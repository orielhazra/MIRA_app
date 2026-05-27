// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

fn main() {
    let v1_schema = include_str!("migrations/v1_create_tables.sql");
    let mut sql_builder = SqlBuilder::default();

    #[cfg(target_os = "windows")]
    {
        sql_builder = sql_builder.add_migrations(
            "sqlite:G:\Chatbot-Assets\Memory\mira.db",
            vec![Migration {
                version: 1,
                description: "create core MIRA tables",
                sql: v1_schema,
                kind: MigrationKind::Up,
            }],
        );
    }

    sql_builder = sql_builder.add_migrations(
        "sqlite:mira.db",
        vec![Migration {
            version: 1,
            description: "create core MIRA tables",
            sql: v1_schema,
            kind: MigrationKind::Up,
        }],
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(sql_builder.build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
