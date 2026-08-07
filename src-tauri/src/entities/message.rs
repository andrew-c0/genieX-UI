use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(DeriveEntityModel, Serialize, Deserialize, Debug, Clone)]
#[sea_orm(table_name = "messages")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub model_id: Option<String>,
    pub created_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::chat_session::Entity",
        from = "Column::SessionId",
        to = "super::chat_session::Column::Id"
    )]
    ChatSession,
}

impl Related<super::chat_session::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ChatSession.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
