# M.I.R.A. React App

This is a React/Vite conversion of the vanilla JavaScript M.I.R.A. roleplaying chatbot UI.

## What is included

- React component structure instead of direct DOM mutation
- LocalStorage repository layer preserved for now
- KoboldCpp OpenAI-compatible chat endpoint support
- Streaming responses
- Story, world, character, multi-character cast, lorebook, temporary lore, active lore, director notes, and Current Context support
- Story/character/world import and export
- Debug modal with lore matching and prompt preview
- Extract Updates workflow that applies accepted suggestions into Current Context
- CSS migrated from the original app

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

KoboldCpp should be running separately at:

```txt
http://localhost:5001
```

## Tauri/SQLite next step

The current data layer is in `src/services/repository.js`. For the Tauri version, replace this repository with a SQLite-backed repository while keeping the React components mostly unchanged.
