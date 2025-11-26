use std::env;
use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, ServerApi, ServerApiVersion},
    Client, Database, Collection,
};
use tokio;
use dotenv::dotenv;
use anyhow::{Result, Context, anyhow};
use crate::models::meta_data::TimeTableMetaData;
use crate::models::wrapper::{MetaData, TimeTable};
use crate::models::wrapper::Notification;
use futures_util::TryStreamExt;

#[derive(Debug)]
pub struct MongoConnection {
    pub client: Client,
}

impl MongoConnection {
    /// Create a new MongoDB connection
    pub async fn new() -> Result<Self> {
        dotenv().ok();

        let pass = env::var("MONGO_PASS")
            .context("MONGO_PASS environment variable not found")?;
        let username = "pstanwar6747".to_string();
        let cluster = "classsync.9dpbpau.mongodb.net".to_string();

        let app_name = "ClassSync".to_string();

        let conn_str = format!(
            "mongodb+srv://{}:{}@{}/?retryWrites=true&w=majority&appName={}",
            username, pass, cluster, app_name
        );

        let mut client_options = ClientOptions::parse(&conn_str)
            .await
            .context("Failed to parse MongoDB connection string")?;

        let server_api = ServerApi::builder()
            .version(ServerApiVersion::V1)
            .build();
        client_options.server_api = Some(server_api);

        // Set connection pool options for better performance
        client_options.max_pool_size = Some(10);
        client_options.min_pool_size = Some(1);
        client_options.max_idle_time = Some(std::time::Duration::from_secs(300));

        let client = Client::with_options(client_options)
            .context("Failed to create MongoDB client")?;

        // Test the connection
        client
            .database("admin")
            .run_command(doc! {"ping": 1})
            .await
            .context("Failed to ping MongoDB deployment")?;

        println!("Connected to MongoDB successfully!");

        Ok(MongoConnection { client })
    }

    /// Get a database reference
    pub fn database(&self, name: &str) -> Database {
        self.client.database(name)
    }

    /// Get a collection reference
    pub fn collection<T>(&self, db_name: &str, collection_name: &str) -> Collection<T>
    where
        T: Send + Sync,
    {
        self.database(db_name).collection(collection_name)
    }
    
    pub async fn get_metadata(&self, db_name: &str) -> Result<MetaData> {
        let collection: Collection<MetaData> = self.collection(db_name, "meta_data");

        let count = collection.estimated_document_count().await?;
        let latest_meta = collection.find_one(doc! { "version": count as i32 }).await?;
        match latest_meta {
            Some(meta) => Ok(meta),
            None => Err(anyhow!("No meta data found")),
        }
    }

    pub async fn get_timetable(&self, db_name: &str) -> Result<TimeTable> {
        let collection: Collection<TimeTable> = self.collection(db_name, "timetables");
        let mut cursor = collection.find(doc! {}).await?;
        let mut all: Vec<TimeTable> = Vec::new();
        while let Some(doc) = cursor.try_next().await? { all.push(doc); }
        if all.is_empty() { return Err(anyhow!("No timetables found")); }
        // Prefer active timetables by kind precedence: Exam > CA > Regular
        let now_ms = chrono::Utc::now().timestamp_millis();
        let mut active: Vec<&TimeTable> = all.iter().filter(|t| {
            let af = t.active_from.as_ref().map(|d| d.timestamp_millis()).unwrap_or(i64::MIN);
            let au = t.active_until.as_ref().map(|d| d.timestamp_millis()).unwrap_or(i64::MAX);
            af <= now_ms && now_ms <= au
        }).collect();
        if !active.is_empty() {
            active.sort_by_key(|t| {
                match t.kind.as_deref() { Some("Exam") => 0, Some("CA") => 1, _ => 2 }
            });
            return Ok((*active[0]).clone());
        }
        // Fallback: return last inserted
        Ok(all.last().unwrap().clone())
    }

    pub async fn add_meta_data(&self, db_name: &str, meta_data_res: TimeTableMetaData) -> Result<()> {
        let collection: Collection<MetaData> = self.collection(db_name, "meta_data");

        let count = collection.estimated_document_count().await?;
        let latest_meta = collection.find_one(doc! { "version": count as i32 }).await?;
        let new_meta_data = if let Some(existing_meta) = latest_meta {
            existing_meta.merge(&meta_data_res)
        } else {
            // Create new metadata with version 1
            MetaData {
                version: 1,
                data: meta_data_res,
            }
        };

        // Insert the new metadata
        collection
            .insert_one(&new_meta_data)
            .await
            .context("Failed to insert metadata")?;

        Ok(())
    }
    pub async fn add_time_table(&self, db_name: &str, res: TimeTable) -> Result<()> {
        let collection: Collection<TimeTable> = self.collection(db_name, "timetables");
        collection.insert_one(&res).await.context("Failed to insert time table")?;
        // Generate course-level notification schedules for clients
        self.generate_notifications_for_timetable(db_name, &res).await?;
        Ok(())
    }

    pub async fn generate_notifications_for_timetable(&self, db_name: &str, timetable: &TimeTable) -> Result<()> {
        let notifications: Collection<Notification> = self.collection(db_name, "notifications");
        let mut batch_docs: Vec<Notification> = Vec::new();
        for day in &timetable.days {
            for col in &day.cols {
                let hr = col.start_time.hr;
                let min = col.start_time.min;
                for slot in &col.schedules {
                    if let Some(course) = &slot.course {
                        let notif = Notification {
                            kind: "course_schedule".to_string(),
                            course_code: Some(course.code.clone()),
                            user_id: None,
                            day: Some(day.day),
                            start_hr: Some(hr),
                            start_min: Some(min),
                            offsets_min: Some(vec![60, 30, 5]),
                            message: Some(format!("{} scheduled", course.code)),
                            created_at: Some(mongodb::bson::DateTime::now()),
                        };
                        batch_docs.push(notif);
                    }
                }
            }
        }
        if !batch_docs.is_empty() {
            notifications.insert_many(batch_docs).await?;
        }
        Ok(())
    }
}

/// Create a database with initial collections and setup
pub async fn create_database(client: &Client, db_name: &str) -> Result<()> {
    let db = client.database(db_name);

    // Define collections that should exist for ClassSync
    let collections = vec![
        "users",
        "timetables",
        "meta_data",
        "notifications",
    ];

    println!("Creating database '{}' with collections...", db_name);

    for collection_name in collections {
        // Create collection by inserting and then removing a dummy document
        // This is necessary because MongoDB creates collections lazily
        let collection: Collection<Document> = db.collection(collection_name);

        let dummy_doc = doc! {
            "_temp": true,
            "created_at": mongodb::bson::DateTime::now()
        };

        // Insert dummy document
        let insert_result = collection.insert_one(&dummy_doc).await
            .context(format!("Failed to create collection '{}'", collection_name))?;

        // Remove dummy document
        collection.delete_one(doc! {"_id": insert_result.inserted_id}).await
            .context(format!("Failed to cleanup dummy document in '{}'", collection_name))?;

        println!("  ✓ Created collection: {}", collection_name);
    }
    
    println!("✓ Database '{}' created successfully with all collections", db_name);
    Ok(())
}




#[tokio::test]
async fn test_connect() {
    // Connect to MongoDB
    let mongo = MongoConnection::new().await.unwrap();

    // Create the ClassSync database
    create_database(&mongo.client, "class_sync").await.unwrap();

    // Example: Insert a test user
    let users_collection: Collection<Document> = mongo.collection("class_sync", "users");

    let test_user = doc! {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "student",
        "created_at": mongodb::bson::DateTime::now()
    };

    match users_collection.insert_one(&test_user).await {
        Ok(result) => println!("✓ Inserted test user with ID: {}", result.inserted_id),
        Err(e) => println!("Note: Test user might already exist: {}", e),
    }

    // Example: Query users
    let user_count = users_collection.count_documents(doc! {}).await.unwrap();
    println!("✓ Total users in database: {}", user_count);
    assert!(user_count > 0);
    
}
