# Music Chart Creator — Project Summary & Documentation

This document serves as a comprehensive reference guide for the **Music Chart Creator** application. It captures the project scope, technical file structure, core features, precise design rules, resolved engineering challenges, and Tauri desktop release workflow.

---

## 📁 File Structure

The project lives in `/Users/randymitchell/Desktop/Antigravity/music-sheets` and uses a vanilla HTML/CSS/JS frontend split into small modules, bundled into a Tauri desktop shell.

| File / Path | Type | Description |
|:---|:---|:---|
| 📄 **[index.html](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/index.html)** | Source Code | Main HTML structure for the three-panel workspace, modals, toolbar, and script loading. |
| 🎨 **[style.css](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/style.css)** | Source Code | Defines the editor dashboard, light/dark themes, modals, and print-styled chart preview. |
| ⚙️ **[app.js](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/app.js)** | Source Code | App bootstrap and event binding glue. |
| 🧩 **[src-js/](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/)** | Source Code | Feature modules for state, storage, editor rendering, preview rendering, import/export, transposition, undo, and UI helpers. |
| 📦 **[build.js](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/build.js)** | Build Script | Copies browser assets into `dist/` for Tauri and local browser runs. |
| 🖨️ **[jspdf.umd.min.js](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/jspdf.umd.min.js)** | Vendored Dependency | Official bundled `jsPDF 4.2.1` UMD build used for PDF export. |
| 🚀 **[src-tauri/](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/src-tauri/)** | Tauri App | Rust/Tauri shell, configuration, capabilities, icons, and desktop packaging metadata. |
| 🔐 **[.github/workflows/release.yml](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/.github/workflows/release.yml)** | Release Workflow | Cross-platform release builder with third-party actions pinned to full commit SHAs. |

---

## 💎 Core Features

### 1. Three-Panel Dashboard
* **Sidebar (Left)**: Controls song metadata (Title, Artist, Key, Capo, BPM, Original Key), transpose controls (Up/Down semitones), and a library manager to save/load charts inside local storage.
* **Sections Editor (Center)**: Drag-and-drop section builder. Each section is a card that can be custom resized or reordered. Lines inside a section can be set as **Chords**, **Lyrics** (with bold toggle), or **Instructions**.
* **Chart Preview (Right)**: A live WYSIWYG sheet music rendering that mirrors the exact layout, margins, and sizing of the output PDF. Zoom controls adjust scaling using native CSS zoom.

### 2. Smart Transposition Engine
* Transposes entire songs up or down by semitones.
* Intelligently parses complex chords, including extensions, slash chords (`G/F#`), sus chords, and minor/major indicators.
* Follows standard spelling logic (e.g., automatically using flats for flat scales like `F`, `Bb`, `Eb`).

### 3. Text Import Parser
* Parses raw text chords and lyrics.
* Automatically detects lines containing chord symbols and formats them as Chord lines.
* Detects bracketed labels (e.g., `[Chorus]`) and creates distinct sections.
* Assigns regular lines as Lyrics.

### 4. Auto-Scale Line Fitting

### 5. Undo / Redo
* Full state rollback via  with a 50-entry deep-clone stack.
*  to undo,  to redo. Toolbar buttons show availability.
* Text inputs batch edits via focus/blur: typing a chord progression counts as one undo step.

### 6. Section Templates & Multi-Select
* 6 preset templates (Empty, Verse 4-bar, Chorus 8-bar, Bridge 4-bar, Chords-only, Instrumental 8-bar) from a dropdown next to Add Section.
*  to select multiple sections. Floating batch bar offers Delete, Move, Transpose ±1, and Deselect All.

### 7. Line Drag-and-Drop & Search/Replace
* Drag handles on each line for reordering within and between sections.
* Inline search & replace bar () with case-sensitive and regex support across all chord, lyric, instruction, and grid content.
* Preserves vocal line structure by preventing text wrapping in the chart preview and PDF export.
* After each render, every chord, lyric, and instruction line is measured against the available paper width.
* If a line would overflow, its font size is proportionally scaled down so the entire line fits on one row.
* The minimum scale is clamped at 60% of the original font size to keep text readable.
* Short lines remain at their full `17.6px` size; only the ones that need it are shrunk.
* PDF export uses the same sizing logic directly through jsPDF text measurement and drawing, so overflowing lines are scaled consistently without DOM screenshot capture.

---

## 🎨 Design & Formatting Rules

The preview and PDF export are designed to match the original band PDF charts exactly. Below are the rigid formatting rules that must be maintained:

### Typography (Helvetica/Arial)
* **Font Family**: `'Helvetica Neue', Helvetica, Arial, sans-serif` for all previewed chart elements.
* **Lyric/Chord Base Font Size**: `17.6px` (regular body).
* **Bold Lyric Lines**: Must be rendered at the same size as regular lyrics (`17.6px`) but with `font-weight: 700`.
* **Section Headers**: `19.5px` font size, bold (`700`), and formatted in **ALL CAPS** with no surrounding brackets.

### Color-Coding System (Physical PDF Values)
The preview and PDF sheets use a strict set of hex colors:

| Element | Hex Color | Notes |
|:---|:---|:---|
| **Chords** | `#1a55d4` | Blue, bold text |
| **Intro / Outro** | `#cc00cc` | Magenta, bold text |
| **Chorus Label** | `#217a14` | Green, bold text |
| **Bridge Label** | `#6a1f9a` | Dark Purple, bold text |
| **Instrumental Label** | `#1a55d4` | Blue, bold text |
| **Custom Label** | `#9b5c00` | Amber / Brown, bold text |
| **Instructions** | `#cc00cc` | Magenta, bold text (lines starting with `*` or in italics) |
| **Verse Numbers** | See below | Placed in brackets at the beginning of the first line of a verse |
| └ *Verse 1* | `#cc1800` | Red `[1]` |
| └ *Verse 2* | `#ff7a00` | Orange `[2]` |
| └ *Verse 3* | `#8a2be2` | Purple `[3]` |
| └ *Verse 4* | `#0070c0` | Blue `[4]` |
| └ *Verse 5* | `#00b050` | Green `[5]` |
| └ *Verse 6+* | `#6b6b6b` | Dark Gray `[6+]` |

### PDF Margin & Page Layout Rules
* **Page Size**: Standard Letter size.
* **Margins**: Narrow and equal top and bottom margins (`24px` effective) to minimize wasted vertical white space and maximize lyrics per page.
* **Footer Page Numbers**: Rendered in the bottom-right corner as `Page X of Y` in small gray text.
* **Page Budgeting**: When exporting, elements are budget-fitted. The script draws a white block over the page number footer zone to prevent lyrics from overlapping the page numbers.

---

## 🛠️ Resolved Engineering Hurdles

1. **Fixed PDF Export Crash**: Removed runtime CDN loading and bundled jsPDF locally, with guarded library initialization so export errors surface cleanly.
2. **Fixed Preview Cutoff**: Swapped out CSS `transform: scale()` zooming for native CSS `zoom`. This ensures the scrolling wrapper wrapper correctly calculates its layout dimensions, removing any page-clipping bugs.
3. **Fixed Sections Pane Scroll & Card Resizing**:
   * Removed `max-height` limits on section editor cards to prevent nested scrolling (mouse wheel traps).
   * Restricted CSS transitions on `.section-card` to skip dimensions, preventing transition lag when dragging the resize handles.
   * Debounced `autoSave()` by `500ms` to stop heavy, blocking localStorage IO calls from interrupting smooth mouse resize gestures.
4. **Preserved Editor Text Selection**: Fine-tuned CSS drag handles so that dragging reorders cards, but users can still double-click and drag-select text inside the editor text fields without interference.
5. **Implemented Auto-Scale Line Fitting**: Added a post-render measurement pass that temporarily sets each content line to nowrap, measures scrollWidth against the available paper width, and applies a proportional font-size reduction when the line overflows. The scale floors at 0.6x to preserve legibility, and the original white-space is restored afterward so only overflowing lines are affected.
6. **Implemented High-Priority Workflow Enhancements**: All seven features from the roadmap — undo/redo (`UndoManager` with batched text edits), collapsible sections, section templates (6 presets), duplicate-with-focus flow, multi-select with batch actions, line drag-and-drop, and search & replace with regex support. Added 3 new keyboard shortcuts (`Cmd+Z`, `Cmd+Shift+Z`, `Cmd+H`). No localStorage migration needed — all new state keys are additive with falsy defaults.
7. **Resolved Code Review Issues (May 2026)**:
   * **Improved Transposition Regex**: Resolved a bug in the transposition regex to support complex jazz and pop chord voicings (e.g. `maj7`, `m7b5`, `7#9`, `sus2`/`sus4`, `dim7`).
   * **ID-Based Storage Indexing**: Migrated stored chart deduplication from title name to a generated unique ID to prevent naming collisions.
   * **Robust Storage Quota Handling**: Caught `QuotaExceededError` in local storage autosaves/library saves, informing the user when storage is full.
   * **Unicode Validation & UTF-8 Imports**: Passed explicit `UTF-8` encoding parameters to file readers, validated JSON import files for corruption by checking for the replacement char `\uFFFD`, and added `charset=utf-8` on JSON export blobs.
   * **batched Text Undo/Redo**: Hooked up text-edit batching inside the `UndoManager` using focus/blur event handlers.
   * **Shift-click Card Selection**: Resolved Shift-click range selections by introducing a range tracking mechanism.
   * **Centralized Modal Styles**: Cleaned up inline CSS for the text import modal and moved layout properties to `style.css`.
   * **PDF Verse Colors**: Aligned the PDF export colors with the CSS stylesheet rules for verses 4 and 5.

8. **Security Hardening (May 2026)**:
   * **XSS Fix**: Replaced `innerHTML` toast rendering with safe `textContent`-based DOM construction to prevent script injection via user-supplied chart titles and filenames.
   * **Bundled PDF Library**: Downloaded the official `jsPDF 4.2.1` UMD artifact from npm and bundled it locally, removing runtime dependency on public CDNs for PDF export.
   * **Removed Unused Capture Library**: Removed the unused vendored `html2canvas.min.js` file and script load, reducing the JavaScript supply-chain surface.
   * **Tightened CSP**: Stripped all external CDN domains (`cdnjs.cloudflare.com`, `jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com`) from the Content Security Policy. Scripts now load only from `'self'`.
   * **Pinned Release Actions**: Pinned GitHub Actions `uses:` entries to full commit SHAs so release builds do not follow mutable tags or branches.



---

## 🚀 macOS Application Options

We have two options for launching the app on macOS:

### 1. Standalone Native App (Tauri)
* **App Path**: **[chart-creator.app](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/src-tauri/target/release/bundle/macos/chart-creator.app)**
* **Installer Path**: **[chart-creator_0.1.0_aarch64.dmg](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/src-tauri/target/release/bundle/dmg/chart-creator_0.1.0_aarch64.dmg)**
* **Behavior**: Runs completely standalone as a native desktop client with all assets compiled inside the app. It does not require any external terminal commands or local Python server processes.
* **Commands**: Run `npx tauri dev` to run in development mode or `npx tauri build` to recompile.

### 2. Browser Desktop Helper (Python Web Server Launcher)
* **App Link**: **[Chart Creator.app](file:///Users/randymitchell/Desktop/Chart%20Creator.app)**
* **Launcher Behavior**:
  1. Checks if a process is listening on port `8080` (e.g. `lsof -i :8080`).
  2. If none is found, it changes directory to the workspace and starts the Python server (`python3 -m http.server 8080 &`). To ensure python3 resolves correctly when launched from Finder (which does not inherit login shell PATHs), the script constructs a robust PATH environment including Homebrew paths `/opt/homebrew/bin` and `/usr/local/bin`.
  3. Opens the local server URL (`http://localhost:8080`) in the default web browser.
  4. Immediately exits the launching applet to keep your macOS Dock tidy.
* **Custom Icon**: Bundled with a custom macOS squircle icon showing a neon guitar crossed with a creative writing pen. Finder caches are bypassed using app bundle renaming triggers to force Finder updates.

---

## 🧠 Future Roadmap & Extensibility

## ✅ Implemented (May 2026)

All 7 High-Priority Workflow Enhancements and 7 Tier 2 UX & Design Polish features from the roadmap:

| Feature | Implementation |
|:---|:---|
| **Undo / Redo** | `UndoManager` class with 50-entry stack, `Cmd+Z` / `Cmd+Shift+Z`, toolbar buttons, text-edit batching on focus/blur |
| **Collapsible Sections** | Chevron toggle in section header, collapses card body, `section.collapsed` persisted |
| **Section Templates** | `<select>` dropdown near Add Section with 6 presets (Empty, Verse 4-bar, Chorus 8-bar, Bridge 4-bar, Chords-only, Instrumental 8-bar) |
| **Duplicate + Edit Flow** | Duplicated sections flash highlight, auto-increment verse numbers, scroll + focus first input |
| **Multi-Select & Batch Actions** | `Cmd+Click` section selection, floating batch bar with Delete, Move Up/Down, Transpose, Deselect All |
| **Line Drag-and-Drop** | Drag handles on each line, within-section and cross-section reordering via HTML5 drag API |
| **Search & Replace** | Inline bar (`Cmd+H`) with case-sensitive and regex toggles, chord-aware replacement across all sections |
| **Page Break Indicators** | Zoom-independent visual break lines overlaid in preview at 792pt equivalents (Letter page height) |
| **Shortcut Cheat Sheet** | Keyboard shortcut helper modal toggled via toolbar button or `?` hotkey |
| **Time Signature Selector** | `Time Sig` metadata field in sidebar, displaying in the preview/PDF next to BPM (hidden when unset) |
| **Arrangement Notes Field** | Free-text notes area in sidebar rendered under metadata with text-wrapping on preview/PDF |
| **Dark Mode Preview Toggle** | Clean preview invert mode via `.chart-paper.dark-mode` selector |
| **Improved Saved Charts** | Advanced library list with search filtering, alpha/key/date sorting, pinning favorites, and unique ID legacy migration |
| **Delete Recovery Toast** | Confirms permanent library/batch deletions, while single section deletes trigger an Undo Toast notification |

### New Keyboard Shortcuts

| Shortcut | Action |
|:---|:---|
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+H` | Open search & replace |
| `Cmd+S` | Save (existing) |
| `Cmd+E` | Export PDF (existing) |
| `?` | Open keyboard shortcuts cheat sheet |

### 🔮 Advanced Extensibility
* **Setlist Mode**: Group, reorder, and export combined multi-song PDFs.
* **Nashville Number System**: Convert chords dynamically relative to the key.
* **Chord Diagram Popovers**: Guitar/ukulele fingerings on hovering chords.
* **Live Sync**: Multi-user real-time editing and shareable view links.
* **Auto-Scroll Teleprompter**: Hands-free scrolling synced with song BPM.
* **Audio Reference**: Embed YouTube/Spotify links inside the editor.
* **Collapsible Workspace Panels**: Hide sidebar/preview for a focused editor view.
* **Command Palette (`Cmd+K`)**: Keyboard-driven command search bar.
* **Onboarding Walkthrough**: Step-by-step tour for first-time users.
* **Status Bar Counters**: Line counts, page estimations, and zoom indicators.
* **Section Minimap**: Color-coded structural navigator strip.
* **Offline Support**: The PDF dependency is bundled locally; full offline PDF export works without a network connection.

* **Per-Line Font Size Override**: Allow manual adjustment of individual line font sizes in the editor, overriding the auto-scale behavior for lines that need specific sizing.
* **Chord-Lyric Alignment**: Improve chord-over-lyric alignment so chord tokens sit directly above their corresponding syllables, matching standard chord-chart formatting.
