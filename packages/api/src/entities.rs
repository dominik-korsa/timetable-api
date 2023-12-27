use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct School {
    pub(crate) rspo_id: i32,
    pub(crate) name: String,
}
