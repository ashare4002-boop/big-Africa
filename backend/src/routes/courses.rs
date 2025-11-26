use axum::{Json, http::StatusCode};
use axum::extract::{State, Query};
use mongodb::{bson::{doc, Document}, Collection};
use serde::{Serialize, Deserialize};
use crate::AppState;
use futures_util::StreamExt;
use crate::db::config::MongoConnection;

#[derive(Deserialize)]
pub struct ListQuery { pub search: Option<String> }

#[derive(Serialize)]
pub struct CourseItem { pub code: String, pub name: String }

#[derive(Serialize)]
pub struct ListRes { pub data: Vec<CourseItem> }

#[derive(Serialize, Deserialize, Clone)]
pub struct Selection { pub code: String, pub category: String }

#[derive(Deserialize)]
pub struct SelectBody { pub selections: Vec<Selection> }

pub async fn list(State(state): State<AppState>, Query(q): Query<ListQuery>) -> Result<Json<ListRes>, (StatusCode, Json<serde_json::Value>)> {
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let meta: Collection<Document> = mongo.collection(&state.db_name, "meta_data");
    let mut cur = meta.find(doc!{}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let mut latest: Option<Document> = None;
    while let Some(res) = cur.next().await { if let Ok(d) = res { latest = Some(d); } }
    let mut out: Vec<CourseItem> = Vec::new();
    if let Some(doc) = latest {
        if let Some(subjects) = doc.get_document("data").ok().and_then(|d| d.get_document("subjects").ok()) {
            for key in ["cs","ec","hs","ph","ma","oth"] {
                if let Some(arr) = subjects.get_array(key).ok() {
                    for it in arr {
                        if let Some(obj) = it.as_document() {
                            let code = obj.get_str("code").unwrap_or("").to_string();
                            let name = obj.get_str("name").unwrap_or("").to_string();
                            if let Some(s) = q.search.as_ref() { if !code.to_lowercase().contains(&s.to_lowercase()) { continue; } }
                            out.push(CourseItem{ code, name });
                        }
                    }
                }
            }
        }
    }
    Ok(Json(ListRes{ data: out }))
}

pub async fn select(State(state): State<AppState>, headers: axum::http::HeaderMap, Json(body): Json<SelectBody>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let token = crate::routes::auth::get_user_id_from_auth(&headers).unwrap_or_default();
    if token.is_empty() { return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"unauthorized"})))); }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let coll: Collection<Document> = mongo.collection(&state.db_name, "user_courses");
    let now = mongodb::bson::DateTime::now();
    let codes: Vec<String> = body.selections.iter().map(|s| s.code.clone()).collect();
    let doc = doc!{"user_id": token, "selections": mongodb::bson::to_bson(&body.selections).unwrap(), "codes": codes, "created_at": &now};
    coll.insert_one(doc).await.ok();
    Ok(Json(serde_json::json!({"ok":true})))
}

#[derive(Deserialize)]
pub struct ToggleBody { pub enabled: bool }

pub async fn toggle_course_notifications(State(state): State<AppState>, headers: axum::http::HeaderMap, axum::extract::Path(code): axum::extract::Path<String>, Json(body): Json<ToggleBody>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let token = crate::routes::auth::get_user_id_from_auth(&headers).unwrap_or_default();
    if token.is_empty() { return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"unauthorized"})))); }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let coll: Collection<Document> = mongo.collection(&state.db_name, "user_course_notifications");
    let res = coll.update_one(doc!{"user_id": &token, "course_code": &code}, doc!{"$set": {"enabled": body.enabled}}).await;
    if res.is_ok() {
        let m = res.unwrap();
        if m.matched_count == 0 { let _ = coll.insert_one(doc!{"user_id": &token, "course_code": &code, "enabled": body.enabled}).await; }
    }
    Ok(Json(serde_json::json!({"ok":true})))
}
