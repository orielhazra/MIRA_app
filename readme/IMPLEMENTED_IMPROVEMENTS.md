# Implemented Improvements

This build implements the requested changes:

- Added generation Stop support using AbortController.
- Added Retry for the most recent generation request.
- Stabilized Current Context editing with a dirty/saved indicator so parent re-renders do not wipe unsaved edits.
- Rebuilt Current Context when switching a story to a different world.
- Synced cast add/remove operations with Current Context and Director Notes.
- Added clearer validation errors for imported character/world JSON.
- Added autosave-style status messaging in the Current Context panel.
- Improved responsive layout for smaller screens by stacking the editor below chat on tablets and preserving navigation on mobile.
- Expanded right-panel lore editing to all cast members, not just the current focus character.
- Improved Debug modal with prompt section estimates and copy buttons for system prompt, full request prompt, and messages JSON.
- Removed user-facing “main character” language and moved to active/inactive cast designation. Legacy `mainCharacterId` fields remain internally only for older saved/imported stories.

Validation performed:

```bash
npm run build
```

Result: build succeeded.
