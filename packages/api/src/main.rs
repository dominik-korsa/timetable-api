mod routes;
mod db;
mod entities;
mod state;
mod error;

use std::env;
use axum::{routing::get, Router};
use axum::response::IntoResponse;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use crate::error::ApiError;
use crate::routes::v1::{get_school, list_schools};
use crate::state::SharedState;

async fn handle_fallback() -> impl IntoResponse {
    ApiError::RouteNotFound
}

#[tokio::main]
async fn main() {
    dotenv().unwrap();

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(
            &env::var("DATABASE_URL").expect("DATABASE_URL env variable should be set")
        ).await.unwrap();

    let app = Router::new()
        .route("/v1/schools", get(list_schools))
        .route("/v1/schools/:rspo_id", get(get_school))
        .fallback(handle_fallback)
        .with_state(SharedState { db_pool: pool });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}