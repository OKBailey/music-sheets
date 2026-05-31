<img src="icon.png" width="128" height="128" alt="Chart Creator icon">

# Chart Creator

Create professional music charts with color-coded chords, lyrics, and sections. Export to PDF. Great for dialing in new tracks with your band and even writing new songs! Built with vanilla HTML/CSS/JS in a Tauri desktop shell.

## Installation

### macOS

1. Go to the **Releases** page on GitHub.
2. Download the `.dmg` file matching your Mac's processor:
   - **Apple Silicon (M1/M2/M3/etc.)**: Download the file ending in `_aarch64.dmg`.
   - **Intel**: Download the file ending in `_x64.dmg`.
3. Open the downloaded `.dmg` file and drag **Chart Creator** into your **Applications** folder.
4. **First-time Launch Setup (Unsigned App)**:
   - Right-click (or Control-click) **Chart Creator** in your Applications folder and select **Open**.
   - Click **Open** on the prompt that appears. This bypasses the unsigned app warning (you only need to do this once).

### Windows

1. Go to the **Releases** page on GitHub.
2. Download the Windows installer:
   - **Standard Installer**: Download the `.msi` file.
   - **Standalone Executable**: Download the `.exe` file.
3. Run the installer or double-click the `.exe` file to launch the app.
4. **First-time Launch Setup (Unsigned App)**:
   - If Windows SmartScreen flags the app as untrusted, click **More info** and then click **Run anyway**.

## Features

- **Three-panel workspace** — sidebar for metadata, center for the section editor, right for live preview
- **Smart transposition** — transpose entire charts by semitones with automatic sharp/flat spelling and complex chord support (slash chords, extensions, sus, dim, aug)
- **Section editor** — drag-and-drop sections and lines, custom resize, collapsible cards, 6 preset templates (Verse, Chorus, Bridge, Intro, Instrumental, Empty)
- **Color-coded output** — sections and chords use distinct colors matched to standard chart conventions
- **PDF export** — page-budgeted letter-size output with auto-scaling lines, page numbers, and WYSIWYG fidelity to the preview
- **Search and replace** — inline bar with regex and case-sensitive support across all chord, lyric, and instruction content
- **Multi-select batch actions** — Cmd+Click to select multiple sections for bulk delete, move, duplicate, or transpose
- **Text import** — paste raw chart text and let the parser detect chord lines, section labels, and lyrics
- **Library manager** — save charts to local storage with search, sort, and favorites
- **Undo/redo** — 50-entry stack with batched text-editing so typing feels natural
- **Light/Dark themes** — toggle the app interface between dark and light modes while keeping the chart paper pristine for printing
- **Keyboard-driven** — `Cmd+Z` undo, `Cmd+Shift+Z` redo, `Cmd+H` find & replace, `?` shortcut cheat sheet

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) (for the dev server)
- [Rust](https://rustup.rs) (for the Tauri desktop build)
- macOS, Windows, or Linux

### Run in a Browser (no Rust needed)

```bash
git clone https://github.com/your-username/chart-creator.git
cd chart-creator
mkdir -p dist
cp index.html app.js style.css icon.png src-js html2canvas.min.js jspdf.umd.min.js dist/
npx http-server dist -p 1420
```

Open [http://localhost:1420](http://localhost:1420).

### Run as a Desktop App

```bash
git clone https://github.com/your-username/chart-creator.git
cd chart-creator
npm install -g @tauri-apps/cli
npx tauri dev
```

## Build

```bash
npx tauri build
```

The packaged app lands in `src-tauri/target/release/bundle/`.

## Tech Stack

| Layer | Technology |
|:---|:---|
| Shell | Tauri 2 (Rust) |
| UI | Vanilla HTML/CSS/JS — no framework |
| PDF | jsPDF + html2canvas (bundled locally) |
| Storage | `localStorage` |

## Project Structure

```
.
├── index.html              # Main HTML — three-panel layout, modals
├── app.js                  # App glue — event bindings, init, batch actions
├── style.css               # Editor (light/dark) and preview paper (print) styles
├── src-js/
│   ├── constants.js        # Section metadata, verse colors
│   ├── state.js            # State factory, ID generation, templates
│   ├── storage.js          # localStorage auto-save/load, library CRUD
│   ├── editor.js           # Section card builder, line items, drag-and-drop
│   ├── preview.js          # Chart paper renderer, auto-scale, zoom
│   ├── import-export.js    # JSON and PDF export, text import parser
│   ├── transpose.js        # Chord transposition engine
│   ├── undo.js             # UndoManager with text-edit batching
│   └── ui.js               # Toasts, confirm dialogs, status bar, search
├── html2canvas.min.js      # Bundled capture library
├── jspdf.umd.min.js        # Bundled PDF library
├── src-tauri/              # Tauri backend (Rust)
│   ├── tauri.conf.json     # CSP, window config, build commands
│   └── src/lib.rs          # Tauri app setup
└── icon.png                # App icon
```

## Security

All CDN dependencies are bundled locally. The Content Security Policy restricts scripts to `'self'` only.

## License

MIT
