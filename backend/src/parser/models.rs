use axum::Json;
use serde::{Deserialize, Serialize};
use crate::models::wrapper::TimeStamp;

#[derive(Serialize,Deserialize,Debug,Default, Clone)]
pub struct Teach {
    pub abbreviation: String,
    pub name : String,
}


#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct Subject {
    pub code : String,
    pub title : String,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct TimeTableinfo {
    pub teachers: Option<Vec<Teach>>,
    pub subjects: Option<Vec<Subject>>,
}

impl TimeTableinfo {
    pub fn to_json(&self) -> Json<TimeTableinfo> {
        Json(self.clone())
    }
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct LLMSlot {
    pub subject_code: String,
    pub subject_title: Option<String>,
    pub group: Option<String>,
    pub level: Option<String>,
    pub start: String,
    pub end: String,
    pub rooms: Vec<String>,
    pub teachers: Vec<String>,
    pub purpose: String,
    pub raw_text: Option<String>,
    pub conflict: Option<bool>,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct LLMColumn {
    pub name: Option<String>,
    #[serde(rename = "slots")]
    pub slots: Option<Vec<LLMSlot>>,
    pub start_time: Option<TimeStamp>,
    pub end_time: Option<TimeStamp>,
    pub duration_min: Option<u32>,
    #[serde(rename = "entries")]
    pub entries: Option<Vec<LLMEntry>>, 
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct LLMDay {
    pub day: serde_json::Value,
    #[serde(rename = "columns")]
    pub columns: Vec<LLMColumn>,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct SourceMeta {
    pub pages: u32,
    pub extracted_snippet: Option<String>,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct LLMEntry {
    pub purpose: String,
    pub course_code: String,
    pub course_title: Option<String>,
    pub batches: Option<Vec<String>>, 
    pub teachers: Vec<String>,
    pub room: Option<String>,
    pub weeks: Option<String>,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct CourseInfo {
    pub code: String,
    pub title: String,
    pub r#type: Option<String>,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct RoomInfo {
    pub code: String,
    pub description: String,
}

#[derive(Serialize,Deserialize,Debug,Default,Clone)]
pub struct LLMTimeTableRes {
    pub ver: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub faculty: Option<String>,
    pub department: Option<String>,
    pub level: Option<String>,
    pub teachers: Option<Vec<Teach>>, 
    pub courses: Option<Vec<CourseInfo>>, 
    pub rooms: Option<Vec<RoomInfo>>, 
    pub days: Vec<LLMDay>,
    pub source_meta: Option<SourceMeta>,
    pub confidence: Option<f32>,
}
