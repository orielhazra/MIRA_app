# SQLite Schema Ownership

> Added during Phase D remediation on 2026-05-27.

## Goal

Reduce schema drift between the Rust migration layer and the TypeScript bootstrap / compatibility layer.

## Current ownership model

### Canonical fresh-database schema
The canonical schema for a brand-new database is still:
- `src-tauri/src/migrations/v1_create_tables.sql`

That file remains the **source of truth for fresh Tauri databases**.

### Canonical TypeScript mirror / compatibility contract
The canonical TypeScript-side schema mirror is now:
- `src/services/storage/sqliteSchema.ts`

That file centralizes:
- expected columns per table
- TypeScript `CREATE TABLE IF NOT EXISTS` statements
- compatibility patches for known drift cases
- shared insert SQL used by `sqliteEngine.ts`

### Runtime bootstrap / persistence engine
- `src/services/storage/sqliteEngine.ts`

This file should now focus on:
- initialization flow
- persistence behavior
- transactions
- queued/debounced writes
- loading/saving rows

It should **not** be the place where table definitions are invented ad hoc.

## Required update path for schema changes

When adding or changing SQLite schema:

1. Update **Rust fresh schema**
   - `src-tauri/src/migrations/v1_create_tables.sql`

2. Update **TypeScript schema mirror**
   - `src/services/storage/sqliteSchema.ts`

3. If older DBs need repair, add a **compatibility patch**
   - `SQLITE_SCHEMA_PATCHES` in `sqliteSchema.ts`

4. Update load/save logic if the field is persisted
   - `src/services/storage/sqliteEngine.ts`

5. Run validation
   - `npm run typecheck`
   - `npm run typecheck:test`
   - `npm run test`
   - `npm run build`
   - plus a real save/load smoke pass when possible

## Current limitation

Rust and TypeScript still duplicate the schema in two different languages.
This remediation step reduces drift risk substantially, but does **not** fully eliminate duplication.
A future improvement could generate one layer from the other or introduce versioned forward migrations beyond the current bootstrap approach.
