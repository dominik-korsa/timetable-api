use std::collections::HashMap;
use axum::extract::{Path, State};
use axum::Json;
use axum::response::IntoResponse;
use phf::{phf_set, Set};
use crate::db::{get_school_by_rspo_id, get_schools_by_voivodeship};
use crate::error::ApiError;
use crate::state::SharedState;

const VALID_VOIVODESHIPS: Set<&str> = phf_set!{ "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32" };

pub(crate) async fn list_schools_by_voivodeship(
    State(state): State<SharedState>,
    Path(params): Path<HashMap<String, String>>
) -> impl IntoResponse {
    // TODO: Remove .expect
    let voivodeship_teryt = params.get("voivodeship").expect("Param \"voivodeship\" should be present");
    if !VALID_VOIVODESHIPS.contains(voivodeship_teryt) {
        return Err(ApiError::UnknownVoivodeship);
    }
    let schools = get_schools_by_voivodeship(&state.db_pool, voivodeship_teryt).await?;
    Ok(Json(schools))
}

pub(crate) async fn get_school(
    State(state): State<SharedState>,
    Path(params): Path<HashMap<String, String>>
) -> impl IntoResponse {
    // TODO: Remove .expect and .unwrap
    let rspo_id: i32 = params.get("rspo_id").expect("Param \"rspo_id\" should be present")
        .parse().unwrap();
    let Some(school) = get_school_by_rspo_id(&state.db_pool, rspo_id).await? else {
        return Err(ApiError::EntityNotFound)
    };
    Ok(Json(school))
}