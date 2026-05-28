# SQLite Schema Change Checklist

> Temporary schema ownership guidance created during Phase A remediation on 2026-05-27.

## Current Rule

Until persistence is fully consolidated, the project currently supports **two runtime database targets**:

- permanent Windows desktop path via `CUSTOM_DB_PATH`
- fallback default Tauri app database: `sqlite:mira.db`

The TypeScript loader uses the custom path on supported Windows runtimes, creates the custom directory if needed, and falls back to `sqlite:mira.db` when custom-path initialization is unavailable or unsupported.

## Current Schema Ownership Model

The project still has **two schema bootstrap layers**:

1. **Rust / Tauri SQL migrations**
   - File: `src-tauri/src/migrations/v1_create_tables.sql`
   - Registered in: `src-tauri/src/main.rs`
2. **TypeScript SQLite bootstrap / compatibility layer**
   - File: `src/services/storage/sqliteEngine.ts`
   - Used to ensure tables exist and patch older local databases during app initialization

## Required Update Checklist for Any New Column/Table

When adding or changing schema, update all of the following in the same change:

### 1. Rust migration schema
- Update `src-tauri/src/migrations/v1_create_tables.sql` if the change applies to fresh databases
- If the schema change is for already-existing databases, add a compatibility path or forward migration strategy

### 2. TypeScript bootstrap schema
- Update the TypeScript schema mirror in `src/services/storage/sqliteSchema.ts`
- Add compatibility repair logic / patches there when older DBs need repair
- Keep `src/services/storage/sqliteEngine.ts` aligned with any changed read/write behavior

### 3. Read path
- Update every `SELECT` mapping that loads the changed field(s)
- Ensure missing/legacy values fall back safely

### 4. Write path
- Update all `INSERT` / `UPDATE` statements for the changed field(s)
- Confirm the data survives a save/load cycle

### 5. Validation pass
Run at minimum:
- app boot
- one save/load cycle
- restart and reload persisted data
- confirm no silent field loss

## Phase A Decision

For now, the project uses this rule:

- **Rust migrations** are registered for the permanent Windows custom DB URL and for the default fallback `sqlite:mira.db`
- **TypeScript bootstrap** remains responsible for repairing legacy or drifted local schemas during initialization

This is not the final architecture. A later hardening phase should consolidate schema ownership further to reduce drift risk.
