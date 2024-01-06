use crate::db::Db;
use crate::entities::SchoolWithVersions;
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
use std::net::SocketAddr;
use tokio::try_join;

pub(crate) fn create_schools_router() -> ApiRouter<Db> {
    ApiRouter::new()
        .api_route("/v1/schools", get(list_schools))
        .api_route("/v1/schools/:rspo_id", get(get_school))
        .api_route(
            "/v1/schools/:rspo_id/optivum-versions/:generated_on/:discriminant",
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
    Ok(Json(schools))
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
    rspo_id: i32,
    // generated_on: NaiveDate,
    generated_on: String,
    discriminant: i16,
}
async fn get_optivum_version_data(
    State(db): State<Db>,
    Path(params): Path<OptivumVersionParams>,
) -> impl IntoApiResponse {
    let timetable_data = db
        .get_version_data(params.rspo_id, params.generated_on, params.discriminant)
        .await?;
    let Some(timetable_data) = timetable_data else {
        return Err(ApiError::EntityNotFound)
    };
    Ok(timetable_data)
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
