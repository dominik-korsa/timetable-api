use sqlx::{Pool, Postgres};

#[derive(Clone)]
pub(crate) struct SharedState {
    pub(crate) db_pool: Pool<Postgres>,
}