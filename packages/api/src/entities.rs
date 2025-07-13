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
    pub(crate) website_url: Option<String>,
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct TilesInfo {
    pub(crate) min_lat_tile: i32,
    pub(crate) max_lat_tile: i32,
    pub(crate) min_long_tile: i32,
    pub(crate) max_long_tile: i32,
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct ClusterMarker {
    pub(crate) count: i64,
    pub(crate) geo_lat: f64,
    pub(crate) geo_long: f64,
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
    pub(crate) id: i32,
    pub(crate) generated_on: Option<String>,
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct SchoolListResponse {
    pub(crate) schools: Vec<School>
}

#[derive(Serialize, JsonSchema)]
pub(crate) struct ClusterMarkersResponse {
    pub(crate) markers: Vec<ClusterMarker>
}