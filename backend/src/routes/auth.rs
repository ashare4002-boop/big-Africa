use axum::{Json, http::StatusCode};
use axum::extract::{State};
use mongodb::{bson::{doc, Document}, Collection};
use serde::{Serialize, Deserialize};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use crate::AppState;
use crate::db::config::MongoConnection;
use chrono::{Utc, Duration as ChronoDuration};

#[derive(Serialize, Deserialize)]
struct AuthClaims { sub: String, exp: usize }

fn jwt_secret() -> String { std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev_secret".to_string()) }

#[derive(Deserialize)]
pub struct SignupBody {
    pub name: String,
    pub level: String,
    pub matricule: String,
    pub faculty: String,
    pub department: String,
    pub password: String,
    pub phone: Option<String>,
    pub network: Option<String>,
}

#[derive(Serialize)]
pub struct SignupRes { pub user_id: String, pub token: String }

#[derive(Deserialize)]
pub struct LoginBody { pub matricule: String, pub password: String }

#[derive(Serialize)]
pub struct LoginRes { pub token: String }

pub async fn signup(State(state): State<AppState>, Json(body): Json<SignupBody>) -> Result<Json<SignupRes>, (StatusCode, Json<serde_json::Value>)> {
    if body.name.is_empty() || body.level.is_empty() || body.matricule.is_empty() || body.faculty.is_empty() || body.department.is_empty() || body.password.is_empty() {
        return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"invalid body"}))));
    }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let users: Collection<Document> = mongo.collection(&state.db_name, "users");
    let exists = users.find_one(doc!{"matricule": &body.matricule, "faculty": &body.faculty}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    if exists.is_some() { return Err((StatusCode::CONFLICT, Json(serde_json::json!({"error":"matricule already exists"})))); }

    let user_id = uuid::Uuid::new_v4().to_string();
    let pass_hash = hash(&body.password, DEFAULT_COST).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let now = mongodb::bson::DateTime::now();
    let udoc = doc!{"_id": &user_id, "name": &body.name, "level": &body.level, "matricule": &body.matricule, "faculty": &body.faculty, "department": &body.department, "password_hash": pass_hash, "phone": body.phone.clone().unwrap_or_default(), "network": body.network.clone().unwrap_or_default(), "created_at": &now};
    users.insert_one(udoc).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;

    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let plans = crate::routes::subscriptions::get_plans();
    let plan = plans.get("premium_monthly").unwrap();
    let trial_end = mongodb::bson::DateTime::from_millis((Utc::now() + ChronoDuration::days(plan.trial_days)).timestamp_millis());
    let sdoc = doc!{"_id": uuid::Uuid::new_v4().to_string(), "user_id": &user_id, "plan_id": &plan.id, "amount": plan.amount, "currency": &plan.currency, "network": body.network.clone().unwrap_or_default(), "phone": body.phone.clone().unwrap_or_default(), "status": "TRIAL", "start_date": mongodb::bson::DateTime::from_millis(Utc::now().timestamp_millis()), "current_period_end": trial_end, "next_charge_due": trial_end, "last_payment_ref": mongodb::bson::Bson::Null, "attempts": 0, "created_at": &now};
    let _ = subs.insert_one(sdoc).await;

    let exp = (Utc::now() + ChronoDuration::days(30)).timestamp() as usize;
    let claims = AuthClaims { sub: user_id.clone(), exp };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(jwt_secret().as_bytes())).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    Ok(Json(SignupRes { user_id, token }))
}

pub async fn login(State(state): State<AppState>, Json(body): Json<LoginBody>) -> Result<Json<LoginRes>, (StatusCode, Json<serde_json::Value>)> {
    if body.matricule.is_empty() || body.password.is_empty() { return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"invalid body"})))); }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let users: Collection<Document> = mongo.collection(&state.db_name, "users");
    let u = users.find_one(doc!{"matricule": &body.matricule}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let d = match u { Some(x) => x, None => return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"invalid credentials"})))) };
    let stored = d.get_str("password_hash").unwrap_or("");
    if !verify(&body.password, stored).unwrap_or(false) { return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"invalid credentials"})))); }
    let user_id = d.get_str("_id").unwrap_or("").to_string();
    let exp = (Utc::now() + ChronoDuration::days(30)).timestamp() as usize;
    let claims = AuthClaims { sub: user_id, exp };
    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(jwt_secret().as_bytes())).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    Ok(Json(LoginRes { token }))
}

pub fn get_user_id_from_auth(headers: &axum::http::HeaderMap) -> Option<String> {
    let v = headers.get("authorization").and_then(|h| h.to_str().ok())?;
    let parts: Vec<&str> = v.split_whitespace().collect();
    if parts.len() == 2 && parts[0].eq_ignore_ascii_case("bearer") {
        let token = parts[1];
        let secret = jwt_secret();
        let res = decode::<AuthClaims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default()).ok()?;
        Some(res.claims.sub)
    } else { None }
}
