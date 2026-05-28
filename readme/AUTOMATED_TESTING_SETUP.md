# Automated Testing Setup

> Added on 2026-05-27
> Updated on 2026-05-28

## Tooling
- **Vitest** for unit and integration tests
- **React Testing Library** for component and hook interaction tests
- **jsdom** for browser-like test environment
- **@testing-library/jest-dom** for readable DOM assertions

## Available scripts
- `npm run typecheck` — TypeScript validation
- `npm run typecheck:test` — test TypeScript validation
- `npm run test` — run automated test suite once
- `npm run test:watch` — run tests in watch mode
- `npm run test:coverage` — generate coverage report
- `npm run build` — production build validation
- `npm run verify` — unified full-project verification

## Implemented test coverage

### Reducers
- `tests/storyReducer.test.ts`
- `tests/loreReducer.test.ts`

### Helpers
- `tests/appHelpers.test.ts`
- `tests/helpers.test.ts`

### UI components
- `tests/Sidebar.test.tsx`
  - sidebar story button regression coverage
- `tests/PendingUpdatesPanel.test.tsx`
  - pending update rendering and interaction coverage
- `tests/ChatView.test.tsx`
  - assistant option selection and edit button interaction coverage
- `tests/StoryCreationSheet.test.tsx`
  - story creation draft editing and submit coverage
- `tests/HeaderSettingsMenu.test.tsx`
  - header settings menu interaction coverage

### Hooks / manager integration
- `tests/useAppManager.test.tsx`
  - story switching through the manager layer
  - story creation sheet opening through the manager layer
- `tests/useChatActions.test.tsx`
  - message sending, editing, deletion, and reset behavior
- `tests/useStateUpdates.test.tsx`
  - pending update toggling, extraction, and application
- `tests/useStoryActions.test.tsx`
  - story switching fallback behavior and story deletion flow
- `tests/useLoreActions.test.tsx`
  - lore update, temporary lore save, and lore refresh flows
- `tests/useImportExport.test.tsx`
  - export bundle generation, import file handling, and bundle-import workflows
- `tests/useGeneration.test.tsx`
  - successful generation flow
  - retry behavior
  - error handling path

### Service-layer logic
- `tests/loreService.test.ts`
  - keyword matching
  - active lore memory construction
  - lore inspection / prompt selection
  - trigger text generation
  - prompt budget selection behavior
- `tests/promptService.test.ts`
  - opening message placeholder replacement
  - request message assembly
  - system prompt content generation
- `tests/koboldApi.test.ts`
  - generation body creation
  - prompt-text serialization
  - stop-sequence cleanup
  - token estimate helper
- `tests/sqliteSchema.test.ts`
  - schema contract / drift protection coverage

## Key config files
- `vitest.config.mjs`
- `vitest.setup.ts`
- `tsconfig.test.json`

## Validation status
At implementation time, the following all passed:
- `npm run typecheck`
- `npm run typecheck:test`
- `npm run build`
- `npm run test`
- `npm run verify`

## Current suite size
- **20 test files**
- **60 passing tests**
