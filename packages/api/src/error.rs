use axum::http::StatusCode;
use axum::Json;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

type Result<T> = std::result::Result<T, ApiError>;

#[derive(Clone)]
pub(crate) enum ApiError {
    DbError,
    InvalidTerytCode,
    EntityNotFound,
    RouteNotFound,
}

impl ApiError {
    fn get_status_code(&self) -> StatusCode {
        match self {
            ApiError::DbError => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::InvalidTerytCode => StatusCode::BAD_REQUEST,
            ApiError::EntityNotFound => StatusCode::NOT_FOUND,
            ApiError::RouteNotFound => StatusCode::NOT_FOUND,
        }
    }

    fn get_message(&self) -> &'static str {
        match self {
            ApiError::DbError => "Unexpected database error",
            ApiError::InvalidTerytCode => "Invalid TERYT code",
            ApiError::EntityNotFound => "Entity not found",
            ApiError::RouteNotFound => "Route not found",
        }
    }
}

#[derive(Serialize)]
struct ApiErrorResponse {
    message: &'static str,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let response = ApiErrorResponse {
            message: self.get_message()
        };
        (self.get_status_code(), Json(response)).into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(_: sqlx::Error) -> Self {
        ApiError::DbError
    }
}
