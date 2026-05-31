<img src="icon.png" width="128" height="128" alt="Chart Creator icon">

# Chart Creator

Create professional music charts with color-coded chords, lyrics, and sections. Export to PDF. Great for dialing in new tracks with your band and even writing new songs! Built with vanilla HTML/CSS/JS in a Tauri desktop shell.

## Installation

To download the application, look at the right sidebar of this GitHub page and click on the latest version under the **Releases** section.

### macOS

1. Check your Mac's chip: Click the Apple icon () in the top-left corner of your screen and select **About This Mac**. Look at **Processor** or **Chip**.
2. Go to the **Releases** page and download the `.dmg` file matching your Mac:
   - **Apple Silicon (M1, M2, M3, M4, etc.)**: Download the file ending in `_aarch64.dmg`.
   - **Intel Processor**: Download the file ending in `_x64.dmg`.
3. Open the downloaded `.dmg` file and drag the **Chart Creator** icon into your **Applications** folder.
4. **First-time Launch Setup (Unsigned App warning)**:
   - Go to your Applications folder.
   - Hold the **Control** key and click the app icon, then choose **Open** from the menu.
   - Click **Open** in the warning box that appears. This is only needed for the very first launch.

### Windows

1. Go to the **Releases** page and download either:
   - **Standard Installer (`.msi`)**: Choose this to install the app permanently on your system.
   - **Portable App (`.exe`)**: Choose this to run the app directly without installing anything.
2. Double-click the downloaded file.
3. **First-time Launch Setup (Windows SmartScreen warning)**:
   - Since the app is unsigned, Windows may show a blue box saying *"Windows protected your PC"*.
   - Click **More info** (under the text), then click **Run anyway**.

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
node build.js
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
| PDF | jsPDF 4.2.1 (bundled locally) |
| Storage | `localStorage` |

## Project Structure

```
.
├── .github/workflows/
│   └── release.yml        # Pinned GitHub Actions release build
├── index.html              # Main HTML — three-panel layout, modals
├── app.js                  # App glue — event bindings, init, batch actions
├── build.js                # Copies browser assets into dist/ for Tauri/dev server
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
├── jspdf.umd.min.js        # Bundled PDF library
├── src-tauri/              # Tauri backend (Rust)
│   ├── Cargo.toml          # Rust dependencies
│   ├── capabilities/       # Tauri runtime permissions
│   ├── tauri.conf.json     # CSP, window config, build commands
│   └── src/lib.rs          # Tauri app setup
└── icon.png                # App icon
```

## Security

The PDF dependency is bundled locally. The Content Security Policy restricts scripts to `'self'` only, and release workflow actions are pinned to immutable commit SHAs.

## License

MIT
