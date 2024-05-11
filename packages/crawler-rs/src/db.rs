use crate::entities::{SchoolWithWebsite};
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

#[derive(Clone)]
pub(crate) struct Db {
    pool: Pool<Postgres>,
}

impl Db {
    pub(crate) async fn new(url: &str) -> sqlx::Result<Self> {
        let pool = PgPoolOptions::new().max_connections(5).connect(url).await?;
        Ok(Db { pool })
    }

    pub(crate) async fn get_schools_with_website(&self) -> sqlx::Result<Vec<SchoolWithWebsite>> {
        sqlx::query_as!(
            SchoolWithWebsite,
            r#"SELECT
                "rspo_id", "website_url" as "website_url!"
                FROM "schools"
                WHERE website_url IS NOT NULL
                ORDER BY "rspo_id""#,
        )
        .fetch_all(&self.pool)
        .await
    }
}
