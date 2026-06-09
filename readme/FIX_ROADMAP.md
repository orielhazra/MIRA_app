# M.I.R.A. — Fix Roadmap

**Based on:** `CODE_QUALITY_ANALYSIS.md` (2026-06-04)  
**Goal:** Zero compiler errors, no critical security gaps, reduced technical debt, production-ready codebase.  
**Last updated:** 2026-06-09  
**Status:** ✅ ALL PHASES COMPLETE — ALL TASKS DONE

---

## Final Status

```
TypeScript errors:    0  ✅  (was 10)
Test files:          30  ✅  (was 29)
Tests passing:      103  ✅  (was 95)
Production build:    OK  ✅
CSP enabled:        Yes  ✅  (was null)
FACTORY_RESET:    Fixed  ✅  (personas preserved)
Deps pinned:        Yes  ✅  (was 4x "latest")
@types/react:       v19  ✅  (was v18 — mismatched runtime)
console.log:          0  ✅  (was 3)
Duplicate funcs:      0  ✅  (was 10)
AppContext typed:   Yes  ✅  (was { [key: string]: any })
Binding sigs typed: Yes  ✅  (was all any)
alert() calls:        0  ✅  (was 32)
confirm() calls:      0  ✅  (was 14)
!important:           0  ✅  (was 13)
Loading states:     Yes  ✅  (switchStory + openStoryEditSheet)
Dead code:            0  ✅  (was 117 lines)
God hook split:     Yes  ✅  (680 → 464 lines, 5 contexts)
Async interface:  Clean  ✅  (was boolean | Promise<boolean>)
FK enforcement:      On  ✅  (was off)
Import validation:  Zod  ✅  (was shallow manual checks)
Error boundaries:     2  ✅  (was 3 — removed redundant)
Hardcoded DB path:    0  ✅  (was G:\ — now config file + Settings UI)
any usages:         166  ⬇️  (was 235, -29%)
Files changed:       63  (+911 / -1106, net -195 lines)
New modules:         19
Bugs found & fixed:   9  (2 runtime + 7 type)
```

---

## Overview

| Phase | Name | Focus | Status | Effort |
|-------|------|-------|--------|--------|
| **0** | Emergency Fixes | Broken code & security | ✅ **DONE** | ~3 hrs |
| **1** | Build Stability | Reproducible, clean builds | ✅ **DONE** | ~1 hr |
| **2** | Code Deduplication | Consolidate duplicated logic | ✅ **DONE** | ~3 hrs |
| **3** | Type Safety Hardening | Kill `any`, type the context | ✅ **DONE** | ~4 hrs |
| **4** | UX & Polish | Replace blocking UI, add loading states | ✅ **DONE** | ~4 hrs |
| **5** | Architecture Improvements | Split god hook, async, memoize, cleanup | ✅ **DONE** | ~4 hrs |
| **6** | Resilience & Validation | Import validation, FK enforcement | ✅ **DONE** | ~2 hrs |

**Total effort: ~21 hours**

---

## Phase 0 — Emergency Fixes ✅ COMPLETE

| Task | Summary |
|------|---------|
| **0.1** Fix 10 TypeScript errors | Found 2 runtime bugs (wrong arg order, wrong cast types). |
| **0.2** Remove hardcoded DB path | Hybrid approach: `mira.config.json` (read by Rust + TS) + Settings UI for editing. Removed `G:\` hardcoded path entirely. |
| **0.3** Enable CSP | Localhost-only policy applied. |
| **0.4** Fix FACTORY_RESET personas | Added `personas` to dispatch payload + persistence. |
| **0.5** Regression tests | 8 new tests in `tests/phase0Regressions.test.ts`. |

---

## Phase 1 — Build Stability ✅ COMPLETE

| Task | Summary |
|------|---------|
| **1.1** Pin dependency versions | 4 `"latest"` → semver. `@types/react` 18→19. |
| **1.2** Move `@tauri-apps/cli` to devDependencies | Build-time CLI out of production deps. |
| **1.3** Remove unused `useState` import | Cleaned `AppProviders.tsx`. |
| **1.4** Clean up `console.log` | 3→0 (→ `console.debug`). |

---

## Phase 2 — Code Deduplication ✅ COMPLETE

| Task | Summary |
|------|---------|
| **2.1** Consolidate `uniqueCompact` + `normalizeMatchText` | 4+3 copies → 1 each. Created `arrayUtils.ts`, `textUtils.ts`. |
| **2.2** Consolidate `normalizePresence` family | 6 copies → 1 each. Created `castUtils.ts`. |
| **2.3** Shared `ContextInput` / `ContextTextarea` | 7 copies → 1 each. Created `FormFields.tsx`. |
| **2.4** Rename `buildDraft` collisions | Disambiguated names. |
| **2.5** Extract shared persistence tracker | Created `persistenceTracker.ts`. ~85 lines deduped. |

---

## Phase 3 — Type Safety Hardening ✅ COMPLETE

| Task | Summary |
|------|---------|
| **3.1** Type the AppContext | `{ [key: string]: any }` → `ReturnType<typeof useAppManager>` (127 props). Found 3 bugs. |
| **3.2** Type hook dependency interfaces | 10 factory signatures typed. Created `AppManagerContext` + 10 type aliases. Found 4 bugs. |
| **3.3** Type `buildSmartPromptContext` return | `SmartPromptContext` interface (17 fields). |
| **3.4** `any` reduction sweep | 235 → 166 (-29%). Key files zeroed: `useAppManager`, `prompt`, `managerContext`. |

### Bugs Found by Typing (7 total)
- `saveStoryCastIdentity` stale ref in StoryContext
- `StoryMeta` type shadowing in Landing.tsx
- `RepositoryStorage.personas` missing from interface
- `saveActiveStory` missing from 2 lore call sites
- `characterId` legacy refs in prompt.ts Maps
- `GenerationDeps` not exported
- `LoreActionDeps` incomplete (5 missing fields)

---

## Phase 4 — UX & Polish ✅ COMPLETE

| Task | Summary |
|------|---------|
| **4.1** Create `ConfirmDialog` | Native `<dialog>`, dark theme, danger/default variants. |
| **4.2** Replace `confirm()` calls | 14 → 0 across 4 chunks. Centralized `pendingConfirm` + component-local patterns. |
| **4.3** Replace `alert()` calls | 32 → 0 across 4 chunks. Toast context + `showToast()` in all hooks. |
| **4.4** Loading states | `isLoadingStory` for `switchStory` + `openStoryEditSheet`. |

---

## Phase 5 — Architecture Improvements ✅ COMPLETE

| Task | Summary |
|------|---------|
| **5.1** Split `useAppManager` into focused contexts | 5 context providers extracted. `useAppManager` 680 → 464 lines (-32%). |
| **5.2** Unify async repository interface | `boolean \| Promise<boolean>` → `boolean` (8 methods). |
| **5.3** Memoize `MainLayout` rendering | `useMemo` for `appClassName`, `useCallback` for repeated handlers. |
| **5.4** Remove dead Rust code | Deleted `lib.rs` + `[lib]` from `Cargo.toml`. |
| **5.5** Delete dead sub-context files | Removed 4 unused thin wrappers (117 lines). |
| **5.6** Move persistence/settings/confirm to UIContext | 3 `useState` + 1 `useEffect` + 5 functions moved. |

### Context Architecture

```
AppProviders
  └─ ToastProvider           (41 lines — toast stack)
     └─ UIProvider           (149 lines — panels, persistence, settings, confirm, loading, db path)
        └─ StoryStateProvider (203 lines — story reducer, CRUD, derived values)
           └─ ChatStateProvider  (92 lines — chat + generation reducers)
              └─ LoreStateProvider  (74 lines — lore reducer, pending updates)
                 └─ AppContent      (useAppManager orchestrator → AppContext)
```

---

## Phase 6 — Resilience & Validation ✅ COMPLETE

| Task | Summary |
|------|---------|
| **6.1** Zod schema validation for imports | 5 schemas, 10MB file size limit, `formatZodErrors()`. Added `zod` dependency. |
| **6.2** SQLite foreign key enforcement | `PRAGMA foreign_keys = ON` in `ensureSqliteSchema()`. |
| **6.3** Deduplicate Error Boundaries | 3 → 2. Removed redundant `<ErrorBoundary>` from `App.tsx`. |
| **6.4** CSS specificity cleanup | 13 → 0 `!important` overrides. Used element selectors for specificity. |

---

## Milestone Checklist

| Milestone | Criteria | Status |
|-----------|----------|--------|
| **M0: Compiles Clean** | `tsc --noEmit` exits 0, all tests pass | ✅ Done |
| **M1: Reproducible Build** | No `"latest"`, `npm ci` succeeds | ✅ Done |
| **M2: No Duplicates** | Each utility function defined once | ✅ Done |
| **M3: Typed Context** | AppContext fully typed, key files at 0 any | ✅ Done |
| **M4: No Blocking Dialogs** | Zero `alert()` / `confirm()` calls | ✅ Done |
| **M5: Architecture V2** | God hook split, contexts own state, dead code removed | ✅ Done |
| **M6: Validated & Resilient** | Zod validation, FK enforcement, clean error boundaries | ✅ Done |

---

## Complete Before / After

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| TypeScript errors | 10 | 0 | ✅ |
| Tests | 95 (29 files) | 103 (30 files) | +8 |
| `"latest"` deps | 4 | 0 | ✅ |
| `@types/react` | v18 (mismatched) | v19 (aligned) | ✅ |
| `console.log` | 3 | 0 | ✅ |
| Duplicate functions | 10 | 0 | ✅ |
| `any` usages | 235 | 166 | -29% |
| `alert()` calls | 32 | 0 | ✅ |
| `confirm()` calls | 14 | 0 | ✅ |
| `!important` CSS | 13 | 0 | ✅ |
| CSP | disabled | localhost-only | ✅ |
| Error boundaries | 3 (redundant) | 2 (clean) | ✅ |
| SQLite FK enforcement | off | on | ✅ |
| Import validation | shallow manual | Zod schemas + size limit | ✅ |
| Dead code | 117 lines + lib.rs | 0 | ✅ |
| Hardcoded DB path | `G:\Chatbot-Assets\Memory\mira.db` | Config file + Settings UI | ✅ |
| `useAppManager` | 680 lines (god hook) | 464 lines (orchestrator) | -32% |
| Context providers | 0 (all in one hook) | 5 focused contexts | ✅ |
| Repository interface | `boolean \| Promise<boolean>` | `boolean` | ✅ |
| Bugs found & fixed | — | 9 (2 runtime + 7 type) | |
| New modules | — | 19 | |
| Files changed | — | 63 | |
| Lines | — | +911 / -1106 (net -195) | |

---

## All New Modules Created (19 total)

```
src/utils/arrayUtils.ts                    — uniqueCompact
src/utils/textUtils.ts                     — normalizeMatchText
src/utils/castUtils.ts                     — normalizePresence, getRowPresence, formatPresenceLabel
src/components/ui/FormFields.tsx           — ContextInput, ContextTextarea
src/components/ui/ConfirmDialog.tsx        — ConfirmDialog, ConfirmActionState, CONFIRM_CLOSED
src/components/ui/ToastContainer.tsx       — ToastContainer
src/context/ToastContext.tsx               — ToastProvider, useToast
src/context/UIContext.tsx                  — UIProvider, useUI
src/context/ChatStateContext.tsx           — ChatStateProvider, useChatState
src/context/LoreStateContext.tsx           — LoreStateProvider, useLoreState
src/context/StoryStateContext.tsx          — StoryStateProvider, useStoryState
src/services/storage/persistenceTracker.ts — createPersistenceTracker
src/services/appConfig.ts                 — readAppConfig, writeAppConfig, loadDatabasePath
src/types/appContext.ts                    — AppContextValue
src/types/managerContext.ts                — AppManagerContext + 10 hook type aliases
src/schemas/importSchemas.ts              — Zod schemas for import validation
src/styles/15-confirm-dialog.css           — ConfirmDialog styles
src/styles/16-toast.css                    — Toast styles
tests/phase0Regressions.test.ts            — 8 regression tests
```

---

*Roadmap authored 2026-06-04. Completed 2026-06-09. All 7 phases, all tasks done in ~21 hours.*
