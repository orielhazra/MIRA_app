# World Template Overlay System Implementation Plan

> Date: 2026-05-29  
> Branch context: `temp`

---

## Project assumption

There are **no meaningful existing user-authored stories to preserve** beyond the seeded default stories.

That changes the implementation strategy in an important way:

- we should prefer a **clean architecture** over backward-compatibility shims,
- we can make **breaking schema/type changes now** if they improve the final design,
- we do **not** need a heavy migration layer for old story records,
- we can simply **update the default seed data** and **reset/reseed persisted story data** during rollout if needed.

## What this means in practice

Because of this assumption, the plan should be optimized for:

1. **clean field names**,
2. **clean resolver logic**,
3. **clean persistence schema**,
4. **clean default data seeding**,
5. **minimal legacy fallback code**.

So this revised plan intentionally chooses a cleaner model than the previous compatibility-preserving version.

---

# Goal

Implement a **reusable world template system with story-specific overlays**, where:

- the **World Library** stores reusable **template worlds**,
- a **Story** references a specific template version,
- the story stores only its **custom changes** in a `worldOverlay`,
- the app builds an **effective story world** at runtime by merging:

```text
Effective Story World = Base Template World + Story World Overlay
```

This allows:
- reusable templates,
- story-specific expansion,
- low duplication,
- safe isolation,
- future template migrations.

---

# Recommended architecture

## Mental model

```text
World Template Library
       │
       ├─ Template: Aldmyr v1
       ├─ Template: Aldmyr v2
       └─ Template: Liminal Station v1

Story A
   ├─ base template = Aldmyr v1
   └─ worldOverlay = { custom locations, modified rules, story-specific lore }

Story B
   ├─ base template = Aldmyr v2
   └─ worldOverlay = { different changes }

Story C
   ├─ base template = Liminal Station v1
   └─ worldOverlay = { different changes }
```

The story does **not** own a full copied world by default.
Instead, it owns:

- a **reference** to the base template version,
- a **patch/overlay** containing only story-specific changes.

---

# Revised strategic choice because there is no legacy burden

Since there are no real old stories to preserve, we should make one major cleanup now:

## Use `templateWorldId`, not `worldId`

Instead of keeping `Story.worldId` for compatibility, we should rename it now to:

- `templateWorldId`

This is cleaner and avoids carrying a misleading field name forever.

### Why this is worth doing now
- the old name describes the old architecture,
- the new architecture is template-based, not direct-world-owned,
- there is little migration risk because only seeded defaults matter,
- it avoids years of semantic confusion later.

This is the biggest plan change caused by your new assumption.

---

# Non-negotiable design rules

## Rule 1 — A story must point to a specific template version
A story must not point to a live mutable “latest” template.

A story should always know:
- which template family it came from,
- which exact version it is based on.

## Rule 2 — Template edits must not silently mutate existing stories
When a template changes, existing stories must stay stable unless explicitly rebased.

## Rule 3 — Story-specific world edits go into the overlay only
Editing a story’s world must never mutate the global template.

## Rule 4 — Template editing and story-world editing must be separate UX flows
Users must be able to tell whether they are editing:
- the reusable template,
- or the active story’s customized world.

## Rule 5 — Location matching must prefer stable IDs, not names
Overlay systems become fragile if runtime world logic depends on string name matching.

## Rule 6 — Lore entries also need stable IDs
If world lore can be modified/removed by story overlay, lore entries must be addressable by ID.

---

# Proposed data model

## 1) Template world metadata

Use the existing `World` shape as the core template payload, but add version metadata.

### Proposed template shape

```ts
interface World {
  id: string;                  // exact version record ID
  templateKey: string;         // stable family key
  templateVersion: number;     // version number within the family
  name: string;
  overview?: string;
  shortDescription?: string;
  description?: string;
  rules?: string;
  locations?: WorldLocation[];
  worldLorebook?: LoreEntry[];
  createdAt?: number;
}
```

### Meaning of fields
- `id` = exact persisted record for a template version
- `templateKey` = logical template family identifier
- `templateVersion` = version number for that family

### Example
```text
id = world_aldmyr_v1
templateKey = aldmyr
templateVersion = 1
```

```text
id = world_aldmyr_v2
templateKey = aldmyr
templateVersion = 2
```

---

## 2) Story model

Because we do not need to preserve the old naming model, use this cleaner shape directly:

```ts
interface Story {
  id: string;
  title: string;

  templateWorldId: string;
  templateWorldKey: string;
  templateWorldVersion: number;

  worldOverlay: StoryWorldOverlay;

  characterIds: string[];
  scenario?: string;
  greeting?: string;
  storyLorebook?: LoreEntry[];
  temporaryLorebook?: LoreEntry[];
  storyMemory: StoryJournal;
  currentContext: CurrentContext;
  castState: CastState;
  directorNotes?: DirectorNotes;
  createdAt?: number;
  lastPlayedAt?: number;
}
```

### Notes
- `templateWorldId` points to the exact base template version record
- `templateWorldKey` is the family key
- `templateWorldVersion` is the pinned version number
- `worldOverlay` is required, not optional, in the new system

Since only default stories matter, it is better to standardize on this shape immediately.

---

## 3) Story world overlay

### Phase 1 overlay scope

Start with a practical overlay that supports:
- world-level text overrides,
- location modifications,
- added/removed locations,
- world lore additions/modifications/removals.

```ts
interface StoryWorldOverlay {
  worldPatch: {
    name?: string;
    overview?: string;
    shortDescription?: string;
    description?: string;
    rules?: string;
  };

  modifiedLocations: Record<string, Partial<WorldLocation>>;
  addedLocations: WorldLocation[];
  removedLocationIds: string[];

  modifiedLoreEntries: Record<string, Partial<LoreEntry>>;
  addedLoreEntries: LoreEntry[];
  removedLoreEntryIds: string[];
}
```

### Notes
- keys in `modifiedLocations` are **location IDs**
- keys in `modifiedLoreEntries` are **lore entry IDs**
- `addedLocations` and `addedLoreEntries` must have stable IDs
- the overlay should default to an empty object structure, not `undefined`

---

## 4) Current context update

The current context needs a stable location reference.

### Add to `CurrentContext.location`

```ts
interface LocationContext {
  locationId?: string;
  name?: string;
  description?: string;
  visibleExits?: string;
  availableLocations?: string;
  hazards?: string;
}
```

### Why this matters
The resolver and prompt builder should prefer:
- `locationId`

and use:
- `name`

only as a display field or fallback.

---

# Effective-world resolution model

Create one shared resolver for the entire app.

## Required helper functions

Recommended new module:
- `src/services/storyWorld.ts`

### Core functions

```ts
getTemplateWorldById(templateWorldId, worlds)
getLatestTemplateByKey(templateKey, worlds)
resolveEffectiveWorld(story, worlds)
applyWorldOverlay(baseWorld, overlay)
createEmptyWorldOverlay()
```

## Resolver behavior

```text
resolveEffectiveWorld(story, worlds):
  1. find base template world using story.templateWorldId
  2. normalize the base template
  3. apply story.worldOverlay
  4. normalize the merged result
  5. return the effective world
```

## App-wide rule

Every active-story flow must use the resolved world, including:
- `useAppManager`
- prompt building
- lore resolution
- story world panels
- sidebar world display
- location logic

---

# Template versioning strategy

## Recommended strategy

### Templates are versioned records, not mutable shared live objects
When a template is edited in the library:
- create a **new template version record**,
- keep older versions available for stories already using them.

### Example
```text
Aldmyr v1  -> used by Story A
Aldmyr v2  -> used by Story B
```

Story A should remain on v1 unless manually rebased.

## Library UI behavior
The library should display only the **latest version** per `templateKey` by default.
Older versions can be:
- hidden,
- archived,
- or shown in an advanced view later.

## Delete behavior
Do not hard-delete template versions that are still referenced by stories.
If needed:
- archive them,
- or block deletion.

---

# Revised migration strategy

Because there are no meaningful legacy stories to preserve, the migration plan becomes much simpler.

## We do not need a general legacy-story migration layer
We do **not** need to write broad compatibility logic for old story shapes in long-term production code.

Instead, we should do this:

### 1. Rewrite the default seed data
Update:
- `defaultWorlds`
- `defaultStories`

to the new architecture directly.

### 2. Reset and reseed persisted stories during rollout if needed
If old persisted story data exists locally during development, we can:
- clear story persistence,
- reseed from the new defaults,
- continue from a clean state.

### 3. Keep only minimal transitional fallback if required during implementation
If a temporary short-lived fallback is useful while refactoring, that is fine — but it should not become permanent architecture.

## Practical consequence
This lets us:
- rename `worldId` to `templateWorldId`,
- require `worldOverlay`,
- simplify story normalization,
- simplify storage code,
- simplify tests.

---

# Step-by-step implementation plan

## Step 1 — Rename story world reference fields cleanly

### Files
- `src/types/index.ts`
- all references to `story.worldId`

### Tasks
Replace story world-reference fields with:
- `templateWorldId`
- `templateWorldKey`
- `templateWorldVersion`

Add:
- `worldOverlay`

Add:
- `locationId` to `CurrentContext.location`

### Done when
- the type layer expresses the new architecture clearly
- all compile errors now point to the places that need updating

---

## Step 2 — Update default seed data first

### Files
- `src/constants/defaultData.ts`
- `src/utils/appHelpers.ts` (startup seed behavior)

### Tasks
Update default worlds so every template has:
- `templateKey`
- `templateVersion`

Update default stories so every story has:
- `templateWorldId`
- `templateWorldKey`
- `templateWorldVersion`
- `worldOverlay: createEmptyWorldOverlay()`

### Important
Do this early so the rest of the app can be refactored against the final data shape.

### Done when
- default data already matches the new architecture

---

## Step 3 — Make location IDs and lore IDs stable

### Files
- `src/services/normalizers.ts`
- `src/types/index.ts`

### Tasks
### Locations
Ensure every template location has a stable ID and that IDs persist after edits.

### Lore
Update lore normalization so world lore entries always get stable IDs when missing.

### Why now
Overlay patching/removal requires reliable IDs before resolver logic is built.

### Done when
- locations and lore entries are always targetable by stable ID

---

## Step 4 — Create the story-world resolver module

### Files
- new: `src/services/storyWorld.ts`

### Tasks
Implement:
- `createEmptyWorldOverlay()`
- `getTemplateWorldById()`
- `applyWorldOverlay()`
- `resolveEffectiveWorld()`

### Overlay merge behavior

#### World-level fields
- apply `overlay.worldPatch` over base template fields

#### Locations
- start with template locations
- remove any `removedLocationIds`
- patch locations listed in `modifiedLocations`
- append `addedLocations`

#### Lore
- start with template world lorebook
- remove any `removedLoreEntryIds`
- patch lore entries listed in `modifiedLoreEntries`
- append `addedLoreEntries`

### Done when
- the app can deterministically build an effective world from a template + overlay

---

## Step 5 — Simplify normalization around the new shape

### Files
- `src/services/normalizers.ts`

### Tasks
Update `normalizeWorld()`:
- require/preserve `templateKey`
- require/preserve `templateVersion`

Update `normalizeStory()`:
- require/preserve `templateWorldId`
- require/preserve `templateWorldKey`
- require/preserve `templateWorldVersion`
- require/preserve `worldOverlay`
- initialize empty overlay only if truly missing during development

### Important
Do not design this around long-term support for the old `worldId` model.

### Done when
- normalizers are centered on the final architecture, not the legacy one

---

## Step 6 — Change active-world resolution in `useAppManager`

### Files
- `src/hooks/useAppManager.ts`

### Tasks
Replace direct template lookup with resolver logic.

### Target pattern
```ts
resolveEffectiveWorld(activeStory, worlds)
```

### Goal
For an active story, `activeWorld` must mean:
- the **effective merged world**,
not the raw template world.

### Done when
- all active story screens receive the merged world view

---

## Step 7 — Update story creation to pin a template version and create an empty overlay

### Files
- `src/hooks/useStoryActions.ts`
- `src/utils/appHelpers.ts`

### Tasks
When creating a story:
- choose a world template from the library
- store its exact `id` as `templateWorldId`
- store `templateKey`
- store `templateVersion`
- initialize `worldOverlay = createEmptyWorldOverlay()`
- build initial current context using the **effective world**

### Done when
- new stories are created directly in the overlay architecture

---

## Step 8 — Rework template editing into versioned saves

### Files
- `src/hooks/useWorldActions.ts`
- `src/features/worlds/WorldSheet.tsx`

### Tasks
The current world library editor saves directly back into one world record.
That must change.

### New save behavior for template editing
When a template is edited from the library:
- create a **new version** of that template,
- do not mutate the old version if stories may depend on it.

### Simplest implementation rule
On template save:
1. clone the edited template
2. assign a new `id`
3. keep the same `templateKey`
4. increment `templateVersion`
5. save as a new library record
6. optionally mark the old template as archived later

### Done when
- editing the library template no longer mutates the exact template versions used by stories

---

## Step 9 — Add story-world overlay editing actions

### Files
- new: `src/hooks/useStoryWorldActions.ts`
- `src/hooks/useAppManagerBindings.ts`
- `src/hooks/useAppManager.ts`

### Tasks
Create overlay-specific actions such as:
- `updateStoryWorldPatch()`
- `addStoryWorldLocation()`
- `updateStoryWorldLocation(locationId, patch)`
- `removeStoryWorldLocation(locationId)`
- `addStoryWorldLoreEntry()`
- `updateStoryWorldLoreEntry(entryId, patch)`
- `removeStoryWorldLoreEntry(entryId)`
- `resetStoryWorldOverlay()`

### Behavior
These actions must update only `activeStory.worldOverlay`, then save the story.

### Done when
- the story can evolve its own world without touching the template library

---

## Step 10 — Add a dedicated Story World editing UI

### Files
- `src/app/layout/panels/StoryWorldPanel.tsx`
- optionally new: `src/features/worlds/StoryWorldSheet.tsx`
- `src/components/EditorPanel.tsx`
- `src/app/layout/MainLayout.tsx`

### Recommended UX split

#### Template World editor
Edits the reusable library template

#### Story World editor
Edits only the active story overlay

### Minimum editable fields for story overlay
- world name override
- overview/description/rules overrides
- add/modify/remove locations
- add/modify/remove world lore entries

### Important
The story-world editor should show the **effective merged world**, but save only the **overlay changes**.

### Done when
- a user can customize the active story world separately from the library template

---

## Step 11 — Update template assignment to re-base the story cleanly

### Files
- `src/hooks/useStoryActions.ts`

### Tasks
Update world assignment in a story so that selecting a new template:
- sets `templateWorldId`
- sets `templateWorldKey`
- sets `templateWorldVersion`
- resets `worldOverlay` to empty
- rebuilds current context from the new effective world
- syncs director notes
- resets chat and active lore memory

### Done when
- switching templates cleanly re-bases the story on a new template version

---

## Step 12 — Update prompt generation and lore resolution to use effective worlds

### Files
- `src/services/prompt.ts`
- `src/services/lore.ts`
- `src/hooks/useLoreActions.ts`

### Tasks
Ensure that all runtime world-dependent systems use the resolved effective world.

### Specifically
- prompt smart context should use merged locations
- world rules in prompt should use merged rules
- world lore injection should use merged world lorebook
- location selection should prefer `locationId`

### Done when
- story-world overlay changes are reflected in generation and lore behavior

---

## Step 13 — Upgrade current context to prefer `locationId`

### Files
- `src/types/index.ts`
- `src/services/normalizers.ts`
- `src/utils/appHelpers.ts`
- `src/services/prompt.ts`
- `src/app/layout/panels/CurrentContextPanel.tsx`

### Tasks
When initializing or saving current context:
- preserve `locationId`
- set `locationId` when current location corresponds to a known effective-world location
- keep `name` mainly for readability/display

### Prompt resolution rule
When selecting current location:
1. try `locationId`
2. fallback to exact name match only if needed

### Done when
- renaming a location no longer breaks current-location resolution

---

## Step 14 — Update persistence with the clean new schema

### Files
- `src/services/storage/localStorageEngine.ts`
- `src/services/storage/sqliteEngine.ts`
- `src/services/storage/sqliteSchema.ts`
- SQL migration file(s)

### Important strategy shift
Because there are no meaningful old stories to preserve, persistence can be updated more aggressively.

## Local storage
Update the stored story shape directly.
If needed during rollout:
- clear old story storage,
- reseed defaults.

## SQLite changes
### Worlds table
Add/support:
- `templateKey`
- `templateVersion`
- optional `archived`

### Stories table
Store:
- `templateWorldId`
- `templateWorldKey`
- `templateWorldVersion`
- `worldOverlay`

### Optional rollout simplification
Since this is a branch-level architectural change, it is acceptable during development to:
- clear story rows,
- reseed defaults,
- avoid over-engineering old-row migration.

### Done when
- the new architecture persists cleanly without legacy shape dependence

---

## Step 15 — Update import/export for overlays and template metadata

### Files
- `src/hooks/useImportExport.ts`
- `src/utils/appHelpers.ts`

### Story export
Include:
- base template reference fields
- `worldOverlay`
- story data
- chat history
- characters
- exact base template version data if needed for portability

### Story import
Preserve:
- `templateWorldId`
- `templateWorldKey`
- `templateWorldVersion`
- `worldOverlay`

If imported template is missing locally:
- create/import the referenced template version as part of the import flow,
- then restore the story against it.

### World template export
Still exports only the reusable template record.

### Done when
- story overlays survive export/import exactly

---

## Step 16 — Update UI language to distinguish template worlds from story worlds

### Files
- `src/features/stories/Landing.tsx`
- `src/features/worlds/WorldSheet.tsx`
- `src/components/Sidebar.tsx`
- `src/components/ChatHeader.tsx`
- `src/app/layout/panels/StoryWorldPanel.tsx`

### Recommended wording
- **World Templates** for the library
- **Story World** for the active story’s effective world
- **Edit Template** vs **Edit Story World**
- **Use Template In Story** for assignment

### Done when
- the product vocabulary is unambiguous

---

## Step 17 — Focus tests on the new architecture, not migration complexity

### Files
- `tests/useStoryActions.test.tsx`
- `tests/useAppManager.test.tsx`
- `tests/useImportExport.test.tsx`
- `tests/sqliteSchema.test.ts`
- new tests for `storyWorld.ts`

### Critical tests to add

#### Resolver tests
- merges template + worldPatch correctly
- applies location overrides correctly
- adds/removes locations correctly
- applies lore overrides correctly

#### Story creation tests
- new story stores template version reference
- new story starts with empty overlay

#### Template versioning tests
- editing a template creates a new version instead of mutating the old one
- old default stories still resolve against old versions

#### Story-world editing tests
- overlay edits affect effective world
- overlay edits do not mutate library templates

#### Prompt correctness tests
- prompts use effective world, not raw template
- current location resolves by `locationId`

#### Persistence tests
- `worldOverlay` survives save/load in local storage
- `worldOverlay` survives save/load in SQLite

#### Seed/reset tests
- default data loads correctly in the new architecture
- factory reset / reseed restores valid default templates and stories

### No need for large legacy migration tests
Since only default stories matter, the test suite should focus on:
- correctness of the new architecture,
not on broad support for retired story shapes.

---

# Suggested file-by-file implementation order

## Pass 1 — foundation
1. `src/types/index.ts`
2. `src/constants/defaultData.ts`
3. `src/services/normalizers.ts`
4. `src/services/storyWorld.ts` (new)
5. `src/utils/appHelpers.ts`

## Pass 2 — active runtime resolution
6. `src/hooks/useAppManager.ts`
7. `src/hooks/useStoryActions.ts`
8. `src/services/prompt.ts`
9. `src/services/lore.ts`

## Pass 3 — story-world editing
10. `src/hooks/useStoryWorldActions.ts` (new)
11. `src/hooks/useAppManagerBindings.ts`
12. story-world editor UI files

## Pass 4 — template versioning
13. `src/hooks/useWorldActions.ts`
14. `src/features/worlds/WorldSheet.tsx`
15. landing / selection UI

## Pass 5 — persistence
16. `src/services/storage/localStorageEngine.ts`
17. `src/services/storage/sqliteSchema.ts`
18. `src/services/storage/sqliteEngine.ts`
19. SQL migration / reset strategy

## Pass 6 — import/export and tests
20. `src/hooks/useImportExport.ts`
21. test files
22. cleanup pass

---

# Overlay-first MVP

If the full plan is too large for one pass, the minimum MVP should include:

1. rename `worldId` to `templateWorldId`
2. add `templateWorldKey` and `templateWorldVersion`
3. add `worldOverlay`
4. update default data to the new shape
5. create `resolveEffectiveWorld()`
6. make `activeWorld` use the resolver
7. make prompt/lore use the effective world
8. add `locationId` support
9. persist `worldOverlay`
10. add at least one story-world editing path for rules and locations

This MVP will already deliver the core behavior:

> **A story inherits from a reusable template version and can customize its own world through an overlay without mutating the template.**

---

# Risks and mitigation

## Risk 1 — Overlay editing UI becomes confusing
### Mitigation
Keep template editing and story-world editing clearly separate.

## Risk 2 — Name-based location logic breaks overlays
### Mitigation
Add `locationId` early and make resolver/prompt prefer it.

## Risk 3 — Template edits affect story stability
### Mitigation
Use pinned template versions, not live “latest” links.

## Risk 4 — Lore entries are hard to patch/remove
### Mitigation
Ensure stable lore IDs before overlay editing ships.

## Risk 5 — Template version growth clutters the library
### Mitigation
Show only latest versions in normal UI; archive older versions.

## Risk 6 — Old dev data in storage causes confusion during rollout
### Mitigation
During rollout, clear/reseed story persistence instead of carrying heavy compatibility code.

---

# Acceptance criteria

This feature is complete when:

- world templates are stored and editable as versioned library records
- default stories use `templateWorldId`, `templateWorldKey`, and `templateWorldVersion`
- every story has a `worldOverlay`
- active story world is resolved as template + overlay
- editing a story world changes only the overlay
- editing a template creates a new version instead of mutating older referenced versions
- prompts and lore use the effective merged world
- `locationId` is supported in current context
- import/export preserves overlays and template references
- persistence supports version metadata and overlay data
- UI clearly distinguishes templates from story-world customization
- reset/reseed produces valid default stories under the new architecture

---

# Final recommendation

Because there are no meaningful existing stories to preserve beyond defaults, we should take advantage of that and implement the overlay architecture **cleanly**, not compatibly.

That means:
- rename fields now,
- simplify schema now,
- rewrite defaults now,
- avoid long-lived legacy fallback code.

The correct implementation target is:

> **versioned template world + story overlay + effective-world resolver**

with a **clean rename to `templateWorldId`** and a **default-data reseed strategy** instead of broad migration support.
