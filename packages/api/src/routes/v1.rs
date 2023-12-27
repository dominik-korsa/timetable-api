use axum::extract::State;
use axum::response::IntoResponse;
use crate::db::get_all_schools;
use crate::state::SharedState;

pub(crate) async fn list_schools(
    State(state): State<SharedState>
) -> impl IntoResponse {
    let schools = get_all_schools(&state.db_pool).await.unwrap(); // TODO: Handle

    axum::Json(schools)
}