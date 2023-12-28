use axum::extract::{Path, Query, State};
use axum::Json;
use axum::response::IntoResponse;
use regex_macro::regex;
use serde::Deserialize;
use crate::db::{get_school_by_rspo_id, get_schools_by_teryt};
use crate::error::ApiError;
use crate::state::SharedState;

#[derive(Deserialize)]
pub(crate) struct VoivodeshipQuery {
    /// Accepted values:
    /// 2 digit voivodeship TERYT code
    /// 4 digit county TERYT code
    /// 6 digit commune without type TERYT code
    /// 7 digit commune with type TERYT code
    teryt: String,
}

fn validate_teryt(teryt: &str) -> bool {
    regex!(r#"^(?:02|04|06|08|10|12|14|16|18|20|22|24|26|28|30|32)(?:\d{2}(?:\d{2}\d?)?)?$"#).is_match(teryt)
}

pub(crate) async fn list_schools(
    State(state): State<SharedState>,
    Query(params): Query<VoivodeshipQuery>
) -> impl IntoResponse {
    if !validate_teryt(&params.teryt) {
        return Err(ApiError::InvalidTerytCode);
    }
    let schools = get_schools_by_teryt(&state.db_pool, &params.teryt).await?;
    Ok(Json(schools))
}

#[derive(Deserialize)]
pub(crate) struct SchoolParams {
    rspo_id: i32
}

pub(crate) async fn get_school(
    State(state): State<SharedState>,
    Path(params): Path<SchoolParams>
) -> impl IntoResponse {
    let Some(school) = get_school_by_rspo_id(&state.db_pool, params.rspo_id).await? else {
        return Err(ApiError::EntityNotFound)
    };
    Ok(Json(school))
}