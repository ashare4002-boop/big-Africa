mod parser;
mod models;
mod test;
mod db;
mod routes;
mod nwapay;

use crate::db::config::MongoConnection;
use crate::models::meta_data::TimeTableInfo;
use crate::models::wrapper::{MetaData, Res, TimeTable};
use axum::http::StatusCode;
use axum::{routing::{get, post}, Json, Router, extract::State};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use axum::response::IntoResponse;
use tokio;
use tower_http::cors::{Any, CorsLayer};
use reqwest::{Client};
use crate::models::ext::TimetableData;
use std::fs;
use axum::routing::head;
use routes::ai_parser;
use routes::subscriptions;
use futures_util::stream::TryStreamExt;

#[derive(Serialize)]
struct Message {
    msg: String,
}

// removed unused Input struct to eliminate warning

// Shared application state
#[derive(Clone)]
pub struct AppState {
    db_name: String,
    rate_limiter: Arc<Mutex<HashMap<String, Vec<std::time::Instant>>>>,
    jobs: Arc<Mutex<HashMap<String, serde_json::Value>>>,
}

// Helper function for consistent error handling
fn mongo_error_response(e: impl std::fmt::Display) -> (StatusCode, Json<Message>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(Message {
        msg: format!("Database error: {}", e)
    }))
}

fn success_response(msg: &str) -> Json<Message> {
    Json(Message { msg: msg.to_string() })
}

#[tokio::main]
async fn main() {
    // Shared state
    let state = AppState {
        db_name: "class_sync".to_string(),
        rate_limiter: Arc::new(Mutex::new(HashMap::new())),
        jobs: Arc::new(Mutex::new(HashMap::new())),
    };

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/new", head(health_check))
        .route("/metadata", post(set_metadata))
        .route("/metadata", get(get_metadata))
        .route("/timetable", post(set_time_table))
        .route("/timetable", get(get_time_table))
        .route("/ext/timetable", get(fetch_and_process))
        .route("/ai/parse", get(ai_parser::get_ai_parse))
        .route("/ai/parse", post(ai_parser::post_ai_parse))
        .route("/ai/parse/async", post(ai_parser::post_ai_parse_async))
        .route("/ai/parse/status/:job_id", get(ai_parser::get_ai_parse_status))
        .route("/subscription/initiate", post(subscriptions::initiate))
        .route("/subscription/status/:payment_id", 
        get(subscriptions::status))
        .route("/subscription/charge", post(subscriptions::charge_now))  
        .route("/webhook/nwapay", post(subscriptions::webhook))
        .route("/notifications", get(list_notifications))
        .route("/notifications/push", post(push_admin_notification))     
        .route("/data", get(get_data_json))
        .route("/auth/signup", post(crate::routes::auth::signup))
        .route("/auth/login", post(crate::routes::auth::login))
        .route("/courses", get(crate::routes::courses::list))
        .route("/courses/select", post(crate::routes::courses::select))
        .route("/courses/:code/notifications/toggle", post(crate::routes::courses::toggle_course_notifications))
        .route("/me/timetable/generate", post(crate::routes::user_timetable::generate))
        .route("/me/timetable", get(crate::routes::user_timetable::get_my_timetable))
        .with_state(state.clone())
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind to address");

    println!("Server running on http://localhost:3000");

    let state_bg = state.clone();
    tokio::spawn(async move {
        loop {
            let _ = crate::routes::subscriptions::run_scheduler(State(state_bg.clone())).await;
            tokio::time::sleep(std::time::Duration::from_secs(24*3600)).await;
        }
    });

    axum::serve(listener, app.into_make_service_with_connect_info::<std::net::SocketAddr>())
        .await
        .expect("Server failed to start");
}

async fn health_check() -> Json<Message> {
    success_response("Hello, JSON World!")
}

async fn set_metadata(
    State(state): State<AppState>,
    Json(payload): Json<TimeTableInfo>
) -> Result<Json<Message>, (StatusCode, Json<Message>)> {
    let res = payload.transform();
    let mongo = MongoConnection::new().await
        .map_err(mongo_error_response)?;

    mongo.add_meta_data(&state.db_name, res).await
        .map_err(mongo_error_response)?;

    Ok(success_response("Success"))
}

async fn get_metadata(
    State(state): State<AppState>
) -> Result<Json<MetaData>, (StatusCode, Json<Message>)> {
    let mongo = MongoConnection::new().await
        .map_err(mongo_error_response)?;

    let meta_data = mongo.get_metadata(&state.db_name).await
        .map_err(|e| (StatusCode::NOT_FOUND, Json(Message {
            msg: format!("Metadata not found: {}", e)
        })))?;

    Ok(Json(meta_data))
}

async fn set_time_table(
    State(state): State<AppState>,
    Json(payload): Json<Res>
) -> Result<Json<Message>, (StatusCode, Json<Message>)> {
    let mongo = MongoConnection::new().await
        .map_err(mongo_error_response)?;

    let meta_data = mongo.get_metadata(&state.db_name).await
        .map_err(|_| (StatusCode::BAD_REQUEST, success_response("Error getting metadata")))?;

    let time_table = payload.transform(&meta_data.data)
        .map_err(|_| (StatusCode::BAD_REQUEST, success_response("Unable to verify key")))?;

    let _ = mongo.add_time_table(&state.db_name, time_table).await;
    Ok(success_response("Success"))
}

async fn get_time_table(
    State(state): State<AppState>
) -> Result<Json<TimeTable>, (StatusCode, Json<Message>)> {
    let mongo = MongoConnection::new().await
        .map_err(mongo_error_response)?;

    let timetable = mongo.get_timetable(&state.db_name).await
        .map_err(|e| (StatusCode::NOT_FOUND, Json(Message {
            msg: format!("Timetable not found: {}", e)
        })))?;

    Ok(Json(timetable))
}

async fn fetch_and_process() -> Json<Message> {
    let client = Client::new();

    let url = "https://simple-timetable.tashif.codes/data/time-table/ODD25/128.json";
    let res = client.get(url).send().await;
    match res {
        Ok(t) => {
            let data = t.json::<TimetableData>().await;
            if let Ok(data) = data {
                dbg!(data);
                return Json(Message{msg: "Timetable process successfully".to_string()})
            }
            Json(Message{msg: "Unable to parse".to_string()})
        }
        Err(_) => {
            Json(Message{msg: "Error".to_string()})
        }
    }
}


async fn get_data_json() -> impl IntoResponse {
    let file_path = "data.json";

    match fs::read_to_string(file_path) {
        Ok(content) => {
            // Parse to ensure it's valid JSON
            match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(json_value) => {
                    (StatusCode::OK, Json(json_value))
                }
                Err(_) => {
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                        "error": "Invalid JSON format in data.json"
                    })))
                }
            }
        }
        Err(_) => {
            (StatusCode::NOT_FOUND, Json(serde_json::json!({
                "error": "data.json file not found"
            })))
        }
    }
}
#[derive(serde::Deserialize)]
struct NotifQuery { courses: Option<String> }

async fn list_notifications(State(state): State<AppState>, axum::extract::Query(q): axum::extract::Query<NotifQuery>) -> Result<Json<serde_json::Value>, (StatusCode, Json<Message>)> {
    let mongo = MongoConnection::new().await.map_err(mongo_error_response)?;
    let coll: mongodb::Collection<mongodb::bson::Document> = mongo.collection(&state.db_name, "notifications");
    let filter = if let Some(csv) = q.courses.as_ref() {
        let list: Vec<&str> = csv.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        mongodb::bson::doc!{"course_code": {"$in": list}}
    } else { mongodb::bson::doc!{} };
    let mut cursor = coll.find(filter).await.map_err(mongo_error_response)?;
    let mut out: Vec<mongodb::bson::Document> = Vec::new();
    while let Some(doc) = cursor.try_next().await.map_err(mongo_error_response)? {
        out.push(doc);
    }
    Ok(Json(serde_json::json!({"data": out})))
}

#[derive(serde::Deserialize)]
struct PushBody { courses: Vec<String>, message: String }

async fn push_admin_notification(State(state): State<AppState>, Json(body): Json<PushBody>) -> Result<Json<Message>, (StatusCode, Json<Message>)> {
    let mongo = MongoConnection::new().await.map_err(mongo_error_response)?;
    let coll: mongodb::Collection<mongodb::bson::Document> = mongo.collection(&state.db_name, "notifications");
    let now = mongodb::bson::DateTime::now();
    let mut docs: Vec<mongodb::bson::Document> = Vec::new();
    for code in body.courses.iter() {
        docs.push(mongodb::bson::doc!{"kind":"admin_update","course_code": code, "message": &body.message, "created_at": &now});
    }
    if !docs.is_empty() { coll.insert_many(docs).await.map_err(mongo_error_response)?; }
    Ok(success_response("queued"))
}
