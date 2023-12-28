use sqlx::{Pool, Postgres};
use crate::entities::School;

pub(crate) async fn get_schools_by_voivodeship(pool: &Pool<Postgres>, voivodeship_teryt: &str) -> sqlx::Result<Vec<School>> {
    sqlx::query_as!(
        School,
        r#"SELECT "name", "rspo_id" FROM "schools" WHERE voivodeship_teryt = $1 ORDER BY "commune_teryt", "rspo_id""#,
        voivodeship_teryt
    )
        .fetch_all(pool)
        .await
}

pub(crate) async fn get_school_by_rspo_id(pool: &Pool<Postgres>, rspo_id: i32) -> sqlx::Result<Option<School>> {
    sqlx::query_as!(
        School,
        r#"SELECT "name", "rspo_id" FROM "schools" WHERE rspo_id = $1"#,
        rspo_id,
    )
        .fetch_optional(pool)
        .await
}