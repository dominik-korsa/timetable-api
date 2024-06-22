use crate::entities::{OptivumTimetableVersion, School};
use crate::error;
use crate::error::ApiError;
use sqlx::postgres::PgPoolOptions;
use sqlx::types::ipnetwork::IpNetwork;
use sqlx::{Error, Pool, Postgres};
use std::net::SocketAddr;

#[derive(Clone)]
pub(crate) struct Db {
    pool: Pool<Postgres>,
}

impl Db {
    pub(crate) async fn new(url: &str) -> sqlx::Result<Self> {
        let pool = PgPoolOptions::new().max_connections(5).connect(url).await?;
        Ok(Db { pool })
    }

    pub(crate) async fn get_schools_by_teryt(&self, teryt: &str) -> sqlx::Result<Vec<School>> {
        sqlx::query_as!(
            School,
            r#"SELECT
                "name", "rspo_id", "commune_teryt" as "teryt", "geo_lat", "geo_long", "parent_rspo_id", "website_url",
                "corresp_addr_street" as "address_street",
                "corresp_addr_building_nr" as "address_building_number",
                "corresp_addr_apartament_nr" as "address_apartament_number",
                "corresp_addr_zip_code" as "address_zip_code",
                "corresp_addr_town" as "address_town"
                FROM "schools"
                WHERE commune_teryt LIKE $1
                ORDER BY "commune_teryt", "rspo_id""#,
            format!("{}%", teryt),
        )
        .fetch_all(&self.pool)
        .await
    }

    pub(crate) async fn get_school_by_rspo_id(&self, rspo_id: i32) -> sqlx::Result<Option<School>> {
        sqlx::query_as!(
            School,
            r#"SELECT
                "name", "rspo_id", "commune_teryt" as "teryt", "geo_lat", "geo_long", "parent_rspo_id", "website_url",
                "corresp_addr_street" as "address_street",
                "corresp_addr_building_nr" as "address_building_number",
                "corresp_addr_apartament_nr" as "address_apartament_number",
                "corresp_addr_zip_code" as "address_zip_code",
                "corresp_addr_town" as "address_town"
                FROM "schools"
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
        // generated_on: NaiveDate,
        generated_on: String,
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
        .and_then(|result| result.timetable_data);
        Ok(timetable_data)
    }

    pub(crate) async fn submit_url(
        &self,
        rspo_id: i32,
        url: String,
        email_address: Option<String>,
        ip_addr: SocketAddr,
    ) -> error::Result<()> {
        let result = sqlx::query!(
            r#"INSERT INTO "url_form" (rspo_id, url, email_address, ip_address) VALUES ($1, $2, $3, $4)"#,
            rspo_id,
            url,
            email_address,
            IpNetwork::from(ip_addr.ip()),
        )
            .execute(&self.pool)
            .await;
        match result {
            Ok(_) => Ok(()),
            Err(Error::Database(error)) if error.is_foreign_key_violation() => {
                Err(ApiError::EntityNotFound)
            }
            Err(error) => Err(ApiError::from(error)),
        }
    }
}
