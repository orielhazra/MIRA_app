# Story Template Overlay Audit Report

> Date: 2026-05-29  
> Branch context: `temp`  
> Audit type: post-cleanup static audit after template versioning, overlay editing, persistence, and import/export updates  
> Note: this audit is based on code inspection. Full automated verification was **not** completed in this environment because the TypeScript toolchain (`tsc`) was unavailable.

---

# Executive summary

The story/template overlay system is now **architecturally complete in its core design** and **mostly complete in user-facing workflow**.

## Current completion estimate

- **Architecture:** ~94%
- **User-facing workflow:** ~92%
- **Hardening / production confidence:** ~75%

## Overall judgment

This system is now in a strong state.

The original major risks have been addressed:
- stories pin exact template versions
- story worlds are resolved through an overlay
- story-world editing exists in UI and action layers
- prompt/runtime location logic is location-ID-aware
- SQLite schema supports template metadata and overlays
- import/export preserves template metadata and story overlays
- template library saving now creates new template versions
- story creation/edit forms now prefer latest template versions
- import conflict handling now reuses matching template versions
- blank template first-save clutter has been reduced

At this point, the remaining work is mostly:
- polish,
- observability,
- consistency cleanup in storage compatibility paths,
- and full runtime verification.

---

# What was audited

The audit focused on the story/template overlay feature across:

- `src/hooks/useAppManager.ts`
- `src/hooks/useStoryActions.ts`
- `src/hooks/useWorldActions.ts`
- `src/hooks/useStoryWorldActions.ts`
- `src/services/storyWorld.ts`
- `src/services/prompt.ts`
- `src/services/normalizers.ts`
- `src/services/storage/sqliteSchema.ts`
- `src/services/storage/sqliteEngine.ts`
- `src/services/storage/localStorageEngine.ts`
- `src/hooks/useImportExport.ts`
- `src/app/layout/panels/StoryWorldPanel.tsx`
- `src/app/layout/panels/CurrentContextPanel.tsx`
- `src/features/worlds/WorldSheet.tsx`
- `src/features/stories/Landing.tsx`
- `src/features/stories/StoryCreationSheet.tsx`
- `src/features/stories/StoryEditSheet.tsx`
- relevant test files in `tests/`

---

# Confirmed strengths

## 1. Core overlay model is fully present

Implemented and connected:
- `templateWorldId`
- `templateWorldKey`
- `templateWorldVersion`
- `worldOverlay`
- `resolveEffectiveWorld()`
- story-world editing actions
- story-world editing UI
- location ID-aware prompt/runtime logic
- current-context location linking
- persistence support
- import/export support

This is the central success condition of the feature.

---

## 2. Template versioning now works in the reusable world library

Implemented behavior:
- editing a template creates a new template version
- stories remain pinned to exact template versions
- landing shows only the latest version per template family by default
- deleting a template checks the whole family for story usage
- first save of a blank starter template reuses v1 instead of leaving hidden junk versions

This closes the largest prior architecture gap.

---

## 3. Story creation and story editing are now version-aware

Implemented behavior:
- story creation sheet shows latest template versions only
- selecting a template updates pinned metadata
- story edit sheet shows latest versions by default
- older currently pinned versions still appear when needed
- opening story creation from an older active version prefers the latest version in that family

This makes the template version UX substantially more coherent.

---

## 4. Import/version conflict handling now exists

Implemented behavior:
- world import reuses an existing local template if `templateKey + templateVersion` already exist
- story import also reuses an existing local template version when possible
- imported stories preserve overlays and template metadata

This removes a major source of duplicate template clutter.

---

## 5. Location identity is now materially better

Implemented behavior:
- `locationId` on current context
- prompt resolution prefers `locationId`
- state updates resolve scene moves against canonical world locations
- current context UI allows linking the scene to a story-world location

This is one of the strongest quality improvements in the system.

---

# Findings

## Severity legend

- 🔴 High: likely to cause incorrect behavior or major confusion
- 🟠 Medium: important inconsistency or structural weakness
- 🟡 Low: cleanup, polish, observability, or future enhancement

---

## 🟠 F-1: Storage compatibility fallbacks still remain in SQLite loading paths

### Files
- `src/services/storage/sqliteEngine.ts`

### Problem
The application-level model has largely moved to the clean template-based system, but SQLite loading still contains transitional compatibility reads such as:
- `row.templateWorldId || row.worldId`
- `row.templateWorldKey || row.templateWorldId || row.worldId`

### Why this matters
This is understandable for migration compatibility, but it means the storage layer still conceptually supports the old shape.

Because your project assumption is that there are no meaningful old stories beyond defaults, these fallback paths are now primarily technical debt.

### Recommendation
After one successful full verification cycle on fresh and migrated local DBs, simplify SQLite loading to the final schema only.

Suggested future cleanup:
- require `templateWorldId`
- require `templateWorldKey`
- require `templateWorldVersion`
- require `worldOverlay`

Keep migration patches in schema if needed, but remove long-lived semantic fallback logic once verified.

---

## 🟠 F-2: Import conflict handling reuses matching template versions by key/version only, not by content checksum

### Files
- `src/hooks/useImportExport.ts`
- `src/services/storyWorld.ts`

### Problem
The importer now reuses existing templates when:
- `templateKey` matches
- `templateVersion` matches

This is good, but it assumes that equal key/version means equal content.

### Why this matters
If two worlds with the same:
- `templateKey`
- `templateVersion`

have actually diverged in content, the importer will silently reuse the local copy.

### Current risk
Low-to-medium. This is a reasonable first conflict policy, but it is not a content-aware policy.

### Recommendation
Possible future hardening:
- add a template checksum / content hash
- or compare imported template content before reuse
- or warn the user if same key/version but different content are detected

This is not required to continue development, but it would improve robustness.

---

## 🟡 F-3: `StoryMeta` still does not include template key/version

### Files
- `src/types/index.ts`
- `src/services/storyMeta.ts`

### Problem
`StoryMeta` still contains:
- `templateWorldId`

but not:
- `templateWorldKey`
- `templateWorldVersion`

### Why this matters
This is not required for correctness, but it limits:
- lightweight template-family analytics
- richer story library displays without loading worlds
- future admin/debug tooling

### Recommendation
Optional improvement:
- extend `StoryMeta` with:
  - `templateWorldKey`
  - `templateWorldVersion`

Not urgent.

---

## 🟡 F-4: Older template version history is hidden but not inspectable

### Files
- `src/features/stories/Landing.tsx`
- `src/features/worlds/WorldSheet.tsx`

### Problem
Older versions are intentionally hidden from the normal landing flow, which is correct.
However, there is still no explicit UI to:
- inspect template version history
- compare versions
- see which stories are pinned to which exact version

### Why this matters
This is now a usability enhancement, not a core architecture issue.

### Recommendation
Future enhancement:
- add version history UI in `WorldSheet`
- show template family members and story usage per version

---

## 🟡 F-5: Terminology is improved but not fully standardized everywhere

### Files
- `WorldSheet.tsx`
- `Landing.tsx`
- story/library-related UI text generally

### Problem
The system is now strongly template-based, but wording still mixes:
- world
- template
- story world
- reusable world

### Recommendation
Continue terminology cleanup toward:
- `World Templates`
- `Story World`
- `Template Family`
- `Template Version`
- `Use Template In Story`

This is mainly polish.

---

## 🟡 F-6: Static audit only — runtime confidence is still lower than architecture confidence

### Problem
This audit is based on code inspection.
The system has undergone broad coordinated changes across:
- types
- normalizers
- runtime resolution
- UI
- persistence
- import/export
- versioning behavior

But a full verification run was not completed here.

### Recommendation
Run at minimum:

```bash
npm run typecheck
npm run typecheck:test
npm run test
npm run build
```

And then manually smoke test:
- create blank template
- first save stays v1
- second save creates v2
- create story from template
- customize story world
- switch story location using scene control picker
- export/import world template
- export/import story bundle
- re-open story
- assign newer template to active story
- delete unused template family

---

# Resolved issues from earlier audit

The following previously flagged issues are now considered resolved:

## Resolved
- Story creation/edit sheets exposing all template versions
- Duplicated latest-template filtering logic in Landing
- Reusable template export falling back to `activeWorld`
- Missing template/version conflict handling during import
- Blank starter template leaving hidden junk versions on first save
- Core model still depending on `worldId` fallback in the main application normalizer

Note: storage compatibility fallback remains in SQLite loading, but the **core model path** is now clean.

---

# Completion analysis after cleanup

## Strongly complete

### Core overlay architecture
- story template pinning
- story world overlay model
- effective world resolution
- overlay editing actions
- overlay-aware UI
- prompt/runtime location ID support
- current context location linking
- import/export metadata continuity
- SQLite schema support

**Completion:** ~95%

---

## Strongly complete

### Story workflow
- create story from latest template versions
- assign template to story
- customize story world
- save runtime story-world state
- resolve current location through story world
- preserve overlays across import/export

**Completion:** ~92–94%

---

## Mostly complete

### Template-versioning workflow
- version creation exists
- latest-only display exists
- pinned-old-version edit support exists
- delete-family safety exists
- first-save blank-template cleanup exists
- import reuse policy exists

**Completion:** ~88–90%

---

## Production hardening
- schema logic implemented
- import/export implemented
- tests expanded
- but full runtime verification still pending

**Completion:** ~72–75%

---

# Recommended remaining work order

## Priority 1 — hardening
1. Run full typecheck/test/build verification
2. Perform manual smoke test pass on template versioning and import/export
3. Validate SQLite migration behavior on a non-empty local DB

## Priority 2 — storage cleanup
4. Remove long-lived SQLite `worldId` fallback reads once verified safe

## Priority 3 — quality improvements
5. Extend `StoryMeta` with template key/version if desired
6. Add template checksum/content-aware import conflict detection
7. Add template version history UI
8. Continue terminology polish

---

# Final judgment

The story/template overlay system is now **functionally successful and architecturally mature**.

The major design goals are all implemented:
- reusable world templates
- exact template version pinning
- story-specific world overlays
- effective world resolution
- story-world editing
- location identity
- versioned template saves
- import/export continuity
- persistence support

## Final completion call

**This feature is now effectively complete at the feature level, with remaining work mostly in hardening and polish.**

### Practical score
- **Overall completion:** ~91%
- **Ready for continued development:** Yes
- **Ready for focused verification and polish:** Yes
- **Largest remaining need:** runtime verification, not architecture
