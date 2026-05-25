// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind, Builder as SqlBuilder};

fn main() {
    // 1. Import our SQL schema from our dedicated .sql file at compile-time!
    let v1_schema = include_str!("migrations/v1_create_tables.sql");

    // 2. Setup the migrations array
    let migrations = vec![
        Migration {
            version: 1,
            description: "create core MIRA tables",
            sql: v1_schema, // <-- Wire the imported schema here
            kind: MigrationKind::Up,
        }
    ];

    // 3. Launch Tauri
    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:mira.db", migrations)
                .build()
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
