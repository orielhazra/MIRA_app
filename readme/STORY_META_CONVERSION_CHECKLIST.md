# Story Metadata Conversion Checklist

Created during Phase 0 stabilization.

## Target state

- The app stores and renders a lightweight `StoryMeta[]` library list.
- Only the currently selected story is loaded as a full `Story` in memory.
- Story switching calls `repository.stories.loadFull(storyId)`.
- Story mutations save only the active story via `repository.stories.saveStory(story)`.
- App code no longer depends on a full `stories: Story[]` state array.
- App code no longer derives active story from `activeStoryId`; it uses `activeStory` directly.

## Compatibility policy

- Legacy storage/import data may still be read and normalized.
- New app state and newly saved stories should not use legacy-only fields.
- Old repository methods such as `stories.list()` / `stories.saveAll()` may remain temporarily as compatibility bridges, but new app code should migrate away from them.

## Side task: remove main-character concept

Status: in progress.

Decisions:

- `Story` should not expose or save a `mainCharacterId` field.
- Cast leadership should be inferred from active cast state and `characterIds` order.
- Legacy imports/saves may still be read if they contain an old primary-character field, but normalization should convert that into `characterIds` only.
- New story creation, character add/remove, export, default data, and SQLite insert schema should not write the old field.

## Known old-model usages to remove

Search command:

```bash
grep -R "ctx\.stories\|saveStoryList\|activeStoryId\|setActiveStoryId\|repository\.stories\.list(" -n src
```

Current migration blockers:

- `loadInitialState()` still calls `repository.stories.list(defaultStories)`.
- `useAppManager.ts` expects `initial.storyMetas` and `initial.activeStory`, but `loadInitialState()` does not yet return them.
- `useAppManagerBindings.ts` still passes `ctx.stories`, `saveStoryList`, `activeStoryId`, and `setActiveStoryId` into many action hooks.
- `useStoryActions.ts` still switches and saves via the old full `stories` array.
- `useCharacterActions.ts`, `useLoreActions.ts`, and `useStateUpdates.ts` still mutate story arrays via `saveStoryList`.
- `useImportExport.ts` still imports into a full story list and sets `activeStoryId`.
- `StoryContext.tsx` still exposes `stories` and `activeStoryId`.
- Factory reset still saves full default story arrays through `stories.saveAll()`.

## Baseline commands

Run after each milestone:

```bash
npm run typecheck
npm test
```

## Phase 0 exit criteria

- [x] Conversion checklist exists.
- [x] Current old-model usages are recorded.
- [x] Current test/typecheck failures are recorded or re-runnable.
- [x] New code stops writing `mainCharacterId`.
- [ ] Typecheck is expected to remain failing until Phase 1/2 state-loading work is completed.

## Phase 0 baseline results

Latest run after Phase 0 cleanup:

```bash
npm run typecheck
```

Remaining TypeScript failures:

- `src/hooks/useAppManager.ts`: `loadInitialState()` still returns old-model fields, so `initial.storyMetas` and `initial.activeStory` are not typed/available yet.

Resolved during Phase 0:

- Removed TypeScript errors caused by `Story.mainCharacterId` references.
- Fixed missing `onFactoryReset` prop passed from `MainLayout` to `Sidebar`.

```bash
npm test
```

Remaining test failures:

- `tests/Sidebar.test.tsx`: stale test expects stories to be listed in `Sidebar`; the story list is moving to `Landing`.
- `tests/storyReducer.test.ts`: stale tests still assert `activeStoryId` behavior.
- `tests/useAppManager.test.tsx`: stale test still asserts `activeStoryId` after switching.

Passing after Phase 0:

- Import/export tests pass after removing newly-written primary-character fields from imported stories.

## Phase 1 blank-slate cleanup results

Completed:

- Removed all `mainCharacterId` references from `src` and `tests`.
- Added `src/services/storyMeta.ts` with `storyToMeta()` and `upsertStoryMeta()` helpers.
- Expanded `StoryMeta` with `characterCount` and `lastPlayedAt`.
- Added optional `Story.lastPlayedAt`.
- Added `src/services/storage/types.ts` documenting the target blank-slate repository/storage contract.
- Changed browser localStorage story storage from one full `roleplay_stories` list to:
  - `roleplay_story_metas`
  - `roleplay_story_full_${storyId}`
- Added `stories.deleteStory(storyId)` to localStorage and SQLite engines.
- Removed SQLite localStorage legacy migration logic.
- Removed `mainCharacterId` from SQLite story schema and insert SQL.
- Added `lastPlayedAt` to SQLite story schema and story insert/upsert paths.
- Updated `loadInitialState()` to load story metadata only and start on Landing with `activeStory: null`.

Validation:

```bash
npm run typecheck
npm run build
```

Both pass after Phase 1.

Known remaining conversion work:

- App action/binding hooks still contain old full-list concepts (`stories`, `saveStoryList`, `activeStoryId`, `setActiveStoryId`).
- Tests still need to be rewritten for the new architecture.
- `useStoryActions.switchStory()` still needs to load full story data via `repository.stories.loadFull(storyId)`.
- Story mutation hooks still need to call `saveActiveStory(story)` instead of `saveStoryList(stories)`.

## Continued conversion results

Completed after Phase 1 cleanup:

- Refactored story reducer with direct active-story actions:
  - `SET_ACTIVE_STORY`
  - `CLEAR_ACTIVE_STORY`
  - `UPSERT_STORY_META`
  - `REMOVE_STORY_META`
- Added `saveActiveStory(story)` in `useAppManager()` and routed story persistence through `repository.stories.saveStory(story)`.
- Removed app/test references to the old concepts:
  - `activeStoryId`
  - `setActiveStoryId`
  - `saveStoryList`
  - `mainCharacterId`
  - `repository.stories.list(`
- Refactored story switching to call `repository.stories.loadFull(storyId)` and load chat/lore only for that story.
- Refactored active-story mutations to save a single active story instead of a full story list:
  - current context
  - scene control
  - story memory
  - cast state
  - director notes
  - story lore
  - temporary lore
  - pending state updates
  - character presence/add/remove
  - world assignment
- Refactored import to create/save one active story via `saveActiveStory()`.
- Refactored export to use the active story directly; no active-story id comparison is needed.
- Refactored world/character delete guards to use `storyMetas` instead of a full story list.
- Added Landing story deletion UI and `deleteStoryById(storyId)` manager action.
- Updated tests to the new metadata + direct active story model.

Validation now passes:

```bash
npm test
npm run typecheck
npm run build
```

All pass.

Cleanup verification:

```bash
grep -R "activeStoryId\|setActiveStoryId\|saveStoryList\|mainCharacterId\|repository\.stories\.list(" -n src tests
```

No matches.
