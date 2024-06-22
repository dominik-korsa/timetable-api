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
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Extension;
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use axum::extract::Request;
use axum::http::header::{CACHE_CONTROL, X_CONTENT_TYPE_OPTIONS};
use axum::http::HeaderValue;
use axum::middleware::Next;
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};

async fn handle_fallback() -> impl IntoResponse {
    ApiError::RouteNotFound
}

async fn default_headers_middleware(
    request: Request,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    response
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

    let cors = CorsLayer::new()
        .allow_origin(Any);
    let headers_layer = ServiceBuilder::new()
        .layer(cors)
        .layer(axum::middleware::from_fn(default_headers_middleware));

    let app_router = ApiRouter::new()
        .merge(create_schools_router())
        .route("/", get(redirect_to_docs))
        .nest_api_service("/docs", create_docs_router())
        .fallback(handle_fallback)
        .finish_api_with(&mut api, transform_api_docs)
        .with_state(db)
        .layer(Extension(Arc::new(api)))
        .layer(headers_layer)
        .into_make_service_with_connect_info::<SocketAddr>();

    let addr = "0.0.0.0:3000";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("The API is listening at: http://{addr}/");
    axum::serve(listener, app_router).await.unwrap();
}
