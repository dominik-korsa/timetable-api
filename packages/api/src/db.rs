use sqlx::{Pool, Postgres};
use crate::entities::School;

pub(crate) async fn get_schools_by_teryt(pool: &Pool<Postgres>, teryt: &str) -> sqlx::Result<Vec<School>> {
    assert!(!teryt.is_empty(), "TERYT should not be empty");
    sqlx::query_as!(
        School,
        r#"SELECT "name", "rspo_id" FROM "schools" WHERE commune_teryt LIKE $1 ORDER BY "commune_teryt", "rspo_id""#,
        format!("{}%", teryt),
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