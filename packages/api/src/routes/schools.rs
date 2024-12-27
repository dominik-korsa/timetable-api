use crate::db::Db;
use crate::entities::{SchoolListResponse, SchoolWithVersions};
use crate::error::ApiError;
use aide::axum::routing::{get, post};
use aide::axum::{ApiRouter, IntoApiResponse};
use axum::extract::{ConnectInfo, Path, Query, State};
use axum::http::StatusCode;
use axum_jsonschema::Json;
use email_address::EmailAddress;
use regex_macro::regex;
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::value::RawValue;
use std::net::SocketAddr;
use tokio::try_join;

pub(crate) fn create_schools_router() -> ApiRouter<Db> {
    ApiRouter::new()
        .api_route("/v1/schools", get(list_schools))
        .api_route("/v1/tiles/0.5/:tile_lat/:tile_long/schools", get(list_tiles_0_5))
        .api_route("/v1/tiles/0.5/info", get(get_tiles_0_5_info))
        .api_route("/v1/schools/:rspo_id", get(get_school))
        .api_route(
            "/v1/optivum-versions/:id",
            get(get_optivum_version_data),
        )
        .api_route("/v1/schools/:rspo_id/submit-url", post(submit_url))
}

#[derive(Deserialize, JsonSchema)]
struct VoivodeshipQuery {
    /// TERYT code of the school location:
    /// voivodeship (2 digits) / county (4 digits) / commune with optional type (6-7 digits)
    teryt: String,
}

fn validate_teryt(teryt: &str) -> bool {
    regex!(r#"^(?:02|04|06|08|10|12|14|16|18|20|22|24|26|28|30|32)(?:\d{2}(?:\d{2}\d?)?)?$"#)
        .is_match(teryt)
}

async fn list_schools(
    State(db): State<Db>,
    Query(params): Query<VoivodeshipQuery>,
) -> impl IntoApiResponse {
    if !validate_teryt(&params.teryt) {
        return Err(ApiError::InvalidTerytCode);
    }
    let schools = db.get_schools_by_teryt(&params.teryt).await?;
    Ok(Json(SchoolListResponse {
        schools
    }))
}

#[derive(Deserialize, JsonSchema)]
struct TilesParams {
    /// Filters schools where `FLOOR(school.geo_lat / 0.5) == tile_lat`
    tile_lat: i16,
    /// Filters schools where `FLOOR(school.geo_long / 0.5) == tile_long`
    tile_long: i16,
}

/// List schools in a particular 0.5°x0.5 map tile.
async fn list_tiles_0_5(
    State(db): State<Db>,
    Path(params): Path<TilesParams>,
) -> impl IntoApiResponse {
    let schools = db.get_tiles_0_5(params.tile_lat, params.tile_long).await?;
    Ok::<_, ApiError>(Json(SchoolListResponse {
        schools
    }))
}

async fn get_tiles_0_5_info(
    State(db): State<Db>,
) -> impl IntoApiResponse {
    let info = db.get_tiles_0_5_info().await?;
    Ok::<_, ApiError>(Json(info))
}

#[derive(Deserialize, JsonSchema)]
struct SchoolParams {
    rspo_id: i32,
}

async fn get_school(
    State(db): State<Db>,
    Path(params): Path<SchoolParams>,
) -> impl IntoApiResponse {
    let (school, versions) = try_join!(
        db.get_school_by_rspo_id(params.rspo_id),
        db.get_versions_by_rspo_id(params.rspo_id),
    )?;
    let Some(school) = school else {
        return Err(ApiError::EntityNotFound)
    };
    Ok(Json(SchoolWithVersions {
        school,
        optivum_versions: versions,
    }))
}

#[derive(Deserialize, JsonSchema)]
struct OptivumVersionParams {
    id: i32,
}
async fn get_optivum_version_data(
    State(db): State<Db>,
    Path(params): Path<OptivumVersionParams>,
) -> impl IntoApiResponse {
    let timetable_data = db
        .get_version_data(params.id)
        .await?;
    let Some(timetable_data) = timetable_data else {
        return Err(ApiError::EntityNotFound)
    };
    let Ok(timetable_data) = RawValue::from_string(timetable_data) else {
        return Err(ApiError::Internal)
    };
    Ok(Json(timetable_data))
}

#[derive(Deserialize, JsonSchema)]
struct SubmitUrlBody {
    url: String,
    email_address: Option<String>,
}

async fn submit_url(
    State(db): State<Db>,
    Path(params): Path<SchoolParams>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(body): Json<SubmitUrlBody>,
) -> impl IntoApiResponse {
    if let Some(email_address) = &body.email_address {
        if !EmailAddress::is_valid(email_address) {
            return Err(ApiError::InvalidEmailAddress);
        }
    }
    db.submit_url(params.rspo_id, body.url, body.email_address, addr)
        .await?;
    Ok(StatusCode::CREATED)
}
