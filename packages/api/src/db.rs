use sqlx::{Pool, Postgres};
use crate::entities::School;

pub(crate) async fn get_all_schools(pool: &Pool<Postgres>) -> sqlx::Result<Vec<School>> {
    sqlx::query_as!(School, r#"SELECT "name", "rspo_id" FROM "schools""#)
        .fetch_all(pool)
        .await
}