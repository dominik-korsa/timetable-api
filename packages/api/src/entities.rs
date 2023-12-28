use chrono::NaiveDate;
use serde::Serialize;
use sqlx::types::chrono::{DateTime, Utc};

#[derive(Serialize)]
pub(crate) struct School {
    pub(crate) rspo_id: i32,
    pub(crate) name: String,
    pub(crate) teryt: String,
}

#[derive(Serialize)]
pub(crate) struct SchoolWithVersions {
    #[serde(flatten)]
    pub(crate) school: School,
    pub(crate) optivum_versions: Vec<OptivumTimetableVersion>,
}

#[derive(Serialize)]
pub(crate) struct OptivumTimetableVersion {
    pub(crate) original_url: String,
    pub(crate) generated_on: NaiveDate,
    pub(crate) discriminant: i16,
    pub(crate) found_on: DateTime<Utc>,
}