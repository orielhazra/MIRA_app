# Automated Testing Setup

> Added on 2026-05-27
> Updated on 2026-05-27

## Tooling
- **Vitest** for unit and integration tests
- **React Testing Library** for component and hook interaction tests
- **jsdom** for browser-like test environment
- **@testing-library/jest-dom** for readable DOM assertions

## Available scripts
- `npm run typecheck` — TypeScript validation
- `npm run test` — run automated test suite once
- `npm run test:watch` — run tests in watch mode
- `npm run test:coverage` — generate coverage report
- `npm run build` — production build validation

## Implemented test coverage

### Reducers
- `tests/storyReducer.test.ts`
- `tests/loreReducer.test.ts`

### Helpers
- `tests/appHelpers.test.ts`

### UI components
- `tests/Sidebar.test.tsx`
  - sidebar story button regression coverage
- `tests/PendingUpdatesPanel.test.tsx`
  - pending update rendering and interaction coverage

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
  - export bundle generation and import file handling
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

## Key config files
- `vitest.config.mjs`
- `vitest.setup.ts`

## Validation status
At implementation time, the following all passed:
- `npm run typecheck`
- `npm run build`
- `npm run test`

## Current suite size
- **14 test files**
- **39 passing tests**
