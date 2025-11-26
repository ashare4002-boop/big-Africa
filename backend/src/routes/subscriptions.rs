use axum::{Json, http::StatusCode, extract::{Path, State}, body::Bytes};
use futures_util::StreamExt;
use serde::{Serialize, Deserialize};
use mongodb::{bson::{doc, Document, Bson}, Collection};
use crate::{AppState};
use crate::db::config::MongoConnection;
use crate::nwapay::NwaPay;
use std::collections::HashMap;
use chrono::{Utc, Duration as ChronoDuration}; // Required for date math

// --- Subscription Plan Configuration (The "Subscriptions File" Logic) ---

#[derive(Clone, Serialize, Deserialize)]
pub struct SubscriptionPlan {
    pub id: String,
    pub name: String,
    pub amount: i64, // The recurring charge amount
    pub currency: String,
    pub interval_days: i64, // Duration of the access period
    pub trial_days: i64, // Initial free period
}

// Fixed pricing defined here, decoupled from the API request
pub fn get_plans() -> HashMap<String, SubscriptionPlan> {
    let mut plans = HashMap::new();
    plans.insert("premium_monthly".to_string(), SubscriptionPlan {
        id: "premium_monthly".to_string(),
        name: "Premium Monthly".to_string(),
        amount: 399, // User requested 399 XAF
        currency: "XAF".to_string(),
        interval_days: 30, // User requested monthly
        trial_days: 7, // User requested 7-day trial
    });
    plans
}

// --- API Request/Response Models ---

#[derive(Deserialize)]
pub struct InitiateBody {
    pub user_id: String,
    pub phone: String,
    pub network: String,
    pub plan_id: String, // Accepts plan ID instead of raw amount
}

#[derive(Serialize)]
pub struct InitiateRes {
    pub subscription_id: String,
    pub status: String,
}

// --- API Handlers ---

// This now creates the trial subscription, it DOES NOT initiate a payment
pub async fn initiate(State(state): State<AppState>, Json(body): Json<InitiateBody>) -> Result<Json<InitiateRes>, (StatusCode, Json<serde_json::Value>)> {
    if body.user_id.is_empty() || body.phone.is_empty() || body.network.is_empty() { 
        return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"invalid body"})))); 
    }

    let nw = NwaPay::new_from_env();
    let online = nw.check_availability(&body.network).await.unwrap_or(true);
    if !online { return Err((StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({"error":"network unavailable"})))); }

    let plans = get_plans();
    let plan = plans.get(&body.plan_id).ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"Invalid plan_id"})))
    })?;

    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    
    // Safety check: Don't create duplicate subscriptions
    if subs.find_one(doc!{"user_id": &body.user_id, "status": {"$ne": "CANCELED"}}).await.unwrap().is_some() {
        return Err((StatusCode::CONFLICT, Json(serde_json::json!({"error":"User already has an active subscription."}))))
    }
    
    let subscription_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now();
    
    // Calculate Trial End Date (Now + 7 Days)
    let trial_end_chrono = now + ChronoDuration::days(plan.trial_days);
    let trial_end_date = mongodb::bson::DateTime::from_millis(trial_end_chrono.timestamp_millis());
    
    // Insert Subscription Record
    let doc = doc!{
        "_id": &subscription_id, 
        "user_id": &body.user_id, 
        "plan_id": &plan.id,
        "amount": plan.amount, 
        "currency": &plan.currency, 
        "network": &body.network, 
        "phone": &body.phone, 
        "status": "TRIAL", 
        "start_date": mongodb::bson::DateTime::from_millis(now.timestamp_millis()),
        "current_period_end": trial_end_date, // Access ends here (end of trial)
        "next_charge_due": trial_end_date, // First charge is due on this date
        "last_payment_ref": Bson::Null,
        "attempts": 0,
        "created_at": mongodb::bson::DateTime::from_millis(now.timestamp_millis())
    };

    subs.insert_one(doc).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    
    Ok(Json(InitiateRes{ subscription_id, status: "TRIAL".to_string() }))
}

pub async fn status(State(state): State<AppState>, Path(subscription_id): Path<String>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    // Fetch from subscriptions collection
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let p = subs.find_one(doc!{"_id": &subscription_id}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    match p { 
        Some(d) => Ok(Json(serde_json::to_value(d).unwrap_or(serde_json::json!({})))), 
        None => Err((StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"subscription not found"})))) 
    }
}

pub async fn webhook(State(state): State<AppState>, headers: axum::http::HeaderMap, body: Bytes) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let nw = NwaPay::new_from_env();
    let sig = headers.get("x-signature").and_then(|v| v.to_str().ok()).unwrap_or("");
    
    if !nw.verify_webhook_signature(sig, &body) { 
        return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error":"bad signature"})))); 
    }

    let v: serde_json::Value = serde_json::from_slice(&body).map_err(|_| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"bad json"}))))?;
    let reference = v.get("reference").and_then(|x| x.as_str()).unwrap_or("");
    let status = v.get("status").and_then(|x| x.as_str()).unwrap_or("PENDING");
    let metadata = v.get("metadata").and_then(|x| x.as_object()).cloned().unwrap_or_default();
    let subscription_id = metadata.get("subscription_id").and_then(|x| x.as_str()).unwrap_or(""); // Use metadata to link to subscription
    
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let payments: Collection<Document> = mongo.collection(&state.db_name, "payments");
    
    let p_doc = payments.find_one(doc!{"reference": &reference}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    
    if p_doc.is_none() { 
        // Orphan webhook - transaction not initiated by scheduler
        return Ok(Json(serde_json::json!({"ok":true})));
    }
    let p_data = p_doc.unwrap();
    let user_id = p_data.get_str("user_id").unwrap_or("");
    let current_payment_status = p_data.get_str("status").unwrap_or("PENDING");

    // Idempotency Check (Audit 6.2): Prevents duplicate subscription extensions
    if current_payment_status == "SUCCESS" {
        return Ok(Json(serde_json::json!({"ok":true, "info": "payment already processed"})));
    }

    let now_chrono = Utc::now();
    let now = mongodb::bson::DateTime::from_millis(now_chrono.timestamp_millis());
    let raw_bson = mongodb::bson::to_bson(&v).unwrap_or(Bson::Null);

    // Update Payment status and log webhook
    payments.update_one(
        doc!{"reference": &reference},
        doc!{"$set": {"status": &status, "completed_at": &now }, "$push": {"webhook_logs": {"raw": raw_bson, "received_at": &now }}}
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;

    // --- Subscription Update Logic ---
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let s_doc = subs.find_one(doc!{"_id": &subscription_id}).await.unwrap_or(None);
    
    if status == "SUCCESS" {
        let plans = get_plans();
        let plan = s_doc.as_ref()
            .and_then(|d| d.get_str("plan_id").ok())
            .and_then(|id| plans.get(id))
            .ok_or_else(|| {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"plan not found for successful payment"})))
            })?;
        
        // Calculate new subscription end date: Current time + Interval (30 days)
        let new_end_chrono = now_chrono + ChronoDuration::days(plan.interval_days);
        let new_end_date = mongodb::bson::DateTime::from_millis(new_end_chrono.timestamp_millis());
        
        subs.update_one(
            doc!{"_id": &subscription_id},
            doc!{"$set": {
                "status": "ACTIVE",
                "last_payment": &now, 
                "current_period_end": new_end_date, // Access end date is now 30 days out
                "next_charge_due": new_end_date, // Next payment due is 30 days out
                "last_payment_ref": reference
            }},
        ).await.ok(); 

        let notifications: Collection<Document> = mongo.collection(&state.db_name, "notifications");
        let pay_doc = doc!{"kind":"payment_success","user_id": user_id, "message": "Payment reçu — abonnement actif", "created_at": &now};
        let _ = notifications.insert_one(&pay_doc).await;

    } else if status == "FAILED" || status == "TIMEOUT" {
        // Handle Dunning Logic: Set status to PAST_DUE
        subs.update_one(
            doc!{"_id": &subscription_id},
            doc!{"$set": {"status": "PAST_DUE"}},
        ).await.ok(); 
    }

    Ok(Json(serde_json::json!({"ok":true})))
}

#[derive(Deserialize)]
pub struct ChargeBody {
    pub subscription_id: String,
}

pub async fn charge_now(State(state): State<AppState>, Json(body): Json<ChargeBody>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    if body.subscription_id.is_empty() { return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"invalid body"})))); }
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let payments: Collection<Document> = mongo.collection(&state.db_name, "payments");
    let nw = NwaPay::new_from_env();
    let cb = std::env::var("PAYMENT_CALLBACK_URL").unwrap_or_default();

    let s_doc = subs.find_one(doc!{"_id": &body.subscription_id}).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let s = match s_doc { Some(d) => d, None => return Err((StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"subscription not found"})))) };

    let user_id = s.get_str("user_id").unwrap_or("");
    let phone = s.get_str("phone").unwrap_or("");
    let network = s.get_str("network").unwrap_or("");
    let amount = s.get_i64("amount").unwrap_or(0);
    let currency = s.get_str("currency").unwrap_or("XAF");
    let attempts = s.get_i32("attempts").unwrap_or(0);

    let online = nw.check_availability(network).await.unwrap_or(true);
    if !online { return Err((StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({"error":"network unavailable"})))); }

    if amount <= 0 { return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"invalid amount"})))); }

    let payment_id = uuid::Uuid::new_v4().to_string();
    let now = mongodb::bson::DateTime::now();
    let meta = serde_json::json!({"subscription_id": &body.subscription_id, "user_id": user_id});

    let pdoc = doc!{"_id": &payment_id, "user_id": user_id, "subscription_id": &body.subscription_id, "amount": amount, "currency": currency, "network": network, "phone": phone, "status": "PENDING", "attempts": attempts + 1, "initiated_at": &now };
    payments.insert_one(pdoc).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;

    match nw.request_to_pay(phone, amount, currency, network, &cb, meta).await {
        Ok(rtp) => {
            payments.update_one(doc!{"_id": &payment_id}, doc!{"$set": {"reference": &rtp.reference, "status": &rtp.status}}).await.ok();
            subs.update_one(doc!{"_id": &body.subscription_id}, doc!{"$set": {"status": "AWAITING_PAYMENT", "attempts": attempts + 1}}).await.ok();
            Ok(Json(serde_json::json!({"ok": true, "reference": rtp.reference, "status": rtp.status})))
        },
        Err(e) => {
            payments.update_one(doc!{"_id": &payment_id}, doc!{"$set": {"status": "GATEWAY_FAILED"}}).await.ok();
            Err((StatusCode::BAD_GATEWAY, Json(serde_json::json!({"error": e.to_string()}))))
        }
    }
}


// --- Scheduler Simulation (Crucial Architectural Component) ---

// This function must be run by a periodic job (like a Cron Job) every day
pub async fn run_scheduler(State(state): State<AppState>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let mongo = MongoConnection::new().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let subs: Collection<Document> = mongo.collection(&state.db_name, "subscriptions");
    let payments: Collection<Document> = mongo.collection(&state.db_name, "payments");
    let nw = NwaPay::new_from_env();
    let cb = std::env::var("PAYMENT_CALLBACK_URL").unwrap_or_default();
    let now = mongodb::bson::DateTime::now();

    // Find subscriptions that are DUE or PAST_DUE and not at max attempts (5)
    let filter = doc!{
        "next_charge_due": {"$lte": &now}, 
        "status": {"$in": ["TRIAL", "ACTIVE", "PAST_DUE"]}, 
        "attempts": {"$lt": 5} 
    };
    
    let mut cursor = subs.find(filter).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))))?;
    let mut charges_initiated = 0;

    // Processing Loop (Audit 5.2)
    while let Some(result) = cursor.next().await {
        if let Ok(sub_doc) = result {
            let subscription_id = sub_doc.get_str("_id").unwrap_or("");
            let user_id = sub_doc.get_str("user_id").unwrap_or("");
            let phone = sub_doc.get_str("phone").unwrap_or("");
            let network = sub_doc.get_str("network").unwrap_or("");
            let amount = sub_doc.get_i64("amount").unwrap_or(0); // 399 XAF

            if amount > 0 {
                // 1. Create a Payment Record (PENDING)
                let payment_id = uuid::Uuid::new_v4().to_string();
                let meta = serde_json::json!({"subscription_id": subscription_id, "user_id": user_id});
                
                let payment_doc = doc!{
                    "_id": &payment_id, 
                    "user_id": user_id, 
                    "subscription_id": subscription_id,
                    "amount": amount, 
                    "currency": "XAF", 
                    "network": network, 
                    "phone": phone, 
                    "status": "PENDING", 
                    "attempts": sub_doc.get_i32("attempts").unwrap_or(0) + 1,
                    "initiated_at": &now 
                };

                payments.insert_one(payment_doc).await.ok();
                
                // 2. Call Nkwa Pay (POST /collect)
                match nw.request_to_pay(phone, amount, "XAF", network, &cb, meta).await {
                    Ok(rtp) => {
                        // 3. Update Payment Reference and Subscription Status
                        payments.update_one(
                            doc!{"_id": &payment_id}, 
                            doc!{"$set": {"reference": &rtp.reference, "status": &rtp.status}}
                        ).await.ok();
                        
                        // Set subscription status to AWAITING_PAYMENT
                        subs.update_one(
                            doc!{"_id": subscription_id}, 
                            doc!{"$set": {"status": "AWAITING_PAYMENT", "attempts": sub_doc.get_i32("attempts").unwrap_or(0) + 1}}
                        ).await.ok();
                        
                        charges_initiated += 1;
                    },
                    Err(_) => {
                        // 4. Handle API Failure
                        payments.update_one(
                            doc!{"_id": &payment_id}, 
                            doc!{"$set": {"status": "GATEWAY_FAILED"}}
                        ).await.ok();
                        // Dunning logic will re-attempt on the next scheduler run
                    }
                }
            }
        }
    }
    
    // Termination Check (Audit 5.3): Cancel subscriptions that have reached 5 failed attempts
    let term_filter = doc!{
        "next_charge_due": {"$lte": &now},
        "status": {"$in": ["TRIAL", "ACTIVE", "PAST_DUE", "AWAITING_PAYMENT"]},
        "attempts": {"$gte": 5}
    };
    let term_update = doc!{"$set": {"status": "CANCELED", "cancellation_date": &now, "reason": "Failed to collect payment after 5 attempts"}};
    let result = subs.update_many(term_filter, term_update).await.ok().map(|r| r.modified_count).unwrap_or(0);


    Ok(Json(serde_json::json!({"ok":true, "message": format!("Scheduler run complete. Initiated {} charges. Canceled {} subscriptions.", charges_initiated, result)})))
}
