# Phase B Smoke Test Checklist

> Purpose: verify that the reconnected controller layer works end-to-end after the `useAppManager` integration work.
> Date: 2026-05-27

## 1. Boot / Navigation
- [ ] App loads without crashing
- [ ] Landing view appears when no active story is selected
- [ ] Sidebar lists stories, characters, and worlds
- [ ] Switching between landing / story / character / world views works

## 2. Story lifecycle
- [ ] Click **New Story**
- [ ] Story creation sheet opens
- [ ] Select a world and at least one character
- [ ] Start the story successfully
- [ ] Story becomes active in the sidebar
- [ ] Switch to another story and back
- [ ] Delete active story and confirm runtime data is removed

## 3. Chat actions
- [ ] Send a message
- [ ] Continue last reply
- [ ] Elaborate last reply
- [ ] Reroll last reply
- [ ] Retry last generation after failure/cancel
- [ ] Cancel generation while streaming
- [ ] Roll back last exchange
- [ ] Reset chat to opening message

## 4. Message editing
- [ ] Start editing a user message
- [ ] Save edit without regeneration
- [ ] Save edit with regeneration
- [ ] Edit an assistant message with alternatives
- [ ] Delete messages from a selected index
- [ ] Regenerate from a selected message
- [ ] Select a different assistant option when alternatives exist

## 5. Character / world management
- [ ] Create a blank character template
- [ ] Save character edits
- [ ] Add character to active story
- [ ] Change character presence to active/inactive
- [ ] Remove character from active story
- [ ] Create a blank world
- [ ] Save world edits
- [ ] Assign a world to the active story
- [ ] Delete unused character/world templates

## 6. Lore / state update flows
- [ ] Refresh active lore
- [ ] Edit story lore entries
- [ ] Edit world lore entries
- [ ] Edit character lore entries
- [ ] Save temporary lore
- [ ] Clear temporary lore
- [ ] Extract state updates from recent chat
- [ ] Toggle pending updates individually
- [ ] Apply selected pending updates
- [ ] Reject all pending updates

## 7. Persistence sanity
- [ ] Refresh/restart app and confirm active story reloads
- [ ] Chat history persists for active story
- [ ] Lore memory persists
- [ ] Story/world/character edits persist

## 8. Regression checks for Phase B
- [ ] `PendingUpdatesPanel` works with array-based `selectedPendingUpdateIds`
- [ ] No non-UI business logic imports from `ChatView.tsx`
- [ ] `useAppManager` no longer returns no-op stubs for core wired flows
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` succeeds
