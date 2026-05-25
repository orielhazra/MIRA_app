# 🛠️ Step-by-Step Tauri & SQLite Backend Migration Guideline

This document outlines a structured, step-by-step roadmap to migrate M.I.R.A.'s persistence layer from **LocalStorage** to a robust, local **SQLite Database** managed inside a native **Tauri Desktop wrapper**.

Use this checklist to track your implementation progress.

---

## 📅 Roadmap Overview

| Phase | Core Objective | Estimated Effort | Status |
| :---: | :--- | :---: | :---: |
| **Phase 1** | Desktop Environment & Tauri Init | Low | ⬜ Not Started |
| **Phase 2** | SQLite Database Schema Design | Low-Medium | ⬜ Not Started |
| **Phase 3** | Rust Backend Config & SQL Plugin | Medium | ⬜ Not Started |
| **Phase 4** | JavaScript Repository Layer Migration (`repository.js`) | Medium-High | ⬜ Not Started |
| **Phase 5** | LocalStorage Legacy Data Migration | Medium | ⬜ Not Started |
| **Phase 6** | System Validation, Testing, & Final Desktop Build | Medium | ⬜ Not Started |

---

## 📝 Phase-by-Phase Checklist

### ⬜ Phase 1: Desktop Environment & Tauri Init
In this phase, you wrap the current Vite web app with Tauri's Rust-based desktop harness.

- [ ] **1.1 Install system prerequisites**
  - Install Rust toolchain (via `rustup`).
  - Install OS-specific C compilers and development libraries (e.g., Build Essential on Linux, Xcode on macOS, Build Tools on Windows).
- [ ] **1.2 Install Tauri CLI and API dependencies**
  - Run: `npm install @tauri-apps/cli @tauri-apps/api`
- [ ] **1.3 Initialize Tauri desktop harness**
  - Run: `npx tauri init`
  - *Configuration answers when prompted:*
    - **What is your app name?** `mira`
    - **What is the window title?** `M.I.R.A. Roleplay Assistant`
    - **Where are your web assets located?** `../dist` (points to Vite build folder)
    - **What is the dev server URL?** `http://localhost:5173` (Vite dev server)
    - **What is your frontend build command?** `npm run build`
    - **What is your frontend dev command?** `npm run dev`
- [ ] **1.4 Test native development loop**
  - Run: `npx tauri dev`
  - Verify that a native OS window mounts and renders the app landing page perfectly.

---

### ⬜ Phase 2: SQLite Database Schema Design
Establish a clean SQL schema that represents all five existing entity structures currently mapped to JSON.

- [ ] **2.1 Define `worlds` table**
  ```sql
  CREATE TABLE IF NOT EXISTS worlds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    overview TEXT,
    description TEXT,
    rules TEXT,
    locations TEXT,  -- JSON serialized string
    createdAt INTEGER
  );
  ```
- [ ] **2.2 Define `characters` table**
  ```sql
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    shortDescription TEXT,
    race TEXT,
    role TEXT,
    aliases TEXT,           -- JSON serialized list
    promptKeywords TEXT,    -- JSON serialized list
    profileSummary TEXT,
    defaultOutfit TEXT,
    description TEXT,
    personality TEXT,
    appearance TEXT,
    backstory TEXT,
    speakingStyle TEXT,
    relationshipToUser TEXT,
    goals TEXT,
    characterRules TEXT,
    promptPinned INTEGER DEFAULT 0,
    lorebook TEXT,          -- JSON serialized lorebook entries
    createdAt INTEGER
  );
  ```
- [ ] **2.3 Define `stories` table**
  ```sql
  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    worldId TEXT,
    characterIds TEXT,      -- JSON serialized array of active cast IDs
    mainCharacterId TEXT,
    scenario TEXT,
    greeting TEXT,
    storyLorebook TEXT,     -- JSON serialized lorebook
    temporaryLorebook TEXT, -- JSON serialized lorebook
    storyMemory TEXT,       -- JSON serialized StoryJournal structure
    currentContext TEXT,    -- JSON serialized CurrentContext structure
    castState TEXT,         -- JSON serialized CastState structure
    directorNotes TEXT,     -- JSON serialized DirectorNotes structure
    createdAt INTEGER,
    FOREIGN KEY(worldId) REFERENCES worlds(id)
  );
  ```
- [ ] **2.4 Define `chats` table**
  ```sql
  CREATE TABLE IF NOT EXISTS chats (
    storyId TEXT PRIMARY KEY,
    messages TEXT NOT NULL, -- JSON serialized ChatMessage array
    FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE
  );
  ```
- [ ] **2.5 Define `lore_memory` table**
  ```sql
  CREATE TABLE IF NOT EXISTS lore_memory (
    storyId TEXT PRIMARY KEY,
    activeLore TEXT NOT NULL, -- JSON serialized active match history
    FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE
  );
  ```
- [ ] **2.6 Define `settings` table**
  ```sql
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  ```

---

### ⬜ Phase 3: Rust Backend Config & SQL Plugin
Integrate Tauri's high-performance native SQLite driver plugin.

- [ ] **3.1 Install Tauri SQL Plugin**
  - Run: `npm install @tauri-apps/plugin-sql`
- [ ] **3.2 Configure SQL Plugin permissions in Cargo**
  - Add the SQL plugin dependency inside `src-tauri/Cargo.toml`.
- [ ] **3.3 Register SQL Plugin in Rust startup**
  - Open `src-tauri/src/main.rs` (or `lib.rs`) and register the SQL plugin handler:
    ```rust
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    ```
- [ ] **3.4 Configure automated SQLite tables setup**
  - Define migration files or execute a batch command during Tauri initialization to run the `CREATE TABLE` scripts if they do not exist.

---

### ⬜ Phase 4: JavaScript Repository Layer Migration
Rewrite M.I.R.A.'s persistence layer to connect to the SQLite DB, leaving frontend React state logic entirely untouched.

- [ ] **4.1 Load Database Connection**
  - Open `src/services/repository.js` and import the Tauri SQLite API:
    ```javascript
    import Database from "@tauri-apps/plugin-sql";
    const db = await Database.load("sqlite:mira_roleplay.db");
    ```
- [ ] **4.2 Rewrite `repository.worlds`**
  - [ ] Implement `list()`: `SELECT * FROM worlds` (parse serialized JSON for locations).
  - [ ] Implement `saveAll(worlds)`: Bulk transaction executing Upsert statements for each item.
- [ ] **4.3 Rewrite `repository.characters`**
  - [ ] Implement `list()`: `SELECT * FROM characters` (parse arrays and sub-lorebook JSON).
  - [ ] Implement `saveAll(characters)`: Upsert transaction.
- [ ] **4.4 Rewrite `repository.stories`**
  - [ ] Implement `list()`: `SELECT * FROM stories` (parse context, journal, memory, cast JSON).
  - [ ] Implement `saveAll(stories)`: Upsert transaction.
- [ ] **4.5 Rewrite `repository.chats`**
  - [ ] Implement `load(storyId)`: `SELECT messages FROM chats WHERE storyId = ?`
  - [ ] Implement `save(storyId, messages)`: Upsert transaction.
- [ ] **4.6 Rewrite `repository.loreMemory`**
  - [ ] Implement `load(storyId)`: `SELECT activeLore FROM lore_memory WHERE storyId = ?`
  - [ ] Implement `save(storyId, loreMemory)`: Upsert transaction.
- [ ] **4.7 Rewrite `repository.settings`**
  - [ ] Implement `getKoboldBaseUrl(fallback)`: `SELECT value FROM settings WHERE key = 'kobold_base_url'`
  - [ ] Implement `setKoboldBaseUrl(value)`: Upsert setting.

---

### ⬜ Phase 5: LocalStorage Legacy Data Migration
Ensure users upgrading from the web browser LocalStorage build do not lose their current characters, worlds, or story histories.

- [ ] **5.1 Create migration trigger**
  - Write an initialization routine inside the SQL database layer to check if legacy keys are present in LocalStorage.
- [ ] **5.2 Copy data to SQLite**
  - If legacy browser data is present:
    1. Loop through LocalStorage stories, worlds, and characters.
    2. Write them as initial SQL inserts into the database.
- [ ] **5.3 Deprecate LocalStorage keys**
  - Run a cleanup command (`localStorage.clear()`) after successful migration to prevent redundant runs.

---

### ⬜ Phase 6: System Validation, Testing, & Final Desktop Build
Perform validation checks to guarantee the app compiles cleanly, executes fast queries, and builds static executables.

- [ ] **6.1 Perform integration dry run**
  - Run: `npx tauri dev`
  - Verify creating, editing, and deleting stories, cast members, and settings.
- [ ] **6.2 Verify "Extract Updates" loop**
  - Trigger updates extraction and apply suggestions. Check database serialization integrity.
- [ ] **6.3 Run Production Bundle Build**
  - Run: `npx tauri build`
  - This compiles Rust source code, bundle static web assets, and generates final installers:
    - **Windows:** `.msi` and `.exe` installer.
    - **macOS:** `.dmg` and `.app` bundle.
    - **Linux:** `.deb` and `.AppImage` packages.
