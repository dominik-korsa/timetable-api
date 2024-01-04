use axum::extract::{Path, Query, State};
use axum::Json;
use axum::response::IntoResponse;
use regex_macro::regex;
use serde::Deserialize;
use tokio::try_join;
use crate::db::Db;
use crate::entities::SchoolWithVersions;
use crate::error::ApiError;

#[derive(Deserialize)]
pub(crate) struct VoivodeshipQuery {
    /// Accepted values:
    /// - 2 digit voivodeship TERYT code
    /// - 4 digit county TERYT code
    /// - 6 digit commune without type TERYT code
    /// - 7 digit commune with type TERYT code
    teryt: String,
}

fn validate_teryt(teryt: &str) -> bool {
    regex!(r#"^(?:02|04|06|08|10|12|14|16|18|20|22|24|26|28|30|32)(?:\d{2}(?:\d{2}\d?)?)?$"#).is_match(teryt)
}

pub(crate) async fn list_schools(
    State(db): State<Db>,
    Query(params): Query<VoivodeshipQuery>
) -> impl IntoResponse {
    if !validate_teryt(&params.teryt) {
        return Err(ApiError::InvalidTerytCode);
    }
    let schools = db.get_schools_by_teryt(&params.teryt).await?;
    Ok(Json(schools))
}

#[derive(Deserialize)]
pub(crate) struct SchoolParams {
    rspo_id: i32
}

pub(crate) async fn get_school(
    State(db): State<Db>,
    Path(params): Path<SchoolParams>
) -> impl IntoResponse {
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


#[derive(Deserialize)]
pub(crate) struct OptivumVersionParams {
    rspo_id: i32,
    generated_on: /* NaiveDate */ String,
    discriminant: i16,
}
pub(crate) async fn get_optivum_version_data(
    State(db): State<Db>,
    Path(params): Path<OptivumVersionParams>
) -> impl IntoResponse {
    let timetable_data = db.get_version_data(
        params.rspo_id,
        params.generated_on,
        params.discriminant,
    ).await?;
    let Some(timetable_data) = timetable_data else {
        return Err(ApiError::EntityNotFound)
    };
    Ok(timetable_data)
}