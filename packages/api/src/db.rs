use std::net::SocketAddr;
use email_address::EmailAddress;
use sqlx::{Pool, Postgres};
use sqlx::postgres::PgPoolOptions;
use sqlx::types::ipnetwork::IpNetwork;
use crate::entities::{OptivumTimetableVersion, School};

#[derive(Clone)]
pub(crate) struct Db {
    pool: Pool<Postgres>,
}

impl Db {
    pub(crate) async fn new(url: &str) -> sqlx::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(url).await?;
        Ok(Db {
            pool,
        })
    }

    pub(crate) async fn get_schools_by_teryt(&self, teryt: &str) -> sqlx::Result<Vec<School>> {
        assert!(!teryt.is_empty(), "TERYT should not be empty");
        sqlx::query_as!(
        School,
        r#"SELECT "name", "rspo_id", "commune_teryt" as "teryt" FROM "schools"
            WHERE commune_teryt LIKE $1
            ORDER BY "commune_teryt", "rspo_id""#,
        format!("{}%", teryt),
    )
            .fetch_all(&self.pool)
            .await
    }

    pub(crate) async fn get_school_by_rspo_id(&self, rspo_id: i32,) -> sqlx::Result<Option<School>> {
        sqlx::query_as!(
            School,
            r#"SELECT "name", "rspo_id", "commune_teryt" as "teryt" FROM "schools"
                WHERE rspo_id = $1"#,
            rspo_id,
        )
            .fetch_optional(&self.pool)
            .await
    }

    pub(crate) async fn get_versions_by_rspo_id(
        &self,
        rspo_id: i32,
    ) -> sqlx::Result<Vec<OptivumTimetableVersion>> {
        sqlx::query_as!(
            OptivumTimetableVersion,
            r#"SELECT "generated_on", "discriminant" FROM "optivum_timetable_versions"
                WHERE school_rspo_id = $1
                ORDER BY generated_on, discriminant"#,
            rspo_id,
        )
            .fetch_all(&self.pool)
            .await
    }

    pub(crate) async fn get_version_data(
        &self,
        rspo_id: i32,
        generated_on: /* NaiveDate */ String,
        discriminant: i16,
    ) -> sqlx::Result<Option<String>> {
        let timetable_data = sqlx::query!(
            r#"SELECT "timetable_data" FROM "optivum_timetable_versions"
                WHERE school_rspo_id = $1 AND generated_on = $2 AND discriminant = $3"#,
            rspo_id,
            generated_on,
            discriminant,
        )
            .fetch_optional(&self.pool)
            .await?
            .map(|result| result.timetable_data);
        Ok(timetable_data)
    }

    pub(crate) async fn submit_url(
        &self,
        rspo_id: i32,
        url: String,
        email_address: Option<EmailAddress>,
        ip_addr: SocketAddr,
    ) -> sqlx::Result<()> {
        sqlx::query!(
            r#"INSERT INTO "url_form" (rspo_id, url, email_address, ip_address) VALUES ($1, $2, $3, $4)"#,
            rspo_id,
            url,
            email_address.map(|email| email.to_string()),
            IpNetwork::from(ip_addr.ip()),
        )
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
