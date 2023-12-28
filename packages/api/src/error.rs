use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

type Result<T> = std::result::Result<T, ApiError>;

#[derive(Clone)]
pub(crate) enum ApiError {
    DbError,
    UnknownVoivodeship,
    EntityNotFound,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::DbError => (StatusCode::INTERNAL_SERVER_ERROR, "Unexpected database error"),
            ApiError::UnknownVoivodeship => (StatusCode::BAD_REQUEST, "Invalid voivodeship TERYT code"),
            ApiError::EntityNotFound => (StatusCode::NOT_FOUND, "Entity not found"),
        }.into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(_: sqlx::Error) -> Self {
        ApiError::DbError
    }
}
