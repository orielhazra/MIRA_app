# M.I.R.A. Architecture Remediation Work Plan

> Based on `readme/ARCHITECTURE_GAPS_REPORT.md` reviewed on 2026-05-27
> Goal: restore a runnable, correct, and maintainable application before new feature work

---

## 1) Executive Summary

The gap report shows the project is **not yet in a shippable state**. The most urgent issues are:

1. **The app does not boot correctly in Vite** (`index.html` points to `main.jsx` instead of `main.tsx`)
2. **The controller layer is disconnected** (`useAppManager` exports stubs instead of real hook actions)
3. **SQLite persistence has schema drift and data-loss risk** (`worldLorebook` missing, dual schema definitions, no transaction protection)

Because of that, the plan should **not** start with UX enhancements or new features. It should first:
- restore boot/build,
- reconnect core action wiring,
- stop data loss,
- then complete the broken high-priority workflows.

---

## 2) Delivery Strategy

Use a phased approach with a hard gate between phases:

- **Phase A — Stabilize boot + data safety**
- **Phase B — Reconnect architecture**
- **Phase C — Finish broken user workflows**
- **Phase D — Harden persistence + correctness**
- **Phase E — Cleanup + documentation + regression coverage**

Each phase should end with a short smoke-test pass before moving on.

---

## 3) Guiding Principles

1. **Fix runtime blockers before refactors**
2. **Prefer small, verifiable changes over large rewrites**
3. **Preserve current data shape where possible**
4. **Make one source of truth for persistence contracts**
5. **Add validation and smoke checks alongside each milestone**

---

## 4) Phase-by-Phase Work Plan

## Phase A — Stabilize Boot and Prevent Data Loss

### Objectives
- Make `npm run dev` and `npm run build` work
- Ensure the database schema matches runtime reads/writes
- Finalize the current desktop DB path strategy and document fallback behavior

### Scope
- GAP-2
- GAP-3
- GAP-11
- partial GAP-13

### Tasks

#### A1. Fix Vite entry point mismatch
**Gaps:** GAP-2  
**Files:** `index.html`

**Work:**
- Change `/src/main.jsx` → `/src/main.tsx`

**Acceptance criteria:**
- `npm run build` resolves the app entry correctly
- no 404 for `main.jsx`

---

#### A2. Repair `worldLorebook` persistence
**Gaps:** GAP-3  
**Files:**
- `src-tauri/src/migrations/v1_create_tables.sql`
- `src/services/storage/sqliteEngine.ts`

**Work:**
- Add `worldLorebook TEXT` to Tauri migration schema
- Add `worldLorebook TEXT` to fallback JS table creation
- Add `worldLorebook` to insert/save logic
- Confirm load path parses it safely
- Add backward-compatible handling when column/data is missing in older DBs

**Acceptance criteria:**
- a saved world lorebook survives app restart
- no silent loss of world lore entries
- older DBs do not crash on load

---

#### A3. Formalize the permanent custom desktop DB path decision
**Gaps:** GAP-11  
**Files:**
- `src-tauri/src/main.rs`
- `src/constants/defaultData.ts`
- possibly `src/services/storage/sqliteEngine.ts`

**Work:**
- Keep the custom Windows desktop DB path as the primary runtime target for now
- Ensure non-Windows runtimes and path initialization failures fall back safely to `sqlite:mira.db`
- Document the supported path strategy and browser/Tauri behavior clearly

**Acceptance criteria:**
- Windows desktop runtime uses the permanent custom DB path by default
- non-Windows or failed custom-path initialization safely falls back to `sqlite:mira.db`
- DB path strategy is deterministic and documented

---

#### A4. Define schema ownership
**Gaps:** partial GAP-13  
**Files:** persistence layer docs + schema files

**Work:**
- Decide whether SQL schema is owned by:
  - Tauri migrations first, with TS fallback mirroring it, or
  - a generated/shared schema contract
- Document the rule so future column additions cannot drift

**Acceptance criteria:**
- schema change process is documented in one place
- future migrations require updating all required layers by checklist

### Estimated effort
**1–2 days**

### Exit gate for Phase A
- App builds successfully
- App starts successfully in dev
- World lorebook data persists across save/load
- The permanent custom DB path decision and fallback behavior are fully documented

---

## Phase B — Reconnect the Architecture

### Objectives
- Make the controller layer actually invoke the feature hooks
- Remove the “dead action layer” problem
- Restore end-to-end action flow from UI → controller → reducer/service → persistence

### Scope
- GAP-1
- GAP-4
- GAP-17
- GAP-21
- GAP-18 (partial)

### Tasks

#### B1. Wire `useAppManager` to real hooks
**Gaps:** GAP-1  
**Files:**
- `src/hooks/useAppManager.ts`
- all hook modules under `src/hooks/`

**Work:**
- Instantiate `useGeneration`, `useChatActions`, `useStoryActions`, `useCharacterActions`, `useWorldActions`, `useLoreActions`, `useStateUpdates`, `useImportExport`
- Replace no-op stubs with real closures bound to current state/dispatch/dependencies
- Ensure `MainLayout` receives actual executable handlers

**Acceptance criteria:**
- send message works from UI
- story creation actions invoke real code paths
- state extraction action invokes real pipeline
- no exported no-op stubs remain for core flows

---

#### B2. Resolve reducer/hook contract mismatch
**Gaps:** GAP-4, GAP-17  
**Files:**
- `src/reducers/generationReducer.ts`
- `src/reducers/loreReducer.ts`
- `src/hooks/useGeneration.ts`
- `src/hooks/useLoreActions.ts`

**Work:**
- Pick one architecture and enforce it consistently:
  1. reducers are the source of truth and hooks dispatch actions, or
  2. callbacks/setters remain primary and dead reducers are removed
- Recommendation: **use reducers consistently**, because the current app already advertises reducer-based architecture

**Acceptance criteria:**
- generation state transitions are driven by one consistent mechanism
- lore state transitions are driven by one consistent mechanism
- dead reducer action types are either implemented or removed

---

#### B3. Fix `selectedPendingUpdateIds` type contract
**Gaps:** GAP-21  
**Files:**
- `src/reducers/loreReducer.ts`
- `src/hooks/useAppManager.ts`
- `src/components/PendingUpdatesPanel.tsx`
- `src/app/layout/MainLayout.tsx`

**Work:**
- Standardize on either `string[]` or `Set<string>` across state, props, and operations
- Recommendation: store as `string[]` in reducer state, convert to `Set` only in memoized selectors if needed

**Acceptance criteria:**
- pending update selection UI works without runtime method errors
- TS types match actual runtime shape

---

#### B4. Extract non-UI utilities from `ChatView`
**Gaps:** partial GAP-18  
**Files:**
- `src/features/chat/ChatView.tsx`
- `src/utils/*` or `src/services/*`
- importing hooks/helpers

**Work:**
- Move `getMessageDisplayText` and `isAssistantMessageWithOptions` into a utility module
- update imports

**Acceptance criteria:**
- no business logic helper is imported from a UI component file

### Estimated effort
**2–4 days**

### Exit gate for Phase B
- Main user actions are wired and executable
- Controller layer matches the documented architecture
- No dead core manager stubs remain

---

## Phase C — Complete Broken User Workflows

### Objectives
- Make the major user-facing features actually usable after controller wiring is restored

### Scope
- GAP-5
- GAP-6
- GAP-7
- GAP-8
- GAP-9
- GAP-10

### Tasks

#### C1. Complete chat action stubs
**Gaps:** GAP-5  
**Files:** `src/hooks/useChatActions.ts`

**Missing behaviors:**
- reroll last reply
- regenerate from message
- reset chat
- start/cancel/save message edit
- delete messages from index
- select assistant option

**Acceptance criteria:**
- each composer/chat action has a working UI path
- edited messages reflow correctly through generation state
- alternative selection updates the visible conversation predictably

---

#### C2. Complete story lifecycle stubs
**Gaps:** GAP-6  
**Files:** `src/hooks/useStoryActions.ts`

**Missing behaviors:**
- open story creation sheet
- switch story
- start story from creation sheet
- cancel story creation
- delete active story
- assign world to story

**Acceptance criteria:**
- user can create, switch, and delete stories
- assigning a world updates dependent story context correctly

---

#### C3. Complete import pipeline
**Gaps:** GAP-7  
**Files:** `src/hooks/useImportExport.ts`

**Missing behaviors:**
- import character bundle
- import world bundle
- import story bundle

**Acceptance criteria:**
- exported bundles can be re-imported successfully
- invalid bundle shape is rejected safely
- imported data is normalized before persistence

---

#### C4. Complete character membership/presence actions
**Gaps:** GAP-8  
**Files:** `src/hooks/useCharacterActions.ts`

**Missing behaviors:**
- set character presence in active story
- add character to active story
- remove character from active story

**Acceptance criteria:**
- character membership updates active story cast correctly
- presence changes are reflected in context/prompt inputs where applicable

---

#### C5. Fix context/note synchronization helpers
**Gaps:** GAP-9, GAP-10  
**Files:** `src/utils/appHelpers.ts`

**Work:**
- implement `syncDirectorNotesFromContext` to truly derive note updates from current context
- implement actual use of `storyCharacters` in `createInitialCurrentContext`, or remove the argument if it is not part of the intended design

**Acceptance criteria:**
- helper names match real behavior
- context initialization is deterministic and documented

### Estimated effort
**3–5 days**

### Exit gate for Phase C
- Core create/edit/chat/import flows are functional
- No major user-facing buttons are wired to stubs

---

## Phase D — Persistence and Correctness Hardening

### Objectives
- Reduce risk of corruption or silent divergence between memory and persisted state
- Improve operational resilience before feature expansion

### Scope
- GAP-13
- GAP-14
- GAP-16
- GAP-19
- GAP-20
- remainder of GAP-18

### Tasks

#### D1. Consolidate schema management
**Gaps:** GAP-13  

**Work:**
- define the canonical schema source
- reduce duplicate `CREATE TABLE` drift risk
- add schema evolution checklist to docs

**Acceptance criteria:**
- adding a column requires a single documented migration flow

---

#### D2. Add transactions to bulk save
**Gaps:** GAP-14  
**Files:** `src/services/storage/sqliteEngine.ts`

**Work:**
- wrap `DELETE + INSERT` save cycles in transaction boundaries
- ensure rollback on failure

**Acceptance criteria:**
- interrupted writes do not leave DB half-empty

---

#### D3. Surface persistence failures
**Gaps:** GAP-20  

**Work:**
- replace fire-and-forget persistence with observable error reporting
- add user-visible notification path for failed saves
- keep in-memory/persisted divergence visible

**Acceptance criteria:**
- write failures are logged and surfaced
- user can tell when data was not saved

---

#### D4. Add persistence throttling/debouncing
**Gaps:** GAP-19  

**Work:**
- debounce write-through persistence for bursty state updates, especially generation streams
- ensure flush on critical transitions (completion, unload, explicit save-equivalent actions)

**Acceptance criteria:**
- write volume during streaming is significantly reduced
- final state remains durable

---

#### D5. Add settings UI for KoboldCPP URL
**Gaps:** GAP-16  

**Work:**
- expose `repository.settings.setKoboldBaseUrl()` in UI
- validate URL input and save it persistently

**Acceptance criteria:**
- users can configure the backend without devtools/manual editing

### Estimated effort
**2–4 days**

### Exit gate for Phase D
- persistence is transactional, observable, and lower-churn
- key configuration is manageable in UI

---

## Phase E — Cleanup, Docs, and Regression Coverage

### Objectives
- remove confusing leftovers
- align documentation with actual architecture
- establish a repeatable validation routine

### Scope
- GAP-12
- GAP-15
- GAP-22 to GAP-27
- plus basic test/QA scaffolding

### Tasks

#### E1. Remove dead files and dead branches
- remove obsolete backup files from the source tree
- remove dead CSS and unreachable branches
- clean unused placeholders where appropriate

#### E2. Update docs to match TS architecture
- refresh README/docs that still reference `.jsx`
- update architecture blueprint to reflect actual implementation
- explicitly note any architectural decisions made during remediation

#### E3. Add project hygiene
- add `.editorconfig`
- optionally add Prettier config
- consider minimal lint/test setup if the team wants guardrails

#### E4. Create regression checklist
Because the repo currently has **no test suite**, define a lightweight manual smoke pack:
- app boots
- app builds
- create story
- switch story
- create character/world
- add/remove character from story
- send message
- continue/elaborate/reroll
- edit and delete message
- extract updates
- save and restart app
- export/import bundles
- change Kobold URL

### Estimated effort
**1–2 days**

### Exit gate for Phase E
- repo is cleaner and easier to maintain
- docs do not contradict implementation
- a repeatable smoke checklist exists

---

## 5) Suggested Implementation Order by Sprint

### Sprint 1
- A1 Fix entry point
- A2 Repair `worldLorebook`
- A3 Formalize permanent custom DB path + fallback
- Smoke test boot/build/persistence

### Sprint 2
- B1 Wire `useAppManager`
- B3 Fix pending update ID type mismatch
- Smoke test send/chat/basic navigation

### Sprint 3
- B2 Align reducers/hooks
- C2 Story lifecycle completion
- C4 Character membership/presence
- Smoke test story setup workflows

### Sprint 4
- C1 Complete chat stubs
- C5 Fix sync helpers
- Smoke test conversation editing/regeneration

### Sprint 5
- C3 Import flows
- D2 Transactions
- D3 Save error surfacing
- D4 Debounced persistence
- Smoke test export/import and restart durability

### Sprint 6
- D1 Consolidate schema ownership
- D5 Kobold settings UI
- E1–E4 cleanup/docs/regression checklist

---

## 6) Effort Overview

| Phase | Focus | Estimate |
|---|---|---:|
| A | Boot + data safety | 1–2 days |
| B | Architecture reconnection | 2–4 days |
| C | Broken workflow completion | 3–5 days |
| D | Persistence hardening | 2–4 days |
| E | Cleanup + docs + QA | 1–2 days |
| **Total** | **Remediation** | **9–17 working days** |

> If a single developer is doing all work while also validating manually, a realistic target is **2–3 weeks**.

---

## 7) Key Risks

1. **Hook integration may expose hidden state coupling** once stubs are replaced
2. **Schema fixes may require migration handling** for existing local databases
3. **Reducer alignment may touch many files** if the app mixes callbacks and reducer actions inconsistently
4. **Import/export completion may reveal weak normalization rules**
5. **No automated tests means regressions are likely** unless each phase gets a smoke checklist

---

## 8) Recommended Definition of Done

The remediation effort should be considered complete only when:

- the app boots in Vite without entry errors
- the app can create, edit, switch, and delete core entities
- sending/generating/editing chat works end-to-end
- persistence survives restart without silent data loss
- the SQLite schema is documented and consistent
- no critical/high gaps remain open
- docs reflect the actual implementation, not the intended one

---

## 9) Immediate Next Action

Start with this exact order:

1. **Fix `index.html` entry path**
2. **Fix `worldLorebook` schema/save/load**
3. **Refactor `useAppManager` to instantiate and expose the real hooks**

That sequence gives the fastest route from “architecturally incomplete” to “runnable and testable.”
