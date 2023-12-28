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