# High-Priority Workflow Enhancements — Implementation Plan

All 7 features from the [project_summary.md](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/project_summary.md) `🚀 High-Priority Workflow Enhancements` section.

---

## Recommended Change Grouping

> [!IMPORTANT]
> I recommend splitting this into **two PRs / change sets** for cleaner review and safer rollback:
>
> **Change Set A** (foundational, low-risk): Undo/Redo, Collapsible Sections, Duplicate+Edit Flow, Section Templates
>
> **Change Set B** (larger surface area, higher interaction risk): Multi-Select & Batch Actions, Line Drag-and-Drop, Search & Replace
>
> Set A has no cross-feature dependencies. Set B features interact with each other (multi-select affects what drag-and-drop does; search & replace touches the same state-mutation paths).

---

## 1. Files to Touch

All paths relative to `/Users/randymitchell/Desktop/Antigravity/music-sheets/`.

### [app.js](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/app.js) (~70% of the work)

| Order | What Changes |
|:---|:---|
| 1 | **Undo/Redo stack** — Add `undoStack[]`, `redoStack[]`, `pushUndo()`, `undo()`, `redo()`. Wrap every state-mutating call (`autoSave`, section CRUD, transpose, import, line edits) with `pushUndo()`. Wire `Cmd+Z` / `Cmd+Shift+Z`. |
| 2 | **Collapsible sections** — Add `section.collapsed` boolean to state. Toggle on header click/chevron. In `buildSectionCard()`, hide `.section-card-body` when collapsed. Persist to localStorage. |
| 3 | **Section templates** — Add `SECTION_TEMPLATES` constant (e.g., "Verse 4-bar", "Chorus 8-bar", "Standard Bridge") with pre-populated lines. Add template picker UI to `addNewSection()`. |
| 4 | **Duplicate + Edit flow** — Enhance existing `dupeBtn` handler (L430-438): auto-increment verse number (already done), scroll to + focus first input of duplicated section, flash highlight animation. |
| 5 | **Multi-select & batch actions** — Add `selectedSectionIds: Set()`. Toggle selection on click (with `Cmd/Ctrl` modifier). Render batch action bar (delete, move, transpose selected). Update drag-and-drop to work with selection groups. |
| 6 | **Line drag-and-drop** — Add `draggable` handle to each `lineItem` in `buildLineItem()`. Handle intra-section and cross-section line moves via `dragstart`/`dragover`/`drop`. Replace the existing ↑/↓ buttons as primary reorder mechanism (keep as fallback). |
| 7 | **Search & Replace** — Add `searchAndReplace(find, replace, scope)` function operating on chord/lyric/instruction content. Wire to a modal or inline bar toggled by `Cmd+H`. Support regex toggle and scope (all sections vs. selected). |

### [index.html](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/index.html)

| Order | What Changes |
|:---|:---|
| 1 | Add **Undo/Redo buttons** to `.toolbar-actions` (between Save and Export PDF). |
| 2 | Add **Search & Replace modal** (similar structure to existing `import-modal`). |
| 3 | Add **batch action floating bar** container (hidden by default, shown when multi-select active). |
| 4 | Add **template picker dropdown** — a `<select>` or popover near the "Add Section" button. |

### [style.css](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/style.css)

| Order | What Changes |
|:---|:---|
| 1 | **Collapsible section** styles — `.section-card-body.collapsed` (height 0, overflow hidden), chevron rotation animation on `.section-collapse-toggle`. |
| 2 | **Multi-select** styles — `.section-card.selected` border/glow state, `.batch-action-bar` positioning and appearance. |
| 3 | **Line drag** styles — `.line-item .line-drag-handle`, `.line-item.dragging`, `.line-item.drag-over` indicators. |
| 4 | **Search & Replace modal** styles — reuse existing modal pattern but with inline find/replace inputs. |
| 5 | **Duplicate flash** animation — `@keyframes section-flash` for the highlight effect on duplication. |
| 6 | **Template picker** — dropdown/popover styling. |

### [project_summary.md](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/project_summary.md)

| Order | What Changes |
|:---|:---|
| Last | Move implemented features from "High-Priority" to "Resolved Engineering Hurdles" or a new "Implemented" section. Document any new keyboard shortcuts. |

---

## 2. New Files to Create

**None required.** The app is a single-page vanilla JS/CSS/HTML project. All enhancements fit cleanly into the existing three files without needing modules or new files.

> [!NOTE]
> If `app.js` gets unwieldy past ~2500 lines, we could extract an `undo.js` module or a `templates.js` data file, but that's optional and can be decided after implementation.

---

## 3. Files to Delete or Rename

**None.** No files need to be deleted or renamed.

---

## 4. Public API Surface Changes

This is a client-side-only app with no external API. Changes visible to the **user/caller**:

| Change | Details |
|:---|:---|
| **State shape** | `section.collapsed` (new boolean), `section.selected` (runtime only, not persisted). No migration needed — `undefined` is falsy, so old saved charts work as-is. |
| **Keyboard shortcuts** | `Cmd+Z` = undo, `Cmd+Shift+Z` = redo, `Cmd+H` = search & replace. `Cmd+S` and `Cmd+E` remain unchanged. |
| **localStorage schema** | No breaking changes. The `chart-creator-state` JSON gains optional `collapsed` booleans on sections. Old data loads fine (missing keys default falsy). |
| **Section templates** | New constant `SECTION_TEMPLATES` — purely internal, no external surface. |

---

## 5. Migration Steps

**None needed.** All state additions are additive with falsy defaults. Old charts stored in `localStorage` will load without errors — `section.collapsed` will simply be `undefined` (treated as `false`). No data migration, no schema versioning required.

---

## 6. Risk Callouts

| Risk | Severity | Mitigation |
|:---|:---|:---|
| **Undo stack memory** | Medium | Cap stack at ~50 entries. Deep-clone state on each push. Large charts with many rapid edits could spike memory — the cap prevents runaway growth. |
| **Undo + auto-save interaction** | Medium | `autoSave()` runs on a debounced 500ms timer. Undo should restore state AND trigger autoSave, but we must avoid pushing the restored state back onto the undo stack. Guard with an `isUndoing` flag. |
| **Line drag-and-drop vs. text selection** | High | This is the **hardest feature** and the most likely to introduce regressions. The current section drag already had issues with text selection (resolved with handle-only dragging). Line drag will need the same handle-only pattern and careful `mousedown`/`dragstart` isolation. Test thoroughly on Mac Safari + Chrome. |
| **Multi-select + existing drag** | Medium | Currently section drag uses the card as the drop target. Multi-select drag (moving N sections at once) needs to change the splice logic from single-item to batch. Must not break single-section drag. |
| **Search & Replace on chord lines** | Low | Replacing partial chord tokens (e.g., `m` → `m7`) could produce invalid chords (`Am` → `Am7` ✓, but `Am7` → `Am77` ✗). Offer a "whole word" toggle or chord-aware matching mode. |
| **Rollback difficulty** | Low | All changes are in 3 files with no external dependencies or migrations. Git revert is clean. |

> [!WARNING]
> **Line drag-and-drop** is the riskiest feature because it interacts with text selection, existing section drag, and the content editing flow. If time is tight, this is the one to defer or put behind a feature flag.

---

## 7. Out of Scope

These items from the roadmap are **explicitly not part of this pass**:

- **Page Break Indicators** — Visual & Stage Polish category
- **Dark Mode Preview** — Visual & Stage Polish category
- **Keyboard Shortcut Modal** — Visual & Stage Polish (though we'll document new shortcuts in the project summary)
- **Time Signature Field** — Visual & Stage Polish
- **Arrangement Notes** — Visual & Stage Polish
- **Improved Library UI** — Visual & Stage Polish
- **Delete Recovery** — Visual & Stage Polish (partially addressed by Undo/Redo)
- All **Advanced Extensibility** items (Setlist Mode, Nashville Numbers, Chord Diagrams, Live Sync, etc.)
- **Per-Line Font Size Override** and **Chord-Lyric Alignment** — listed at the bottom of the roadmap

---

## Open Questions

1. **Section Templates** — What specific templates do you want? My default set:
   - *Verse (4-bar)* — 4 grid lines (chord + lyric pairs)
   - *Chorus (8-bar)* — 8 grid lines
   - *Bridge (4-bar)* — 4 grid lines
   - *Intro/Outro (chords only)* — 4 chord lines, no lyrics
   - *Empty* — current behavior (1 chord + 1 lyric)
   
   Want different structures or more templates?

2. **Search & Replace UI** — inline bar at the top of the editor (like VS Code) or a modal dialog (like the existing Import Text modal)? I'd lean inline bar for speed.

3. **Multi-select UX** — Should `Cmd+Click` toggle individual sections, or do you also want `Shift+Click` for range selection?

4. **Line drag handles** — The existing ↑/↓ buttons work. Should I **replace** them with a drag handle, or **add** a drag handle and keep ↑/↓ as a secondary option?
