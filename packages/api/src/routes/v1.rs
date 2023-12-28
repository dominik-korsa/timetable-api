use axum::extract::{Path, State};
use axum::Json;
use axum::response::IntoResponse;
use phf::{phf_set, Set};
use serde::Deserialize;
use crate::db::{get_school_by_rspo_id, get_schools_by_voivodeship};
use crate::error::ApiError;
use crate::state::SharedState;

const VALID_VOIVODESHIPS: Set<&str> = phf_set!{ "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32" };

#[derive(Deserialize)]
pub(crate) struct VoivodeshipParams {
    voivodeship: String,
}

pub(crate) async fn list_schools_by_voivodeship(
    State(state): State<SharedState>,
    Path(params): Path<VoivodeshipParams>
) -> impl IntoResponse {
    if !VALID_VOIVODESHIPS.contains(&params.voivodeship) {
        return Err(ApiError::UnknownVoivodeship);
    }
    let schools = get_schools_by_voivodeship(&state.db_pool, &params.voivodeship).await?;
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