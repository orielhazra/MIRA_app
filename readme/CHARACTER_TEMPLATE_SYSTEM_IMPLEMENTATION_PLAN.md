# Character Template Overlay System Implementation Plan

> Date: 2026-05-29  
> Branch context: `temp`

---

## Project assumption

There are **no meaningful legacy user-authored stories to preserve** beyond the seeded defaults.

That means we should optimize for a **clean final character architecture**, not for long-term compatibility shims.

So this plan intentionally prefers:
- clean field names
- clean story-cast data structures
- clean persistence schema
- reseeded defaults
- minimal legacy compatibility code

---

# Goal

Implement a **reusable character template system with story-specific overlays**, analogous to the world template system.

The target behavior is:

- the **Character Library** stores reusable, versioned character templates
- each **Story** contains its own **cast member instances** pinned to specific template versions
- each cast member can have a **story-specific character overlay**
- the runtime prompt, cast state, journals, and UI use the **effective story character**, not the raw template

Conceptually:

```text
Character Template Library
       │
       ├─ Template: Mira v1
       ├─ Template: Mira v2
       ├─ Template: Morwen v1
       └─ Template: Saelith v1

Story A
   ├─ Cast Member 1 -> Mira v1 + overlay
   ├─ Cast Member 2 -> Morwen v1 + overlay
   └─ Cast Member 3 -> Saelith v1 + overlay

Story B
   ├─ Cast Member 1 -> Mira v2 + overlay
   └─ Cast Member 2 -> Morwen v1 + different overlay
```

Effective story character model:

```text
Effective Story Character = Base Character Template + Story Character Overlay + Cast State
```

---

# Why this change is needed

## Current weakness in the app

Right now the app mixes two different concepts:

1. **Reusable character template** from the library
2. **Story-specific cast identity** edited inside the story panels

But the current code still persists story-cast identity changes back into the shared character template list.

That means:
- editing a character for one story can affect other stories
- story-specific identity is not actually isolated
- the UI promises story-specific identity, but persistence is still global

This plan fixes that mismatch.

---

# Recommended architecture

## Layer 1 — Character Templates (global library)
Reusable and versioned.

## Layer 2 — Story Cast Members (per-story instances)
Pinned to a template version and owned by the story.

## Layer 3 — Cast State (runtime scene-state only)
Transient / current-scene information.

This separation should be strict:

- **Template** = reusable long-term base identity
- **Story Character Overlay** = story-specific permanent identity changes
- **Cast State** = current-scene live state

---

# Non-negotiable design rules

## Rule 1 — A story cast member must point to a specific template version
A story must not reference a floating “latest” character template.

## Rule 2 — Template edits must not mutate existing stories
Editing the global template library should not silently change story cast members already in use.

## Rule 3 — Story-specific character edits must go into a story-owned overlay
Editing cast identity inside a story must never overwrite the reusable template directly.

## Rule 4 — Cast State remains separate from identity
Do not merge permanent identity overlays with live cast state.

Examples:
- **identity overlay**: role, aliases, appearance, base relationship, lorebook additions
- **cast state**: mood, outfit right now, current goal, temporary secret, scene instruction

## Rule 5 — Story cast members need their own stable IDs
Do not rely on template character IDs inside the story runtime.

A story cast member should have a stable story-local instance ID, because:
- it is the thing referenced by cast state
- it is the thing referenced by story journals / relationships
- it isolates story-specific identity from the global template

---

# Proposed data model

## 1) Character template metadata

Extend the existing `Character` type to support versioned templates.

```ts
interface Character {
  id: string;                  // exact template version record id
  templateKey: string;         // stable family key
  templateVersion: number;     // version number within that family

  name: string;
  shortDescription?: string;
  race?: string;
  role?: string;
  aliases?: string[];
  promptKeywords?: string[];
  profileSummary?: string;
  defaultOutfit?: string;
  description?: string;
  personality?: string;
  appearance?: string;
  backstory?: string;
  speakingStyle?: string;
  relationshipToUser?: string;
  goals?: string;
  characterRules?: string;
  promptPinned?: boolean;
  lorebook?: LoreEntry[];
  createdAt?: number;
}
```

Example:

```text
id = character_mira_v1
templateKey = mira
templateVersion = 1
```

---

## 2) Story cast member overlay

```ts
interface StoryCharacterOverlay {
  identityPatch: {
    name?: string;
    shortDescription?: string;
    race?: string;
    role?: string;
    aliases?: string[];
    promptKeywords?: string[];
    profileSummary?: string;
    defaultOutfit?: string;
    description?: string;
    personality?: string;
    appearance?: string;
    backstory?: string;
    speakingStyle?: string;
    relationshipToUser?: string;
    goals?: string;
    characterRules?: string;
    promptPinned?: boolean;
  };

  modifiedLoreEntries: Record<string, Partial<LoreEntry>>;
  addedLoreEntries: LoreEntry[];
  removedLoreEntryIds: string[];
}
```

---

## 3) Story cast member instance

```ts
interface StoryCastMember {
  id: string; // stable story-local cast member id

  templateCharacterId: string;
  templateCharacterKey: string;
  templateCharacterVersion: number;

  overlay: StoryCharacterOverlay;
}
```

This becomes the story-owned permanent cast layer.

---

## 4) Story model

Recommended clean replacement:

```ts
interface Story {
  id: string;
  title: string;

  templateWorldId: string;
  templateWorldKey?: string;
  templateWorldVersion?: number;
  worldOverlay: StoryWorldOverlay;

  castMembers: StoryCastMember[];

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

### Key change
Replace:
- `characterIds: string[]`

with:
- `castMembers: StoryCastMember[]`

This is the single most important character-system structural change.

---

## 5) Cast state must use story cast member IDs

Current `CastMemberState` and `RelationshipState` use `characterId`.

That should become story-instance based.

```ts
interface CastMemberState {
  castMemberId: string;
  presence: "active" | "nearby" | "inactive";
  present?: boolean;
  outfit?: string;
  mood?: string;
  condition?: string;
  currentGoal?: string;
  knowledge?: string;
  temporarySecret?: string;
  sceneInstruction?: string;
}

interface RelationshipState {
  castMemberId: string;
  relationshipToUser?: string;
  trustTensionNotes?: string;
  promisesConflicts?: string;
}
```

### Why this matters
The runtime should track the **story cast member**, not the template.

---

## 6) Story memory should also be cast-member aware

Current `characterJournals` keys are character IDs or ad-hoc derived IDs.

This should become:

```ts
characterJournals: Record<string, JournalEntry[]>; // keyed by castMemberId
```

That keeps character-specific memory scoped to the story instance.

---

# Character runtime resolution model

Create a resolver module, parallel to `storyWorld.ts`.

Recommended new file:
- `src/services/storyCharacters.ts`

## Required helpers

```ts
createEmptyCharacterOverlay()
getTemplateCharacterById(templateCharacterId, characters)
getLatestTemplateCharacterByKey(templateKey, characters)
getLatestTemplateCharacters(characters)
applyCharacterOverlay(baseCharacter, overlay)
resolveEffectiveStoryCharacter(castMember, characters)
resolveEffectiveStoryCharacters(story, characters)
getStoryCastMemberById(story, castMemberId)
```

## Resolver behavior

```text
Effective Story Character = Template Character + Character Overlay
```

The effective character should then be combined with cast state at prompt/render time.

---

# Prompt/runtime design

The prompt system should work with:

1. **effective story characters** for permanent identity
2. **cast state** for current scene state
3. **relationships** keyed by cast member instance

## Implication
Prompt-building must stop assuming that the reusable library character object is the story’s permanent identity.

It should instead use:
- resolved story cast members
- story-local overlays
- cast-state overlays

---

# Recommended UI split

## Character Library Sheet
Edits the reusable template version.

## Story Cast Identity editor
Edits the story-specific character overlay.

## Cast State panel
Still edits live scene state only.

This matches the world-system separation:
- template editor
- story overlay editor
- runtime state editor

---

# Step-by-step implementation plan

## Step 1 — Extend types for versioned character templates and story cast members

### Files
- `src/types/index.ts`

### Tasks
Add to `Character`:
- `templateKey`
- `templateVersion`

Add new types:
- `StoryCharacterOverlay`
- `StoryCastMember`

Change `Story`:
- replace `characterIds` with `castMembers`

Change `CastMemberState`:
- `characterId` -> `castMemberId`

Change `RelationshipState`:
- `characterId` -> `castMemberId`

### Done when
- type layer expresses template + story-cast + cast-state separation clearly

---

## Step 2 — Update default character and story seed data

### Files
- `src/constants/defaultData.ts`

### Tasks
Give default characters:
- `templateKey`
- `templateVersion`

Update default stories to use:
- `castMembers`

Example:

```ts
castMembers: [
  {
    id: "cast_mira_story_1",
    templateCharacterId: "mira",
    templateCharacterKey: "mira",
    templateCharacterVersion: 1,
    overlay: createEmptyCharacterOverlay(),
  }
]
```

### Done when
- seeded defaults match the final architecture directly

---

## Step 3 — Create `storyCharacters.ts` resolver module

### Files
- new: `src/services/storyCharacters.ts`

### Tasks
Implement:
- template lookup by id
- latest-template lookup by key
- latest-template list for the character library
- overlay application
- effective story character resolution
- effective story cast resolution

### Done when
- story cast can be resolved independently from the global template list

---

## Step 4 — Update normalizers

### Files
- `src/services/normalizers.ts`

### Tasks
Update `normalizeCharacter()`:
- preserve template metadata

Add:
- `normalizeStoryCharacterOverlay()`
- `normalizeStoryCastMember()`

Update `normalizeStory()`:
- replace `characterIds` handling with `castMembers`
- normalize overlays and cast-member template metadata

### Done when
- stories normalize cleanly into story-cast-member architecture

---

## Step 5 — Update story helper functions and selectors

### Files
- `src/utils/appHelpers.ts`
- `src/services/storyMeta.ts`

### Tasks
Replace character-id assumptions in helpers like:
- `getStoryCharactersFromLists()`
- `chooseActiveCastLead()`
- `loadChatForStory()`
- story export helpers

Update `storyToMeta()` to derive:
- cast count
- maybe template character summary if desired later

### Done when
- helper layer is cast-member aware instead of template-character-id based

---

## Step 6 — Update `useAppManager` to use resolved effective story characters

### Files
- `src/hooks/useAppManager.ts`

### Tasks
Replace current active-story character derivation with:
- `resolveEffectiveStoryCharacters(activeStory, characters)`

Update:
- `activeStoryCharacters`
- `activeCharacter`
- any getter functions that still assume `characterIds`

### Done when
- runtime app state uses effective story characters rather than raw templates

---

## Step 7 — Update story creation to create cast member instances

### Files
- `src/hooks/useStoryActions.ts`
- `src/features/stories/StoryCreationSheet.tsx`
- `src/features/stories/StoryEditSheet.tsx`

### Tasks
When a new story is created:
- selected templates become `castMembers`
- each gets a story-local `id`
- each gets pinned template metadata
- each gets empty character overlay

Story creation/edit UI should still display reusable templates, but write `castMembers` instead of `characterIds`.

### Done when
- story creation produces story-local cast member instances instead of raw template IDs

---

## Step 8 — Update character library editing into versioned saves

### Files
- `src/hooks/useCharacterActions.ts`
- `src/features/characters/CharacterSheet.tsx`
- landing character library

### Tasks
Template saving should behave like world template saving:
- save edits as a **new template version**
- keep same `templateKey`
- increment `templateVersion`
- show latest version in library by default
- preserve pinned old versions for stories already using them

### Done when
- character template library behaves like the world template library

---

## Step 9 — Introduce story-cast identity actions

### Files
- new: `src/hooks/useStoryCharacterActions.ts`
- `src/hooks/useAppManagerBindings.ts`
- `src/hooks/useAppManager.ts`

### Tasks
Create story-cast overlay actions such as:
- `updateStoryCharacterPatch(castMemberId, patch)`
- `addStoryCharacterLoreEntry(castMemberId, loreEntry)`
- `updateStoryCharacterLoreEntry(castMemberId, entryId, patch)`
- `removeStoryCharacterLoreEntry(castMemberId, entryId)`
- `resetStoryCharacterOverlay(castMemberId)`

### Done when
- story-specific cast identity edits no longer overwrite global templates

---

## Step 10 — Rework “Story Cast Identity” UI to edit overlays, not global characters

### Files
- `src/app/layout/panels/StoryWorldPanel.tsx`
- or new `src/features/characters/StoryCharacterSheet.tsx`

### Tasks
The current “Story Cast Identity” cards should edit:
- the story character overlay

not:
- the reusable template record

### Recommended behavior
Story cast identity cards should show:
- effective story character fields
- template family/version label
- overlay save/reset actions

### Done when
- users can safely customize cast identity per story

---

## Step 11 — Keep `CastStatePanel` runtime-only but retarget it to castMember IDs

### Files
- `src/app/layout/panels/CastStatePanel.tsx`
- `src/hooks/useStoryActions.ts`
- `src/services/prompt.ts`

### Tasks
Change cast-state logic to use:
- `castMemberId`

not template character IDs.

### Done when
- runtime state tracks story cast instances correctly

---

## Step 12 — Update prompt builder for story cast members

### Files
- `src/services/prompt.ts`
- `src/services/lore.ts`

### Tasks
Prompt generation should use:
- resolved story characters
- cast-state current info
- story-specific character overlay lore

Character mention detection should work against effective story characters.

### Done when
- prompts reflect story-specific cast identity correctly

---

## Step 13 — Update character import/export behavior

### Files
- `src/hooks/useImportExport.ts`
- `src/utils/appHelpers.ts`

### Tasks
### Character template export
Export exact template version.

### Character template import
Reuse existing matching `templateKey + templateVersion` if appropriate.

### Story export
Preserve:
- story cast members
- template metadata
- overlays

### Story import
Restore:
- cast member instance IDs
- remapped overlays
- cast state keyed by castMemberId

### Done when
- story-specific character identity survives import/export correctly

---

## Step 14 — Update persistence schema

### Files
- `src/services/storage/localStorageEngine.ts`
- `src/services/storage/sqliteSchema.ts`
- `src/services/storage/sqliteEngine.ts`
- `src-tauri/src/migrations/v1_create_tables.sql`

### Character table additions
Add:
- `templateKey`
- `templateVersion`

### Story table changes
Replace raw `characterIds`-only assumption with:
- `castMembers`

If you want to preserve a summary column for metadata, that can remain separate.

### Cast state / journals
Ensure story persistence supports:
- cast member instance IDs
- overlay data

### Done when
- persistence fully supports versioned character templates and story cast instances

---

## Step 15 — Add tests before final cleanup

### Tests to add/update
- character template versioning
- story creation creates cast members, not raw character IDs
- story cast overlay resolution
- story cast identity editing does not mutate library templates
- cast state remains scoped to cast member instances
- import/export preserves cast member overlays
- SQLite schema supports template metadata and story cast members

### Done when
- automated tests cover the new architecture end-to-end

---

# Suggested implementation order

## Pass 1 — types and seed data
1. `src/types/index.ts`
2. `src/constants/defaultData.ts`
3. `src/services/normalizers.ts`

## Pass 2 — resolution and helpers
4. `src/services/storyCharacters.ts`
5. `src/utils/appHelpers.ts`
6. `src/services/storyMeta.ts`

## Pass 3 — story workflow
7. `src/hooks/useStoryActions.ts`
8. `src/hooks/useAppManager.ts`
9. story creation/edit sheets

## Pass 4 — character library versioning
10. `src/hooks/useCharacterActions.ts`
11. `src/features/characters/CharacterSheet.tsx`
12. character library landing behavior

## Pass 5 — story cast identity editing
13. `src/hooks/useStoryCharacterActions.ts`
14. `src/hooks/useAppManagerBindings.ts`
15. story cast identity UI
16. `CastStatePanel.tsx`

## Pass 6 — persistence and import/export
17. storage files
18. import/export files
19. tests
20. cleanup pass

---

# MVP recommendation

If you want the smallest viable implementation first, the MVP should include:

1. versioned character templates
2. story cast members instead of raw `characterIds`
3. effective story character resolver
4. story character overlay editing
5. prompt system uses effective story characters
6. persistence + import/export preserve cast members and overlays

That would deliver the core behavior:

> reusable character templates globally, with story-specific cast identity that no longer mutates the shared template.

---

# Final recommendation

Implement the character system using the same strategic pattern as the world system, but with one important structural upgrade:

> **Use story cast member instances, not just template character IDs.**

That is the key to making story-specific character identity clean, isolated, and scalable.
