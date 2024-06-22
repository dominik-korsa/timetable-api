pub(crate) struct SchoolWithWebsite {
    pub(crate) rspo_id: i32,
    pub(crate) website_url: String,
}

pub(crate) struct School {
    pub(crate) rspo_id: i32,
    pub(crate) website_url: Option<String>,
}
impl From<SchoolWithWebsite> for School {
    fn from(value: SchoolWithWebsite) -> Self {
        School {
            rspo_id: value.rspo_id,
            website_url: Some(value.website_url),
        }
    }
}