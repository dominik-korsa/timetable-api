#![warn(clippy::pedantic)]

mod routes;
mod db;
mod entities;
mod error;

use std::env;
use std::net::SocketAddr;
use axum::Router;
use axum::response::IntoResponse;
use dotenvy::dotenv;
use crate::db::Db;
use crate::error::ApiError;
use crate::routes::schools::create_schools_router;

#[allow(clippy::unused_async)]
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
        .merge(create_schools_router())
        .fallback(handle_fallback)
        .with_state(db)
        .into_make_service_with_connect_info::<SocketAddr>();

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}