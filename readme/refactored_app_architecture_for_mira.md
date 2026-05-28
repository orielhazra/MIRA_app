# Refactoring Plan for `src/App.jsx`

> **Historical Note:** This document reflects an earlier pre-TypeScript / migration stage of the project and intentionally contains legacy `.js` / `.jsx` filenames. Use the current source tree and newer remediation reports for the up-to-date implementation state.

## Goal

Reduce the current 1800+ line monolithic `App.jsx` into:

- Feature-oriented modules
- Reusable hooks
- Context providers
- Cleaner orchestration layer
- Easier testing and maintenance
- Better rendering performance

---

# Proposed Folder Structure

```txt
src/
├── app/
│   ├── AppProviders.jsx
│   ├── routes.jsx
│   └── layout/
│       ├── MainLayout.jsx
│       └── panels/
│
├── context/
│   ├── StoryContext.jsx
│   ├── ChatContext.jsx
│   ├── GenerationContext.jsx
│   └── LoreContext.jsx
│
├── hooks/
│   ├── useStoryManager.js
│   ├── useCharacterManager.js
│   ├── useWorldManager.js
│   ├── useChatManager.js
│   ├── useGeneration.js
│   ├── useLoreSystem.js
│   ├── useImportExport.js
│   └── usePersistence.js
│
├── features/
│   ├── chat/
│   ├── stories/
│   ├── worlds/
│   ├── characters/
│   ├── lore/
│   └── debugging/
│
├── services/
├── components/
└── App.jsx
```

---

# Refactored `App.jsx`

The new App component should only orchestrate layout and providers.

---

# AppProviders.jsx

---

# MainLayout.jsx

---

# Story Context

## StoryContext.jsx

---

# useStoryManager Hook

---

# useChatManager Hook

## Responsibilities

Move all chat logic out of App.jsx:

- Chat history
- Message editing
- Streaming responses
- Retry handling
- Abort controller
- Token estimation
- Progress updates

---

## useChatManager.js

---

# useLoreSystem Hook

## Responsibilities

Extract all lore logic:

- Lore injection
- Runtime memory
- Lore pruning
- Active lore tracking
- Debug inspection

---

# Replace Massive useState Blocks with Reducers

---

# Example Reducer

```jsx
export function storyReducer(state, action) {
  switch (action.type) {
    case "CREATE_STORY":
      return {
        ...state,
        stories: [...state.stories, action.payload],
      };

    case "DELETE_STORY":
      return {
        ...state,
        stories: state.stories.filter(
          (story) => story.id !== action.payload
        ),
      };

    default:
      return state;
  }
}
```

---

# Error Boundary

## ErrorBoundary.jsx

```jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <h2>Application Error</h2>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

# Performance Optimizations

## Current Problems

- Entire app rerenders frequently
- Large message arrays cause lag
- Derived state recalculated repeatedly

## Improvements

### Use memoization

```jsx
export default React.memo(ChatView);
```

### Virtualized chat rendering

Use:

- `react-window`
- `react-virtualized`

### Debounced persistence

```jsx
const debouncedSave = debounce(repository.save, 500);
```

---

# Replace LocalStorage

## Current Risk

Large RP sessions may exceed browser limits.

## Recommended Replacement

### IndexedDB + Dexie

```bash
npm install dexie
```

### Example

```jsx
import Dexie from "dexie";

export const db = new Dexie("mira-db");

db.version(1).stores({
  stories: "id",
  chats: "storyId",
  lore: "storyId",
});
```

---

# Suggested Feature Modules

## features/chat

```txt
features/chat/
├── ChatContainer.jsx
├── ChatMessage.jsx
├── Composer.jsx
├── hooks/
├── services/
└── reducers/
```

## features/lore

```txt
features/lore/
├── LoreInspector.jsx
├── LoreMemoryPanel.jsx
├── loreReducer.js
└── useLoreSystem.js
```

---

# TypeScript Migration

Recommended migration order:

1. `services/`
2. `hooks/`
3. `reducers/`
4. `contexts/`
5. Components

---

# Immediate Refactoring Priorities

## Phase 1

Highest impact:

1. Extract hooks
2. Split layout
3. Add contexts
4. Add reducers

---

## Phase 2

1. Add error boundaries
2. Add IndexedDB
3. Add memoization
4. Add virtualized chat

---

## Phase 3

1. Convert to TypeScript
2. Add automated tests
3. Add semantic lore retrieval
4. Add plugin architecture

---

# Final Refactored Architecture Result

After refactoring, App.jsx should:

- Be under 50 lines
- Only orchestrate providers/layout
- Contain zero business logic
- Contain zero persistence logic
- Contain zero generation logic
- Contain zero lore logic

All heavy logic should exist in:

- hooks
- reducers
- contexts
- services
- feature modules

This will dramatically improve:

- Maintainability
- Scalability
- Performance
- Testing
- Team collaboration
- Feature development speed
- Runtime stability

