mod routes;
mod db;
mod entities;
mod error;

use std::env;
use axum::{routing::get, Router};
use axum::response::IntoResponse;
use dotenvy::dotenv;
use crate::db::Db;
use crate::error::ApiError;
use crate::routes::v1::{get_optivum_version_data, get_school, list_schools};

async fn handle_fallback() -> impl IntoResponse {
    ApiError::RouteNotFound
}

#[tokio::main]
async fn main() {
    dotenv().unwrap();

    let db = Db::new(
        &env::var("DATABASE_URL").expect("DATABASE_URL env variable should be set")
    ).await.unwrap();

    let app = Router::new()
        .route("/v1/schools", get(list_schools))
        .route("/v1/schools/:rspo_id", get(get_school))
        .route("/v1/schools/:rspo_id/optivum-versions/:generated_on/:discriminant", get(get_optivum_version_data))
        .fallback(handle_fallback)
        .with_state(db);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}