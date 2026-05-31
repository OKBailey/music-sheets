# Implementation Plan — Music Chart Creator Fixes

This implementation plan details the changes necessary to fix all 13 issues highlighted in the code review of 2026-05-29 for the Music Chart Creator application.

## User Review Required

> [!NOTE]
> The changes affect the core application layout and state logic (transposition, zoom rendering, local storage persistence, undo/redo handling, import validation, and rendering details).
> There are no breaking data changes, but existing library entries will be migrated automatically to include a unique ID for robust deduplication.

## Proposed Changes

---

### [Component Name: App Logic & Transpose Engine]

Fixes transposition regex, dead code, local storage storage logic, JSON validation, batch transposition logic, undo/redo batching, and text validation.

#### [MODIFY] [app.js](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/app.js)

- **Issue 1: Transposition Regex**
  - Simplify `transposeChordLine` to split chord root and quality correctly, ensuring voicings like `maj7`, `m7b5`, `7#9`, `sus2`/`sus4`, and `dim7` are correctly transposed.
  - Delete `transposeChordToken` if it is indeed dead code, or reuse it cleanly.

- **Issue 2: Zoom Style**
  - Update `applyZoom` to set `chartPaper.style.zoom = scale` instead of CSS `transform: scale()` with layout hacks. Reset any inline transform wrapper adjustments.

- **Issue 3: LocalStorage Quota**
  - Detect `QuotaExceededError` in both `autoSave` and `saveChartToLibrary`. Alert the user on library saving quota failure, advising them to export JSON or prune the library.
  - Introduce `id` in the initial chart state, auto-generating it if missing. Use the `id` for library deduplication in `saveChartToLibrary`, `loadChartFromLibrary`, and `deleteChartFromLibrary`.

- **Issue 4 & 12: Import JSON Validation & UTF-8 Check**
  - Update `importJSON` to check `Array.isArray(data.sections)` and verify each section has `id`, `type`, and `Array.isArray(lines)`.
  - Pass the explicit `'UTF-8'` argument to `FileReader.readAsText(file, 'UTF-8')`.
  - Validate the imported text by checking for the replacement character `\uFFFD`, raising an error and blocking import if corrupted encoding is detected.
  - Add `charset=utf-8` to the JSON Blob type in `exportJSON`.

- **Issue 5: Batch Transpose Selected Sections**
  - Prevent `batchTransposeSelected` from mutating the global `state.key`. Only transpose the chords inside the selected sections, utilizing the global key only to determine flats/sharps usage.

- **Issue 6: Dead Code Cleanup**
  - Remove unused handlers: `handleLineDragStart`, `handleLineDragEnd`, `handleLineDragOver`, `handleLineDragEnter`, `handleLineDrop`.

- **Issue 7 & 8: Undo/Redo Batching & Focus Duplicates**
  - Update `UndoManager` to:
    - Avoid duplicate consecutive snapshots in `push()`.
    - Automatically save changes in the current state on `undo()` if we're at the top of the stack and it is different from the stack top.
    - Automatically call `commitTextEdit()` when pushing a new state.
  - Replace focus-based `pushUndo()` on all text inputs with `snapshotTextEdit()`, and hook up `commitTextEdit()` on input blur.
  - Define the missing `updateUndoRedoButtons()` utility.

- **Issue 9: Shift-click Range Selection**
  - Implement `selectSectionRange(sectionId)` using the last selected section or first active selection as anchor.
  - Update checkbox and header click listeners to route to `selectSectionRange` if `e.shiftKey` is held, and call `toggleSectionSelect` with the event object if Cmd/Ctrl is held.

- **Issue 13: Verse 4+ PDF Colors**
  - Map verses 4 and 5 in the PDF generation block to `#0070c0` and `#00b050` respectively, matching style preview colors.

---

### [Component Name: User Interface]

Updates modal styles, moves inline CSS to `style.css`, and switches default preview typography.

#### [MODIFY] [style.css](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/style.css)

- **Issue 10: Preview Font**
  - Switch `--chart-font` from Verdana to `Helvetica Neue, Helvetica, Arial, sans-serif` to match the PDF export layout.

- **Issue 11: Modal Styles**
  - Add modal layout classes (`.modal-overlay`, `.modal-content`, `.modal-title`, `.modal-description`, `.modal-textarea`, `.modal-footer`) to `style.css` to centralize layout properties.

#### [MODIFY] [index.html](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/index.html)

- **Issue 11: Inline Style Cleanup**
  - Clean up HTML structure by replacing inline styles on `#import-modal` and its children with the new centralized modal classes.

---

## Verification Plan

### Automated Tests
- Run browser validation to verify that:
  - Complex chords like `C#m7b5` are transposed cleanly.
  - Zooming recalculates scroll sizes correctly without page clippings.
  - Shift-clicking ranges selects all cards correctly.
  - Invalid JSON files fail import gracefully without page crashes.

### Manual Verification
- Test all major features in the browser: adding sections, drag/drop, metadata edits, import/export, and PDF generation with verse 4+ colors.
