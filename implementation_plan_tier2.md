# Tier 2 UX & Design Polish — Implementation Plan

This plan addresses all 7 features from the `Tier 2: UX & Design Polish` section of the feature suggestions.

## User Review Required

> [!IMPORTANT]
> - **Page Breaks:** Do you prefer page break indicators to visually push content down (creating a gap like MS Word) or simply draw a dashed line *over* the content to show where the PDF will cut it? My plan uses a dashed line overlay for simplicity and accuracy.
> - **Dark Mode:** Should dark mode apply *only* to the paper preview, or to the entire app interface? (The editor is already somewhat dark-themed).
> - **Destructive Actions:** For deleting a section, I propose an Undo Toast ("Section deleted. [Undo]") since we already have a robust Undo stack. Is this preferable to a "Hold to delete" button?

## Open Questions

- **Arrangement Notes Location:** Should the band notes be rendered at the very top of the chart (below the Title/Metadata) or at the very bottom of the chart? I will default to top, right under the metadata.
- **Time Signature default:** Should the default time signature be `4/4` or empty?

## Proposed Changes

---

### UI & Editor (index.html, style.css)

#### [MODIFY] index.html
- **Shortcut Cheat Sheet:** Add a `?` button to `.toolbar-actions`. Add a `<div id="shortcuts-modal" class="modal">` containing a table of shortcuts (`Cmd+Z`, `Cmd+Shift+Z`, `Cmd+H`, `Cmd+S`, `Cmd+E`, `?`).
- **Time Signature:** Add a `<select id="song-timesig">` in the sidebar below BPM. Options: `4/4, 3/4, 6/8, 2/4, 12/8`.
- **Arrangement Notes:** Add a `<textarea id="arrangement-notes">` in the sidebar.
- **Dark Mode Toggle:** Add a `<button id="toggle-dark-mode">` in the `.preview-header`.
- **Library Enhancements:** Add a search input `<input type="text" id="library-search" placeholder="Search charts...">` and a sort select `<select id="library-sort">` to the Library pane.
- **Toast Container:** Add `<div id="toast-container">` for the undo toast.

#### [MODIFY] style.css
- **Page Break Indicators:** Add `.page-break-indicator` (absolute positioned, dotted line, `width: 100%`, `height: 1px`).
- **Dark Mode:** Add `#chart-preview-paper.dark-mode` using CSS `filter: invert(1) hue-rotate(180deg)` to perfectly invert white to black while preserving the hue of chord colors (blue stays blue, red stays red).
- **Library UI:** Add styles for `.chart-meta` (smaller text for key, date), `.favorite-btn` (star icon), and `.toast`.

---

### Logic & State Management (app.js)

#### [MODIFY] app.js
- **State Expansion:** 
  - Add `timeSignature` (default `'4/4'`) and `arrangementNotes` (default `''`) to the main `state` object.
  - Wire up event listeners to `song-timesig` and `arrangement-notes` to update state and trigger `pushUndo()` and `autoSave()`.
- **Preview Rendering:**
  - Update `renderPreview()` to include the Time Signature next to the BPM.
  - Render the Arrangement Notes as a styled `<div>` below the header.
  - **Page Breaks:** After `renderPreview()` completes, calculate the total height of `#chart-preview-paper`. For every `792px` (standard PDF letter height at our 1pt=1px scale), insert a `.page-break-indicator` line.
- **PDF Export:**
  - Update PDF generation to print the Time Signature next to BPM.
  - Add support for rendering the Arrangement Notes block in the PDF.
- **Saved Charts Library:**
  - Update the save function (`saveChartToLibrary()`) to inject `key`, `sectionsCount`, `lastModified` (timestamp), and `isFavorite` into the stored chart metadata.
  - Rewrite `loadChartsList()` to use the search input and sort dropdown. Render the extra metadata in the list items. Wire up the favorite star toggle.
- **Destructive Confirmations:**
  - In `buildSectionCard()`, change the delete button's behavior. Instead of instantaneous deletion, remove the section, trigger `pushUndo()`, and show a Toast: "Section deleted. [Undo]". Clicking Undo will call `undo()`.

## Verification Plan

### Manual Verification
- Test creating a chart that exceeds 792px and verify a dashed line appears exactly where the PDF page break occurs.
- Toggle dark mode and ensure chord colors are still legible and correctly hued.
- Create a chart, add a time signature and notes, export the PDF, and ensure they render correctly in the exported document.
- Delete a section, verify the toast appears, click Undo on the toast, and verify the section returns.
- Save multiple charts, favorite one, change the sort order, and verify the list updates correctly.
