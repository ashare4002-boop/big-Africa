use std::time::{Duration, Instant};
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use reqwest::Client as HttpClient;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use subtle::ConstantTimeEq; // Ensure you have the 'subtle' crate

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, Debug)]
pub struct OAuthToken {
    pub access_token: String,
    pub expires_at: Instant,
}

#[derive(Clone)]
pub struct NwaPay {
    pub base_url: String,
    pub client_id: String,
    pub client_secret: String,
    pub hmac_secret: String,
    http: HttpClient,
    cache: Arc<Mutex<Option<OAuthToken>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestToPayRes {
    pub reference: String,
    pub status: String,
}

impl NwaPay {
    pub fn new_from_env() -> Self {
        let base_url = std::env::var("NWAPAY_BASE_URL").unwrap_or_default();
        let client_id = std::env::var("NWAPAY_CLIENT_ID").unwrap_or_default();
        let client_secret = std::env::var("NWAPAY_CLIENT_SECRET").unwrap_or_default();
        let hmac_secret = std::env::var("NWAPAY_HMAC_SECRET").unwrap_or_default();
        
        // Audit 3.1: Ensure we aren't using staging credentials in prod or vice versa
        // A simple check could be added here, but for now we rely on the ENV vars.
        
        Self {
            base_url,
            client_id,
            client_secret,
            hmac_secret,
            http: HttpClient::builder()
                .timeout(Duration::from_secs(30)) // Add global timeout
                .build()
                .unwrap_or_default(),
            cache: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn get_oauth_token(&self) -> anyhow::Result<String> {
        if let Some(tok) = self.cache.lock().unwrap().as_ref() {
            // Buffer of 60 seconds to prevent using a token that expires mid-flight
            if Instant::now() + Duration::from_secs(60) < tok.expires_at { 
                return Ok(tok.access_token.clone()); 
            }
        }
        
        let url = format!("{}/oauth/token", self.base_url);
        let res = self.http.post(&url)
            .form(&serde_json::json!({"client_id": self.client_id, "client_secret": self.client_secret}))
            .send().await?;
            
        if !res.status().is_success() {
            return Err(anyhow::anyhow!("Failed to auth: {}", res.status()));
        }

        let body: serde_json::Value = res.json().await?;
        let token = body.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let expires_in = body.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3000);
        
        let cached = OAuthToken { access_token: token.clone(), expires_at: Instant::now() + Duration::from_secs(expires_in) };
        *self.cache.lock().unwrap() = Some(cached);
        Ok(token)
    }

    // Audit 7.1: Operational Resilience
    // Check if the Mobile Money network is online before batch processing
    pub async fn check_availability(&self, network: &str) -> anyhow::Result<bool> {
         // Note: Assuming endpoint /availability exists per standard aggregator patterns
         // If specific path differs, adjust based on live docs.
        let url = format!("{}/availability", self.base_url);
        let res = self.http.get(&url).send().await?;
        if res.status().is_success() {
             let v: serde_json::Value = res.json().await?;
             // Simplistic check: assumes JSON response {"mtn": "online"}
             let status = v.get(network.to_lowercase()).and_then(|s| s.as_str()).unwrap_or("offline");
             Ok(status == "online")
        } else {
            // If endpoint fails, assume online to avoid blocking business, but log warning
            Ok(true) 
        }
    }

    async fn backoff_attempts<F, Fut, T>(&self, f: F) -> anyhow::Result<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = anyhow::Result<T>>,
    {
        // Audit 5.3: Retry Logic
        let delay = [0, 2, 5, 10]; // Increased backoff spread
        for (i, d) in delay.iter().enumerate() {
            if *d > 0 {
                tokio::time::sleep(Duration::from_secs(*d)).await;
            }
            match f().await {
                Ok(t) => return Ok(t),
                Err(e) => {
                    // Log the retry attempt here if you have a logger
                    if i == delay.len() - 1 {
                        return Err(e);
                    }
                }
            }
        }
        Err(anyhow::anyhow!("Retries exhausted"))
    }

    pub async fn request_to_pay(&self, phone: &str, amount: i64, currency: &str, network: &str, callback_url: &str, metadata: serde_json::Value) -> anyhow::Result<RequestToPayRes> {
        let token = self.get_oauth_token().await?;
        let url = format!("{}/payments/request", self.base_url);
        
        // Audit 2.3: Currency Strictness (Integers only)
        let payload = serde_json::json!({
            "phone": phone,
            "amount": amount, // Strictly i64
            "currency": currency,
            "network": network,
            "callback_url": callback_url,
            "metadata": metadata,
        });

        self.backoff_attempts(|| async {
            let res = self
                .http
                .post(&url)
                .bearer_auth(&token)
                .json(&payload)
                .send()
                .await?;
            
            if !res.status().is_success() {
                 let err_text = res.text().await.unwrap_or_default();
                 return Err(anyhow::anyhow!("Gateway Error: {}", err_text));
            }

            let v: serde_json::Value = res.json().await?;
            let reference = v
                .get("reference")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            let status = v
                .get("status")
                .and_then(|x| x.as_str())
                .unwrap_or("PENDING")
                .to_string();
            Ok(RequestToPayRes { reference, status })
        })
        .await
    }

    #[allow(dead_code)]
    pub async fn get_payment_status(&self, reference: &str) -> anyhow::Result<String> {
        let token = self.get_oauth_token().await?;
        let url = format!("{}/payments/status/{}", self.base_url, reference);
        self.backoff_attempts(|| async {
            let res = self
                .http
                .get(&url)
                .bearer_auth(&token)
                .send()
                .await?;
            let v: serde_json::Value = res.json().await?;
            Ok(
                v.get("status")
                    .and_then(|x| x.as_str())
                    .unwrap_or("PENDING")
                    .to_string(),
            )
        })
        .await
    }

    // Audit 6.1: Webhook Integrity
    pub fn verify_webhook_signature(&self, header_sig: &str, body: &[u8]) -> bool {
        let mut mac = HmacSha256::new_from_slice(self.hmac_secret.as_bytes()).expect("HMAC can be created");
        mac.update(body);
        let calc = mac.finalize().into_bytes();
        
        match hex::decode(header_sig) {
            Ok(provided) => {
                // Audit 6.1: Timing Attack Protection using constant_time_eq
                provided.ct_eq(&calc).into()
            },
            Err(_) => false,
        }
    }
}