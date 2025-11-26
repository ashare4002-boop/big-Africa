use axum::{Json, http::StatusCode};
use axum::extract::{State};
use mongodb::{bson::{doc, Document}, Collection};
use futures_util::StreamExt;
use serde::{Serialize};
use crate::AppState;
use crate::db::config::MongoConnection;
use chrono::Utc;

#[derive(Serialize)]
pub struct GenRes { pub ok: bool, pub warnings: Vec<String> }

fn subscription_gate(sub: Option<Document>) -> bool {
    if let Some(s) = sub {
        let status = s.get_str("status").unwrap_or("TRIAL");
        if status == "ACTIVE" { return true; }
        let end = s.get_datetime("current_period_end").ok();
        if let Some(d) = end { return d.timestamp_millis() >= Utc::now().timestamp_millis(); }
        return false
    }
    false
}

pub async fn generate(State(state): State<AppState>, headers: axum::http::HeaderMap) -> Result<Json<GenRes>, (StatusCode, Json<serde_json::Value>)> {
    let user_id = crate::routes::auth::get_user_id_from_auth(&headers).unwrap_or_default();
    if user_id.is_empty() { return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"unauthorized"})))); }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let sub_doc = subs.find_one(doc!{"user_id": &user_id}).await.ok().flatten();
    if !subscription_gate(sub_doc) { return Err((StatusCode::FORBIDDEN, Json(serde_json::json!({"redirect":"/pay"})))); }

    let selects: Collection<Document> = mongo.collection(&state.db_name, "user_courses");
    let sel = selects.find_one(doc!{"user_id": &user_id}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let sdoc = match sel { Some(x) => x, None => return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"no selections"})))) };
    let codes: Vec<String> = sdoc.get_array("codes").ok().unwrap_or(&vec![]).iter().filter_map(|b| b.as_str().map(|x| x.to_string())).collect();

    // Load user details to filter timetable by faculty/department/level
    let users: Collection<Document> = mongo.collection(&state.db_name, "users");
    let udoc = users.find_one(doc!{"_id": &user_id}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let (ufac, udep, ulev) = if let Some(u) = udoc { (
        u.get_str("faculty").unwrap_or("").to_string(),
        u.get_str("department").unwrap_or("").to_string(),
        u.get_str("level").unwrap_or("").to_string(),
    ) } else { (String::new(), String::new(), String::new()) };

    let timetables: Collection<Document> = mongo.collection(&state.db_name, "timetables");
    // Fetch all, then pick active by period and precedence, filtered by user fields when present
    let mut cursor = timetables.find(doc!{}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let mut candidates: Vec<Document> = Vec::new();
    while let Some(res) = cursor.next().await { if let Ok(d) = res { candidates.push(d); } }
    if candidates.is_empty() { return Err((StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"no timetables"})))) }
    let now_ms = Utc::now().timestamp_millis();
    // filter by faculty/department/level if any are set on the timetable
    let mut filtered: Vec<Document> = candidates.iter().filter(|t| {
        let tf = t.get_str("faculty").unwrap_or("");
        let td = t.get_str("department").unwrap_or("");
        let tl = t.get_str("level").unwrap_or("");
        (tf.is_empty() || tf == ufac) && (td.is_empty() || td == udep) && (tl.is_empty() || tl == ulev)
    }).map(|t| t.clone()).collect();
    if filtered.is_empty() { filtered = candidates.clone(); }
    let mut active: Vec<Document> = filtered.iter().filter(|t| {
        let af = t.get_datetime("active_from").ok().map(|d| d.timestamp_millis()).unwrap_or(i64::MIN);
        let au = t.get_datetime("active_until").ok().map(|d| d.timestamp_millis()).unwrap_or(i64::MAX);
        af <= now_ms && now_ms <= au
    }).map(|t| t.clone()).collect();
    let b = if !active.is_empty() {
        active.sort_by_key(|t| {
            match t.get_str("kind").unwrap_or("") { "Exam" => 0, "CA" => 1, _ => 2 }
        });
        active.remove(0)
    } else {
        // fallback last
        let mut all = filtered.clone();
        all.pop().unwrap()
    };

    let mut days: Vec<mongodb::bson::Bson> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    if let Some(arr) = b.get_array("days").ok() {
        for day in arr {
            if let Some(d) = day.as_document() {
                let mut new_cols: Vec<mongodb::bson::Bson> = Vec::new();
                if let Some(cols) = d.get_array("cols").ok() {
                    for c in cols {
                        if let Some(cd) = c.as_document() {
                            let mut new_schedules: Vec<mongodb::bson::Bson> = Vec::new();
                            if let Some(schs) = cd.get_array("schedules").ok() {
                                let mut selected: Vec<mongodb::bson::Document> = Vec::new();
                                for s in schs {
                                    if let Some(sd) = s.as_document() {
                                        let code = sd.get_document("course").ok().and_then(|cc| cc.get_str("code").ok()).unwrap_or("");
                                        if codes.iter().any(|x| x == code) { selected.push(sd.clone()); new_schedules.push(mongodb::bson::Bson::Document(sd.clone())); }
                                    }
                                }
                                if selected.len() > 1 {
                                    let names: Vec<String> = selected.iter().map(|sd| sd.get_document("course").ok().and_then(|cc| cc.get_str("code").ok()).unwrap_or("").to_string()).collect();
                                    warnings.push(format!("Clash at {:02}:{:02} -> {}", cd.get_document("start_time").ok().and_then(|st| st.get_i32("hr").ok()).unwrap_or(0), cd.get_document("start_time").ok().and_then(|st| st.get_i32("min").ok()).unwrap_or(0), names.join(", ")));
                                }
                            }
                            let mut nd = cd.clone();
                            nd.insert("schedules", mongodb::bson::Bson::Array(new_schedules));
                            new_cols.push(mongodb::bson::Bson::Document(nd));
                        }
                    }
                }
                let mut ndoc = d.clone();
                ndoc.insert("cols", mongodb::bson::Bson::Array(new_cols));
                days.push(mongodb::bson::Bson::Document(ndoc));
            }
        }
    }
    let user_tts: Collection<Document> = mongo.collection(&state.db_name, "user_timetables");
    let doc = doc!{"user_id": &user_id, "days": days.clone(), "generated_at": mongodb::bson::DateTime::now(), "warnings": warnings.clone()};
    let res = user_tts.update_one(doc!{"user_id": &user_id}, doc!{"$set": &doc}).await;
    if res.is_ok() { let m = res.unwrap(); if m.matched_count == 0 { let _ = user_tts.insert_one(doc!{"user_id": &user_id, "days": days.clone(), "generated_at": mongodb::bson::DateTime::now()}).await; } }
    // Default notification activation for user per selected courses
    if !codes.is_empty() {
        let user_notifs: Collection<Document> = mongo.collection(&state.db_name, "user_course_notifications");
        for c in codes.iter() { let _ = user_notifs.update_one(doc!{"user_id": &user_id, "course_code": c}, doc!{"$set": {"enabled": true}}).await; }
    }
    Ok(Json(GenRes{ ok: true, warnings }))
}

pub async fn get_my_timetable(State(state): State<AppState>, headers: axum::http::HeaderMap) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let user_id = crate::routes::auth::get_user_id_from_auth(&headers).unwrap_or_default();
    if user_id.is_empty() { return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"unauthorized"})))); }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let sub_doc = subs.find_one(doc!{"user_id": &user_id}).await.ok().flatten();
    if !subscription_gate(sub_doc) { return Err((StatusCode::FORBIDDEN, Json(serde_json::json!({"redirect":"/pay"})))); }
    let user_tts: Collection<Document> = mongo.collection(&state.db_name, "user_timetables");
    let tt = user_tts.find_one(doc!{"user_id": &user_id}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    match tt { Some(d) => Ok(Json(serde_json::to_value(d).unwrap_or(serde_json::json!({})))), None => Err((StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"not found"})))) }
}
