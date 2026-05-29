# Chart Creator — Feature & Design Suggestions

## Tier 1: High-Impact Workflow Features

### 1. Undo / Redo Stack
- Currently no way to undo accidental deletions (sections, lines, transpose)
- Implement a simple command stack (`Cmd+Z` / `Cmd+Shift+Z`)
- Critical for transpose mistakes — one wrong click and all chords shift with no rollback

### 2. Collapsible Sections in Editor
- Long charts (20+ sections) make the editor panel hard to navigate
- Add collapse/expand toggle per section card — show just the header when collapsed
- "Collapse All / Expand All" button in editor toolbar

### 3. Section Templates / Quick Insert
- Replace the current "Add Section" flow with a **template palette** dropdown:
  - `Verse (empty)`, `Verse (4-line grid)`, `Chorus (4-line grid)`, `Bridge`, `Tag`, `Turnaround`
- Pre-populate with a typical chord+lyric grid structure so the user doesn't always start from blank

### 4. Duplicate + Edit Flow (Section Variants)
- After duplicating a verse, auto-increment the verse number **and** scroll to it
- Add a "Duplicate as next verse" button that's more prominent than the current 📋 icon — maybe a "+ Verse 3" chip on the card footer

### 5. Multi-Select & Batch Actions
- Shift-click or checkbox to select multiple sections
- Batch delete, batch move (reorder), batch transpose (transpose only selected sections)

### 6. Line Drag-and-Drop (within and between sections)
- Currently lines can only be moved with ↑/↓ buttons, one step at a time
- Support drag-and-drop for lines within a section and across sections

### 7. Search & Replace in Chords
- Find chord `Bm` → replace with `Bm7` across the whole chart
- Essential for quick chord quality adjustments

---

## Tier 2: UX & Design Polish

### 8. Preview Page Break Indicators
- Show faint dashed lines in the preview where PDF pages will split
- Currently the user has no idea where page breaks land until they export
- Would also help them decide where to insert blank spacers or rearrange sections

### 9. Keyboard Shortcut Cheat Sheet
- A small `⌘?` or `?` button in the toolbar that shows a modal with all shortcuts
- Current shortcuts (`Cmd+S`, `Cmd+E`, `Esc`) are undiscoverable

### 10. Time Signature Field
- Add a `Time Sig` dropdown in the sidebar (4/4, 3/4, 6/8, etc.)
- Render it in the chart header next to BPM

### 11. "Notes" / "Arrangement Notes" Free-Text Field
- A collapsible textarea in the sidebar for band notes, arrangement cues, or setlist context
- Rendered as a small block at the top or bottom of the chart preview (light gray italic)

### 12. Dark Mode Preview Toggle
- A toggle in the preview header to switch the paper between white (print-accurate) and a dark/inverted reading mode
- Useful for on-stage iPad/tablet reading where a white page is blinding

### 13. Improved Saved Charts Library
- Show key, section count, and last-modified date next to each saved chart name
- Sort options: alphabetical, recently modified, by key
- Add a **search/filter** input above the list
- Show a small "star" or "pin" icon to favorite frequently-used charts

### 14. Confirmation on Destructive Actions
- Deleting a section currently has no confirmation — it's instant and irreversible (no undo yet)
- Add a subtle "hold to delete" or brief undo-toast pattern: "Section deleted. **Undo**"

---

## Tier 3: Ambitious / Stretch Features

### 15. Setlist Mode
- Load multiple charts in sequence with a **setlist order** view
- Navigate between songs with left/right arrows or swipe
- Export an entire setlist as a single multi-song PDF
- Show a setlist sidebar: song name, key, BPM — essentially a gig overview

### 16. Nashville Number System Toggle
- A toggle that converts all chords in the preview to Nashville numbers relative to the song key
- `C → 1`, `Am → 6m`, `F → 4`, `G → 5` in key of C
- Extremely useful for session musicians and transposing on the fly

### 17. Chord Diagram Popover
- Hover over a chord name in the preview to see a small guitar/ukulele chord diagram
- Doesn't need to be in the PDF — just a learning/reference aid in the editor

### 18. Live Collaboration (Cloud Sync)
- Real-time multi-user editing (like Google Docs)
- Would require a backend, but even basic "share chart via link" with read-only viewing would be huge

### 19. Auto-Scroll / Teleprompter Mode
- A "Play" button that auto-scrolls the preview at a tempo-synced speed (BPM-aware)
- Useful for rehearsal — hands-free chart reading

### 20. Audio Reference Link
- A field to paste a YouTube/Spotify URL
- Rendered as a small clickable link in the editor (not in PDF)
- Could embed a mini player in the sidebar for rehearsal reference

---

## Design Overhaul Ideas

### 21. Collapsible Sidebar & Preview (Two-Panel Mode)
- Add hide/show toggles for the sidebar and preview panels
- On smaller screens or when focused on editing, let the user go full-width editor-only
- Animated slide transitions

### 22. Command Palette (`Cmd+K`)
- A spotlight-style command palette for power users
- Quick access to: add section, transpose, export, load chart, switch chart, toggle preview
- Searchable by typing

### 23. Onboarding / First-Run Experience
- The empty state is functional but could be warmer
- A brief 3-step walkthrough overlay on first visit: "Create sections → Edit chords & lyrics → Export PDF"
- Store a `hasSeenOnboarding` flag in localStorage

### 24. Status Bar Enhancements
- Show total line count, estimated page count, current zoom
- A clickable "Page 1 of 2" indicator that scrolls the preview to each page break

### 25. Section Mini-Map
- A thin vertical strip on the right edge of the editor showing a color-coded minimap of all sections
- Click a band to jump to that section — similar to VS Code's minimap but for song structure

---

## Quick Wins (< 1 hour each)

| Feature | Effort | Impact |
|---|---|---|
| `Tab` key moves to next line input | Trivial | High — faster editing |
| `Cmd+D` to duplicate current section | Trivial | Medium |
| Auto-detect key from first chord line | Small | Medium |
| Show char count on long lines approaching overflow | Small | Low |
| Animate section reorder (drag-drop) | Small | Medium — feels polished |
| Export filename includes key (e.g. `Hallelujah_G.pdf`) | Trivial | Low |
| Toast shows "Saved to library" vs "Exported JSON" separately | Trivial | Clarity |

---

> [!TIP]
> **Recommended build order:** Undo/Redo (#1) → Page Break Indicators (#8) → Collapsible Sections (#2) → Section Templates (#3) → Setlist Mode (#15)
> This path maximizes daily usability improvements first, then unlocks the multi-song workflow.

Which of these resonate? I can build an implementation plan for any subset.
