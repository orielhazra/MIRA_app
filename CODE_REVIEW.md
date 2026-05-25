# MIRA App — Code Review Report

> **Commit:** `878ff17` (Initial commit)  
> **Checked:** 2026-05-24  
> **Updated:** 2026-05-24 (post-fix)  
> **Build status:** ✅ Passes `vite build` with 0 errors  
> **ESLint:** 0 errors, 8 warnings  

---

## ✅ FIXED — Critical Bug 1: Array fields become strings after user edits → crash on `.join()`

**Status:** ✅ Fixed  
**Files patched:** `src/components/Sheets.jsx`, `src/components/EditorPanel.jsx`

### Original problem

When a user edited "Aliases", "Prompt Keywords", or location "Keywords", the raw string value overwrote the array in draft state. On the next render, `.join(", ")` was called on a string, throwing `TypeError`.

```jsx
// BEFORE — broken:
<TextInput
  label="Aliases"
  value={(draft.aliases || []).join(", ")}
  onChange={(value) => update("aliases", value)}  // ← stores a STRING
/>
// Next render: ("some string").join(", ") → TypeError!
```

**Affected fields:**
- `CharacterSheet`: `aliases`, `promptKeywords`
- `WorldSheet`: `promptKeywords`, location `keywords`
- `StoryCastIdentityCard` (EditorPanel): `aliases`, `promptKeywords`

### Fix applied

Added `import { parseKeywords } from "../utils/helpers.js"` to both files and wrapped all affected `onChange` handlers:

```jsx
// AFTER — fixed:
<TextInput
  label="Aliases"
  value={(draft.aliases || []).join(", ")}
  onChange={(value) => update("aliases", parseKeywords(value))}  // ← stores an ARRAY
/>
```

`parseKeywords("a, b, c")` → `["a", "b", "c"]` — the value stored in draft state is always an array, so `.join(", ")` never fails on re-render.

---

## ✅ FIXED — Critical Bug 2: Story Journal data is never included in the LLM prompt

**Status:** ✅ Fixed  
**File patched:** `src/services/prompt.js`

### Original problem

`normalizeStoryMemory()` in `normalizers.js` produces:
```js
{ summary, generalJournal, characterJournals, tasks }
```

But `formatStoryMemory()` in `prompt.js` was reading stale field names:
```js
source.coreSummary    // ← undefined
source.recentEvents   // ← undefined
source.openThreads    // ← undefined
source.characterMemory // ← undefined
source.archived       // ← undefined
source.promptToggles  // ← undefined
```

**Result:** The system prompt always showed `"No story memory included."` — the entire Story Journal feature was invisible to the AI.

Additionally, `buildSmartPromptContext()` referenced the same stale fields (`storyMemory.coreSummary`, `.recentEvents`, etc.) in its `triggerText` construction, so journal content was also invisible to the lore keyword matching system.

### Fix applied — two changes in `prompt.js`

**Change 1: Rewrote `formatStoryMemory()` (line 237)** to read the actual journal schema:

```js
function formatStoryMemory(memory) {
  const source = memory && typeof memory === "object" ? memory : {};
  const sections = [];

  if (String(source.summary || "").trim()) {
    sections.push(`Core Summary:\n${compactText(source.summary, 900)}`);
  }

  const activeJournal = (Array.isArray(source.generalJournal) ? source.generalJournal : [])
    .filter((entry) => entry.active !== false && String(entry.content || "").trim());
  if (activeJournal.length) {
    sections.push(`General Journal:\n${activeJournal.map(...).join("\n")}`);
  }

  // + characterJournals and activeTasks sections

  return sections.length ? sections.join("\n\n") : "No story memory included.";
}
```

Now correctly includes:
| Journal Section | Source Field | Included When |
|---|---|---|
| Core Summary | `source.summary` | Non-empty string |
| General Journal | `source.generalJournal` (active entries) | Has active entries with content |
| Character Journal | `source.characterJournals` (active entries) | Has active entries with content |
| Active Tasks | `source.tasks` (active entries) | Has active entries with content |

**Change 2: Updated `buildSmartPromptContext()` trigger text (line 160)** — replaced stale field references:

```js
// BEFORE — stale fields:
story?.storyMemory?.coreSummary,
story?.storyMemory?.recentEvents,
story?.storyMemory?.openThreads,
story?.storyMemory?.characterMemory,

// AFTER — actual schema:
story?.storyMemory?.summary,
...(Array.isArray(story?.storyMemory?.generalJournal)
  ? story.storyMemory.generalJournal.filter((e) => e.active !== false).map((e) => e.content)
  : []),
```

This ensures journal content is included in the lore trigger text scan, so lore entries can match keywords found in journal entries.

---

## 🟠 REMAINING MISMATCHES (Data flow / logic inconsistencies)

### 3. `createInitialCurrentContext(world, storyCharacters)` — extra arg silently discarded

**File:** `App.jsx` — `assignWorldToStory()`

```js
const rebuiltContext = createInitialCurrentContext(world, storyCharacters);
```

But `createInitialCurrentContext` only accepts one parameter:
```js
function createInitialCurrentContext(world) { ... }
```

The `storyCharacters` argument is silently ignored. If the intent was to include character data in the initial context, that logic is missing.

---

### 4. `syncDirectorNotesFromContext()` doesn't actually sync

**File:** `App.jsx`

```js
function syncDirectorNotesFromContext(notes, context) {
  return normalizeDirectorNotes(notes);  // ← ignores 'context' entirely
}
```

The function name implies it syncs notes FROM context, but the `context` argument is completely unused. Meanwhile, the reverse function `syncCurrentContextFromDirectorNotes()` DOES use both arguments. This suggests incomplete implementation.

---

### 5. `saveSceneControl` has a dual-path that may skip saves

**File:** `EditorPanel.jsx`

```js
function saveSceneControl(contextDraft, directorDraft) {
  if (onSaveSceneControl) onSaveSceneControl(contextDraft, directorDraft);
  else {
    onSaveCurrentContext?.(contextDraft);
    onSaveDirectorNotes?.(directorDraft);
  }
}
```

When `onSaveSceneControl` is provided (it always is from `App.jsx`), it saves both context and director notes atomically. But the `else` fallback only calls optional chaining — if those callbacks are undefined, the save silently fails.

---

### 6. `.app` grid layout class mismatch

**File:** `styles.css`

The base CSS sets:
```css
.app {
  grid-template-columns: 280px minmax(420px, 1fr) 360px;
}
```

But `App.jsx` only ever applies class `with-editor` or `without-editor`:
```jsx
<div className={`app ${shouldShowEditor ? "with-editor" : "without-editor"}`}>
```

The base `.app` 3-column rule is always overridden by either `.with-editor` or `.without-editor`. The base rule is effectively dead CSS.

---

### 7. No UI for KoboldCpp API URL configuration

**File:** `koboldApi.js`, `repository.js`

The base URL defaults to `http://localhost:5001` and can be changed via:
```js
repository.settings.setKoboldBaseUrl("http://...")
```

But there is **no UI anywhere** to change this setting. Users must manually edit localStorage or use the browser console. For an app that requires a running KoboldCpp instance, this is a significant usability gap.

---

## 🟡 ESLINT WARNINGS (8 total — unchanged)

| # | File | Line | Message |
|---|------|------|---------|
| 1 | `App.jsx` | 1319 | `'context' is defined but never used` |
| 2 | `App.jsx` | 1741 | `'formatAcceptedUpdateAsLore' is defined but never used` |
| 3 | `EditorPanel.jsx` | 45 | `'directorStatus' is assigned a value but never used` |
| 4 | `EditorPanel.jsx` | 80 | `'saveDirectorNotes' is defined but never used` |
| 5 | `EditorPanel.jsx` | 109 | `'saveCurrentContext' is defined but never used` |
| 6 | `EditorPanel.jsx` | 1076 | `'buildStoryMemoryDraft' is defined but never used` |
| 7 | `EditorPanel.jsx` | 1210 | `'DirectorNotesPanel' is defined but never used` |
| 8 | `prompt.js` | 269 | `'story' is assigned a value but never used` |

---

## 🗑️ DEAD CODE

| Component / Function | File | Notes |
|---|---|---|
| `DirectorNotesPanel` | `EditorPanel.jsx:1211` | Full component (90+ lines) never rendered; superseded by `CurrentContextPanel` |
| `buildStoryMemoryDraft` | `EditorPanel.jsx:1077` | Superseded by `buildStoryJournalDraft` |
| `formatAcceptedUpdateAsLore` | `App.jsx:1741` | Never called |
| `saveDirectorNotes` (local) | `EditorPanel.jsx:81` | Overridden by the scene control save path |
| `saveCurrentContext` (local) | `EditorPanel.jsx:110` | Overridden by the scene control save path |
| `directorStatus` state | `EditorPanel.jsx:46` | Assigned but never displayed |
| Base `.app` 3-col grid | `styles.css:19` | Always overridden by `.with-editor` / `.without-editor` |

---

## ⚠️ CODE QUALITY ISSUES

### 8. `ChatView.jsx` — Unstable `key` prop causes re-mounts during streaming

```jsx
key={`${index}-${message.role}-${message.content?.slice(0, 20)}`}
```

During streaming, the message content changes on every chunk, which changes the key and forces React to unmount/remount the message component. This causes:
- Loss of scroll position
- Flickering
- Unnecessary DOM thrashing

**Fix:** Use a stable key based on message index only, or assign stable IDs to messages:
```jsx
key={message.id || `msg-${index}`}
```

---

### 9. `playCompletionSound()` — Leaks AudioContext instances

**File:** `helpers.js`

```js
const audioContext = new AudioContext();
```

A new `AudioContext` is created every time a generation completes. Browsers limit the number of active AudioContexts (typically ~6). After enough generations, this will throw.

**Fix:** Reuse a singleton AudioContext:
```js
let _audioCtx = null;
function getAudioContext() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
```

---

### 10. `setTimeout` status clearers — not cleaned up on unmount

Throughout the app:
```js
setStatus("Saved.");
setTimeout(() => setStatus(""), 1500);
```

If the component unmounts before the timeout fires, React will warn about state updates on unmounted components. Should use a ref to track mounted state, or `useEffect` cleanup.

---

### 11. `StoryCastIdentityCard` — deep object dependency in useEffect

**File:** `EditorPanel.jsx`

```jsx
useEffect(() => {
  setDraft(character);
  setStatus("");
}, [character]); // ← new object reference on every parent render
```

The `character` prop is a new object reference on every render (from `.map()` or `.find()`), causing this effect to fire on every render, resetting local edits.

**Fix:** Use a stable key for comparison:
```jsx
useEffect(() => {
  setDraft(character);
  setStatus("");
}, [character?.id]); // Only reset when the character identity changes
```

---

### 12. No React Error Boundary

If any child component throws during render, the entire app white-screens. There is no error boundary to catch and display a recovery UI.

---

### 13. `localStorage` — no size limit handling beyond `try/catch`

**File:** `repository.js`

The app stores stories, characters, worlds, chats, lore memory, and settings all in localStorage (typically 5-10 MB). Long-running stories with many messages could exceed this limit. The error handling shows an alert but doesn't offer recovery options (e.g., pruning old chats).

---

## 💡 SUGGESTIONS

### Architecture

| # | Suggestion | Priority |
|---|---|---|
| 1 | **Add a settings panel** with a UI for KoboldCpp base URL, max tokens, temperature, etc. | High |
| 2 | **Extract App.jsx state into a reducer** (`useReducer` or Zustand) — the component is 1815 lines with 20+ state variables | High |
| 3 | **Add React Error Boundary** wrapping the main content area | High |
| 4 | **Add message IDs** for stable React keys and better edit/delete operations | Medium |
| 5 | **Debounce lore memory saves** to reduce localStorage writes during rapid state changes | Medium |
| 6 | **Add data migration/versioning** to `repository.js` for future schema changes | Medium |
| 7 | **Split `App.jsx` into custom hooks**: `useStory`, `useChat`, `useLore`, `useImportExport` | Medium |

### UX

| # | Suggestion | Priority |
|---|---|---|
| 8 | **Show connection status** to KoboldCpp (ping/health check) | Medium |
| 9 | **Add undo/redo** for chat operations (rollback, delete, regenerate) | Low |
| 10 | **Persist unsaved editor drafts** to prevent data loss on accidental navigation | Medium |
| 11 | **Add keyboard shortcuts** for common actions (Ctrl+Enter to send, Esc to cancel) | Low |
| 12 | **Responsive sidebar** — add a hamburger toggle instead of just hiding it | Medium |

### Performance

| # | Suggestion | Priority |
|---|---|---|
| 13 | **Memoize `buildSystemPrompt`** — it runs on every render in DebugModal | Medium |
| 14 | **Virtualize the chat message list** for stories with many messages | Low |
| 15 | **Lazy-load `DebugModal`** with `React.lazy()` — it's rarely used | Low |

### Correctness

| # | Suggestion | Priority |
|---|---|---|
| ~~16~~ | ~~**Fix the story memory → prompt pipeline**~~ | ~~Critical~~ ✅ Fixed |
| ~~17~~ | ~~**Fix array field editing**~~ | ~~Critical~~ ✅ Fixed |
| 18 | **Clean up dead code** to reduce bundle size and maintenance burden | Low |
| 19 | **Add `role="menu"` ARIA attributes** to the composer options dropdown for accessibility | Low |
| 20 | **Add `aria-live="polite"`** to the generation status area for screen reader users | Low |

---

## Summary

| Category | Before | After |
|---|---|---|
| 🔴 Runtime Bugs | 2 | **0** ✅ |
| 🟠 Data Mismatches | 5 | 5 |
| 🟡 ESLint Warnings | 8 | 8 |
| 🗑️ Dead Code | 6+ | 6+ |
| ⚠️ Quality Issues | 6 | 6 |
| 💡 Suggestions | 20 | 18 (2 resolved) |

### Files modified by fixes

| File | Changes |
|---|---|
| `src/components/Sheets.jsx` | Added `parseKeywords` import; wrapped 4 `onChange` handlers for aliases/promptKeywords/keywords fields |
| `src/components/EditorPanel.jsx` | Added `parseKeywords` import; wrapped 2 `onChange` handlers in `StoryCastIdentityCard` |
| `src/services/prompt.js` | Rewrote `formatStoryMemory()` to read the journal schema; updated `buildSmartPromptContext()` trigger text references |

### Next priorities

1. **Add a Settings panel** — KoboldCpp URL has no UI, blocking real-world usage
2. **Refactor App.jsx** — 1815 lines with 20+ state variables needs extraction into hooks/reducer
3. **Add React Error Boundary** — any render crash white-screens the whole app
4. **Dead code cleanup** — remove `DirectorNotesPanel`, `buildStoryMemoryDraft`, `formatAcceptedUpdateAsLore`, etc.
