use serde::Serialize;

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
    pub(crate) generated_on: /* NaiveDate */ String,
    pub(crate) discriminant: i16,
}
