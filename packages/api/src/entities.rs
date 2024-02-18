use schemars::JsonSchema;
use serde::Serialize;

#[derive(Serialize, JsonSchema)]
pub(crate) struct School {
    pub(crate) rspo_id: i32,
    pub(crate) name: String,
    pub(crate) teryt: String,
    pub(crate) geo_lat: f64,
    pub(crate) geo_long: f64,
    pub(crate) parent_rspo_id: Option<i32>,
    pub(crate) address_street: String,
    pub(crate) address_building_number: String,
    pub(crate) address_apartament_number: String,
    pub(crate) address_zip_code: String,
    pub(crate) address_town: String,
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct SchoolWithVersions {
    #[serde(flatten)]
    pub(crate) school: School,
    pub(crate) optivum_versions: Vec<OptivumTimetableVersion>,
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct OptivumTimetableVersion {
    // pub(crate) generated_on: NaiveDate,
    pub(crate) generated_on: String,
    pub(crate) discriminant: i16,
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct SchoolListResponse {
    pub(crate) schools: Vec<School>
}