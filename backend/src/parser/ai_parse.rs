use crate::parser::models::{ TimeTableinfo, LLMTimeTableRes };
use dotenv::dotenv;
use gemini_light_rs::Client;
use serde::de::DeserializeOwned;
use std::env;


fn ai_res_decoder<T: DeserializeOwned>(msg_ctx: &str) -> Result<T, serde_json::Error> {
    serde_json::from_str(msg_ctx)
}

fn extract_json(input: &str) -> Option<String> {
    let start = input.find('{')?;
    let end = input.rfind('}')?;
    if end <= start { return None; }
    Some(input[start..=end].to_string())
}

fn pick_examples(content: &str, max_n: usize) -> Vec<String> {
    let days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]; 
    let mut out = Vec::new();
    for line in content.lines() {
        let l = line.trim();
        if l.len() < 10 { continue; }
        if !l.chars().next().map(|c| c.is_ascii_uppercase()).unwrap_or(false) { continue; }
        if !days.iter().any(|d| l.contains(d)) { continue; }
        if !(l.contains(":") && l.contains("-")) { continue; }
        out.push(l.to_string());
        if out.len() >= max_n { break; }
    }
    out
}

fn get_prompt(content: &str) -> String {
    let header = r#"You are a strict JSON generator.
Return ONLY JSON, no commentary, no markdown.
Segment input by headers: FACULTY/SCHOOL and DEPARTMENT; parse courses under each.
Courses appear as CODE DAY TIME HALL LECTURERS.
Rules:
- Split multiple rooms like G119-G123 into ["G119","G120","G121","G122","G123"].
- Preserve rooms like AMPHI 150 exactly.
- Parse group suffix like CHM201-G1 as group: "G1".
- Long durations such as 07:00-19:00 imply purpose: "Lab".
- Teachers list keeps commas and initials, e.g., "Tabo, D".
- Use 24h hr/min and compute duration in minutes.
Schema:
{
  "ver": "2025-01-10T08:00:00Z",
  "type": "lecture",
  "faculty": "Faculty of Science",
  "department": "Computer Science",
  "level": "200",
  "teachers": [
    { "abbreviation": "TD", "name": "Tabo, Daniel" },
    { "abbreviation": "SJ", "name": "Smith, John" }
  ],
  "courses": [
    { "code": "CSC209", "title": "Data Structures", "type": "major" },
    { "code": "MTH201", "title": "Linear Algebra", "type": "major" }
  ],
  "rooms": [
    { "code": "G112", "description": "" },
    { "code": "G113", "description": "" }
  ],
  "days": [
    {
      "day": 0,
      "columns": [
        {
          "start_time": { "hr": 7, "min": 0 },
          "end_time":   { "hr": 9, "min": 0 },
          "duration_min": 120,
          "entries": [
            {
              "purpose": "T",
              "course_code": "CSC209",
              "course_title": "Data Structures",
              "batches": ["F1"],
              "teachers": ["Tabo, D."],
              "room": "G112",
              "weeks": "ALL"
            }
          ]
        },
        {
          "start_time": { "hr": 9, "min": 0 },
          "end_time":   { "hr": 10, "min": 0 },
          "duration_min": 60,
          "entries": [
            {
              "purpose": "T",
              "course_code": "MTH201",
              "course_title": "Linear Algebra",
              "batches": ["F2"],
              "teachers": ["Smith, J."],
              "room": "G113",
              "weeks": "ALL"
            }
          ]
        }
      ]
    }
  ]
}

Example mappings:
1) CSC209 MON 07:00-09:00 G112-G113 Tabo, D.
   {"slot_purpose":"T","batch":["F1"],"course":"CSC209","room":"G112-G113","teacher":["Tabo, D."]}
2) G119-G123 → rooms: ["G119","G120","G121","G122","G123"]
3) AMPHI 150 → room: "AMPHI 150"
4) CHM201-G1 WED 10:00-12:00 AMPHI 150 Doe, J → group: "G1"
5) CHM450 FRI 07:00-19:00 LAB-X Prof. X → purpose: "Lab", duration: 720
6) MA101 TUE 08:00-10:00 G201 Dr. Y → course: "MA101"
"#;
    format!("{}\nContent:\n{}", header, content)
}

pub async fn ai_parse(content: &str) -> Result<(TimeTableinfo, String), String> {
    dotenv().ok();
    let api_key = env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not set".to_string())?;
    let model = env::var("GEMINI_MODEL").map_err(|_| "GEMINI_MODEL not set".to_string())?;
    let mut client = Client::new(&api_key,&model);
    let prompt = get_prompt(&content);
    for _ in 0..3 {
        let ai_res = client.chat(&*prompt).await.map_err(|_| "AI request failed".to_string())?;
        if let Ok(parsed) = ai_res_decoder::<TimeTableinfo>(&ai_res) {
            return Ok((parsed, ai_res));
        }
        if let Some(json_str) = extract_json(&ai_res) {
            if let Ok(parsed) = ai_res_decoder::<TimeTableinfo>(&json_str) {
                return Ok((parsed, json_str));
            }
        }
    }
    Err("Failed to parse AI JSON".to_string())
}

#[allow(dead_code)]
pub fn llm_schema_prompt(content: &str) -> String {
    let examples = pick_examples(content, 6);
    let mut examples_block = String::new();
    for e in examples.iter() { examples_block.push_str("\n- "); examples_block.push_str(e); }
    format!(r#"System: You are a JSON-only parser. Output MUST be valid JSON matching the schema.
Segmentation: Use FACULTY/SCHOOL and DEPARTMENT headers to scope parsing.
Multiple rooms like G119-G123 become ["G119","G120","G121","G122","G123"].
AMPHI 150 stays as exact room.
Group codes like CHM201-G1 capture group "G1".
Long ranges like 07:00-19:00 → purpose "Lab".
Schema (exact keys):
{{
  "ver": "2025-01-10T08:00:00Z",
  "type": "lecture",
  "faculty": "Faculty of Science",
  "department": "Computer Science",
  "level": "200",
  "teachers": [
    {{ "abbreviation": "TD", "name": "Tabo, Daniel" }},
    {{ "abbreviation": "SJ", "name": "Smith, John" }}
  ],
  "courses": [
    {{ "code": "CSC209", "title": "Data Structures", "type": "major" }},
    {{ "code": "MTH201", "title": "Linear Algebra", "type": "major" }}
  ],
  "rooms": [
    {{ "code": "G112", "description": "" }},
    {{ "code": "G113", "description": "" }}
  ],
  "days": [
    {{
      "day": 0,
      "columns": [
        {{
          "start_time": {{ "hr": 7, "min": 0 }},
          "end_time":   {{ "hr": 9, "min": 0 }},
          "duration_min": 120,
          "entries": [
            {{
              "purpose": "T",
              "course_code": "CSC209",
              "course_title": "Data Structures",
              "batches": ["F1"],
              "teachers": ["Tabo, D."],
              "room": "G112",
              "weeks": "ALL"
            }}
          ]
        }},
        {{
          "start_time": {{ "hr": 9, "min": 0 }},
          "end_time":   {{ "hr": 10, "min": 0 }},
          "duration_min": 60,
          "entries": [
            {{
              "purpose": "T",
              "course_code": "MTH201",
              "course_title": "Linear Algebra",
              "batches": ["F2"],
              "teachers": ["Smith, J."],
              "room": "G113",
              "weeks": "ALL"
            }}
          ]
        }}
      ]
    }}
  ]
}}
Examples from content:{ex}
Rules:
- Return ONLY JSON. No commentary.
- If multiple rooms like G112-G113 or G119-G123, split into individual room codes.
- If ambiguous fields, set to null and include raw_text.
"#, ex=examples_block)
}

#[allow(dead_code)]
pub async fn ai_parse_full(content: &str) -> Result<(LLMTimeTableRes, String), String> {
    dotenv().ok();
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not set".to_string())?;
    let model = std::env::var("GEMINI_MODEL").map_err(|_| "GEMINI_MODEL not set".to_string())?;
    let mut client = Client::new(&api_key,&model);
    let prompt = llm_schema_prompt(content);
    for _ in 0..3 {
        let ai_res = client.chat(&prompt).await.map_err(|_| "AI request failed".to_string())?;
        if let Ok(parsed) = ai_res_decoder::<LLMTimeTableRes>(&ai_res) {
            return Ok((parsed, ai_res));
        }
        if let Some(json_str) = extract_json(&ai_res) {
            if let Ok(parsed) = ai_res_decoder::<LLMTimeTableRes>(&json_str) {
                return Ok((parsed, json_str));
            }
        }
    }
    Err("Failed to parse AI JSON".to_string())
}

