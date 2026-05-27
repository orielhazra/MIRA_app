# M.I.R.A. (Modular Interactive Roleplaying Assistant) — React App

This is the fully refactored, robust React/Vite application conversion of the vanilla JavaScript M.I.R.A. roleplaying chatbot user interface.

---

## 🚀 Key Features

* **React/Vite Component Structure**: Highly performant React render cycles with stable key mappings to prevent flickering and lag during AI response generation streaming.
* **Modular Controller Layer**: Unloaded business logic from React views into custom hooks (under `src/hooks/`) and pure state reducers (under `src/reducers/`).
* **OpenAI-Compatible KoboldCpp Streaming**: Connects directly to local KoboldCpp servers for rapid streaming and real-time generation metrics (token estimation, progress percentage).
* **Smart Prompting Context**: Automatically evaluates and optimizes LLM prompt payload boundaries based on active story, cast states, locations, and nearby objects.
* **Smart Lorebook Injection**: In-context keyword scanning across character, story, and world lorebooks with automatic priority sorting and prompt budgeting.
* **State Update Extraction ("Extract Updates")**: Analyzes the latest chat log and utilizes the LLM to suggest updates to current scene variables (outfits, locations, secrets) which can be selectively applied with a click.
* **Robust Error Handling**: Outfitted with a global React `ErrorBoundary` wrapper around the root application tree to capture unexpected rendering issues and facilitate easy reload/recovery.

---

## 📂 Project Structure Overview

The project is structured according to clean, layered architectural patterns:

* **`src/app/`**: Global orchestrations, routes, and layout containers.
  - **`src/app/layout/panels/`**: Modular sub-editor control boards extracted from the monolithic panel (Scene Control, Cast State, Story Memory, Lorebook).
* **`src/components/`**: Reusable global components (Sidebar, ChatHeader, PendingUpdatesPanel, and low-level primitive forms).
* **`src/features/`**: Feature-driven business modules (isolated `/chat/`, `/stories/`, `/worlds/`, `/characters/`, `/debugging/`, `/lore/` scopes).
* **`src/hooks/`**: Decoupled state action handlers (controllers mapping state mutations to dispatch).
* **`src/reducers/`**: Pure state machine transition logic (`storyReducer`, `chatReducer`, `loreReducer`, `generationReducer`).
* **`src/services/`**: Factual processing utilities (Kobold API, Prompt builders, Lore-keyword triggers, schema normalizers).
* **`readme/`**: Central knowledge base, code reviews, guidelines, and priority roadmap tracking.

---

## 💻 Run Locally

### 1. Install Node Dependencies
Ensure you have Node.js (version 20+) installed, then run:
```bash
npm install
```

### 2. Launch Local Dev Server
```bash
npm run dev
```
Then open the local Vite URL displayed inside your terminal.

### 3. Setup Local AI Backend
M.I.R.A. connects by default to a local KoboldCpp OpenAI-compatible chat API instance. Ensure KoboldCpp is running separately on your machine:
```txt
http://localhost:5001
```

---

## 📈 Native Desktop & SQLite Database
The application is wrapped natively inside a **Tauri Desktop application**. By default, running via Tauri leverages a high-performance **SQLite database** layer, escaping browser storage limits.

To build the native desktop application locally:
```bash
npm run tauri build
```
*(This will output OS-specific installer formats like .exe, .msi, .dmg, or .deb depending on your host OS.)*

Please refer to the comprehensive guidelines located inside the documentation folder:
* **`readme/architecture_readme.md`**: Deep dive into M.I.R.A.'s data pipelines, architecture model, and layer divisions.
* **`readme/db_migration_guideline.md`**: Step-by-step developer checklist and SQL schemas to implement the Tauri wrapper and SQLite plugin.
