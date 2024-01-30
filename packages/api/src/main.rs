#![warn(clippy::pedantic)]
#![allow(clippy::unused_async)]

mod db;
mod entities;
mod error;
mod routes;

use crate::db::Db;
use crate::error::ApiError;
use crate::routes::docs::{create_docs_router, redirect_to_docs, transform_api_docs};
use crate::routes::schools::create_schools_router;
use aide::axum::ApiRouter;
use aide::openapi::OpenApi;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Extension;
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

async fn handle_fallback() -> impl IntoResponse {
    ApiError::RouteNotFound
}

#[tokio::main]
async fn main() {
    if let Err(error) = dotenv() {
        if !error.not_found() {
            panic!("dotenv failed {}", error);
        }
    }

    let db = Db::new(&env::var("DATABASE_URL").expect("DATABASE_URL env variable should be set"))
        .await
        .unwrap();

    aide::gen::extract_schemas(true);
    let mut api = OpenApi::default();

    let app_router = ApiRouter::new()
        .merge(create_schools_router())
        .route("/", get(redirect_to_docs))
        .nest_api_service("/docs", create_docs_router())
        .fallback(handle_fallback)
        .finish_api_with(&mut api, transform_api_docs)
        .with_state(db)
        .layer(Extension(Arc::new(api)))
        .into_make_service_with_connect_info::<SocketAddr>();

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app_router).await.unwrap();
}
