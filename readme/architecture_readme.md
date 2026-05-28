# M.I.R.A. React App — Architectural & Structural Blueprint

This directory contains the comprehensive architectural summary, structural blueprints, and detailed data flow diagrams for the refactored React/Vite conversion of the vanilla JavaScript M.I.R.A. (Modular Interactive Roleplaying Assistant) chatbot.

---

## 🗺️ Refactored Directory Structure Map

Below is the annotated directory tree representing the final modular and decoupled architecture of the application:

```txt
src/
├── app/                           # Global Application Orchestration
│   ├── layout/                    # Layout Containers
│   │   ├── panels/                # Modular Control Panels (Split in Phase 1)
│   │   │   ├── CastStatePanel.tsx     # Live mood, presence, goals, outfits, and temporary secrets
│   │   │   ├── ControlPanelHome.tsx   # Dashboard router and active setup summary
│   │   │   ├── CurrentContextPanel.tsx# Scene Control (atmosphere, facts, locations, objects)
│   │   │   ├── LoreRulesPanel.tsx     # Dynamic lorebook rules matching and temporary lore editor
│   │   │   ├── StoryJournalPanel.tsx  # Story Memory (summary, general entries, cast journals, tasks)
│   │   │   └── StoryWorldPanel.tsx    # Story profile settings, permanent cast identity, world profiles
│   │   └── MainLayout.tsx         # Layout coordinator. Mounts sidebar, chat, and active editor panel
│   ├── AppProviders.tsx           # Mounts state managers and injects AppContext into children
│
├── components/                    # Global Shared and Reusable UI Components
│   ├── ui/                        # Low-level primitive styling components (Phase 5)
│   │   ├── TextArea.tsx           # Custom textarea component with standard padding
│   │   └── TextInput.tsx          # Custom text input with form validation attributes
│   ├── ChatHeader.tsx             # Top bar rendering active story name, status, and debug modal trigger
│   ├── ErrorBoundary.tsx          # Top-level React Error Boundary to catch render crashes (Phase 13)
│   ├── LoreEditor.tsx             # Generic reusable editor + list rendering for Lorebook arrays
│   ├── PendingUpdatesPanel.tsx    # Review bar for AI suggested scene/cast edits before applying
│   └── Sidebar.tsx                # Collapsible navigation showing Stories, Reusable Templates, and Worlds
│
├── constants/
│   └── defaultData.ts             # Built-in fallback stories, worlds, cast presets, and LLM hyperparameters
│
├── context/                       # Shared React Contexts for Hooks
│   ├── AppContext.tsx             # Combined API context hosting app-wide managers and states
│   ├── ChatContext.tsx            # Context hosting message histories and editing states
│   ├── GenerationContext.tsx      # Context hosting streaming statuses, abort tokens, and progress
│   ├── LoreContext.tsx            # Context hosting active lore memories and pending updates
│   └── StoryContext.tsx           # Context hosting stories, worlds, characters list states
│
├── features/                      # Isolated Feature-Driven Business Modules (Phase 4)
│   ├── characters/
│   │   └── CharacterSheet.tsx     # Profile configurations for reusable character templates
│   ├── chat/
│   │   ├── ChatContainer.tsx      # Orchestration wrapper around ChatView and Composer
│   │   ├── ChatMessage.tsx        # Single message item wrapped in React.memo for high performance
│   │   ├── ChatView.tsx           # Message feed with scrolling, editing, and options select
│   │   └── Composer.tsx           # User input textarea with generation cancel/retry, and dropdowns
│   ├── debugging/
│   │   └── DebugModal.tsx         # Real-time lore matching keywords analysis and full system prompt preview
│   ├── lore/
│   │   ├── LoreInspector.tsx      # Inspector detail component for specific lore items
│   │   ├── LoreMemoryPanel.tsx    # Display of items currently injected in the active prompt
│   │   └── loreReducer.ts         # Reducer for local lore features
│   ├── stories/
│   │   ├── Landing.tsx            # Initial landing view for blank storage (Welcome dashboard)
│   │   └── StoryCreationSheet.tsx # Stepped story setup (select world, picker for cast, greeting)
│   └── worlds/
│       └── WorldSheet.tsx         # Layout for world descriptions, rules, and sub-locations list
│
├── hooks/                         # Decoupled Action Reducer Wrappers (Controller Layer)
│   ├── useAppManager.ts           # Central global manager. Composes sub-hooks, binds reducers and dispatches
│   ├── useCharacterActions.ts     # Identity profiles, presence, and template CRUD actions
│   ├── useChatActions.ts          # Chat operations (reset, rollback, editing, option selections)
│   ├── useGeneration.ts           # Generation workflow (stream abort, retry, tokencount progress)
│   ├── useImportExport.ts         # JSON file serializers for character, world, and story backup bundles
│   ├── useLoreActions.ts          # Runtime lore book mutations (story/world/character lore, temporary lore)
│   ├── useStateUpdates.ts         # AI-driven state update extraction ("Extract Updates" pipeline)
│   ├── useStoryActions.ts         # Story metadata mutations, directory notes, and story CRUD
│   └── useWorldActions.ts         # Reusable world metadata and location sub-modules CRUD
│
├── reducers/                      # Pure State Reducers
│   ├── chatReducer.ts             # Active chat history feed array, message edit/options indices
│   ├── generationReducer.ts       # Streaming state toggles, estimated tokens, percent progress
│   ├── loreReducer.ts             # Active matching lore list and AI-pending suggested state updates array
│   └── storyReducer.ts            # Stories, worlds, character lists, active states, active window views
│
├── services/                      # Factual Data Layer and Outer APIs
│   ├── koboldApi.ts               # KoboldCpp stream connection, token counts, and post-processing filters
│   ├── lore.ts                    # In-context keywords matching, sorting, and prompt budgeting
│   ├── normalizers.ts             # Schema enforcement, array fields parse, and payload standardizers
│   ├── prompt.ts                  # Master builder for LLM prompts, formatters for contexts, memory, cast rules
│   └── repository.ts              # Persistence API managing localStorage keys
│
├── utils/
│   ├── appHelpers.ts              # High-level state modifiers (JSON merge, cast ID mapping, alternative inject)
│   └── helpers.ts                 # Low-level utilities (GUIDs, keywords array parsers, audio ctx singletons)
│
├── index.html                     # Root HTML template
├── package.json                   # Vite dependencies configuration
├── tsconfig.json                  # TypeScript checking setup
└── vite.config.js                 # Vite bundler parameters
```

---

## 🏗️ Architectural Summary

M.I.R.A. is built as a **decoupled, event-driven state machine** using modern React patterns, designed to transition smoothly into a desktop/mobile build backed by SQLite (such as with Tauri).

```txt
┌─────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                    │
│   MainLayout ─── Mounts Sidebar, Chat Features, Panels      │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                        CONTROLLER LAYER                     │
│   useAppManager (Central Controller Context Coordinator)    │
│      ├─ useStoryActions       ├─ useChatActions             │
│      ├─ useCharacterActions   ├─ useGeneration              │
│      ├─ useWorldActions       ├─ useStateUpdates            │
│      └─ useLoreActions        └─ useImportExport            │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                        BUSINESS LOGIC                       │
│    Reducers: storyReducer, chatReducer, loreReducer         │
│    APIs & Services: koboldApi, lore matching, prompt        │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                    │
│    repository.ts ─── LocalStorage Persistence Layer          │
└─────────────────────────────────────────────────────────────┘
```

### 1. The Presentation Layer
Contains React features and split control panels under `src/app/layout/panels/` and `src/features/`. These components are pure, stateless templates that do not contain heavy business logic; they render inputs, detail sections, and invoke event handlers passed down via the **App Context Controller**.

### 2. The Controller Hook Layer (`src/hooks/`)
Rather than housing heavy logic in `App.tsx`, functions are decoupled into isolated controllers. Each controller performs pure mutations on state drafts before submitting them to Reducer dispatches and persisting them via the Data Access layer.

### 3. The Pure State Layer (`src/reducers/`)
State management is handled through four pure state reducers (`storyReducer`, `chatReducer`, `loreReducer`, and `generationReducer`) instead of multiple `useState` hooks. This ensures atomic updates, predictable state history, and easy serializability.

### 4. The Service Layer (`src/services/`)
- **`prompt.ts`**: Reconstructs the complete LLM prompt layout. It merges objective facts (Smart Current Context), recent history window, active lore books, permanent character profiles, and temporary director notes.
- **`lore.ts`**: Analyzes the recent text window and compares it to keywords in character, story, and world lorebooks to select and trigger relevant contextual injection without exceeding token boundaries.
- **`koboldApi.ts`**: Connects to the local KoboldCpp server endpoint via HTTP, performing streaming SSE parsing, prompt token counts, and post-generation reply cleanups.

### 5. The Data Access Layer (`src/services/repository.ts`)
Acts as a dynamic gateway switching between `localStorageEngine.ts` (for the browser fallback view) and `sqliteEngine.ts` (for native Tauri desktop execution). It manages write-through caching and persistent saves for active stories, templates, worlds, and settings.

---

## 🔁 Master Pipeline Data Flows

### A. The Story Memory and Lore Prompt Injection Pipeline
```txt
1. User types message and clicks Send.
2. useGeneration triggers inspectLoreInjection():
   - Gathers recent chat window + director notes.
   - Searches combined story/world/character lorebooks for keyword matches.
   - Updates active lore memory and writes matches to repository.
3. useGeneration invokes buildMessagesForRequest():
   - System Prompt constructed (prompt.ts):
     * Inserts Story Summary, general journals, and active tasks.
     * Inserts Smart Current Context (time, atmosphere, locations, objects).
     * Inserts Permanent Cast Identity profiles + Cast States (moods, secrets).
     * Appends triggered Lorebook entries (limited by budget).
     * Appends Private Scene Guidance (Director Notes).
     * Appends Character-Specific rules + General Rules.
4. Messages submitted to streamChatCompletion() (koboldApi.ts).
```

### B. The State Update Extraction ("Extract Updates") Pipeline
```txt
1. User clicks "Extract" in Composer or Panels.
2. useStateUpdates.ts extracts recent chat history (last 12 exchanges).
3. System prompt acts as a strict JSON extraction engine, evaluating facts.
4. LLM returns structured JSON containing list of delta states:
   {"updates": [{"category": "location", "title": "Change location", "to": "Mira's room"}]}
5. MainLayout displays structured suggestions in PendingUpdatesPanel.tsx.
6. User reviews, toggles checkbox list, and clicks "Apply".
7. useAppManager triggers applySelectedPendingUpdates():
   - Merges delta states atomically into Story Memory, Cast State, and Current Context.
   - Normalizes next context schemas and syncs related director notes.
   - Saves final updated Story list structure to Storage repository.
```

---

## 🛠️ Performance & Quality Controls Applied

Throughout the refactoring, several core stability improvements were implemented to guarantee perfect fluid behavior:

1. **Stable Keys in Chat Feed (`src/features/chat/ChatView.tsx`)**:
   - *Problem:* Rendering chat elements based on content slices forced the entire DOM element to unmount/remount on every single stream chunk, causing flickering scrollbars.
   - *Solution:* Replaced with stable, unique indices (`message.id || msg-${index}`), allowing React to selectively render only the changing character text node.
2. **Atomic Scene Control Updates (`src/hooks/useStoryActions.ts`)**:
   - Saves both current context facts and director guidance notes atomically in a single write operation, ensuring consistency and preventing race conditions or skipped saves.
3. **AudioContext Singleton Lifetime (`src/utils/helpers.ts`)**:
   - *Problem:* Playback sound effects created a new audio node on every message, crashing browsers once browser boundaries were exceeded.
   - *Solution:* Enforced a single lazily-created `AudioContext` singleton.
4. **Boolean Loading Lockouts (`src/hooks/useAppManager.ts`)**:
   - Fixed the `extractStateUpdates` toggle mechanism by mapping `setIsExtractingUpdates` to conditionally dispatch start and complete events. This prevents the composer from getting stuck in a disabled state after update extraction.
