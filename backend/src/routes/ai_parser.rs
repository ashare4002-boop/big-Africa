use axum::{extract::{Query, ConnectInfo, State, Path}, Json, http::StatusCode};
use axum::extract::Multipart;
use serde::Deserialize;
use std::{net::SocketAddr, time::{Duration, Instant}};
use crate::parser::wrapper::get_timetable;
// imports for multipart handlers moved inside cfg blocks to avoid unused warnings
use crate::AppState;

#[derive(Deserialize)]
pub struct ParseQuery {
    pub path: Option<String>,
}

fn check_rate(state: &AppState, ip: &str) -> bool {
    let mut rl = state.rate_limiter.lock().unwrap();
    let now = Instant::now();
    let window = Duration::from_secs(60);
    let entries = rl.entry(ip.to_string()).or_insert(Vec::new());
    entries.retain(|t| now.duration_since(*t) <= window);
    if entries.len() >= 5 { return false; }
    entries.push(now);
    true
}


pub async fn get_ai_parse(State(state): State<AppState>, ConnectInfo(addr): ConnectInfo<SocketAddr>, Query(q): Query<ParseQuery>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let ip = addr.ip().to_string();
    if !check_rate(&state, &ip) {
        return Err((StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({"error":"rate limit"}))));
    }
    let Some(path) = q.path else {
        return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"missing path"}))));
    };
    match get_timetable(&path).await {
        Ok((json, _raw)) => Ok(Json(serde_json::json!({"data": json.0, "confidence": 1.0}))),
        Err(e) => Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e, "admin_url":"/admin/map"}))))
    }
}

pub async fn post_ai_parse(State(state): State<AppState>, ConnectInfo(addr): ConnectInfo<SocketAddr>, mut multipart: Multipart) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let ip = addr.ip().to_string();
    if !check_rate(&state, &ip) {
        return Err((StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({"error":"rate limit"}))));
    }
    while let Some(field) = multipart.next_field().await.map_err(|_| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"bad multipart"}))))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let file_name = field.file_name().unwrap_or("upload.pdf").to_string();
            let bytes = field.bytes().await.map_err(|_| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"cannot read file"}))))?;
            let temp_path = format!("/tmp/{}", file_name);
            std::fs::write(&temp_path, &bytes).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"write failed"}))))?;
            let pages = pdf_extract::extract_text_by_pages(&temp_path).map_err(|_| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"pdf extract failed"}))))?;
            let mut content = String::new();
            for p in pages.iter() { content.push_str(p); content.push('\n'); }
            let res = crate::parser::ai_parse::ai_parse_full(&content).await;
            match res {
                Ok((parsed, _raw)) => {
                    return Ok(Json(serde_json::json!({"data": parsed, "confidence": parsed.confidence.unwrap_or(1.0)})))
                }
                Err(e) => {
                    return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": e, "admin_url":"/admin/map"}))))
                }
            }
        }
    }
    Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"no file"}))))
}


pub async fn post_ai_parse_async(State(state): State<AppState>, ConnectInfo(addr): ConnectInfo<SocketAddr>, mut multipart: Multipart) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let ip = addr.ip().to_string();
    if !check_rate(&state, &ip) {
        return Err((StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({"error":"rate limit"}))))
    }
    let mut job_id = None;
    while let Some(field) = multipart.next_field().await.map_err(|_| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"bad multipart"}))))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            let file_name = field.file_name().unwrap_or("upload.pdf").to_string();
            let bytes = field.bytes().await.map_err(|_| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"cannot read file"}))))?;
            let temp_path = format!("/tmp/{}", file_name);
            std::fs::write(&temp_path, &bytes).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"write failed"}))))?;
            let id = uuid::Uuid::new_v4().to_string();
            {
                let mut jobs = state.jobs.lock().unwrap();
                jobs.insert(id.clone(), serde_json::json!({"status":"PENDING"}));
            }
            let state_clone = state.clone();
            let sid = id.clone();
            tokio::spawn(async move {
                let pages = pdf_extract::extract_text_by_pages(&temp_path).unwrap_or_default();
                let mut content = String::new();
                for p in pages.iter() { content.push_str(p); content.push('\n'); }
                let res = crate::parser::ai_parse::ai_parse_full(&content).await;
                let mut jobs = state_clone.jobs.lock().unwrap();
                match res {
                    Ok((parsed, raw)) => {
                        jobs.insert(sid.clone(), serde_json::json!({"status":"DONE","data": parsed, "raw_llm_response": raw}));
                    }
                    Err(e) => {
                        jobs.insert(sid.clone(), serde_json::json!({"status":"FAILED","error": e}));
                    }
                }
            });
            job_id = Some(id);
            break;
        }
    }
    match job_id {
        Some(id) => Ok(Json(serde_json::json!({"job_id": id}))),
        None => Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"no file"}))))
    }
}


pub async fn get_ai_parse_status(State(state): State<AppState>, Path(job_id): Path<String>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let jobs = state.jobs.lock().unwrap();
    match jobs.get(&job_id) {
        Some(v) => Ok(Json(v.clone())),
        None => Err((StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"job not found"}))))
    }
}
