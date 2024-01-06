use std::sync::Arc;

use aide::transform::TransformOpenApi;
use aide::{
    axum::{routing::get, ApiRouter, IntoApiResponse},
    openapi::OpenApi,
    redoc::Redoc,
};
use axum::response::Redirect;
use axum::{response::IntoResponse, Extension, Json};

pub(crate) fn create_docs_router() -> ApiRouter {
    ApiRouter::new()
        .route(
            "/",
            get(Redoc::new("/docs/api.json")
                .with_title("Timetable API")
                .axum_handler()),
        )
        .route("/api.json", get(serve_docs))
}

async fn serve_docs(Extension(api): Extension<Arc<OpenApi>>) -> impl IntoApiResponse {
    Json(api).into_response()
}

pub(crate) fn transform_api_docs(api: TransformOpenApi) -> TransformOpenApi {
    api.title("Timetable API")
}

pub(crate) async fn redirect_to_docs() -> impl IntoResponse {
    Redirect::temporary("/docs/")
}
