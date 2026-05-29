# Music Chart Creator — Walkthrough

## What Was Built

A premium single-page HTML tool for creating song charts that match your existing **408-chart PDF format** exactly. The tool runs at **http://localhost:8080** (dev server already running).

## Files Created

| File | Purpose |
|------|---------|
| [index.html](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/index.html) | Main HTML — three-panel layout, metadata form, import modal, CDN scripts |
| [style.css](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/style.css) | Dark-mode design system with white paper preview matching PDF output |
| [app.js](file:///Users/randymitchell/Desktop/Antigravity/music-sheets/app.js) | All app logic — state, editor, preview, transpose, PDF export, persistence |

## Feature Summary

### Three-Panel Layout
- **Left sidebar**: Song metadata (title, artist, BPM, key, capo, original key), transpose controls, saved charts list
- **Center editor**: Section-based builder with drag-and-drop reordering, inline line editing
- **Right preview**: Live WYSIWYG white "paper" preview that matches PDF output exactly

### Editor Features
- **Section types**: Intro, Verse, Chorus, Bridge, Outro, Instrumental, Custom
- **Line types**: Chord (blue), Lyric (black, with bold toggle), Instruction (pink/magenta)
- **Smart defaults**: Adding sections auto-suggests the next logical type (Intro → Verse → Chorus → Verse…)
- **Keyboard flow**: Enter adds a new line below, Backspace on empty removes line
- **Drag-and-drop**: Reorder sections by dragging the grip handle
- **Repeat markers**: Each section has a repeat count field (×)

### Chart Preview
Matches your existing PDFs precisely:
- **Helvetica** font family at exact PDF sizes (17.6px body, 23.5px bold lyrics)
- Color-coded verse numbers: 🔴 `[1]` red, 🟠 `[2]` orange, 🟣 `[3]` purple, 🔵 `[4]` blue, 🟢 `[5]` green
- 🔵 Blue bold chords
- 🟢 Green chorus/bridge labels
- 🩷 Pink/magenta intro/instruction labels
- Title in quotes, capo display, key/original key display

### Key Transposition
- One-click transpose up/down by semitone
- Smart enharmonic spelling (uses flats for flat keys like F, Bb, Eb)
- Handles all chord types: slash chords (G/F#), extensions (Cadd9), sus chords, etc.
- Updates key display and all chord lines simultaneously

### Persistence & Export
- **Auto-save** to localStorage (every edit + every 30 seconds)
- **Save to library** — stores named charts in browser for quick loading
- **JSON export/import** — download/upload chart data files
- **PDF export** — renders to PDF via html2canvas + jsPDF (letter size, matching PDF style)
- **Text import** — paste raw chart text and auto-detect chords, sections, lyrics

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `⌘S` | Save chart to library |
| `⌘E` | Export PDF |
| `Esc` | Close modals |
| `Enter` | Add new line below (in line editor) |
| `Backspace` | Delete empty line (in line editor) |

## Verified & Fixed
- Page loads correctly with all panels rendering
- Chart preview colors match exact RGB values from analyzed PDFs
- All CSS custom properties resolved to hardcoded values in the preview panel
- Print styles hide editor UI and show only the chart paper
- **Fixed PDF export crash**: Swapped out the 404ing cdnjs URL for jsDelivr CDN (`jspdf@2.5.2/dist/jspdf.umd.min.js`) and added a fallback & user-facing error guard for the jsPDF constructor.
- **Fixed preview cutoff**:
  - Added `align-items: flex-start` to `.preview-scroll` so the white paper preview `.chart-paper` is not stretched and can grow dynamically to fit the full length of the chart.
  - Refactored the preview panel's zoom feature to use CSS `zoom` rather than CSS `transform: scale()`, which recalculates layout size on the fly so the scrollbar wrapper updates scrollbars perfectly without any clipping.
- **Fixed Sections Pane Scrolling & Resizing**:
  - **Removed `max-height: 400px` limitation** on `.section-card-body` to allow section cards to grow naturally to fit their contents. This eliminates internal card scrollbars by default, preventing the mouse wheel from getting trapped inside individual cards, thus restoring smooth outer scrolling for the entire Sections pane.
  - **Optimized CSS transitions**: Swapped `transition: all` to specifically transition only `border-color`, `box-shadow`, `transform`, and `opacity` on `.section-card`. This stops the layout transitions from fighting with manual resizing, fixing resize-handle lag and rubber-banding.
  - **Debounced auto-save**: General `autoSave()` calls are now debounced by 500ms. This prevents the browser from making hundreds of blocking, synchronous localStorage writes per second during card resizing (ResizeObserver callbacks) and typing.
