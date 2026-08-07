use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(DeriveEntityModel, Serialize, Deserialize, Debug, Clone)]
#[sea_orm(table_name = "model_settings")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub model_id: String,
    pub settings: String,
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
