// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

/// Reads the databasePath from mira.config.json in the OS app config directory.
/// Returns None if the file doesn't exist, can't be read, or has no databasePath.
fn read_custom_db_path() -> Option<String> {
    let config_dir = dirs::config_dir()?;
    let config_path = config_dir.join("com.mira.app").join("mira.config.json");

    let content = std::fs::read_to_string(&config_path).ok()?;
    let parsed: serde_json::Value = serde_json::from_str(&content).ok()?;
    let db_path = parsed.get("databasePath")?.as_str()?.trim().to_string();

    if db_path.is_empty() {
        None
    } else {
        Some(db_path)
    }
}

fn main() {
    let v1_schema = include_str!("migrations/v1_create_tables.sql");
    let mut sql_builder = SqlBuilder::default();

    // Register migrations for custom DB path from config file (if set)
    if let Some(custom_path) = read_custom_db_path() {
        let db_url = format!("sqlite:{}", custom_path);
        sql_builder = sql_builder.add_migrations(
            &db_url,
            vec![Migration {
                version: 1,
                description: "create core MIRA tables",
                sql: v1_schema,
                kind: MigrationKind::Up,
            }],
        );
    }

    // Always register default as fallback
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
