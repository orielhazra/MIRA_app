# Phase 0 — Task 0.2: Custom Database Path Alternatives

## The Problem

The current implementation hardcodes a developer-specific Windows path in **two places**:

```ts
// src/constants/defaultData.ts:13
export const CUSTOM_DB_PATH = "G:\\Chatbot-Assets\\Memory\\mira.db";
```

```rust
// src-tauri/src/main.rs:14
"sqlite:G:\\Chatbot-Assets\\Memory\\mira.db"
```

This path is used at **two separate layers**:
1. **Rust backend** (`main.rs`) — registers SQL migrations for the custom path at build time
2. **TypeScript frontend** (`sqliteEngine.ts`) — dynamically loads the database from that path at runtime

Both need a solution. There are 4 realistic alternatives:

---

## Option A — Tauri's Default AppData Path (Recommended) ⭐

### How it works
Remove `CUSTOM_DB_PATH` entirely. Use `sqlite:mira.db` as the only database URL. Tauri's `plugin-sql` **already resolves relative SQLite paths to the OS-standard app data directory** automatically:

| OS | Resolved Path |
|----|---------------|
| **Windows** | `C:\Users\<user>\AppData\Roaming\com.mira.app\mira.db` |
| **macOS** | `~/Library/Application Support/com.mira.app/mira.db` |
| **Linux** | `~/.config/com.mira.app/mira.db` |

The identifier `com.mira.app` comes from `tauri.conf.json` → `"identifier"`.

### Changes required

**`src/constants/defaultData.ts`**
```ts
// Remove the hardcoded path entirely
// export const CUSTOM_DB_PATH = "G:\\Chatbot-Assets\\Memory\\mira.db";  ← DELETE
```

**`src-tauri/src/main.rs`**
```rust
fn main() {
    let v1_schema = include_str!("migrations/v1_create_tables.sql");

    // Single database — Tauri resolves "sqlite:mira.db" to the OS app data dir
    let sql_builder = SqlBuilder::default().add_migrations(
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
```

**`src/services/storage/sqliteEngine.ts`**
```ts
// Remove: import { CUSTOM_DB_PATH } from "../../constants/defaultData";
// Remove: shouldUseCustomDbPath() function
// Remove: entire custom path branch in loadTauriDatabase()

const DEFAULT_TAURI_DB_URL = "sqlite:mira.db";

async function loadTauriDatabase(): Promise<any> {
  const SQL = await import("@tauri-apps/plugin-sql");
  return await SQL.default.load(DEFAULT_TAURI_DB_URL);
}
```

**`src/hooks/useAppManager.ts`**
```ts
// Remove CUSTOM_DB_PATH from import
// Change storageTargetLabel:
const storageTargetLabel = isTauri ? "sqlite:mira.db (App Data)" : "Browser localStorage";
```

**`src/components/HeaderSettingsMenu.tsx`**
```tsx
// Remove CUSTOM_DB_PATH from import
// Replace the "Custom Path" row in the settings grid:
<span>Database Location</span><strong>App Data Directory (OS default)</strong>
```

### Pros
- **Zero configuration** — works on every OS out of the box
- **Follows OS conventions** — data stored where the OS expects app data
- **No code to maintain** — Tauri handles path resolution
- **Backed up by OS backup tools** (macOS Time Machine, Windows roaming profiles)
- **Simplest possible change** — just delete the custom path code

### Cons
- User cannot choose where the database lives (most users never need this)
- Harder to share a database across machines (edge case — use export/import for that)

### Effort: ~30 minutes

---

## Option B — User-Configurable Path via Settings UI

### How it works
Let the user pick a custom database path through the existing Settings panel, stored as a setting. The database path is resolved at app startup.

### Changes required

**1. Extend the `settings` interface:**

`src/services/storage/types.ts`
```ts
settings: {
  getKoboldBaseUrl(fallback: string): string;
  setKoboldBaseUrl(value: string): void;
  getCustomDbPath(fallback: string): string;      // NEW
  setCustomDbPath(value: string): void;            // NEW
};
```

**2. Store the path in the `settings` table:**

Both `localStorageEngine.ts` and `sqliteEngine.ts` get new getters/setters:
```ts
getCustomDbPath(fallback: string): string {
  return cache.settings["custom_db_path"] || fallback;
},
setCustomDbPath(value: string): void {
  cache.settings["custom_db_path"] = value;
  enqueueDbWrite("Set custom DB path", async (db) => {
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ('custom_db_path', $1)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
      [value]
    );
  });
}
```

**3. Resolve the path at startup in `loadTauriDatabase()`:**
```ts
async function loadTauriDatabase(): Promise<any> {
  const SQL = await import("@tauri-apps/plugin-sql");

  // First, connect to the default DB to read settings
  const defaultDb = await SQL.default.load(DEFAULT_TAURI_DB_URL);
  await ensureSqliteSchema(defaultDb);
  
  const rows = await defaultDb.select(
    "SELECT value FROM settings WHERE key = 'custom_db_path'"
  );
  const customPath = rows?.[0]?.value?.trim();
  
  if (customPath && shouldUseCustomDbPath(customPath)) {
    try {
      const fsApi = await import("@tauri-apps/plugin-fs");
      const pathApi = await import("@tauri-apps/api/path");
      const dbDir = await pathApi.dirname(customPath);
      if (!(await fsApi.exists(dbDir))) {
        await fsApi.mkdir(dbDir, { recursive: true });
      }
      return await SQL.default.load(`sqlite:${customPath}`);
    } catch (error) {
      console.warn("Custom DB path failed, using default:", error);
    }
  }

  return defaultDb;
}
```

**4. Add a "Database Location" field to `HeaderSettingsMenu.tsx`:**
```tsx
<label className="settings-field">
  <span>Custom Database Path (leave empty for default)</span>
  <input
    type="text"
    value={draftDbPath}
    onChange={(e) => setDraftDbPath(e.target.value)}
    placeholder="e.g., /Users/me/Documents/mira.db"
  />
</label>
<p className="settings-help">
  Changes require app restart. Leave empty to use the default OS location.
</p>
```

**5. Rust backend — register migrations for both default and potential custom paths:**

This is the tricky part. `main.rs` can't read a runtime setting at build/startup time to know the custom path. Solutions:
- **Option B1:** Register migrations only for the default path. The frontend's `ensureSqliteSchema()` already creates tables on any new database — so the Rust migrations are redundant for custom paths.
- **Option B2:** Use a Tauri `setup()` hook to read a config file and register the custom path dynamically.

**B1 is simpler** and already works because `ensureSqliteSchema()` in the frontend handles table creation.

### Pros
- User has full control over where data is stored
- Power users can put the database on a specific drive, NAS, or synced folder
- Graceful fallback to default if the custom path fails

### Cons
- **Chicken-and-egg problem**: need a database to read the setting that tells you which database to use (solved by always bootstrapping from default, then optionally switching)
- Requires app restart after changing the path (or complex hot-switching logic)
- More code to maintain
- Risk of data appearing "lost" if user changes the path and forgets the old one
- Need to handle migration/copy of data when the path changes

### Effort: ~3–4 hours

---

## Option C — Environment Variable

### How it works
Read the database path from an environment variable at runtime. No UI — power users set it via their OS.

### Changes required

**`src/constants/defaultData.ts`**
```ts
// Remove hardcoded path
export const CUSTOM_DB_PATH = "";  // Resolved at runtime from MIRA_DB_PATH env var
```

**`src-tauri/src/main.rs`**
```rust
fn main() {
    let v1_schema = include_str!("migrations/v1_create_tables.sql");
    let mut sql_builder = SqlBuilder::default();
    
    // Check for custom DB path from environment
    if let Ok(custom_path) = std::env::var("MIRA_DB_PATH") {
        if !custom_path.trim().is_empty() {
            let db_url = format!("sqlite:{}", custom_path.trim());
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
    }
    
    // Always register default as fallback
    sql_builder = sql_builder.add_migrations(
        "sqlite:mira.db",
        vec![Migration { version: 1, description: "create core MIRA tables", sql: v1_schema, kind: MigrationKind::Up }],
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(sql_builder.build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**`src/services/storage/sqliteEngine.ts`**
```ts
async function loadTauriDatabase(): Promise<any> {
  const SQL = await import("@tauri-apps/plugin-sql");
  
  // Tauri doesn't expose env vars directly to the webview, so we'd need
  // a custom Rust command to read it and pass it to the frontend:
  // const customPath = await invoke<string>("get_custom_db_path");
  
  // Or simpler: the Rust side already opened the right DB via migrations,
  // so the frontend just connects to whichever DB the backend registered.
  return await SQL.default.load(DEFAULT_TAURI_DB_URL);
}
```

### Pros
- No UI changes needed
- No database chicken-and-egg problem
- Familiar to developers and sysadmins
- Clean separation — configuration is outside the app

### Cons
- **Invisible to regular users** — they'd never know the option exists without reading docs
- Environment variables on Windows require editing System Properties or creating shortcuts
- **Frontend can't easily read env vars** in Tauri's webview — requires a custom Rust command as a bridge
- Two layers (Rust reads env var for migrations, frontend needs it for `SQL.load()`) adds complexity

### Effort: ~2 hours

---

## Option D — External Config File (`mira.config.json`)

### How it works
Read a JSON config file from a known location (next to the app binary or in the OS app config dir) at startup. Both Rust and TypeScript read the same file.

### Changes required

**Config file** (`~/.config/com.mira.app/mira.config.json` or `%APPDATA%/com.mira.app/mira.config.json`):
```json
{
  "databasePath": "/path/to/my/mira.db"
}
```

**`src-tauri/src/main.rs`**
```rust
use std::fs;
use serde::Deserialize;

#[derive(Deserialize, Default)]
struct MiraConfig {
    #[serde(rename = "databasePath")]
    database_path: Option<String>,
}

fn load_config() -> MiraConfig {
    // Try app config dir, then current dir
    let config_paths = vec![
        dirs::config_dir().map(|p| p.join("com.mira.app/mira.config.json")),
        Some(std::path::PathBuf::from("mira.config.json")),
    ];
    
    for path in config_paths.into_iter().flatten() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<MiraConfig>(&content) {
                return config;
            }
        }
    }
    
    MiraConfig::default()
}

fn main() {
    let v1_schema = include_str!("migrations/v1_create_tables.sql");
    let config = load_config();
    let mut sql_builder = SqlBuilder::default();
    
    if let Some(ref custom_path) = config.database_path {
        if !custom_path.trim().is_empty() {
            sql_builder = sql_builder.add_migrations(
                &format!("sqlite:{}", custom_path),
                vec![Migration { version: 1, description: "create core MIRA tables",
                     sql: v1_schema, kind: MigrationKind::Up }],
            );
        }
    }
    
    sql_builder = sql_builder.add_migrations(
        "sqlite:mira.db",
        vec![Migration { version: 1, description: "create core MIRA tables",
             sql: v1_schema, kind: MigrationKind::Up }],
    );
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(sql_builder.build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Frontend**: Add a Rust command to expose the resolved config to the webview:
```rust
#[tauri::command]
fn get_db_config() -> String {
    let config = load_config();
    config.database_path.unwrap_or_default()
}
```

### Pros
- Works at both the Rust and TypeScript layers cleanly
- User-editable without recompiling
- Can include other future settings (port, theme, etc.)
- Config file is easily documented

### Cons
- Users must manually create/edit a JSON file (less discoverable than in-app UI)
- Need `dirs` crate or Tauri path APIs to find the config location
- Both Rust and TypeScript must agree on the config file location and format
- Adds a `serde` dependency for config parsing in Rust (already available though)

### Effort: ~3 hours

---

## Recommendation Matrix

| Criteria | A: AppData Default | B: Settings UI | C: Env Var | D: Config File |
|----------|:-:|:-:|:-:|:-:|
| Effort | ⭐⭐⭐ (lowest) | ⭐ | ⭐⭐ | ⭐⭐ |
| User-friendly | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Works cross-platform | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Power-user flexible | ⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| No chicken-and-egg | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Code simplicity | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐ |

## My Recommendation

**Start with Option A** (Tauri AppData default) for Phase 0 — it's a 30-minute fix that eliminates the critical issue immediately.

Then, **add Option B as a Phase 4 enhancement** if users actually request custom path support. The Settings UI infrastructure already exists, so adding a database path field is straightforward once the blocking `alert()`/`confirm()` refactor creates the pattern for settings that require restart.

Option D (config file) is the better choice if you want to support advanced deployment scenarios (e.g., portable mode, shared network databases) without adding UI complexity.
