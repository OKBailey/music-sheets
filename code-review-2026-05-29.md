# Code Review — Chart Creator

**Date:** 2026-05-29
**Project:** Vanilla HTML/CSS/JS music chart editor (~4,100 lines across `index.html`, `style.css`, `app.js`).
**Context:** No git repo, no tests, no build tooling. Single-file client-side app persisted via `localStorage`.

---

## Strengths

- **Clean separation** between dark editor UI (CSS) and white paper preview/PDF layout — the two render paths are independent but visually consistent.
- **Transposition engine** (`app.js:11-55`) correctly distinguishes sharp vs flat keys via `FLAT_KEYS` and handles slash chords.
- **Undo/Redo** (`UndoManager` at `app.js:2149-2233`) has smart text-edit batching via `snapshotTextEdit` / `commitTextEdit` so typing a chord progression = one undo step, not one per keystroke.
- **Keyboard shortcuts** (`app.js:1964-1988`) properly guard against firing inside text inputs (they don't — but notably they *do* fire globally, which is correct here since `e.preventDefault()` is only called on the shortcut combos).
- **Auto-scale line fitting** (`app.js:1782-1815`) measures each line independently and clamps at 60% — legible outputs guaranteed.
- **PDF page-break budgeting** (`app.js:1516-1545`) prevents orphaned section headers by pulling the header + first content line onto the next page together.
- Well-organized CSS custom properties (`style.css:7-90`) make theming straightforward.

---

## Issues

### Critical (Must Fix)

1. **`transposeChordLine` regex misses common chord symbols**
   - File: `app.js:41-54`
   - The regex `(?:m?\d*(?:sus|add|dim|aug|maj|dom)?[0-9b#]*(?:\/[A-G][#b]?[0-9]*)?)` fails on qualities like `maj7`, `m7b5`, `7#9`, `add9`, `sus2`/`sus4` after an alteration, and `dim7`. E.g. `C#m7b5` only captures `C#m7` — the `b5` is left behind and never transposed, producing a broken chord name.
   - **Fix:** Simplify to capture the root and *everything else*. `transposeChordToken` already handles slash splitting:
     ```js
     function transposeChordLine(line, semitones, useFlats) {
       return line.replace(/\b([A-G][#b]?)([^\s,;|]+)/g, (m, root, rest) => {
         return (root + rest).split('/').map(part => {
           const match = part.match(/^([A-G][#b]?)(.*)/);
           if (!match) return part;
           return transposeNote(match[1], semitones, useFlats) + match[2];
         }).join('/');
       });
     }
     ```
   - Also, `transposeChordToken` (line 33) is defined but never called — dead code.

### Important (Should Fix)

2. **Zoom uses `transform: scale()` despite project_summary claiming native CSS zoom**
   - File: `app.js:1822-1828`
   - `project_summary.md` explicitly lists "Swapped out CSS `transform: scale()` zooming for native CSS `zoom`" as a resolved engineering hurdle. The current code uses `transform: scale()` with a manual wrapper-height hack. The preview-scroll clipping bug documented in the summary may resurface for tall charts because `offsetHeight` is read after layout but the transform doesn't affect intrinsic sizing.
   - **Fix:** Either switch to `chartPaper.style.zoom = scale` (non-standard but widely supported in Chromium/Safari — matches the documented intent) or compute wrapper height from `scrollHeight` of content inside the paper, not `offsetHeight`.

3. **Silent `localStorage` quota failures**
   - Files: `app.js:199`, `app.js:235` (`autoSave`, `saveChartToLibrary`)
   - `try/catch` swallows `QuotaExceededError`. User sees "Save failed" briefly (2.5s toast) but charts can be silently lost. Worse, `saveChartToLibrary` writes a deep-cloned `state` every save — 10 charts × large state = easy quota hit.
   - **Fix:** Detect quota errors specifically and offer to export JSON or prune old library entries. Consider deduping chart entries by id rather than by name.

4. **`importJSON` lacks shape validation**
   - File: `app.js:1693-1710`
   - Checks only `if (data.sections)`. A file like `{"sections": {}}` or a non-array will pass and crash rendering. Also trusts `section.lines` without checking it's an array.
   - **Fix:** Validate `Array.isArray(data.sections)` and that each section has `id`, `type`, and `Array.isArray(lines)`.

5. **Batch transpose reuses global key logic for per-section chords**
   - File: `app.js:2307-2325` (`batchTransposeSelected`)
   - Mutates the **global** `state.key` when transposing only selected sections. Chords in unselected sections remain in the original key, but the key signature display now shows the transposed key → inconsistent state.
   - **Fix:** Either (a) transpose only chord content without touching `state.key`, or (b) warn the user that this is a song-wide transpose.

### Minor (Nice to Have)

6. **Dead code** — `handleLineDragStart`, `handleLineDragEnd`, `handleLineDragOver`, `handleLineDragEnter`, `handleLineDrop` (`app.js:2342-2393`) are defined but never referenced; the active drag system uses `lineDragState` set inline in `buildLineItem`.

7. **`commitTextEdit` / `snapshotTextEdit` are defined but never called** from any input handler. The text-edit batching described in `project_summary.md` is effectively inert — every keystroke still pushes a full snapshot via the focus handler's `pushUndo()`. (`app.js:2247-2249`)

8. **`pushUndo()` on input focus creates duplicate snapshots** — clicking through 5 inputs in a row adds 5 identical entries to the undo stack. Consider snapshotting only on `change` / blur-if-dirty.

9. **Shift-click range select is broken** (`app.js:2268-2277`): `selectSectionRange` is referenced but never defined. Calling it throws a `ReferenceError` — shift-click is effectively dead.

10. **PDF font differs from preview font** — preview uses Verdana, PDF uses Helvetica. Document honestly in the UI, or switch preview to Helvetica for true WYSIWYG.

11. **Import modal + import-textarea use inline `style` attributes** — ~200 chars of inline CSS in `index.html:193-208`. Move to `style.css` for consistency.

12. **No `<meta charset>` on dynamically created elements**, and `importJSON` doesn't validate UTF-8. Non-ASCII chord symbols will silently corrupt.

13. **Verse 4+ color fallback** (`app.js:1596-1600`): verses 4 and 5 have distinct colors (`#0070c0`, `#00b050`) in CSS (`.v4`, `.v5`) but the PDF logic collapses v4+ to a single gray. Inconsistent preview vs PDF for verses 4 & 5.

---

## Recommendations

1. **Add an `npm run lint` or at minimum an `.eslintrc`** — even vanilla JS benefits from catching issues like `selectSectionRange` being undefined (#9). A `package.json` with `eslint` + `eslint-plugin-compat` would catch browser-API issues too.

2. **Add a smoke test for PDF export** using `jest` + `jsdom` + `canvas` mocks — the PDF path is the highest-risk code and has zero test coverage.

3. **Consider git init** — this project has substantial code and multiple feature milestones documented in `project_summary.md`. Version control would catch regressions like #2 (zoom revert) automatically.

4. **Extract constants** — magic numbers like `50` (undo stack), `0.6` (scale floor), `500` (autosave debounce ms), `372` (paper width px), `17.6` (base font size) should live in a `CONFIG` object at the top of `app.js`.

5. **Debounce `renderPreview`** — every keystroke calls `renderEditor` + `renderPreview` + `autoSave`. For fast typists on large charts this can lag. Debounce preview render at ~80ms.

---

## Assessment

**Ready for production use?** Yes, with the transpose-regex fix (#1).

**Reasoning:** Application is feature-complete and well-organized; UX flows work end-to-end. However, Critical #1 (transpose regex) will silently produce wrong chord names for common jazz/pop voicings — a music chart tool cannot afford incorrect chords. Important #3 (silent quota loss) is a data-safety issue worth fixing before trusting the library with real work. Items #6 and #9 suggest the multi-select refactor didn't fully land; verify the shift-click path before advertising that shortcut.
