// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind, Builder as SqlBuilder};

fn main() {
    // 1. Import our SQL schema from our dedicated .sql file at compile-time!
    let v1_schema = include_str!("migrations/v1_create_tables.sql");

    // 2. Setup the migrations array
    // 3. Launch Tauri
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:G:\\Chatbot Assets\\Memory\\mira.db", vec![
                    Migration {
                        version: 1,
                        description: "create core MIRA tables",
                        sql: v1_schema,
                        kind: MigrationKind::Up,
                    }
                ])
                .add_migrations("sqlite:mira.db", vec![
                    Migration {
                        version: 1,
                        description: "create core MIRA tables",
                        sql: v1_schema,
                        kind: MigrationKind::Up,
                    }
                ])
                .build()
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
