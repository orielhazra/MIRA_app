# M.I.R.A. — Architecture Gap Analysis & Issue Report

> **Date:** 2026-05-27  
> **Commit analyzed:** `f150866` (main)  
> **Files analyzed:** 72 source files across `src/`, `src-tauri/`, and `readme/`  
> **Overall status:** 🟠 **Architecturally incomplete — the app will not function as-is**

---

## 🔴 CRITICAL (App is non-functional)

### GAP-1: `useAppManager` is entirely disconnected from hook logic

**File:** `src/hooks/useAppManager.ts`  
**Severity:** 🔴 **Blocks all user-facing functionality**

Every function exposed to `MainLayout` is a **no-op stub**:

```typescript
const sendMessage = () => {};
const cancelGeneration = () => {};
const saveCharacterSheetEdits = () => {};
const extractStateUpdates = () => {};
const startStoryFromCreationSheet = () => {};
// ... ~40 more empty stubs
```

The actual hook modules (`useGeneration`, `useChatActions`, `useStoryActions`, etc.) contain real implementation logic, but `useAppManager` **never instantiates them** and **never wires** their return values to the exported interface. `useAppManager` imports all hook factories but only uses `useMemo` and `useReducer` — it never calls the hook factories.

| Hook with real logic | Instantiated in `useAppManager`? | Wired to `MainLayout`? |
|---|---|---|
| `useGeneration` | ❌ Never called | ❌ All stubs |
| `useChatActions` | ❌ Never called | ❌ All stubs |
| `useStoryActions` | ❌ Never called | ❌ 6 of 14 are stubs |
| `useCharacterActions` | ❌ Never called | ❌ 4 of 7 are stubs |
| `useWorldActions` | ❌ Never called | ✅ 3 wired but never actually called |
| `useLoreActions` | ❌ Never called | ✅ 7 wired but never actually called |
| `useStateUpdates` | ❌ Never called | ❌ All stubs |
| `useImportExport` | ❌ Never called | ❌ 3 of 6 are stubs |

**Result:** The reducers manage state correctly, but the entire action layer is dead code. No message can be sent, no generation can happen, no state updates can be extracted, and no stories can be created or deleted.

---

### GAP-2: Entry point file mismatch — Vite build will fail

**Files:** `index.html` + `src/main.tsx`  
**Severity:** 🔴 **Blocks both `npm run dev` and `npm run build`**

```html
<!-- index.html line 10 -->
<script type="module" src="/src/main.jsx"></script>
```

```bash
$ ls src/main.*
src/main.tsx   # ← file is .tsx, not .jsx
```

Vite will return a **404** for `main.jsx` at runtime. This breaks both development and production builds.

**Fix:** Change line 10 in `index.html` to `src="/src/main.tsx"`.

---

### GAP-3: Missing `worldLorebook` column — SQLite data loss on every save/load cycle

**Files:** `src-tauri/src/migrations/v1_create_tables.sql`, `src/services/storage/sqliteEngine.ts`  
**Severity:** 🔴 **Silent data loss**

The official SQL schema creates `worlds` as:
```sql
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  overview TEXT,
  description TEXT,
  rules TEXT,
  locations TEXT,
  createdAt INTEGER
  -- NO worldLorebook column!
);
```

But `sqliteEngine.ts` **reads a column that does not exist** on initialization:
```typescript
// Line 142 — reads non-existent column, will be undefined on every load
worldLorebook: row.worldLorebook ? JSON.parse(row.worldLorebook) : [],
```

And the INSERT **never saves** `worldLorebook`:
```typescript
// Only inserts: id, name, overview, description, rules, locations, createdAt
// worldLorebook is MISSING
await db.execute(
  `INSERT INTO worlds (id, name, overview, description, rules, locations, createdAt)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`, [...]
);
```

**Result:** World lorebooks are silently dropped on every save/load cycle. Any lore entries added to a world are lost.

**Fix needed in 3 places:**
1. Add `worldLorebook TEXT` column to `v1_create_tables.sql`
2. Add `worldLorebook TEXT` to the inline `CREATE TABLE` in `sqliteEngine.ts`
3. Add `worldLorebook` to the `INSERT INTO worlds` statement in `sqliteEngine.ts`

---

## 🟠 HIGH (Major correctness / design issues)

### GAP-4: `generationReducer` and `loreReducer` are never dispatched — dead reducers

**Files:** `src/reducers/generationReducer.ts`, `src/reducers/loreReducer.ts`, `src/hooks/useGeneration.ts`, `src/hooks/useLoreActions.ts`

The `generationReducer` defines 11 action types (`START_GENERATION`, `COMPLETE_GENERATION`, `UPDATE_PROGRESS`, etc.) — **zero are ever dispatched**. The `useGeneration` hook directly calls setter callbacks:

```typescript
// useGeneration.ts — bypasses the reducer entirely
setIsGenerating(true);          // instead of dispatchGeneration({ type: "START_GENERATION" })
setGenerationStatus("Complete"); // instead of dispatchGeneration({ type: "COMPLETE_GENERATION" })
```

Same pattern in `useLoreActions` — it calls `setActiveLoreMemory()` directly rather than dispatching `SET_ACTIVE_LORE`. The reducers became dead weight when the hooks were designed with callback-based contracts instead of dispatch-based ones.

This is a symptom of GAP-1 — the hooks and reducers were designed in parallel during the refactor but were never aligned or integrated.

---

### GAP-5: `useChatActions` — critical chat features are unimplemented stubs

**File:** `src/hooks/useChatActions.ts`

| Function | Status |
|---|---|
| `sendMessage` | ✅ Implemented |
| `continueLastReply` | ✅ Implemented |
| `elaborateLastReply` | ✅ Implemented |
| `rollbackLastExchange` | ✅ Implemented |
| `rerollLastReply` | 🟠 Stub (`async (deps: any) => {}`) |
| `regenerateFromMessage` | 🟠 Stub |
| `resetChat` | 🟠 Stub |
| `startEditingMessage` | 🟠 Stub |
| `cancelMessageEdit` | 🟠 Stub |
| `saveMessageEdit` | 🟠 Stub |
| `deleteMessagesFromIndex` | 🟠 Stub |
| `selectAssistantOption` | 🟠 Stub |

Even after GAP-1 is fixed, reroll, regenerate, message editing, deletion, and alternative selection will all be non-functional.

---

### GAP-6: `useStoryActions` — story lifecycle critical paths are stubs

**File:** `src/hooks/useStoryActions.ts`

| Function | Status |
|---|---|
| `saveCurrentContext` | ✅ Implemented |
| `saveSceneControl` | ✅ Implemented |
| `saveStoryMemory` | ✅ Implemented |
| `saveCastState` | ✅ Implemented |
| `saveDirectorNotes` | ✅ Implemented |
| `clearDirectorNotes` | ✅ Implemented |
| `openStoryCreationSheet` | 🟠 Stub |
| `switchStory` | 🟠 Stub |
| `startStoryFromCreationSheet` | 🟠 Stub |
| `cancelStoryCreation` | 🟠 Stub |
| `deleteActiveStory` | 🟠 Stub |
| `assignWorldToStory` | 🟠 Stub |

Users cannot create, switch, or delete stories at the hook level. The `switchStory` in `useAppManager` partially works (it dispatches `SWITCH_STORY` to the reducer directly) but `deleteActiveStory` and `assignWorldToStory` are completely inert.

---

### GAP-7: `useImportExport` — all import handlers are stubs

**File:** `src/hooks/useImportExport.ts`

| Function | Status |
|---|---|
| `exportCharacter` | ✅ Implemented |
| `exportWorld` | ✅ Implemented |
| `exportActiveStory` | ✅ Implemented |
| `handleImportFile` | ✅ Implemented |
| `importCharacterBundle` | 🟠 Stub |
| `importWorldBundle` | 🟠 Stub |
| `importStoryBundle` | 🟠 Stub |

Users can export their data to JSON files but cannot import any of it back.

---

### GAP-8: `useCharacterActions` — presence and story membership are stubs

**File:** `src/hooks/useCharacterActions.ts`

| Function | Status |
|---|---|
| `createBlankCharacter` | ✅ Implemented |
| `saveCharacterSheetEdits` | ✅ Implemented |
| `saveStoryCastIdentity` | ✅ Implemented |
| `deleteSelectedCharacter` | ✅ Implemented |
| `setCharacterPresenceInActiveStory` | 🟠 Stub |
| `addCharacterToActiveStory` | 🟠 Stub |
| `removeCharacterFromActiveStory` | 🟠 Stub |

Cannot change which characters are in a story or toggle their active/nearby/inactive presence after GAP-1 fix.

---

### GAP-9: `syncDirectorNotesFromContext` does not perform any sync

**File:** `src/utils/appHelpers.ts`  
**Previously flagged in `CODE_REVIEW.md` — still unfixed**

```typescript
export function syncDirectorNotesFromContext(
  notes: DirectorNotes | undefined, 
  _context: CurrentContext   // ← underscore prefix means intentionally unused
): DirectorNotes {
  return normalizeDirectorNotes(notes);  // ← ignores context entirely
}
```

The function name promises bidirectional sync: context → director notes (complementing `syncCurrentContextFromDirectorNotes` which goes notes → context), but it's a no-op identity function. The `_context` parameter has been silently discarded since the refactor.

---

### GAP-10: `createInitialCurrentContext` ignores its second argument

**File:** `src/utils/appHelpers.ts`

```typescript
export function createInitialCurrentContext(
  world: World | null, 
  _storyCharacters?: Character[]  // ← discarded
): CurrentContext { ... }
```

Called from the old codebase as `createInitialCurrentContext(world, storyCharacters)`, suggesting characters should influence the initial scene context — but the parameter was never wired.

---

### GAP-11: Hardcoded Windows-only database paths

**Files:** `src-tauri/src/main.rs`, `src/constants/defaultData.ts`

```rust
// main.rs — will panic on macOS/Linux
.add_migrations("sqlite:G:\\Chatbot-Assets\\Memory\\mira.db", vec![...])
```

```typescript
// defaultData.ts — same Windows-only path
export const CUSTOM_DB_PATH = "G:\\Chatbot-Assets\\Memory\\mira.db";
```

This conflicts with `sqliteEngine.ts`'s dynamic approach using `documentDir()/MIRA_Data/mira.db`, creating three competing database locations that may or may not exist depending on the platform.

---

### GAP-12: CSS dead code — base `.app` grid rule is always overridden

**File:** `src/styles.css`

```css
.app {
  display: grid;
  grid-template-columns: 280px minmax(420px, 1fr) 360px;  /* ← never applied */
}
```

`MainLayout.tsx` always renders:
```jsx
<div className={`app ${shouldShowEditor ? "with-editor" : "without-editor"}`}>
```

The base `.app` rule is always overridden by either `.with-editor` or `.without-editor`. Dead CSS.

---

## 🟡 MEDIUM (Design/quality concerns)

### GAP-13: Dual SQLite table creation paths — brittle and prone to drift

Tables are created in **two independent places**:
1. **Rust/Tauri migration** (`v1_create_tables.sql`) — run by the Tauri SQL plugin at startup
2. **TypeScript fallback** (`sqliteEngine.ts` inline `CREATE TABLE IF NOT EXISTS`) — run on JS initialization

If one is updated without the other, subtle schema mismatches emerge (e.g., the `worldLorebook` column was added to the read logic but omitted from both CREATE TABLE paths).

---

### GAP-14: `sqliteEngine.saveAll` uses DELETE + INSERT without transactions

```typescript
await db.execute("DELETE FROM worlds");  // ← all data gone
for (const world of worlds) {
  await db.execute(`INSERT INTO worlds (...) VALUES (...)`, [...]);
}
```

No `BEGIN TRANSACTION` / `COMMIT`. If the process crashes or the loop fails mid-way, the database is left partially or completely empty.

---

### GAP-15: Leftover `App.jsx.backup` in source tree

`src/App.jsx.backup` is a remnant from the JSX→TSX migration. Dead file polluting the source directory.

---

### GAP-16: No UI for KoboldCPP API URL configuration

As flagged in `CODE_REVIEW.md` and still true: `repository.settings.setKoboldBaseUrl()` exists in the persistence layer, but there is no settings panel or UI element to change it. Users must use browser devtools or manually edit localStorage/SQLite.

---

### GAP-17: `loreReducer` has 10+ dead action types

The `loreReducer` defines `UPDATE_STORY_LORE`, `UPDATE_WORLD_LORE`, `UPDATE_CHARACTER_LORE`, `SAVE_TEMPORARY_LORE`, `CLEAR_TEMPORARY_LORE`, `PRUNE_LORE`, `ADD_PENDING_UPDATE`, `REMOVE_PENDING_UPDATE`, `SELECT_ALL_PENDING_UPDATES`, `CLEAR_SELECTED_PENDING_UPDATES` — but **none of these are ever dispatched** from any hook, component, or manager. The entire lore layer bypasses the reducer.

---

### GAP-18: UI component exports used as utility library — coupling violation

`src/features/chat/ChatView.tsx` exports `getMessageDisplayText` and `isAssistantMessageWithOptions`, which are imported by:
- `useGeneration.ts`
- `useChatActions.ts`
- `useStateUpdates.ts`
- `appHelpers.ts`

A UI component is acting as a utility library. If `ChatView` is refactored or split, downstream consumers will break silently. These functions should be extracted to `utils/` or `services/`.

---

### GAP-19: No debouncing or persistence throttling

Every state change triggers an immediate write to SQLite (through the write-through cache). For streaming generation — which fires many state updates per second — this creates heavy database churn. The refactoring plan mentioned debounced persistence (`debounce(repository.save, 500)`) but it was never implemented.

---

### GAP-20: Background SQLite writes are fire-and-forget with no error surfacing

```typescript
dbPromise?.then(async (db) => {
  // ... write operations ...
}).catch((e) => console.error("Background save failed:", e));
```

If the database write fails, the in-memory cache becomes out of sync with the persisted data. The user is never notified. On next app restart, they lose all unsaved changes.

---

### GAP-21: Type mismatch — `loreReducer.selectedPendingUpdateIds` is `string[]` but `useAppManager` treats it as `Set<string>`

In `loreReducer.ts`, the state interface defines:
```typescript
selectedPendingUpdateIds: string[];
```

But `useAppManager.ts` destructures and passes it as if it were a `Set<string>`:
```typescript
selectedPendingUpdateIds,  // ← actually string[], not Set<string>
```

`MainLayout` passes it to `PendingUpdatesPanel` which likely expects a `Set` interface. Most Set methods (`.has()`, `.add()`, `.delete()`) will fail on an array.

---

## 🟢 LOW (Minor issues / cleanup)

| ID | Description | File(s) |
|---|---|---|
| GAP-22 | `readme/` docs reference old `.jsx` file names (`Sheets.jsx`, `EditorPanel.jsx`, `App.jsx`) that no longer exist after TS migration | `readme/CODE_REVIEW.md`, `readme/refactored_app_architecture_for_mira.md` |
| GAP-23 | `src/app/routes.ts` is a placeholder with only a doc comment — never imported or used | `src/app/routes.ts` |
| GAP-24 | Multiple `.gitkeep` files in empty planned directories (`features/chat/hooks/`, `features/chat/reducers/`, `features/chat/services/`, etc.) | 9 `.gitkeep` files |
| GAP-25 | `saveSceneControl` in `EditorPanel.tsx` has a dead `else` branch — `onSaveSceneControl` is always provided from `MainLayout`, making the fallback `onSaveCurrentContext`/`onSaveDirectorNotes` paths unreachable | `src/components/EditorPanel.tsx` |
| GAP-26 | `cloneJson` used for deep copies (good for safety) but is O(n) per save — for large chat histories this adds up; could use structural sharing | `src/utils/helpers.ts` |
| GAP-27 | No editor configuration (`.vscode/`, `.editorconfig`, `.prettierrc`) — inconsistent formatting between strict TS and legacy JS style in the backup file | Root |

---

## 📊 Summary Dashboard

| Severity | Count | Blocks App? |
|---|---|---|
| 🔴 Critical | 3 | Yes — app will not run |
| 🟠 High | 9 | Yes — major features broken |
| 🟡 Medium | 9 | Degraded reliability / data integrity |
| 🟢 Low | 6 | Cleanup / tech debt |
| **Total** | **27** | |

---

## 🔧 Recommended Fix Order

### Phase 1 — Make it run (Critical)
1. **GAP-2:** Fix `index.html` — change `main.jsx` → `main.tsx` (1 line)
2. **GAP-3:** Add `worldLorebook` column to SQL schema and INSERT
3. **GAP-1:** Wire `useAppManager` to the real hooks (instantiate all hooks, map their returns over stubs with proper closure wrappers)

### Phase 2 — Make it usable (High)
4. **GAP-5:** Implement stub functions in `useChatActions` (reroll, regenerate, edit, delete, alternatives)
5. **GAP-6:** Implement stub functions in `useStoryActions` (create, switch, delete, assign world)
6. **GAP-8:** Implement stub functions in `useCharacterActions` (presence, story membership)
7. **GAP-7:** Implement stub functions in `useImportExport` (import bundles)

### Phase 3 — Fix correctness (High)
8. **GAP-9:** Fix `syncDirectorNotesFromContext` to actually sync from context
9. **GAP-10:** Fix `createInitialCurrentContext` to use `storyCharacters`
10. **GAP-11:** Remove hardcoded Windows paths / make `CUSTOM_DB_PATH` configurable per-platform
11. **GAP-4:** Align generation/lore hooks with their reducers (dispatch instead of callback)
12. **GAP-21:** Fix type mismatch between `loreReducer` (array) and `useAppManager` (Set)

### Phase 4 — Harden (Medium)
13. **GAP-14:** Wrap SQLite `saveAll` in transactions
14. **GAP-20:** Surface SQLite write errors to the user
15. **GAP-13:** Consolidate dual table-creation path
16. **GAP-16:** Add KoboldCPP URL settings UI
17. **GAP-18:** Extract `getMessageDisplayText` / `isAssistantMessageWithOptions` to `utils/`

### Phase 5 — Clean up (Low)
18. **GAP-15:** Remove `App.jsx.backup`
19. **GAP-22–27:** Documentation updates, `.gitkeep` cleanup, dead code removal
