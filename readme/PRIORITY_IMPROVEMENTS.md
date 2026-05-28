# Priority Improvements for M.I.R.A. React App

> **Latest Refactoring Milestone (2026-05-25):**  
> ✅ **Phase 1 Complete**: Split monolithic 1,266-line `EditorPanel.tsx` into modular, feature-oriented panel components under `src/app/layout/panels/`.  
> ✅ **Feature Relocations Complete**: Migrated generic views (`ChatView.tsx`, `Composer.tsx`, `DebugModal.tsx`) to isolated, clean feature folders under `src/features/chat/` and `src/features/debugging/`.  
> ✅ **Key Performance Patches**: Resolved unstable React render keys in the streaming feed, entirely eliminating flickering, lag, and scroll jumping.  
> ✅ **Global Error Handler Wrapped**: Mounted native React `ErrorBoundary` wrapping at the root `main.tsx` runtime.  
> ✅ **Clutter Removed**: Purged all deprecated manager hook files under `src/hooks/` to keep the workspace clean.

## HIGH PRIORITY (Critical for stability & core functionality)

### 1. Complete Tauri/SQLite Migration
- **Why:** Already identified as next step in README, LocalStorage has limitations
- **Impact:** Enables larger datasets, better performance, proper data management
- **Effort:** High (architectural change)
- **Status:** ✅ **Completed** (Implemented `@tauri-apps/plugin-sql` with robust dynamic fallback paths, auto-migration of legacy LocalStorage data into SQLite cache, and IPC security privileges)

### 2. Comprehensive Error Handling
- **Why:** Current error handling is minimal, users see generic failures
- **Impact:** Prevents data loss, improves troubleshooting
- **Effort:** Medium
- **Specifics:** Error boundaries, API error recovery, offline detection
- **Status:** 🟠 **In Progress** (React Error Boundary implemented and wrapped at root-level in `main.tsx` to prevent white-screens on render crashes)

### 3. Data Validation & Integrity
- **Why:** Import validation exists but runtime validation is limited
- **Impact:** Prevents corruption, improves reliability
- **Effort:** Medium
- **Specifics:** Schema validation, data migration system, consistency checks
- **Status:** Not started

### 4. Performance Optimization
- **Why:** Large chat histories and lorebooks will slow down the app
- **Impact:** Maintains responsiveness as data grows
- **Effort:** Medium
- **Specifics:** Virtual scrolling, React.memo optimization, caching
- **Status:** 🟠 **In Progress** (Stable React render keys implemented in ChatView to prevent DOM unmounts/remounts during generation stream)

### 5. State Management Refactor
- **Why:** Heavy prop drilling in App.tsx (1787 lines), difficult to maintain
- **Impact:** Easier development, fewer bugs
- **Effort:** Medium-High
- **Specifics:** Redux/Zustand for complex state
- **Status:** ✅ **Completed** (Refactored heavy state drilling in `App.tsx` into 4 dedicated state reducers managed by `useAppManager.ts` and global `AppContext.Provider` layers)

## MEDIUM PRIORITY (Significant UX improvements)

### 6. Undo/Redo Functionality
- **Why:** Easy to make mistakes in complex editing panels
- **Impact:** User confidence, reduced frustration
- **Effort:** Medium
- **Status:** Not started

### 7. Keyboard Shortcuts
- **Why:** Power users need faster workflows
- **Impact:** Productivity for frequent users
- **Effort:** Low-Medium
- **Status:** Not started

### 8. Search Functionality
- **Why:** No way to find specific messages or lore entries
- **Impact:** Usability for large stories
- **Effort:** Medium
- **Status:** Not started

### 9. Onboarding & Documentation
- **Why:** Complex app with no tutorial, steep learning curve
- **Impact:** New user adoption
- **Effort:** Medium
- **Specifics:** Setup wizard, tooltips, sample templates
- **Status:** Not started

### 10. Mobile Responsiveness Improvements
- **Why:** Current responsive layout is basic
- **Impact:** Usability on tablets/phones
- **Effort:** Medium
- **Status:** Not started

### 11. Loading States & Skeletons
- **Why:** Poor perceived performance during generation
- **Impact:** User experience during waits
- **Effort:** Low
- **Status:** 🟠 **In Progress** (Estimated token counters and real-time generation percentages with loading state feedback implemented)

### 12. Backup/Restore System
- **Why:** No easy way to backup all data
- **Impact:** Data safety, peace of mind
- **Effort:** Medium
- **Status:** Not started

## LOW PRIORITY (Nice-to-have enhancements)

### 13. Theme System (Dark/Light)
- **Why:** User preference, accessibility
- **Impact:** Comfort for different users
- **Effort:** Low-Medium
- **Status:** Not started

### 14. Character Images/Avatars
- **Why:** Visual enhancement for character sheets
- **Impact:** Engagement, visual appeal
- **Effort:** Low
- **Status:** Not started

### 15. Prompt Template Library
- **Why:** Users might want different prompt styles
- **Impact:** Flexibility for advanced users
- **Effort:** Medium
- **Status:** Not started

### 16. Lore Analytics
- **Why:** Understand which lore is actually used
- **Impact:** Optimization insights
- **Effort:** Low-Medium
- **Status:** Not started

### 17. Multiple AI Backend Support
- **Why:** Currently locked to KoboldCpp
- **Impact:** Flexibility, choice for users
- **Effort:** Medium-High
- **Status:** Not started

### 18. Collaboration/Sharing Features
- **Why:** Single-user only currently
- **Impact:** New use cases
- **Effort:** High
- **Status:** Not started

## DEFERRED (Future considerations)

### 19. TypeScript Migration
- **Why:** Large codebase, would be extensive refactor
- **Impact:** Type safety, better IDE support
- **Effort:** Very High
- **When:** After other priorities complete
- **Status:** ✅ **Completed** (Fully rewritten into strict TypeScript `.ts` and `.tsx` scopes. Interfaces fully defined under `src/types/index.ts`.)

### 20. Comprehensive Testing Suite
- **Why:** No tests currently, but app works
- **Impact:** Regression prevention
- **Effort:** High
- **When:** After core features stabilize
- **Status:** Not started

### 21. Plugin/Extension System
- **Why:** Advanced feature, niche use case
- **Impact:** Community contributions
- **Effort:** Very High
- **When:** When core platform is mature
- **Status:** Not started

### 22. Voice Input/Output
- **Why:** Complex integration, limited demand
- **Impact:** Accessibility, convenience
- **Effort:** High
- **When:** After core UX is polished
- **Status:** Not started

---

## Recommended Implementation Order

1. **Phase 1 (Foundation):** Items 1-3 (SQLite migration, error handling, data validation)
2. **Phase 2 (Performance):** Item 4 (Performance optimization)
3. **Phase 3 (Code Quality):** Item 5 (State management refactor)
4. **Phase 4 (Core UX):** Items 6-12 (Undo/redo, shortcuts, search, onboarding, mobile, loading, backup)
5. **Phase 5 (Enhancements):** Items 13-18 (Theme, images, templates, analytics, backends, collaboration)
6. **Phase 6 (Future):** Items 19-22 (TypeScript, testing, plugins, voice)

## Notes

- Each item should be updated with "In Progress" or "Completed" status as work begins
- Add sub-tasks and checklists for each item as needed
- Track actual effort vs estimated effort for future planning
- Consider dependencies between items (e.g., state refactor should happen before adding complex features)
