use chrono::NaiveDate;
use sqlx::{Pool, Postgres};
use crate::entities::{OptivumTimetableVersion, School};

pub(crate) async fn get_schools_by_teryt(pool: &Pool<Postgres>, teryt: &str) -> sqlx::Result<Vec<School>> {
    assert!(!teryt.is_empty(), "TERYT should not be empty");
    sqlx::query_as!(
        School,
        r#"SELECT "name", "rspo_id", "commune_teryt" as "teryt" FROM "schools"
            WHERE commune_teryt LIKE $1
            ORDER BY "commune_teryt", "rspo_id""#,
        format!("{}%", teryt),
    )
        .fetch_all(pool)
        .await
}

pub(crate) async fn get_school_by_rspo_id(pool: &Pool<Postgres>, rspo_id: i32) -> sqlx::Result<Option<School>> {
    sqlx::query_as!(
        School,
        r#"SELECT "name", "rspo_id", "commune_teryt" as "teryt" FROM "schools"
            WHERE rspo_id = $1"#,
        rspo_id,
    )
        .fetch_optional(pool)
        .await
}

pub(crate) async fn get_versions_by_rspo_id(pool: &Pool<Postgres>, rspo_id: i32) -> sqlx::Result<Vec<OptivumTimetableVersion>> {
    sqlx::query_as!(
        OptivumTimetableVersion,
        r#"SELECT "original_url", "generated_on", "discriminant", "found_on" FROM "optivum_timetable_versions"
            WHERE school_rspo_id = $1
            ORDER BY generated_on, discriminant"#,
        rspo_id,
    )
        .fetch_all(pool)
        .await
}

pub(crate) async fn get_version_data(
    pool: &Pool<Postgres>,
    rspo_id: i32,
    generated_on: NaiveDate,
    discriminant: i16,
) -> sqlx::Result<Option<String>> {
    let timetable_data = sqlx::query!(
        r#"SELECT "timetable_data" FROM "optivum_timetable_versions"
            WHERE school_rspo_id = $1 AND generated_on = $2 AND discriminant = $3"#,
        rspo_id,
        generated_on,
        discriminant,
    )
        .fetch_optional(pool)
        .await?
        .map(|result| result.timetable_data);
    Ok(timetable_data)
}