mod routes;
mod db;
mod entities;
mod state;
mod error;

use std::env;
use axum::{routing::get, Router};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use crate::routes::v1::list_schools_by_voivodeship;
use crate::state::SharedState;

#[tokio::main]
async fn main() {
    dotenv().unwrap();

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(
            &env::var("DATABASE_URL").expect("DATABASE_URL env variable should be set")
        ).await.unwrap();

    let app = Router::new()
        .route("/v1/voivodeships/:voivodeship/schools", get(list_schools_by_voivodeship))
        .with_state(SharedState { db_pool: pool });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}