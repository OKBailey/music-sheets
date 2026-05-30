# Graph Report - .  (2026-05-29)

## Corpus Check
- 61 files · ~199,033 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 119 nodes · 237 edges · 15 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 181,831 input · 32,089 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Chart Rendering & Line Ops|Chart Rendering & Line Ops]]
- [[_COMMUNITY_Section Management & Persistence|Section Management & Persistence]]
- [[_COMMUNITY_Export, Import & Library|Export, Import & Library]]
- [[_COMMUNITY_UndoRedo System|Undo/Redo System]]
- [[_COMMUNITY_Transpose Engine & Review Fixes|Transpose Engine & Review Fixes]]
- [[_COMMUNITY_Chart Creation & ID Generation|Chart Creation & ID Generation]]
- [[_COMMUNITY_Preview Rendering & Tier 2|Preview Rendering & Tier 2]]
- [[_COMMUNITY_Tauri Desktop Shell|Tauri Desktop Shell]]
- [[_COMMUNITY_State & Event Handling|State & Event Handling]]
- [[_COMMUNITY_PDF Export & Future Features|PDF Export & Future Features]]
- [[_COMMUNITY_Tauri Rust Backend|Tauri Rust Backend]]
- [[_COMMUNITY_State Persistence & Bug Fixes|State Persistence & Bug Fixes]]
- [[_COMMUNITY_Editor Rendering & Templates|Editor Rendering & Templates]]
- [[_COMMUNITY_Build Entry Point|Build Entry Point]]
- [[_COMMUNITY_Teleprompter Feature|Teleprompter Feature]]

## God Nodes (most connected - your core abstractions)
1. `renderPreview()` - 13 edges
2. `renderEditor()` - 12 edges
3. `showToast()` - 11 edges
4. `State Object` - 11 edges
5. `autoSave()` - 9 edges
6. `loadChartFromLibrary()` - 9 edges
7. `init()` - 9 edges
8. `UndoManager` - 9 edges
9. `transposeAllChords()` - 8 edges
10. `addNewSection()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Transpose Engine` --semantically_similar_to--> `Undo / Redo`  [INFERRED] [semantically similar]
  app.js → project_summary.md
- `Nashville Number System Toggle` --conceptually_related_to--> `Transpose Engine`  [INFERRED]
  feature_suggestions.md → app.js
- `Setlist Mode` --conceptually_related_to--> `exportPDF`  [INFERRED]
  feature_suggestions.md → app.js
- `Three-Panel Dashboard` --conceptually_related_to--> `renderPreview`  [INFERRED]
  project_summary.md → app.js
- `Color-Coding System` --references--> `renderPreview`  [EXTRACTED]
  project_summary.md → app.js

## Hyperedges (group relationships)
- **Chart Rendering Lifecycle** — app_state, app_rendereditor, app_renderpreview, app_autosave, app_autoscalelines, app_exportpdf [EXTRACTED 1.00]
- **Tier 1 High-Priority Features (Completed)** — app_undomanager, app_searchandreplace, app_section_templates, app_batcheventlisteners, app_state [EXTRACTED 1.00]
- **Tauri Desktop App Architecture** — main_main, lib_run, buildrs_main, projectsummary_tauri [EXTRACTED 1.00]
- **Tauri Platform Icon Asset Pipeline — 25 iOS AppIcon variants across required Apple sizes (20x20 through 512@2x) and 15 Android adaptive icon variants (foreground, standard, round) across mdpi through xxxhdpi densities** — tauri_icon_platform_variants, tauri_icon_color_palette [INFERRED]

## Communities (16 total, 3 thin omitted)

### Community 0 - "Chart Rendering & Line Ops"
Cohesion: 0.11
Nodes (19): applyZoom(), autoScaleLines(), batchDelete(), buildLineItem(), buildSectionCard(), clearSelection(), createActionBtn(), createLineActionBtn() (+11 more)

### Community 1 - "Section Management & Persistence"
Cohesion: 0.26
Nodes (20): addNewSection(), autoLoad(), autoSave(), batchMoveDown(), batchMoveUp(), batchTranspose(), batchTransposeSelected(), determineUseFlats() (+12 more)

### Community 2 - "Export, Import & Library"
Cohesion: 0.21
Nodes (12): $(), bindEvents(), deleteChartFromLibrary(), exportJSON(), exportPDF(), getSavedCharts(), App Icon - Dark Navy Background with Vibrant Spectrum Gradient Ribbon, renderSavedCharts() (+4 more)

### Community 3 - "Undo/Redo System"
Cohesion: 0.36
Nodes (3): commitTextEdit(), UndoManager, updateUndoRedoButtons()

### Community 4 - "Transpose Engine & Review Fixes"
Cohesion: 0.25
Nodes (8): Transpose Engine, UndoManager, Transpose Regex Bug - Critical Issue #1, Nashville Number System Toggle, Tier 1 High-Impact Workflow Features, Two Change Set Split Strategy, Smart Transposition Engine, Undo / Redo

### Community 5 - "Chart Creation & ID Generation"
Cohesion: 0.4
Nodes (6): createEmptyChart(), createLine(), createSection(), generateId(), getNextVerseNumber(), parseImportText()

### Community 6 - "Preview Rendering & Tier 2"
Cohesion: 0.33
Nodes (6): autoScaleLines, renderPreview, Tier 2 UX & Design Polish, Three-Panel Dashboard, Dark Mode CSS Selector Bug, Page Break Indicator Positioning Bug

### Community 7 - "Tauri Desktop Shell"
Cohesion: 0.5
Nodes (5): run, main (Tauri), Tauri Standalone Native App, App Icon Color Palette — deep navy/indigo blues, rich purples/magentas, lavender-gray highlights, Tauri Platform Icon Variants (iOS & Android)

### Community 8 - "State & Event Handling"
Cohesion: 0.5
Nodes (5): Batch Action Event Listeners, parseImportText, searchAndReplace, State Object, Shift-click Range Select is Broken

### Community 9 - "PDF Export & Future Features"
Cohesion: 0.4
Nodes (5): exportPDF, Setlist Mode, Tier 3 Ambitious / Stretch Features, Color-Coding System, PDF Margin and Page Layout Rules

### Community 11 - "State Persistence & Bug Fixes"
Cohesion: 0.5
Nodes (4): autoSave, normalizeState, Silent localStorage Quota Failures, State Normalization and Startup Crash Fix

### Community 12 - "Editor Rendering & Templates"
Cohesion: 0.67
Nodes (3): renderEditor, SECTION_TEMPLATES, Line Drag-and-Drop Implementation Risk

## Knowledge Gaps
- **21 isolated node(s):** `autoScaleLines`, `SECTION_TEMPLATES`, `build.rs main`, `Three-Panel Dashboard`, `Smart Transposition Engine` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State Object` connect `State & Event Handling` to `Transpose Engine & Review Fixes`, `Preview Rendering & Tier 2`, `PDF Export & Future Features`, `State Persistence & Bug Fixes`, `Editor Rendering & Templates`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `UndoManager` connect `Undo/Redo System` to `Chart Rendering & Line Ops`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `$()` connect `Export, Import & Library` to `Chart Rendering & Line Ops`, `Section Management & Persistence`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `autoScaleLines`, `SECTION_TEMPLATES`, `build.rs main` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chart Rendering & Line Ops` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._