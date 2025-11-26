
use serde::{Deserialize, Serialize};
use crate::models::main_data::{Slot, SlotRes};
use crate::models::meta_data::TimeTableMetaData;
use bcrypt::{hash, verify, DEFAULT_COST, BcryptError};
// Ajout de Context pour une meilleure gestion d'erreurs

// --- Nouvelle définition des Erreurs pour la clarté ---
#[derive(Debug)]
pub enum AppError {
    AuthFailed,
    MissingTimetableData,
    BcryptError(BcryptError),
    EnvironmentError(String),
    ParsingError(String),
}

impl From<BcryptError> for AppError {
    fn from(err: BcryptError) -> Self {
        AppError::BcryptError(err)
    }
}
// --------------------------------------------------------


#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct TimeStamp {
    pub hr: u8,
    pub min: u8,
}
// Ajout d'une implémentation de From pour faciliter la création à partir des minutes totales
impl From<u16> for TimeStamp {
    fn from(total_minutes: u16) -> Self {
        TimeStamp {
            hr: (total_minutes / 60) as u8,
            min: (total_minutes % 60) as u8,
        }
    }
}


#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct Column {
    pub start_time: TimeStamp,
    pub duration: u16,
    pub schedules: Vec<Slot>,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct ColumnRes {
    pub start_time: TimeStamp,
    pub duration: u16,
    pub schedules: Vec<SlotRes>,
}

impl ColumnRes {
    pub fn transform(&self, meta_data: &TimeTableMetaData) -> Column {
        let mut new_slots = Vec::new();
        for i in &self.schedules {
            new_slots.push(i.transform(meta_data));
        }
        Column {
            start_time: self.start_time.clone(),
            duration: self.duration,
            schedules: new_slots,
        }
    }

    /// Helper pour convertir "HH:MM AM/PM" en minutes totales depuis minuit (u16)
    fn parse_time_to_minutes(time_part: &str) -> Option<u16> {
        let trimmed = time_part.trim();
        let (time_str, period) = if trimmed.ends_with("AM") {
            (&trimmed[..trimmed.len() - 2], Some("AM"))
        } else if trimmed.ends_with("PM") {
            (&trimmed[..trimmed.len() - 2], Some("PM"))
        } else {
            (trimmed, None)
        };

        let time_components: Vec<&str> = time_str.split(':').collect();
        if time_components.len() != 2 { return None; }

        let mut hours: u16 = time_components[0].parse().ok()?;
        let minutes: u16 = time_components[1].parse().ok()?;

        match period {
            Some("PM") if hours != 12 => hours += 12,
            Some("AM") if hours == 12 => hours = 0, // 12 AM (minuit) devient heure 0
            _ => (),
        }

        Some(hours * 60 + minutes)
    }

    /// Récupère l'heure de début formatée en TimeStamp (Timestamp)
    fn get_start_time_stamp(time: &str) -> TimeStamp {
        let start_part = time.trim().split(" - ").next().unwrap_or("");
        
        // CORRECTION: Utilise la fonction parse_time_to_minutes et la conversion From<u16>
        match Self::parse_time_to_minutes(start_part) {
            Some(total_minutes) => total_minutes.into(),
            None => TimeStamp { hr: 0, min: 0 },
        }
    }

    /// Calcule la durée en minutes.
    fn get_duration(time: &str) -> u16 {
        let parts: Vec<&str> = time.split(" - ").collect();
        if parts.len() != 2 { return 0; }

        let start_minutes = Self::parse_time_to_minutes(parts[0]).unwrap_or(0);
        let end_minutes = Self::parse_time_to_minutes(parts[1]).unwrap_or(0);

        // Calcule la différence. Si l'heure de fin est avant l'heure de début, on assume un débordement sur la nuit (mais le cas est rare pour un emploi du temps standard).
        if end_minutes >= start_minutes {
            end_minutes - start_minutes
        } else {
            // (24 * 60) - start_minutes + end_minutes // Calcul pour le passage à minuit
            // Dans un emploi du temps, ça devrait être 0 ou une erreur, car les créneaux ne devraient pas traverser minuit.
            0 
        }
    }

    pub fn frm_json(time: &str, slots: &Vec<String>) -> Self {
        let start_time = ColumnRes::get_start_time_stamp(time); // Utilise la fonction TimeStamp correcte
        let duration = ColumnRes::get_duration(time);
        let mut schedules: Vec<SlotRes> = vec![];
        
        // S'appuie sur SlotRes::frm_str qui doit être implémenté dans main_data.rs
        for s in slots {
            let res = SlotRes::frm_str(s); 
            schedules.push(res);
        }
        
        Self {
            start_time,
            duration,
            schedules
        }
    }
}


#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct Day {
    pub day: u8,
    pub cols: Vec<Column>,
}
#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct DayRes {
    pub day: u8,
    pub cols: Vec<ColumnRes>,
}
impl DayRes {
    pub fn transform(&self, meta_data: &TimeTableMetaData) -> Day {
        let mut new_slots = Vec::new();
        for i in &self.cols {
            new_slots.push(i.transform(meta_data));
        }
        Day {
            day: self.day,
            cols: new_slots,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct TimeTable {
    pub ver: String,
    pub days: Vec<Day>,
    pub raw_llm_response: Option<String>,
    pub kind: Option<String>,
    pub active_from: Option<mongodb::bson::DateTime>,
    pub active_until: Option<mongodb::bson::DateTime>,
    pub faculty: Option<String>,
    pub department: Option<String>,
    pub level: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct Notification {
    pub kind: String,
    pub course_code: Option<String>,
    pub user_id: Option<String>,
    pub day: Option<u8>,
    pub start_hr: Option<u8>,
    pub start_min: Option<u8>,
    pub offsets_min: Option<Vec<i32>>, // e.g., [60,30,5]
    pub message: Option<String>,
    pub created_at: Option<mongodb::bson::DateTime>,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct Collection {
    timetables: Vec<TimeTable>,
}
impl Collection {
    pub fn get_timetables(&self) -> Vec<TimeTable> {
        self.timetables.clone()
    }
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct TimeTableRes {
    ver: String,
    days: Vec<DayRes>,
    kind: Option<String>,
    active_from: Option<String>,
    active_until: Option<String>,
    faculty: Option<String>,
    department: Option<String>,
    level: Option<String>,
}
impl TimeTableRes {
    pub fn transform(&self, meta_data: &TimeTableMetaData) -> TimeTable {
        let mut new_days = Vec::new();
        for i in &self.days {
            new_days.push(i.transform(meta_data));
        }
        
        // Gestion de la conversion RFC3339 en BSON DateTime
        let af = self.active_from.as_ref().and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s).ok()
                .map(|dt| mongodb::bson::DateTime::from_millis(dt.timestamp_millis()))
        });
        let au = self.active_until.as_ref().and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s).ok()
                .map(|dt| mongodb::bson::DateTime::from_millis(dt.timestamp_millis()))
        });
        
        TimeTable {
            ver: self.ver.clone(),
            days: new_days,
            raw_llm_response: None,
            kind: self.kind.clone(),
            active_from: af,
            active_until: au,
            faculty: self.faculty.clone(),
            department: self.department.clone(),
            level: self.level.clone(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct MetaData {
    pub version: u16,
    pub data: TimeTableMetaData
}
impl MetaData {
    pub fn merge(&self, new: &TimeTableMetaData) -> MetaData {
        MetaData {
            version: self.version + 1,
            data: self.data.merge(new)
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct Res {
    pub key: String,
    pub timetable: Option<TimeTableRes>,
}

impl Res {
    // CORRECTION: Changement du type de retour pour utiliser AppError
    pub fn transform(&self, meta_data: &TimeTableMetaData) -> Result<TimeTable, AppError> {
        // CORRECTION SÉCURITÉ: L'application doit crasher ou échouer si la clé admin n'est pas configurée
        let stored_hash = std::env::var("ADMIN_KEY_HASH")
            .map_err(|e| AppError::EnvironmentError(
                format!("ADMIN_KEY_HASH not set in environment: {}", e)
            ))?;

        // 1. Vérification de l'authentification
        if verify(&self.key, &stored_hash)? {
            // 2. Transformation des données
            if let Some(timetable) = &self.timetable {
                Ok(timetable.transform(meta_data))
            } else {
                Err(AppError::MissingTimetableData)
            }
        } else {
            // CORRECTION ERREUR: Retourne une erreur d'authentification claire
            Err(AppError::AuthFailed)
        }
    }
}

fn gen_hash(password: &str) -> Result<String, BcryptError> {
    hash(password, DEFAULT_COST)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn get_hash() {
        let a = gen_hash("Pass").unwrap();
        dbg!(&a); // Affichera le hash pour que l'utilisateur puisse le copier dans .env
        assert_ne!(a.len(), 0);
    }
    #[test]
    fn test_verify() {
        // Ce hash correspond à "Pass"
        let stored_hash = "$2b$12$YtQs1d9.s3GX8KP3GoY13OEOmo.Z2lPl/wn0ZHK4KEUkcs6UD57h2".to_string(); 
        let a = verify("Pass", &stored_hash);
        assert!(a.is_ok() && a.unwrap());
    }
}