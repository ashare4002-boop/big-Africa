use axum::Json;
use pdf_extract::extract_text_by_pages;
use crate::parser::ai_parse::ai_parse as parse_ai;
use crate::parser::models::TimeTableinfo;

pub async fn get_timetable(path: &str) -> Result<(Json<TimeTableinfo>, String), String> {
    let content = get_pdf_text(path)?;
    let (timetable, raw) = parse_ai(&content).await?;
    Ok((timetable.to_json(), raw))
}

fn get_pdf_text(path: &str) -> Result<String, String> {
    let pages = extract_text_by_pages(path).map_err(|_| "PDF extraction failed".to_string())?;
    if pages.is_empty() {
        return Err("Empty PDF".to_string());
    }
    let mut all = String::new();
    for p in pages.iter() {
        all.push_str(p);
        all.push_str("\n");
    }
    Ok(all)
}

#[tokio::test]
async fn test_get_timetable() {
    let (a, _raw) = get_timetable("sample/TT.pdf").await.unwrap();
    let teachers_len = a.teachers.as_ref().map(|t| t.len()).unwrap_or(0);
    let subjects_len = a.subjects.as_ref().map(|s| s.len()).unwrap_or(0);
    println!("teachers: {:?} subject {:?}", teachers_len, subjects_len);
}
