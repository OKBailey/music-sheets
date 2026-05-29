/* ========================================================================
   Music Chart Creator — Application Logic
   ======================================================================== */

(() => {
  'use strict';

  // ========================================================================
  // TRANSPOSE ENGINE
  // ========================================================================

  const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Keys that conventionally use flats
  const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
                             'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

  function noteIndex(note) {
    let idx = NOTES_SHARP.indexOf(note);
    if (idx === -1) idx = NOTES_FLAT.indexOf(note);
    return idx;
  }

  function transposeNote(note, semitones, useFlats) {
    const idx = noteIndex(note);
    if (idx === -1) return note; // not a recognized note
    const newIdx = ((idx + semitones) % 12 + 12) % 12;
    return useFlats ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
  }

  function transposeChordLine(line, semitones, useFlats) {
    return line.replace(/\b([A-G][#b]?)([^\s,;|]*)/g, (m, root, rest) => {
      return (root + rest).split('/').map(part => {
        const match = part.match(/^([A-G][#b]?)(.*)/);
        if (!match) return part;
        return transposeNote(match[1], semitones, useFlats) + match[2];
      }).join('/');
    });
  }

  function determineUseFlats(key) {
    if (!key) return false;
    return FLAT_KEYS.has(key);
  }

  // ========================================================================
  // INLINE BOLD PARSER
  // Splits "**bold text** regular text" into segments for rendering.
  // Returns an array of {text, bold} objects.
  // ========================================================================

  function parseInlineBold(content) {
    const segments = [];
    // Regex: split on **...** markers
    const re = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    while ((match = re.exec(content)) !== null) {
      // Text before the bold marker
      if (match.index > lastIndex) {
        segments.push({ text: content.slice(lastIndex, match.index), bold: false });
      }
      segments.push({ text: match[1], bold: true });
      lastIndex = re.lastIndex;
    }
    // Remaining text after last match
    if (lastIndex < content.length) {
      segments.push({ text: content.slice(lastIndex), bold: false });
    }
    // Fallback: no markers found → single segment inheriting caller's bold state
    if (segments.length === 0) {
      segments.push({ text: content, bold: false });
    }
    return segments;
  }

  // Renders inline bold segments into a parent element.
  // baseBold: true means the whole line is bold by default (segments toggle within that).
  function renderInlineBold(parentEl, content, baseBold) {
    const hasMarkers = content.includes('**');
    if (!hasMarkers) {
      // Plain text — honour baseBold at the element level, caller sets className
      parentEl.appendChild(document.createTextNode(content));
      return;
    }
    // Mixed bold — render individual spans
    const segments = parseInlineBold(content);
    segments.forEach(seg => {
      if (seg.text === '') return;
      const span = document.createElement('span');
      span.textContent = seg.text;
      // XOR: if baseBold is true, **...** markers make it NORMAL weight (contrast)
      const isBold = baseBold ? !seg.bold : seg.bold;
      span.style.fontWeight = isBold ? '700' : '400';
      parentEl.appendChild(span);
    });
  }

  // ========================================================================
  // STATE
  // ========================================================================

  const STORAGE_KEY = 'chart-creator-state';
  const STORAGE_CHARTS_KEY = 'chart-creator-saved';



  let state = createEmptyChart();
  let previewZoom = 100;

  function createEmptyChart() {
    return {
      id: generateId(),
      title: '',
      artist: '',
      bpm: null,
      timeSignature: '',
      key: '',
      originalKey: '',
      capo: '',
      arrangementNotes: '',
      sections: []
    };
  }



  function createSection(type = 'verse') {
    return {
      id: generateId(),
      type,
      verseNumber: type === 'verse' ? getNextVerseNumber() : null,
      collapsed: false,
      repeat: null,
      customLabel: '',
      lines: []
    };
  }

  function createLine(type = 'lyric', content = '', bold = false) {
    const line = { id: generateId(), type, content, bold };
    if (type === 'grid') {
      line.chords = '';
    }
    return line;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getNextVerseNumber() {
    const verseNums = state.sections
      .filter(s => s.type === 'verse' && s.verseNumber)
      .map(s => s.verseNumber);
    return verseNums.length > 0 ? Math.max(...verseNums) + 1 : 1;
  }
  // ========================================================================
  // DOM REFERENCES
  // ========================================================================

  const $ = id => document.getElementById(id);

  const inputTitle = $('input-title');
  const inputArtist = $('input-artist');
  const inputKey = $('input-key');
  const inputBpm = $('input-bpm');
  const inputTimesig = $('input-timesig');
  const inputCapo = $('input-capo');
  const inputOriginalKey = $('input-original-key');
  const inputNotes = $('input-notes');
  const editorSections = $('editor-sections');
  const emptyState = $('empty-state');
  const addSectionArea = $('add-section-area');
  const chartPaper = $('chart-paper');
  const chartWrapper = $('chart-wrapper');
  const transposeDisplay = $('transpose-display');
  const savedChartsList = $('saved-charts-list');
  const statusSections = $('status-sections');
  const statusKey = $('status-key');
  const statusAutosave = $('status-autosave');
  const toastContainer = $('toast-container');
  const zoomLevel = $('zoom-level');
  const importModal = $('import-modal');
  const importTextarea = $('import-textarea');

  // ========================================================================
  // AUTO-SAVE / LOAD
  // ========================================================================

  let autoSaveTimeout = null;
  function autoSave(immediate = false) {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

    const doSave = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        statusAutosave.textContent = 'Auto-saved';
      } catch (e) {
        console.warn('Auto-save failed:', e);
        statusAutosave.textContent = 'Save failed';
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          showToast('Autosave failed: Storage full', 'error');
        }
      }
    };

    if (immediate) {
      doSave();
    } else {
      statusAutosave.textContent = 'Saving...';
      autoSaveTimeout = setTimeout(doSave, 500);
    }
  }

  function autoLoad() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
        if (!state.id) state.id = generateId();
        return true;
      }
    } catch (e) {
      console.warn('Auto-load failed:', e);
    }
    return false;
  }

  function getSavedCharts() {
    try {
      const data = localStorage.getItem(STORAGE_CHARTS_KEY);
      const charts = data ? JSON.parse(data) : [];
      let modified = false;
      charts.forEach(c => {
        if (!c.data) c.data = {};
        if (!c.data.id) {
          c.data.id = generateId();
          modified = true;
        }
      });
      if (modified) {
        try {
          localStorage.setItem(STORAGE_CHARTS_KEY, JSON.stringify(charts));
        } catch (e) {
          console.warn('Failed to save migrated charts:', e);
        }
      }
      return charts;
    } catch {
      return [];
    }
  }

  function saveChartToLibrary() {
    if (!state.id) state.id = generateId();
    const name = state.title || 'Untitled Chart';
    const charts = getSavedCharts();
    const existing = charts.findIndex(c => 
      (c.data.id && c.data.id === state.id) ||
      (!c.data.id && c.name === name)
    );
    const entry = {
      name,
      data: JSON.parse(JSON.stringify(state)),
      savedAt: new Date().toISOString(),
      key: state.key || '',
      sectionsCount: state.sections.length,
      isFavorite: existing >= 0 ? charts[existing].isFavorite : false
    };
    if (existing >= 0) {
      charts[existing] = entry;
    } else {
      charts.push(entry);
    }
    try {
      localStorage.setItem(STORAGE_CHARTS_KEY, JSON.stringify(charts));
      renderSavedCharts();
      showToast(`"${name}" saved`, 'success');
    } catch (e) {
      console.error('Library save failed:', e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        showToast('Storage quota exceeded! Export JSON or prune library.', 'error');
        alert('Local storage is full! Please export your chart as JSON or delete older saved charts to free up space.');
      } else {
        showToast('Failed to save to library.', 'error');
      }
    }
  }

  function loadChartFromLibrary(id) {
    const charts = getSavedCharts();
    const chart = charts.find(c => c.data.id === id);
    if (chart) {
      pushUndo();
      state = JSON.parse(JSON.stringify(chart.data));
      if (!state.id) state.id = id;
      syncFormFromState();
      renderEditor();
      renderPreview();
      updateStatusBar();
      showToast(`Loaded "${chart.name}"`, 'info');
    }
  }

  function deleteChartFromLibrary(id) {
    let charts = getSavedCharts();
    const chart = charts.find(c => c.data.id === id);
    const name = chart ? chart.name : 'Chart';
    charts = charts.filter(c => c.data.id !== id);
    try {
      localStorage.setItem(STORAGE_CHARTS_KEY, JSON.stringify(charts));
      renderSavedCharts();
      showToast(`Deleted "${name}"`, 'info');
    } catch (e) {
      console.error('Delete failed:', e);
      showToast('Failed to delete chart', 'error');
    }
  }

  // ========================================================================
  // SYNC FORM ↔ STATE
  // ========================================================================

  function syncStateFromForm() {
    state.title = inputTitle.value.trim();
    state.artist = inputArtist.value.trim();
    state.bpm = inputBpm.value ? parseInt(inputBpm.value) : null;
    state.timeSignature = inputTimesig.value;
    state.key = inputKey.value;
    state.capo = inputCapo.value;
    state.originalKey = inputOriginalKey.value;
    state.arrangementNotes = inputNotes.value.trim();
  }

  function syncFormFromState() {
    inputTitle.value = state.title || '';
    inputArtist.value = state.artist || '';
    inputBpm.value = state.bpm || '';
    inputTimesig.value = state.timeSignature || '';
    inputKey.value = state.key || '';
    inputCapo.value = state.capo || '';
    inputOriginalKey.value = state.originalKey || '';
    inputNotes.value = state.arrangementNotes || '';
    transposeDisplay.textContent = state.key || '—';
  }

  // ========================================================================
  // EDITOR RENDERING
  // ========================================================================

  function renderEditor() {
    // Clear existing section cards (keep empty state)
    const cards = editorSections.querySelectorAll('.section-card');
    cards.forEach(c => c.remove());

    if (state.sections.length === 0) {
      emptyState.style.display = 'flex';
      addSectionArea.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      addSectionArea.style.display = 'flex';

      state.sections.forEach((section, sIdx) => {
        const card = buildSectionCard(section, sIdx);
        editorSections.appendChild(card);
      });
    }
    updateStatusBar();
  }

  function buildSectionCard(section, sIdx) {
    const card = document.createElement('div');
    card.className = `section-card section-card--${section.type}`;
    card.dataset.sectionId = section.id;
    if (section.collapsed) card.classList.add('collapsed');
    // NOTE: draggable is set on the handle only, not the card —
    // setting it on the card breaks text selection in child inputs.

    // Header
    const header = document.createElement('div');
    header.className = 'section-card-header';

    // Collapse toggle
    const collapseToggle = document.createElement('button');
    collapseToggle.className = 'section-collapse-toggle';
    collapseToggle.innerHTML = '<span class="chevron">▾</span>';
    collapseToggle.title = 'Collapse/expand section';
    collapseToggle.addEventListener('click', e => {
      e.stopPropagation();
      toggleSectionCollapse(section.id);
    });

    // Selection checkbox
    const selectCheckbox = document.createElement('input');
    selectCheckbox.type = 'checkbox';
    selectCheckbox.className = 'section-select-checkbox';
    selectCheckbox.title = 'Select section (Cmd+Click)';
    selectCheckbox.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.shiftKey) {
        selectSectionRange(section.id);
      } else {
        toggleSectionSelect(section.id, e);
      }
    });
    selectCheckbox.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    const dragHandle = document.createElement('span');
    dragHandle.className = 'section-drag-handle';
    dragHandle.innerHTML = '⠿';
    dragHandle.draggable = true;

    const typeSelect = document.createElement('select');
    typeSelect.className = 'section-type-select';
    ['intro', 'verse', 'chorus', 'bridge', 'outro', 'instrumental', 'custom'].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      if (t === section.type) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', () => {
      pushUndo();
      section.type = typeSelect.value;
      // Update the type class on the card element
      card.className = `section-card section-card--${section.type}`;
      if (section.type === 'verse' && !section.verseNumber) {
        section.verseNumber = getNextVerseNumber();
      }
      renderEditor();
      renderPreview();
      autoSave();
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'section-card-title';
    titleSpan.textContent = getSectionDisplayTitle(section);

    // Collapsed summary
    const collapsedSummary = document.createElement('span');
    collapsedSummary.className = 'section-collapsed-summary';
    collapsedSummary.textContent = section.lines.length + ' line' + (section.lines.length !== 1 ? 's' : '');

    // Verse number input
    let verseNumInput = null;
    if (section.type === 'verse') {
      verseNumInput = document.createElement('input');
      verseNumInput.className = 'verse-number-input';
      verseNumInput.type = 'number';
      verseNumInput.min = '1';
      verseNumInput.max = '99';
      verseNumInput.value = section.verseNumber || 1;
      verseNumInput.title = 'Verse number';
      verseNumInput.addEventListener('change', () => {
        pushUndo();
        section.verseNumber = parseInt(verseNumInput.value) || 1;
        renderPreview();
        autoSave();
      });
    }

    // Custom label input
    let customInput = null;
    if (section.type === 'custom') {
      customInput = document.createElement('input');
      customInput.className = 'form-input';
      customInput.style.cssText = 'width:120px; padding:4px 8px; font-size:12px;';
      customInput.placeholder = 'Label…';
      customInput.value = section.customLabel || '';
      customInput.addEventListener('focus', () => snapshotTextEdit());
      customInput.addEventListener('blur', () => commitTextEdit());
      customInput.addEventListener('input', () => {
        section.customLabel = customInput.value;
        renderPreview();
        autoSave();
      });
    }

    // Repeat input
    const repeatLabel = document.createElement('span');
    repeatLabel.style.cssText = 'font-size:11px; color:var(--text-tertiary); margin-left:auto;';
    repeatLabel.textContent = '×';

    const repeatInput = document.createElement('input');
    repeatInput.className = 'section-repeat-input';
    repeatInput.type = 'number';
    repeatInput.min = '1';
    repeatInput.max = '99';
    repeatInput.value = section.repeat || '';
    repeatInput.placeholder = '—';
    repeatInput.addEventListener('change', () => {
      pushUndo();
      section.repeat = repeatInput.value ? parseInt(repeatInput.value) : null;
      renderPreview();
      autoSave();
    });

    // Actions
    const actions = document.createElement('div');
    actions.className = 'section-card-actions';

    const dupeBtn = createActionBtn('📋', 'Duplicate section', () => {
      pushUndo();
      const copy = JSON.parse(JSON.stringify(section));
      copy.id = generateId();
      copy.lines.forEach(l => l.id = generateId());
      if (copy.type === 'verse') copy.verseNumber = getNextVerseNumber();
      state.sections.splice(sIdx + 1, 0, copy);
      renderEditor();
      renderPreview();
      autoSave();
      // Flash and scroll to duplicated section
      setTimeout(() => {
        const newCard = editorSections.querySelector(`[data-section-id="${copy.id}"]`);
        if (newCard) {
          newCard.classList.add('section-flash');
          newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const firstInput = newCard.querySelector('.line-input');
          if (firstInput) firstInput.focus();
          setTimeout(() => newCard.classList.remove('section-flash'), 1500);
        }
      }, 100);
    });

    const deleteBtn = createActionBtn('🗑', 'Delete section', () => {
      pushUndo();
      state.sections.splice(sIdx, 1);
      renderEditor();
      renderPreview();
      autoSave();
      showToast('Section deleted', 'info', () => {
        undo();
      });
    });
    deleteBtn.classList.add('delete');

    actions.appendChild(dupeBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(collapseToggle);
    header.appendChild(selectCheckbox);
    header.appendChild(dragHandle);
    header.appendChild(typeSelect);
    if (verseNumInput) header.appendChild(verseNumInput);
    if (customInput) header.appendChild(customInput);
    header.appendChild(repeatLabel);
    header.appendChild(repeatInput);
    header.appendChild(actions);

    header.addEventListener('click', e => {
      if (e.target.closest('button, select, input, .section-drag-handle')) return;
      if (e.shiftKey) {
        selectSectionRange(section.id);
      } else if (e.metaKey || e.ctrlKey) {
        toggleSectionSelect(section.id, e);
      }
    });

    // Body — line editor
    const body = document.createElement('div');
    body.className = 'section-card-body';

    const lineList = document.createElement('div');
    lineList.className = 'line-list';

    section.lines.forEach((line, lIdx) => {
      const lineEl = buildLineItem(section, line, sIdx, lIdx);
      lineList.appendChild(lineEl);
    });

    // Add line buttons
    const addBar = document.createElement('div');
    addBar.className = 'add-line-bar';

    const addChordBtn = createSmallBtn('+ Chord', () => {
      pushUndo();
      section.lines.push(createLine('chord'));
      renderEditor();
      renderPreview();
      autoSave();
      // Focus the new input
      setTimeout(() => {
        const inputs = editorSections.querySelectorAll(`[data-section-id="${section.id}"] .line-input`);
        if (inputs.length) inputs[inputs.length - 1].focus();
      }, 50);
    });
    addChordBtn.style.color = 'var(--accent-chord)';

    const addLyricBtn = createSmallBtn('+ Lyric', () => {
      pushUndo();
      section.lines.push(createLine('lyric'));
      renderEditor();
      renderPreview();
      autoSave();
      setTimeout(() => {
        const inputs = editorSections.querySelectorAll(`[data-section-id="${section.id}"] .line-input`);
        if (inputs.length) inputs[inputs.length - 1].focus();
      }, 50);
    });

    const addInstructionBtn = createSmallBtn('+ Instruction', () => {
      pushUndo();
      section.lines.push(createLine('instruction'));
      renderEditor();
      renderPreview();
      autoSave();
      setTimeout(() => {
        const inputs = editorSections.querySelectorAll(`[data-section-id="${section.id}"] .line-input`);
        if (inputs.length) inputs[inputs.length - 1].focus();
      }, 50);
    });
    addInstructionBtn.style.color = 'var(--accent-intro)';

    const addGridBtn = createSmallBtn('+ Grid', () => {
      pushUndo();
      const gl = createLine('grid');
      gl.chords = '';
      section.lines.push(gl);
      renderEditor();
      renderPreview();
      autoSave();
      setTimeout(() => {
        const card = editorSections.querySelector(`[data-section-id="${section.id}"]`);
        if (card) {
          const inputs = card.querySelectorAll('.grid-lyric');
          if (inputs.length) inputs[inputs.length - 1].focus();
        }
      }, 50);
    });
    addGridBtn.style.color = 'var(--accent-primary)';

    addBar.appendChild(addChordBtn);
    addBar.appendChild(addLyricBtn);
    addBar.appendChild(addInstructionBtn);
    addBar.appendChild(addGridBtn);

    // Line drop zone (for cross-section line drag)
    const lineDropZone = document.createElement('div');
    lineDropZone.className = 'line-drop-zone';
    lineDropZone.addEventListener('dragover', e => {
      if (!lineDragState) return;
      e.preventDefault();
      e.stopPropagation();
      lineDropZone.classList.add('drag-over');
    });
    lineDropZone.addEventListener('dragleave', () => lineDropZone.classList.remove('drag-over'));
    lineDropZone.addEventListener('drop', e => {
      if (!lineDragState) return;
      e.preventDefault();
      e.stopPropagation();
      lineDropZone.classList.remove('drag-over');
      const sourceSec = state.sections.find(s => s.id === lineDragState.sectionId);
      if (!sourceSec) return;
      const srcIdx = sourceSec.lines.findIndex(l => l.id === lineDragState.lineId);
      if (srcIdx < 0) return;
      pushUndo();
      const [moved] = sourceSec.lines.splice(srcIdx, 1);
      section.lines.push(moved);
      lineDragState = null;
      renderEditor();
      renderPreview();
      autoSave();
    });

    body.appendChild(lineList);
    body.appendChild(lineDropZone);
    body.appendChild(addBar);

    if (section.editorHeight) {
      body.style.height = section.editorHeight;
    }
    if (section.collapsed) body.classList.add('collapsed');

    card.appendChild(header);
    card.appendChild(body);

    // Track user resize actions and persist height to state
    const resizeObserver = new ResizeObserver(() => {
      const heightStyle = body.style.height;
      if (heightStyle && heightStyle !== section.editorHeight) {
        section.editorHeight = heightStyle;
        autoSave();
      }
    });
    resizeObserver.observe(body);

    // Drag — handle fires dragstart/dragend; card receives dragover/drop
    dragHandle.addEventListener('dragstart', e => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', section.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    dragHandle.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      if (lineDragState) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', e => {
      // Only remove if leaving the card entirely (not moving between child elements)
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over');
      }
    });
    card.addEventListener('drop', e => {
      if (lineDragState) return;
      e.preventDefault();
      card.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId === section.id) return;
      const fromIdx = state.sections.findIndex(s => s.id === draggedId);
      const toIdx = state.sections.findIndex(s => s.id === section.id);
      if (fromIdx < 0 || toIdx < 0) return;
      pushUndo();
      const [moved] = state.sections.splice(fromIdx, 1);
      state.sections.splice(toIdx, 0, moved);
      renderEditor();
      renderPreview();
      autoSave();
    });

    return card;
  }

  function buildLineItem(section, line, sIdx, lIdx) {
    const item = document.createElement('div');
    item.className = 'line-item';

    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'line-drag-handle';
    dragHandle.innerHTML = '⠿';
    dragHandle.draggable = true;
    dragHandle.title = 'Drag to reorder';
    dragHandle.addEventListener('dragstart', e => {
      e.stopPropagation();
      lineDragState = { sectionId: section.id, lineId: line.id };
      e.dataTransfer.setData('application/x-line-drag', 'line');
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    });
    dragHandle.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      lineDragState = null;
      document.querySelectorAll('.line-drag-above, .line-drag-below').forEach(el => {
        el.classList.remove('line-drag-above', 'line-drag-below');
      });
    });

    // Line drop target
    item.addEventListener('dragover', e => {
      if (!lineDragState) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      item.classList.remove('line-drag-above', 'line-drag-below');
      item.classList.add(e.clientY < midY ? 'line-drag-above' : 'line-drag-below');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('line-drag-above', 'line-drag-below');
    });
    item.addEventListener('drop', e => {
      if (!lineDragState) return;
      e.preventDefault();
      e.stopPropagation();
      item.classList.remove('line-drag-above', 'line-drag-below');
      const sourceSec = state.sections.find(s => s.id === lineDragState.sectionId);
      if (!sourceSec) return;
      const srcIdx = sourceSec.lines.findIndex(l => l.id === lineDragState.lineId);
      if (srcIdx < 0) return;
      const rect = item.getBoundingClientRect();
      let targetIdx = e.clientY < (rect.top + rect.height / 2) ? lIdx : lIdx + 1;
      pushUndo();
      const [moved] = sourceSec.lines.splice(srcIdx, 1);
      if (sourceSec.id === section.id && srcIdx < targetIdx) targetIdx--;
      section.lines.splice(targetIdx, 0, moved);
      lineDragState = null;
      renderEditor();
      renderPreview();
      autoSave();
    });

    // Type indicator bar
    const indicator = document.createElement('div');
    indicator.className = `line-type-indicator ${line.type}${line.bold ? ' lyric-bold' : ''}`;

    // Type selector
    const typeSelect = document.createElement('select');
    typeSelect.className = 'line-type-select';
    [
      { value: 'chord', label: 'Chord' },
      { value: 'lyric', label: 'Lyric' },
      { value: 'instruction', label: 'Instruction' },
      { value: 'grid', label: 'Grid' }
    ].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === line.type) o.selected = true;
      typeSelect.appendChild(o);
    });
    typeSelect.addEventListener('change', () => {
      pushUndo();
      line.type = typeSelect.value;
      if (line.type !== 'lyric' && line.type !== 'grid') line.bold = false;
      if (line.type === 'grid' && line.chords === undefined) line.chords = '';
      renderEditor();
      renderPreview();
      autoSave();
    });

    // Text input
    const input = document.createElement('input');
    input.type = 'text';

    let gridInputs = null;

    if (line.type === 'grid') {
      // Grid: two stacked inputs — chords on top, lyrics below
      gridInputs = document.createElement('div');
      gridInputs.className = 'grid-inputs';

      const chordInput = document.createElement('input');
      chordInput.className = 'line-input grid-chords';
      chordInput.type = 'text';
      chordInput.value = line.chords || '';
      chordInput.placeholder = 'e.g. Am  C  G  D';
      chordInput.addEventListener('focus', () => snapshotTextEdit());
      chordInput.addEventListener('blur', () => commitTextEdit());
      chordInput.addEventListener('input', () => {
        line.chords = chordInput.value;
        renderPreview();
        autoSave();
      });
      gridInputs.appendChild(chordInput);

      const lyricInput = document.createElement('input');
      lyricInput.className = `line-input grid-lyric${line.bold ? ' lyric-bold' : ''}`;
      lyricInput.type = 'text';
      lyricInput.value = line.content;
      lyricInput.placeholder = 'Lyrics go here…';
      lyricInput.addEventListener('focus', () => snapshotTextEdit());
      lyricInput.addEventListener('blur', () => commitTextEdit());
      lyricInput.addEventListener('input', () => {
        line.content = lyricInput.value;
        lyricInput.classList.toggle('has-inline-bold', lyricInput.value.includes('**'));
        renderPreview();
        autoSave();
      });
      if (line.content.includes('**')) lyricInput.classList.add('has-inline-bold');
      gridInputs.appendChild(lyricInput);

      // Enter on grid lyric input adds a new grid line below
      lyricInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          pushUndo();
          const newLine = createLine('grid', '', line.bold);
          section.lines.splice(lIdx + 1, 0, newLine);
          renderEditor();
          renderPreview();
          autoSave();
          setTimeout(() => {
            const card = editorSections.querySelector(`[data-section-id="${section.id}"]`);
            if (card) {
              const inputs = card.querySelectorAll('.grid-lyric');
              if (inputs[lIdx + 1]) inputs[lIdx + 1].focus();
            }
          }, 50);
        }

      });
    } else {
      // Non-grid: single input (existing behavior)
      input.className = `line-input ${line.type}${line.bold ? ' lyric-bold' : ''}`;
      input.value = line.content;
      input.placeholder = line.type === 'chord' ? 'e.g. Am, G, C, F' : line.type === 'instruction' ? 'e.g. [Drum fill]' : 'Lyrics… use **bold** for partial bold';
      input.addEventListener('focus', () => snapshotTextEdit());
      input.addEventListener('blur', () => commitTextEdit());
      input.addEventListener('input', () => {
        line.content = input.value;
        input.classList.toggle('has-inline-bold', input.value.includes('**'));
        renderPreview();
        autoSave();
      });
      if (line.content.includes('**')) input.classList.add('has-inline-bold');

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          pushUndo();
          const newLine = createLine(line.type, '', line.bold);
          section.lines.splice(lIdx + 1, 0, newLine);
          renderEditor();
          renderPreview();
          autoSave();
          setTimeout(() => {
            const card = editorSections.querySelector(`[data-section-id="${section.id}"]`);
            if (card) {
              const inputs = card.querySelectorAll('.line-input');
              if (inputs[lIdx + 1]) inputs[lIdx + 1].focus();
            }
          }, 50);
        }

      });
    }
    let boldBtn = null;
    if (line.type === 'lyric' || line.type === 'grid') {
      boldBtn = document.createElement('button');
      boldBtn.className = `bold-toggle ${line.bold ? 'active' : ''}`;
      boldBtn.textContent = 'B';
      boldBtn.title = 'Toggle bold (emphasized lyric)';
      boldBtn.addEventListener('click', () => {
        pushUndo();
        line.bold = !line.bold;
        renderEditor();
        renderPreview();
        autoSave();
      });
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'line-actions';

    const moveUpBtn = createLineActionBtn('↑', 'Move up', () => {
      if (lIdx === 0) return;
      pushUndo();
      [section.lines[lIdx - 1], section.lines[lIdx]] = [section.lines[lIdx], section.lines[lIdx - 1]];
      renderEditor();
      renderPreview();
      autoSave();
    });

    const moveDownBtn = createLineActionBtn('↓', 'Move down', () => {
      if (lIdx >= section.lines.length - 1) return;
      pushUndo();
      [section.lines[lIdx], section.lines[lIdx + 1]] = [section.lines[lIdx + 1], section.lines[lIdx]];
      renderEditor();
      renderPreview();
      autoSave();
    });

    const deleteBtn = createLineActionBtn('×', 'Delete line', () => {
      pushUndo();
      section.lines.splice(lIdx, 1);
      renderEditor();
      renderPreview();
      autoSave();
    });
    deleteBtn.classList.add('delete');

    actions.appendChild(moveUpBtn);
    actions.appendChild(moveDownBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(dragHandle);
    item.appendChild(indicator);
    item.appendChild(typeSelect);
    if (line.type === 'grid') {
      item.appendChild(gridInputs);
    } else {
      item.appendChild(input);
    }
    if (boldBtn) item.appendChild(boldBtn);
    item.appendChild(actions);

    return item;
  }

  function createActionBtn(icon, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-icon btn-sm';
    btn.innerHTML = icon;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createSmallBtn(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-ghost';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createLineActionBtn(icon, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'line-action-btn';
    btn.textContent = icon;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function getSectionDisplayTitle(section) {
    switch (section.type) {
      case 'verse': return `Verse ${section.verseNumber || ''}`;
      case 'chorus': return 'Chorus';
      case 'bridge': return 'Bridge';
      case 'intro': return 'Intro';
      case 'outro': return 'Outro';
      case 'instrumental': return 'Instrumental';
      case 'custom': return section.customLabel || 'Custom';
      default: return section.type;
    }
  }

  // ========================================================================
  // PREVIEW RENDERING (matches PDF chart format)
  // ========================================================================

  function renderPreview() {
    const paper = chartPaper;
    paper.innerHTML = '';

    // Title
    if (state.title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'chart-title';
      titleEl.textContent = `\u201C${state.title}\u201D`;
      paper.appendChild(titleEl);
    }

    // Artist
    if (state.artist) {
      const artistEl = document.createElement('div');
      artistEl.className = 'chart-artist';
      artistEl.textContent = state.artist;
      paper.appendChild(artistEl);
    }

    // BPM & Time Sig
    if (state.bpm || state.timeSignature) {
      const parts = [];
      if (state.bpm) parts.push(`${state.bpm} BPM`);
      if (state.timeSignature) parts.push(state.timeSignature);
      const bpmEl = document.createElement('div');
      bpmEl.className = 'chart-bpm';
      bpmEl.textContent = parts.join(' • ');
      paper.appendChild(bpmEl);
    }

    // Key info
    if (state.key && state.originalKey) {
      const keyEl = document.createElement('div');
      keyEl.className = 'chart-key-info';
      keyEl.textContent = `Key: ${state.key}`;
      paper.appendChild(keyEl);
      const origEl = document.createElement('div');
      origEl.className = 'chart-meta';
      origEl.textContent = `(originally in ${state.originalKey})`;
      origEl.style.marginBottom = '12px';
      paper.appendChild(origEl);
    } else if (state.key) {
      const keyEl = document.createElement('div');
      keyEl.className = 'chart-key-info';
      keyEl.textContent = `Key: ${state.key}`;
      paper.appendChild(keyEl);
    }

    // Capo
    if (state.capo) {
      const capoEl = document.createElement('div');
      capoEl.className = 'chart-meta';
      capoEl.textContent = `Capo - ${state.capo}`;
      capoEl.style.marginBottom = '12px';
      paper.appendChild(capoEl);
    }

    // Arrangement Notes
    if (state.arrangementNotes) {
      const notesEl = document.createElement('div');
      notesEl.className = 'arrangement-notes';
      notesEl.textContent = state.arrangementNotes;
      paper.appendChild(notesEl);
    }

    // Sections
    state.sections.forEach((section, sIdx) => {
      // Blank line before every section
      const spacer = document.createElement('div');
      spacer.className = 'chart-section-spacer';
      paper.appendChild(spacer);

      const sectionEl = document.createElement('div');
      sectionEl.className = 'chart-section';

      // Section header — unified: no brackets, ALL CAPS, bold, type-colored
      {
        const label = document.createElement('div');
        let typeClass = section.type; // maps to CSS .chart-section-label.<type>
        let headerText = '';

        switch (section.type) {
          case 'intro':
            headerText = 'INTRO';
            break;
          case 'verse':
            // Verse headers are handled inline via verse number — skip standalone label
            headerText = ''; // verse number shown next to first lyric, no separate header
            break;
          case 'chorus':
            headerText = 'CHORUS';
            break;
          case 'bridge':
            headerText = 'BRIDGE';
            break;
          case 'outro':
            headerText = 'OUTRO';
            break;
          case 'instrumental':
            headerText = 'INSTRUMENTAL';
            break;
          case 'custom':
            headerText = (section.customLabel || 'SECTION').toUpperCase();
            typeClass = 'custom';
            break;
          default:
            headerText = section.type.toUpperCase();
        }

        if (section.repeat && section.type !== 'verse') {
          headerText += ` × ${section.repeat}`;
        }

        if (headerText) {
          label.className = `chart-section-label ${typeClass}`;
          label.textContent = headerText;
          sectionEl.appendChild(label);
        }
      }


      // Lines
      let firstLyricInVerse = true;
      section.lines.forEach(line => {
        if (!line.content && !(line.type === 'chord' || (line.type === 'grid' && line.chords))) return; // skip empty non-chord lines in preview

        if (line.type === 'chord') {
          const chordEl = document.createElement('div');
          chordEl.className = 'chart-chord-line';
          chordEl.textContent = line.content;
          sectionEl.appendChild(chordEl);
        } else if (line.type === 'lyric') {
          const lyricEl = document.createElement('div');
          
          // For verse type: first lyric with content is bold + has verse number prefix
          if (section.type === 'verse' && firstLyricInVerse && line.content) {
            lyricEl.className = 'chart-lyric-bold';
            const vNum = section.verseNumber || 1;
            const numSpan = document.createElement('span');
            numSpan.className = `chart-verse-number v${Math.min(vNum, 5)}`;
            numSpan.textContent = `[${vNum}]`;
            lyricEl.appendChild(numSpan);
            // Render inline bold within the verse-first line (base is bold)
            renderInlineBold(lyricEl, line.content, true);
            firstLyricInVerse = false;
          } else if (line.bold) {
            lyricEl.className = 'chart-lyric-bold';
            // Render inline bold within an all-bold line (base is bold)
            renderInlineBold(lyricEl, line.content, true);
          } else {
            lyricEl.className = 'chart-lyric-line';
            // Render inline bold within a normal line (base is normal)
            renderInlineBold(lyricEl, line.content, false);
          }
          sectionEl.appendChild(lyricEl);
        } else if (line.type === 'instruction') {
          const instrEl = document.createElement('div');
          instrEl.className = 'chart-instruction';
          instrEl.textContent = line.content;
          sectionEl.appendChild(instrEl);
        } else if (line.type === 'grid') {
          const gridEl = document.createElement('div');
          gridEl.className = 'chart-grid-line';
          if (line.chords) {
            const chordRow = document.createElement('div');
            chordRow.className = 'chart-chord-line';
            chordRow.textContent = line.chords;
            gridEl.appendChild(chordRow);
          }
          if (line.content) {
            const lyricRow = document.createElement('div');
            // Verse-first grid: bold lyric + verse number prefix
            if (section.type === 'verse' && firstLyricInVerse) {
              lyricRow.className = 'chart-lyric-bold';
              const vNum = section.verseNumber || 1;
              const numSpan = document.createElement('span');
              numSpan.className = `chart-verse-number v${Math.min(vNum, 5)}`;
              numSpan.textContent = `[${vNum}]`;
              lyricRow.appendChild(numSpan);
              renderInlineBold(lyricRow, line.content, true);
              firstLyricInVerse = false;
            } else if (line.bold) {
              lyricRow.className = 'chart-lyric-bold';
              renderInlineBold(lyricRow, line.content, true);
              if (section.type === 'verse' && firstLyricInVerse) firstLyricInVerse = false;
            } else {
              lyricRow.className = 'chart-lyric-line';
              renderInlineBold(lyricRow, line.content, false);
              if (section.type === 'verse' && firstLyricInVerse) firstLyricInVerse = false;
            }
            gridEl.appendChild(lyricRow);
          }
          sectionEl.appendChild(gridEl);
        }
      });

      paper.appendChild(sectionEl);
    });

    // If empty, show placeholder
    if (!state.title && state.sections.length === 0) {
      paper.innerHTML = `
        <div style="color: #ccc; font-size: 14px; padding: 40px 0;">
          <div style="font-size: 28px; margin-bottom: 12px; opacity: 0.3;">🎵</div>
          Your chart preview<br>will appear here
        </div>
      `;
    }

    autoScaleLines(paper);
    applyZoom();

    // Page Break Indicators
    paper.querySelectorAll('.page-break-indicator').forEach(el => el.remove());
    const scale = previewZoom / 100 || 1;
    const unzoomedWidth = paper.clientWidth / scale;
    const pageHeight = 792 * (unzoomedWidth / 612);
    const totalHeight = paper.scrollHeight / scale;

    if (totalHeight > pageHeight) {
      const numBreaks = Math.floor(totalHeight / pageHeight);
      for (let i = 1; i <= numBreaks; i++) {
        const breakLine = document.createElement('div');
        breakLine.className = 'page-break-indicator';
        breakLine.style.top = `${i * pageHeight}px`;
        paper.appendChild(breakLine);
      }
    }
  }

  // ========================================================================
  // TRANSPOSE
  // ========================================================================

  function transposeAllChords(semitones) {
    const currentKey = state.key;
    pushUndo();
    let useFlats = false;

    // Determine the new key
    if (currentKey) {
      const isMinor = currentKey.endsWith('m');
      const root = isMinor ? currentKey.slice(0, -1) : currentKey;
      const newRoot = transposeNote(root, semitones, false);
      const newKey = newRoot + (isMinor ? 'm' : '');
      useFlats = determineUseFlats(newKey);

      // Re-transpose the root with correct enharmonic
      const correctedRoot = transposeNote(root, semitones, useFlats);
      state.key = correctedRoot + (isMinor ? 'm' : '');
      inputKey.value = state.key;
      transposeDisplay.textContent = state.key;
    }

    // Transpose all chord lines
    state.sections.forEach(section => {
      section.lines.forEach(line => {
        if (line.type === 'chord' && line.content) {
          line.content = transposeChordLine(line.content, semitones, useFlats);
        }
        if (line.type === 'grid' && line.chords) {
          line.chords = transposeChordLine(line.chords, semitones, useFlats);
        }
      });
    });

    renderEditor();
    renderPreview();
    autoSave();
    showToast(`Transposed ${semitones > 0 ? 'up' : 'down'} to ${state.key || '?'}`, 'info');
  }

  // ========================================================================
  // IMPORT TEXT
  // ========================================================================

  function parseImportText(text) {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;

    const CHORD_LINE_RE = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|dom|7|9|11|13|\d)*(?:\s*[-,\/\s]\s*[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|dom|7|9|11|13|\d)*)*\s*$/;
    const SECTION_RE = /^\[(.+?)\]\s*(.*)$/;

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      // Check for section markers like [Intro], [Chorus], [1], [Bridge] etc.
      const sectionMatch = trimmed.match(SECTION_RE);
      if (sectionMatch) {
        const label = sectionMatch[1];
        const rest = sectionMatch[2].trim();

        let type = 'custom';
        let verseNumber = null;
        let customLabel = label;
        let repeat = null;

        const lowerLabel = label.toLowerCase();
        if (lowerLabel === 'intro') { type = 'intro'; customLabel = ''; }
        else if (lowerLabel === 'chorus') { type = 'chorus'; customLabel = ''; }
        else if (lowerLabel === 'bridge') { type = 'bridge'; customLabel = ''; }
        else if (lowerLabel === 'outro') { type = 'outro'; customLabel = ''; }
        else if (lowerLabel === 'instrumental') { type = 'instrumental'; customLabel = ''; }
        else if (/^\d+$/.test(label)) {
          type = 'verse';
          verseNumber = parseInt(label);
          customLabel = '';
        }

        // Check for repeat like "x4"
        const repeatMatch = rest.match(/x(\d+)/i);
        if (repeatMatch) repeat = parseInt(repeatMatch[1]);

        currentSection = createSection(type);
        currentSection.verseNumber = verseNumber;
        currentSection.customLabel = customLabel;
        currentSection.repeat = repeat;
        sections.push(currentSection);

        // If there's remaining text after the bracket, add as lyric
        const afterRepeat = rest.replace(/x\d+/i, '').trim();
        if (afterRepeat) {
          currentSection.lines.push(createLine('lyric', afterRepeat, true));
        }
        continue;
      }

      // If no current section, create a verse
      if (!currentSection) {
        currentSection = createSection('verse');
        currentSection.verseNumber = 1;
        sections.push(currentSection);
      }

      // Check if line is a chord line
      if (CHORD_LINE_RE.test(trimmed)) {
        currentSection.lines.push(createLine('chord', trimmed));
      } else {
        // Check if it looks like an instruction (contains brackets or special keywords)
        if (/^\(.+\)$/.test(trimmed) || /^Capo|^Key:|^BPM/i.test(trimmed)) {
          currentSection.lines.push(createLine('instruction', trimmed));
        } else {
          currentSection.lines.push(createLine('lyric', trimmed));
        }
      }
    }

  // Post-process: combine consecutive chord+lyric pairs into grid lines
    sections.forEach(section => {
      const merged = [];
      for (let i = 0; i < section.lines.length; i++) {
        const line = section.lines[i];
        if (line.type === 'chord' && i + 1 < section.lines.length && section.lines[i + 1].type === 'lyric') {
          const gridLine = createLine('grid', section.lines[i + 1].content, section.lines[i + 1].bold);
          gridLine.chords = line.content;
          merged.push(gridLine);
          i++;
        } else {
          merged.push(line);
        }
      }
      section.lines = merged;
    });

    return sections;
  }

  // ========================================================================
  // PDF EXPORT
  // ========================================================================

  async function exportPDF() {
    showToast('Generating PDF…', 'info');

    try {
      const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPDFClass) {
        showToast('PDF library (jsPDF) is not loaded. Please check your internet connection.', 'error');
        return;
      }

      // Letter size: 612 × 792 points
      const pageWidth  = 612;
      const pageHeight = 792;
      const marginX    = 40;
      const marginY    = 24;
      const usableWidth  = pageWidth - marginX * 2; // 532
      const pageNumAreaHeight = 20;
      const usableHeight = pageHeight - marginY - pageNumAreaHeight; // 748

      const pdf = new jsPDFClass({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });

      let y = marginY;

      function checkPageBreak(neededHeight) {
        if (y + neededHeight > usableHeight) {
          pdf.addPage();
          y = marginY;
          return true;
        }
        return false;
      }

      function setColor(colorHex) {
        let hex = colorHex.replace('#', '');
        if (hex.length === 3) {
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        pdf.setTextColor(r, g, b);
      }

      // Helper to calculate font size for line fitting
      function getScaledFontSize(text, baseSize) {
        pdf.setFontSize(baseSize);
        // Remove ** bold markers for measurement since they don't render in width
        const cleanText = text.replace(/\*\*/g, '');
        const textWidth = pdf.getTextWidth(cleanText);
        if (textWidth > usableWidth) {
          const scale = usableWidth / textWidth;
          return Math.max(scale, 0.6) * baseSize;
        }
        return baseSize;
      }

      // Helper to draw text with inline bold support (**bold**)
      function drawTextWithInlineBold(text, x, y, baseBold, align) {
        if (!text.includes('**')) {
          pdf.setFont('helvetica', baseBold ? 'bold' : 'normal');
          if (align === 'center') {
            pdf.text(text, x, y, { align: 'center' });
          } else {
            pdf.text(text, x, y);
          }
          return;
        }

        const segments = parseInlineBold(text);
        let totalWidth = 0;
        segments.forEach(seg => {
          if (seg.text === '') return;
          const isBold = baseBold ? !seg.bold : seg.bold;
          pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
          totalWidth += pdf.getTextWidth(seg.text);
        });

        let curX = x;
        if (align === 'center') {
          curX = x - totalWidth / 2;
        }

        segments.forEach(seg => {
          if (seg.text === '') return;
          const isBold = baseBold ? !seg.bold : seg.bold;
          pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
          pdf.text(seg.text, curX, y);
          curX += pdf.getTextWidth(seg.text);
        });
      }

      const lineHeightMultiplier = 1.35;
      const baseFontSize = 17.6;

      // 1. Song Title
      if (state.title) {
        const titleText = `“${state.title}”`;
        const size = getScaledFontSize(titleText, baseFontSize);
        const height = size * lineHeightMultiplier;
        checkPageBreak(height);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(size);
        pdf.setTextColor(0, 0, 0);
        pdf.text(titleText, pageWidth / 2, y + size, { align: 'center' });
        y += height;
      }

      // 2. Artist
      if (state.artist) {
        const size = getScaledFontSize(state.artist, 14);
        const height = size * lineHeightMultiplier;
        checkPageBreak(height);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(0, 0, 0);
        pdf.text(state.artist, pageWidth / 2, y + size, { align: 'center' });
        y += height;
      }

      // 3. BPM & Time Sig
      if (state.bpm || state.timeSignature) {
        const parts = [];
        if (state.bpm) parts.push(`${state.bpm} BPM`);
        if (state.timeSignature) parts.push(state.timeSignature);
        const bpmText = parts.join(' • ');
        const size = getScaledFontSize(bpmText, 12);
        const height = size * lineHeightMultiplier;
        checkPageBreak(height);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(size);
        pdf.setTextColor(0, 0, 0);
        pdf.text(bpmText, pageWidth / 2, y + size, { align: 'center' });
        y += height;
      }

      // 4. Key & Original Key
      if (state.key) {
        let keyText = `Key: ${state.key}`;
        if (state.originalKey) {
          keyText += ` (originally in ${state.originalKey})`;
        }
        const size = getScaledFontSize(keyText, baseFontSize);
        const height = size * lineHeightMultiplier;
        checkPageBreak(height);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(0, 0, 0);
        pdf.text(keyText, pageWidth / 2, y + size, { align: 'center' });
        y += height;
      }

      // 5. Capo
      if (state.capo) {
        const capoText = `Capo - ${state.capo}`;
        const size = getScaledFontSize(capoText, baseFontSize);
        const height = size * lineHeightMultiplier;
        checkPageBreak(height);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(0, 0, 0);
        pdf.text(capoText, pageWidth / 2, y + size, { align: 'center' });
        y += height;
      }

      // 5.5 Arrangement Notes
      if (state.arrangementNotes) {
        const lines = pdf.splitTextToSize(state.arrangementNotes, usableWidth);
        const size = 13;
        const height = size * lineHeightMultiplier * lines.length + 8;
        checkPageBreak(height);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(size);
        pdf.setTextColor(85, 85, 85);
        pdf.text(lines, pageWidth / 2, y + size, { align: 'center' });
        y += height;
      }

      // 6. Sections
      state.sections.forEach(section => {
        // Section Header Text and Color (except verses, which are inline)
        let headerText = '';
        let headerColor = '#000000';
        switch (section.type) {
          case 'intro': headerText = 'INTRO'; headerColor = '#cc00cc'; break;
          case 'chorus': headerText = 'CHORUS'; headerColor = '#217a14'; break;
          case 'bridge': headerText = 'BRIDGE'; headerColor = '#6a1f9a'; break;
          case 'outro': headerText = 'OUTRO'; headerColor = '#6b6b6b'; break;
          case 'instrumental': headerText = 'INSTRUMENTAL'; headerColor = '#1a55d4'; break;
          case 'custom':
            headerText = (section.customLabel || 'SECTION').toUpperCase();
            headerColor = '#9b5c00';
            break;
        }

        if (section.repeat && section.type !== 'verse') {
          headerText += ` × ${section.repeat}`;
        }

        // Determine height of first rendered line to prevent hanging section headers
        const firstRenderedLine = section.lines.find(l => l.content || l.type === 'chord' || (l.type === 'grid' && l.chords));
        let firstLineHeight = 0;
        if (firstRenderedLine) {
          const isVerseFirst = section.type === 'verse';
          if (firstRenderedLine.type === 'chord') {
            firstLineHeight = getScaledFontSize(firstRenderedLine.content, baseFontSize) * lineHeightMultiplier;
          } else if (firstRenderedLine.type === 'lyric') {
            let fullText = firstRenderedLine.content;
            if (isVerseFirst) {
              const vNum = section.verseNumber || 1;
              fullText = `[${vNum}] ` + fullText;
            }
            firstLineHeight = getScaledFontSize(fullText, baseFontSize) * lineHeightMultiplier;
          } else if (firstRenderedLine.type === 'instruction') {
            firstLineHeight = getScaledFontSize(firstRenderedLine.content, baseFontSize) * lineHeightMultiplier;
          } else if (firstRenderedLine.type === 'grid') {
            let h = 0;
            if (firstRenderedLine.chords) h += getScaledFontSize(firstRenderedLine.chords, baseFontSize) * lineHeightMultiplier;
            if (firstRenderedLine.content) {
              let fullText = firstRenderedLine.content;
              if (isVerseFirst) {
                const vNum = section.verseNumber || 1;
                fullText = `[${vNum}] ` + fullText;
              }
              h += getScaledFontSize(fullText, baseFontSize) * lineHeightMultiplier;
            }
            firstLineHeight = h;
          }
        } else {
          firstLineHeight = baseFontSize * lineHeightMultiplier;
        }

        const headerSize = getScaledFontSize(headerText || 'SECTION', 19.5);
        const headerHeight = headerText ? (headerSize * lineHeightMultiplier) : 0;
        const spacerHeight = baseFontSize * 1.0;

        // Force page break if header + spacer + first content line won't fit on the current page
        if (y + spacerHeight + headerHeight + firstLineHeight > usableHeight) {
          pdf.addPage();
          y = marginY;
        } else {
          // Normal section spacer when not breaking pages
          y += spacerHeight;
        }

        if (headerText) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(headerSize);
          setColor(headerColor);
          pdf.text(headerText, pageWidth / 2, y + headerSize, { align: 'center' });
          y += headerHeight;
        }

        // Render Section Lines
        let firstLyricInVerse = true;
        section.lines.forEach(line => {
          if (!line.content && !(line.type === 'chord' || (line.type === 'grid' && line.chords))) return;

          // Render line based on type
          if (line.type === 'chord') {
            const size = getScaledFontSize(line.content, baseFontSize);
            const height = size * lineHeightMultiplier;
            checkPageBreak(height);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(size);
            setColor('#1a55d4');
            pdf.text(line.content, pageWidth / 2, y + size, { align: 'center' });
            y += height;
          } else if (line.type === 'lyric') {
            const isVerseFirst = section.type === 'verse' && firstLyricInVerse && line.content;
            const boldVal = line.bold || isVerseFirst;
            
            let fullText = line.content;
            let vNumText = '';
            let vNumColor = '#cc1800';

            if (isVerseFirst) {
              const vNum = section.verseNumber || 1;
              vNumText = `[${vNum}] `;
              fullText = vNumText + line.content;
              if (vNum === 1) vNumColor = '#cc1800';
              else if (vNum === 2) vNumColor = '#ff7a00';
              else if (vNum === 3) vNumColor = '#8a2be2';
              else if (vNum === 4) vNumColor = '#0070c0';
              else if (vNum === 5) vNumColor = '#00b050';
              else vNumColor = '#6b6b6b';
              firstLyricInVerse = false;
            }

            const size = getScaledFontSize(fullText, baseFontSize);
            const height = size * lineHeightMultiplier;
            checkPageBreak(height);
            pdf.setFontSize(size);

            if (isVerseFirst) {
              // Centered line with verse number prefix
              const cleanFullText = fullText.replace(/\*\*/g, '');
              const totalW = pdf.getTextWidth(cleanFullText);
              let startX = (pageWidth - totalW) / 2;

              pdf.setFont('helvetica', 'bold');
              setColor(vNumColor);
              pdf.text(vNumText, startX, y + size);
              startX += pdf.getTextWidth(vNumText);

              setColor('#000000');
              drawTextWithInlineBold(line.content, startX, y + size, true, 'left');
            } else {
              pdf.setTextColor(0, 0, 0);
              drawTextWithInlineBold(line.content, pageWidth / 2, y + size, boldVal, 'center');
            }
            y += height;
          } else if (line.type === 'instruction') {
            const size = getScaledFontSize(line.content, baseFontSize);
            const height = size * lineHeightMultiplier;
            checkPageBreak(height);
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(size);
            setColor('#cc00cc');
            pdf.text(line.content, pageWidth / 2, y + size, { align: 'center' });
            y += height;
          } else if (line.type === 'grid') {
            // Monospace formatting for grid line if chords are present, to look natural and aligned
            const useMonospace = line.chords ? true : false;
            const fontName = useMonospace ? 'courier' : 'helvetica';

            if (line.chords) {
              const size = getScaledFontSize(line.chords, baseFontSize);
              const height = size * lineHeightMultiplier;
              checkPageBreak(height);
              pdf.setFont(fontName, 'bold');
              pdf.setFontSize(size);
              setColor('#1a55d4');
              pdf.text(line.chords, pageWidth / 2, y + size, { align: 'center' });
              y += height;
            }

            if (line.content) {
              const isVerseFirst = section.type === 'verse' && firstLyricInVerse;
              const boldVal = line.bold || isVerseFirst;

              let fullText = line.content;
              let vNumText = '';
              let vNumColor = '#cc1800';

              if (isVerseFirst) {
                const vNum = section.verseNumber || 1;
                vNumText = `[${vNum}] `;
                fullText = vNumText + line.content;
                if (vNum === 1) vNumColor = '#cc1800';
                else if (vNum === 2) vNumColor = '#ff7a00';
                else if (vNum === 3) vNumColor = '#8a2be2';
                else if (vNum === 4) vNumColor = '#0070c0';
                else if (vNum === 5) vNumColor = '#00b050';
                else vNumColor = '#6b6b6b';
                firstLyricInVerse = false;
              }

              const size = getScaledFontSize(fullText, baseFontSize);
              const height = size * lineHeightMultiplier;
              checkPageBreak(height);
              pdf.setFontSize(size);

              if (isVerseFirst) {
                const cleanFullText = fullText.replace(/\*\*/g, '');
                const totalW = pdf.getTextWidth(cleanFullText);
                let startX = (pageWidth - totalW) / 2;

                pdf.setFont(fontName, 'bold');
                setColor(vNumColor);
                pdf.text(vNumText, startX, y + size);
                startX += pdf.getTextWidth(vNumText);

                setColor('#000000');
                if (useMonospace) {
                  pdf.setFont('courier', 'bold');
                  pdf.text(line.content.replace(/\*\*/g, ''), startX, y + size);
                } else {
                  drawTextWithInlineBold(line.content, startX, y + size, true, 'left');
                }
              } else {
                pdf.setTextColor(0, 0, 0);
                if (useMonospace) {
                  pdf.setFont('courier', boldVal ? 'bold' : 'normal');
                  pdf.text(line.content.replace(/\*\*/g, ''), pageWidth / 2, y + size, { align: 'center' });
                } else {
                  drawTextWithInlineBold(line.content, pageWidth / 2, y + size, boldVal, 'center');
                }
              }
              y += height;
            }
          }
        });
      });

      // 7. Footer Page Numbers (draw on all pages at the end)
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(120, 120, 120);
        const label = `${i} / ${totalPages}`;
        const textWidth = pdf.getTextWidth(label);
        pdf.text(label, pageWidth - 36 - textWidth, usableHeight + 13);
      }

      const filename = (state.title || 'chart').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'chart';
      pdf.save(`${filename}.pdf`);
      showToast('PDF exported!', 'success');

    } catch (err) {
      console.error('PDF export error:', err);
      showToast('PDF export failed: ' + err.message, 'error');
    }
  }


  // ========================================================================
  // JSON EXPORT / IMPORT
  // ========================================================================

  function exportJSON() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.title || 'chart').replace(/[^a-zA-Z0-9 ]/g, '').trim() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON saved', 'success');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target.result;
        if (text.includes('\uFFFD')) {
          showToast('Failed to import: file contains invalid UTF-8 characters', 'error');
          return;
        }
        const data = JSON.parse(text);
        if (data && Array.isArray(data.sections) && data.sections.every(s => s && s.id && s.type && Array.isArray(s.lines))) {
          pushUndo();
          state = data;
          if (!state.id) state.id = generateId();
          syncFormFromState();
          renderEditor();
          renderPreview();
          autoSave();
          showToast(`Loaded "${data.title || 'chart'}"`, 'success');
        } else {
          showToast('Invalid chart file structure', 'error');
        }
      } catch (err) {
        showToast('Failed to parse file', 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ========================================================================
  // SAVED CHARTS LIST
  // ========================================================================

  function renderSavedCharts() {
    const allCharts = getSavedCharts();
    if (allCharts.length === 0) {
      savedChartsList.innerHTML = '<span style="font-size:12px; color:var(--text-tertiary);">No saved charts yet.</span>';
      return;
    }

    const searchQuery = ($('library-search')?.value || '').toLowerCase();
    const sortVal = $('library-sort')?.value || 'date';

    let charts = allCharts.filter(c => c.name.toLowerCase().includes(searchQuery));

    charts.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      if (sortVal === 'alpha') return a.name.localeCompare(b.name);
      if (sortVal === 'key') return (a.key || '').localeCompare(b.key || '');
      return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
    });

    savedChartsList.innerHTML = '';
    
    if (charts.length === 0) {
      savedChartsList.innerHTML = '<span style="font-size:12px; color:var(--text-tertiary);">No matches found.</span>';
      return;
    }

    charts.forEach(chart => {
      const item = document.createElement('div');
      item.className = 'library-item';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'library-item-content';
      contentDiv.addEventListener('click', () => loadChartFromLibrary(chart.data.id));

      const titleEl = document.createElement('div');
      titleEl.className = 'library-item-title';
      titleEl.textContent = chart.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'library-item-meta';
      const keyStr = chart.key ? `Key: ${chart.key}` : '';
      const dateStr = chart.savedAt ? new Date(chart.savedAt).toLocaleDateString() : '';
      const parts = [keyStr, `${chart.sectionsCount || 0} sections`, dateStr].filter(Boolean);
      metaEl.textContent = parts.join(' • ');

      contentDiv.appendChild(titleEl);
      contentDiv.appendChild(metaEl);

      const actionsDiv = document.createElement('div');
      actionsDiv.style.cssText = 'display:flex; align-items:center; gap:4px;';

      const favBtn = document.createElement('button');
      favBtn.className = `favorite-btn ${chart.isFavorite ? 'favorited' : ''}`;
      favBtn.innerHTML = chart.isFavorite ? '★' : '☆';
      favBtn.title = chart.isFavorite ? 'Remove from favorites' : 'Add to favorites';
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chart.isFavorite = !chart.isFavorite;
        const allIdx = allCharts.findIndex(c => c.data.id === chart.data.id);
        if (allIdx >= 0) allCharts[allIdx].isFavorite = chart.isFavorite;
        localStorage.setItem(STORAGE_CHARTS_KEY, JSON.stringify(allCharts));
        renderSavedCharts();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'line-action-btn delete';
      delBtn.textContent = '×';
      delBtn.title = `Delete "${chart.name}"`;
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(`Delete "${chart.name}"?`)) {
          deleteChartFromLibrary(chart.data.id);
        }
      });

      actionsDiv.appendChild(favBtn);
      actionsDiv.appendChild(delBtn);

      item.appendChild(contentDiv);
      item.appendChild(actionsDiv);
      savedChartsList.appendChild(item);
    });
  }

  // ========================================================================
  // TOAST NOTIFICATIONS
  // ========================================================================

  function showToast(message, type = 'info', actionFn = null) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    if (actionFn) {
      const btn = document.createElement('button');
      btn.textContent = 'Undo';
      btn.style.cssText = 'background:none; border:none; color:inherit; text-decoration:underline; cursor:pointer; margin-left:12px; font-weight:bold; font-size:12px;';
      btn.addEventListener('click', () => {
        actionFn();
        if (toast.parentNode) toast.remove();
      });
      toast.appendChild(btn);
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('fadeout');
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 300);
      }
    }, actionFn ? 4000 : 2500);
  }

  // ========================================================================
  // AUTO-SCALE LINES
  /**
   * Auto-scale content lines that overflow the paper width so they fit on
   * one line, preserving the intended vocal/chord line structure.  Each line
   * is measured independently; only lines that overflow are shrunk.
   * Minimum scale floor is 0.6x the original font-size to keep text legible.
   */
  function autoScaleLines(paper) {
    const style = getComputedStyle(paper);
    const padLeft  = parseFloat(style.paddingLeft) || 0;
    const padRight = parseFloat(style.paddingRight) || 0;
    const availableWidth = paper.clientWidth - padLeft - padRight;
    if (availableWidth <= 0) return;

    const LINE_SELECTOR = '.chart-chord-line, .chart-lyric-line, .chart-lyric-bold, .chart-instruction';
    const lines = paper.querySelectorAll(LINE_SELECTOR);

    lines.forEach(el => {
      const origWhiteSpace = el.style.whiteSpace;
      const origFontSize = parseFloat(getComputedStyle(el).fontSize);
      if (!origFontSize) return;

      // Temporarily prevent wrapping so scrollWidth reflects full line length
      el.style.whiteSpace = 'nowrap';

      const scale = availableWidth / el.scrollWidth;

      if (scale < 1) {
        // Clamp to a minimum of 60% of the original size
        const clamped = Math.max(scale, 0.6);
        el.style.fontSize = `${origFontSize * clamped}px`;
      }

      // Restore original white-space (or clear inline if it wasn't set)
      if (origWhiteSpace) {
        el.style.whiteSpace = origWhiteSpace;
      } else {
        el.style.whiteSpace = '';
      }
    });
  }

  // ========================================================================
  // ZOOM & LAYOUT ADJUSTMENT
  // ========================================================================

  function applyZoom() {
    const scale = previewZoom / 100;
    chartPaper.style.zoom = scale;
    chartPaper.style.transform = '';
    chartPaper.style.transformOrigin = '';
    chartWrapper.style.height = '';
    chartWrapper.style.width = '';
  }

  // ========================================================================
  // STATUS BAR
  // ========================================================================

  function updateStatusBar() {
    statusSections.textContent = `${state.sections.length} section${state.sections.length !== 1 ? 's' : ''}`;
    statusKey.textContent = state.key ? `Key: ${state.key}` : '—';
    transposeDisplay.textContent = state.key || '—';
  }

  // ========================================================================
  // EVENT BINDINGS
  // ========================================================================

  function bindEvents() {
    // Metadata inputs — pushUndo on focus for text undo granularity
    [inputTitle, inputArtist, inputBpm, inputTimesig, inputKey, inputCapo, inputOriginalKey, inputNotes].forEach(input => {
      if (!input) return;
      input.addEventListener('focus', () => snapshotTextEdit());
      input.addEventListener('blur', () => commitTextEdit());
      input.addEventListener('input', () => {
        syncStateFromForm();
        transposeDisplay.textContent = state.key || '—';
        renderPreview();
        updateStatusBar();
        autoSave();
      });
      input.addEventListener('change', () => {
        syncStateFromForm();
        transposeDisplay.textContent = state.key || '—';
        renderPreview();
        updateStatusBar();
        autoSave();
      });
    });

    // Add section buttons
    $('btn-add-section-top').addEventListener('click', () => addNewSection());
    $('btn-add-section-bottom').addEventListener('click', () => addNewSection());

    // Template picker
    const templateSelect = $('template-select');
    if (templateSelect) {
      SECTION_TEMPLATES.forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = t.name;
        templateSelect.appendChild(opt);
      });
    }

    // Transpose
    $('btn-transpose-up').addEventListener('click', () => transposeAllChords(1));
    $('btn-transpose-down').addEventListener('click', () => transposeAllChords(-1));

    // Undo/Redo buttons
    $('btn-undo').addEventListener('click', undo);
    $('btn-redo').addEventListener('click', redo);

    // Toolbar actions
    $('btn-new').addEventListener('click', () => {
      if (state.sections.length > 0 && !confirm('Start a new chart? Unsaved changes will be lost.')) return;
      pushUndo();
      state = createEmptyChart();
      syncFormFromState();
      renderEditor();
      renderPreview();
      updateStatusBar();
      autoSave();
      showToast('New chart created', 'info');
    });

    $('btn-save-json').addEventListener('click', () => {
      saveChartToLibrary();
      exportJSON();
    });

    $('btn-load').addEventListener('click', () => {
      $('file-input-json').click();
    });

    $('file-input-json').addEventListener('change', e => {
      if (e.target.files[0]) {
        importJSON(e.target.files[0]);
        e.target.value = '';
      }
    });

    $('btn-export-pdf').addEventListener('click', exportPDF);

    // Import text modal
    $('btn-import-text').addEventListener('click', () => {
      importModal.style.display = 'flex';
      importTextarea.value = '';
      importTextarea.focus();
    });

    $('btn-import-cancel').addEventListener('click', () => {
      importModal.style.display = 'none';
    });

    $('btn-import-confirm').addEventListener('click', () => {
      const text = importTextarea.value.trim();
      if (!text) {
        showToast('No text to import', 'error');
        return;
      }
      pushUndo();
      const sections = parseImportText(text);
      if (sections.length > 0) {
        state.sections.push(...sections);
        renderEditor();
        renderPreview();
        autoSave();
        showToast(`Imported ${sections.length} section(s)`, 'success');
      }
      importModal.style.display = 'none';
    });

    // Close modal on backdrop click
    importModal.addEventListener('click', e => {
      if (e.target === importModal) importModal.style.display = 'none';
    });

    // Search & Replace bar
    const searchCloseBtn = $('search-close-btn');
    if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearchReplace);
    const searchReplaceBtn = $('search-replace-btn');
    if (searchReplaceBtn) {
      searchReplaceBtn.addEventListener('click', () => {
        const findVal = $('search-find-input')?.value || '';
        const replaceVal = $('search-replace-input')?.value || '';
        const caseSensitive = $('search-case-sensitive')?.checked || false;
        const useRegex = $('search-regex')?.checked || false;
        if (!findVal) { showToast('Enter text to find', 'error'); return; }
        const count = searchAndReplace(findVal, replaceVal, { caseSensitive, regex: useRegex });
        if (count > 0) showToast(`Replaced ${count} occurrence(s)`, 'success');
        else showToast('No matches found', 'info');
      });
    }

    // Zoom controls
    $('btn-zoom-in').addEventListener('click', () => {
      previewZoom = Math.min(previewZoom + 10, 200);
      applyZoom();
      zoomLevel.textContent = `${previewZoom}%`;
    });

    $('btn-zoom-out').addEventListener('click', () => {
      previewZoom = Math.max(previewZoom - 10, 50);
      applyZoom();
      zoomLevel.textContent = `${previewZoom}%`;
    });

    // Batch action bar
    const batchDeleteBtn = $('batch-delete');
    if (batchDeleteBtn) batchDeleteBtn.addEventListener('click', batchDelete);
    const batchMoveUpBtn = $('batch-move-up');
    if (batchMoveUpBtn) batchMoveUpBtn.addEventListener('click', batchMoveUp);
    const batchMoveDownBtn = $('batch-move-down');
    if (batchMoveDownBtn) batchMoveDownBtn.addEventListener('click', batchMoveDown);
    const batchTransUpBtn = $('batch-transpose-up');
    if (batchTransUpBtn) batchTransUpBtn.addEventListener('click', () => batchTranspose(1));
    const batchTransDownBtn = $('batch-transpose-down');
    if (batchTransDownBtn) batchTransDownBtn.addEventListener('click', () => batchTranspose(-1));
    const batchClearBtn = $('batch-clear');
    if (batchClearBtn) batchClearBtn.addEventListener('click', clearSelection);

    // Shortcuts Modal
    const shortcutsBtn = $('btn-shortcuts');
    const shortcutsModal = $('shortcuts-modal');
    const shortcutsClose = $('btn-shortcuts-close');
    if (shortcutsBtn && shortcutsModal) {
      shortcutsBtn.addEventListener('click', () => {
        shortcutsModal.style.display = 'flex';
      });
      shortcutsClose.addEventListener('click', () => {
        shortcutsModal.style.display = 'none';
      });
      shortcutsModal.addEventListener('click', e => {
        if (e.target === shortcutsModal) shortcutsModal.style.display = 'none';
      });
    }

    // Dark Mode Toggle
    const darkModeBtn = $('btn-dark-mode');
    if (darkModeBtn) {
      darkModeBtn.addEventListener('click', () => {
        chartPaper.classList.toggle('dark-mode');
      });
    }

    // Library Enhancements
    const librarySearch = $('library-search');
    const librarySort = $('library-sort');
    if (librarySearch) {
      librarySearch.addEventListener('input', renderSavedCharts);
    }
    if (librarySort) {
      librarySort.addEventListener('change', renderSavedCharts);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }
      // Search & Replace
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        openSearchReplace();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveChartToLibrary();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        exportPDF();
      }
      if (e.key === 'Escape') {
        importModal.style.display = 'none';
        const sm = $('shortcuts-modal');
        if (sm) sm.style.display = 'none';
        closeSearchReplace();
        clearSelection();
      }
      if (e.key === '?') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          const sm = $('shortcuts-modal');
          if (sm) sm.style.display = 'flex';
        }
      }
    });
  }

  function addNewSection(templateIndex) {
    pushUndo();
    // Determine a sensible default type
    const lastSection = state.sections[state.sections.length - 1];
    let defaultType = 'verse';
    if (!lastSection) defaultType = 'intro';
    else if (lastSection.type === 'intro') defaultType = 'verse';
    else if (lastSection.type === 'verse') defaultType = 'chorus';
    else if (lastSection.type === 'chorus') defaultType = 'verse';
    else if (lastSection.type === 'bridge') defaultType = 'chorus';

    const section = createSection(defaultType);

    // Use template if specified, otherwise use selected template or default
    const tplIdx = templateIndex !== undefined ? templateIndex
      : parseInt(($('template-select') || {}).value) || 0;
    const template = SECTION_TEMPLATES[tplIdx] || SECTION_TEMPLATES[0];
    section.lines = template.lines();

    state.sections.push(section);

    renderEditor();
    renderPreview();
    autoSave();

    // Scroll to the new section
    setTimeout(() => {
      const cards = editorSections.querySelectorAll('.section-card');
      if (cards.length) {
        cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = cards[cards.length - 1].querySelector('.line-input');
        if (firstInput) firstInput.focus();
      }
    }, 100);
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  function init() {
    const loaded = autoLoad();
    if (loaded) {
      syncFormFromState();
    }
    
    bindEvents();
    renderEditor();
    renderPreview();
    renderSavedCharts();
    updateStatusBar();
    updateUndoRedoButtons();

    // Periodic auto-save
    setInterval(autoSave, 30000);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


  // ========================================================================
  // UNDO / REDO MANAGER
  // ========================================================================

  class UndoManager {
    constructor(maxSize) {
      this.stack = [];
      this.index = -1;
      this.maxSize = maxSize || 50;
      this._isUndoRedo = false;
      this._textEditSnapshot = null;
    }

    push(state) {
      if (this._isUndoRedo) return;
      this.commitTextEdit();
      
      const clone = JSON.parse(JSON.stringify(state));
      
      // If stack is empty, push this as the initial state
      if (this.index === -1) {
        this.stack = [clone];
        this.index = 0;
        this._updateButtons();
        return;
      }

      // Truncate any redo history
      this.stack = this.stack.slice(0, this.index + 1);

      // Avoid duplicate consecutive snapshots
      if (JSON.stringify(clone) === JSON.stringify(this.stack[this.index])) {
        return;
      }

      this.stack.push(clone);
      if (this.stack.length > this.maxSize) {
        this.stack.shift();
      } else {
        this.index++;
      }
      this._updateButtons();
    }

    undo(currentState) {
      this.commitTextEdit();
      if (this.index < 0) return null;

      // Save current state at the top of the stack if different, so we can redo to it
      if (this.index === this.stack.length - 1 && currentState) {
        const clone = JSON.parse(JSON.stringify(currentState));
        if (JSON.stringify(clone) !== JSON.stringify(this.stack[this.index])) {
          this.stack.push(clone);
          this.index++;
        }
      }

      if (this.index <= 0) return null;

      this._isUndoRedo = true;
      this.index--;
      const snapshot = JSON.parse(JSON.stringify(this.stack[this.index]));
      this._isUndoRedo = false;
      this._updateButtons();
      return snapshot;
    }

    redo() {
      if (this.index >= this.stack.length - 1) return null;
      this._isUndoRedo = true;
      this.index++;
      const snapshot = JSON.parse(JSON.stringify(this.stack[this.index]));
      this._isUndoRedo = false;
      this._updateButtons();
      return snapshot;
    }

    snapshotTextEdit(state) {
      if (this._isUndoRedo) return;
      if (!this._textEditSnapshot) {
        this._textEditSnapshot = JSON.parse(JSON.stringify(state));
      }
    }

    commitTextEdit() {
      if (this._textEditSnapshot) {
        if (this._isUndoRedo) { this._textEditSnapshot = null; return; }
        const preState = this._textEditSnapshot;
        this._textEditSnapshot = null;

        // Truncate redo history
        this.stack = this.stack.slice(0, this.index + 1);

        // Only push if the pre-edit state is different from the CURRENT state
        if (JSON.stringify(preState) !== JSON.stringify(state)) {
          // Push pre-edit state as the restore point
          if (this.index === -1) {
            this.stack = [preState];
            this.index = 0;
          } else if (JSON.stringify(preState) !== JSON.stringify(this.stack[this.index])) {
            this.stack.push(preState);
            if (this.stack.length > this.maxSize) {
              this.stack.shift();
            } else {
              this.index++;
            }
          }
        }
        this._updateButtons();
      }
    }

    clear() {
      this.stack = [];
      this.index = -1;
      this._textEditSnapshot = null;
      this._updateButtons();
    }

    _updateButtons() {
      const undoBtn = document.getElementById('btn-undo');
      const redoBtn = document.getElementById('btn-redo');
      if (undoBtn) undoBtn.disabled = (this.index <= 0);
      if (redoBtn) redoBtn.disabled = (this.index >= this.stack.length - 1);
    }
  }

  const undoManager = new UndoManager();

  function pushUndo() { undoManager.push(state); }
  function commitTextEdit() { undoManager.commitTextEdit(); }
  function snapshotTextEdit() { undoManager.snapshotTextEdit(state); }
  function updateUndoRedoButtons() { undoManager._updateButtons(); }


  // ========================================================================
  // COLLAPSIBLE SECTIONS
  // ========================================================================

  function toggleSectionCollapse(sectionId) {
    const section = state.sections.find(s => s.id === sectionId);
    if (!section) return;
    section.collapsed = !section.collapsed;
    renderEditor();
    autoSave();
  }

  // ========================================================================
  // MULTI-SELECT & BATCH ACTIONS
  // ========================================================================


  function toggleSectionSelect(sectionId, event) {
    const isMac = event ? (navigator.platform.toUpperCase().indexOf('MAC') >= 0) : false;
    const modifierKey = event ? (isMac ? event.metaKey : event.ctrlKey) : false;
    if (modifierKey) {
      if (selectedSectionIds.has(sectionId)) {
        selectedSectionIds.delete(sectionId);
        if (lastSelectedSectionId === sectionId) lastSelectedSectionId = null;
      } else {
        selectedSectionIds.add(sectionId);
        lastSelectedSectionId = sectionId;
      }
    } else {
      selectedSectionIds.clear();
      selectedSectionIds.add(sectionId);
      lastSelectedSectionId = sectionId;
    }
    updateSelectionUI();
  }

  function selectSectionRange(sectionId) {
    if (state.sections.length === 0) return;
    const targetIdx = state.sections.findIndex(s => s.id === sectionId);
    if (targetIdx === -1) return;

    let anchorIdx = -1;
    if (lastSelectedSectionId) {
      anchorIdx = state.sections.findIndex(s => s.id === lastSelectedSectionId);
    }
    if (anchorIdx === -1) {
      anchorIdx = state.sections.findIndex(s => selectedSectionIds.has(s.id));
    }

    if (anchorIdx === -1) {
      selectedSectionIds.clear();
      selectedSectionIds.add(sectionId);
      lastSelectedSectionId = sectionId;
    } else {
      const start = Math.min(anchorIdx, targetIdx);
      const end = Math.max(anchorIdx, targetIdx);
      selectedSectionIds.clear();
      for (let i = start; i <= end; i++) {
        selectedSectionIds.add(state.sections[i].id);
      }
    }
    updateSelectionUI();
  }

  function deselectAllSections() {
    selectedSectionIds.clear();
    lastSelectedSectionId = null;
    updateSelectionUI();
  }

  function updateSelectionUI() {
    document.querySelectorAll('.section-card').forEach(card => {
      const sid = card.dataset.sectionId;
      const cb = card.querySelector('.section-select-checkbox');
      if (cb) cb.checked = selectedSectionIds.has(sid);
      card.classList.toggle('selected', selectedSectionIds.has(sid));
    });
    const bar = document.getElementById('batch-action-bar');
    const count = bar ? bar.querySelector('.batch-count') : null;
    if (bar) {
      if (selectedSectionIds.size > 0) {
        bar.style.display = 'flex';
        if (count) count.textContent = selectedSectionIds.size + ' sections selected';
      } else {
        bar.style.display = 'none';
      }
    }
  }

  function batchDelete() {
    if (selectedSectionIds.size === 0) return;
    if (!confirm('Delete ' + selectedSectionIds.size + ' selected section(s)?')) return;
    pushUndo();
    state.sections = state.sections.filter(s => !selectedSectionIds.has(s.id));
    selectedSectionIds.clear();
    updateSelectionUI();
    renderEditor();
    renderPreview();
    autoSave();
    showToast('Deleted sections', 'info');
  }

  function batchMoveUp() {
    if (selectedSectionIds.size === 0) return;
    pushUndo();
    const indices = [];
    state.sections.forEach((s, i) => { if (selectedSectionIds.has(s.id)) indices.push(i); });
    for (const idx of indices) {
      if (idx > 0 && !selectedSectionIds.has(state.sections[idx - 1].id)) {
        [state.sections[idx - 1], state.sections[idx]] = [state.sections[idx], state.sections[idx - 1]];
      }
    }
    renderEditor(); renderPreview(); autoSave(); updateSelectionUI();
  }

  function batchMoveDown() {
    if (selectedSectionIds.size === 0) return;
    pushUndo();
    const indices = [];
    state.sections.forEach((s, i) => { if (selectedSectionIds.has(s.id)) indices.push(i); });
    for (let j = indices.length - 1; j >= 0; j--) {
      const idx = indices[j];
      if (idx < state.sections.length - 1 && !selectedSectionIds.has(state.sections[idx + 1].id)) {
        [state.sections[idx], state.sections[idx + 1]] = [state.sections[idx + 1], state.sections[idx]];
      }
    }
    renderEditor(); renderPreview(); autoSave(); updateSelectionUI();
  }

  function batchTransposeSelected(semitones) {
    if (selectedSectionIds.size === 0) return;
    pushUndo();
    const currentKey = state.key;
    let useFlats = false;
    if (currentKey) {
      useFlats = determineUseFlats(currentKey);
    }
    state.sections.forEach(section => {
      if (!selectedSectionIds.has(section.id)) return;
      section.lines.forEach(line => {
        if (line.type === 'chord' && line.content) line.content = transposeChordLine(line.content, semitones, useFlats);
        if (line.type === 'grid' && line.chords) line.chords = transposeChordLine(line.chords, semitones, useFlats);
      });
    });
    renderEditor(); renderPreview(); autoSave();
    showToast('Transposed selected sections', 'info');
  }

  // Wrappers for binding compatibility
  function batchTranspose(s) { batchTransposeSelected(s); }
  function clearSelection() { deselectAllSections(); }
  function undo() {
    const snapshot = undoManager.undo(state);
    if (snapshot) { state = snapshot; syncFormFromState(); renderEditor(); renderPreview(); updateStatusBar(); autoSave(); showToast('Undo', 'info'); }
  }
  function redo() {
    const snapshot = undoManager.redo();
    if (snapshot) { state = snapshot; syncFormFromState(); renderEditor(); renderPreview(); updateStatusBar(); autoSave(); showToast('Redo', 'info'); }
  }



  // ========================================================================
  // SEARCH & REPLACE
  // ========================================================================

  function closeSearchReplace() {
    const bar = document.getElementById('search-replace-bar');
    if (bar) bar.style.display = 'none';
  }

  function openSearchReplace() {
    const bar = document.getElementById('search-replace-bar');
    if (bar) { bar.style.display = 'flex'; document.getElementById('search-find-input').focus(); }
  }

  function searchAndReplace(findText, replaceText, options) {
    if (!findText) return 0;
    options = options || {};
    var caseSensitive = options.caseSensitive || false;
    var useRegex = options.regex || false;
    var re;
    try {
      if (useRegex) { re = new RegExp(findText, caseSensitive ? 'g' : 'gi'); }
      else { re = new RegExp(findText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), caseSensitive ? 'g' : 'gi'); }
    } catch (e) { showToast('Invalid search pattern', 'error'); return 0; }
    var count = 0;
    state.sections.forEach(function(section) {
      section.lines.forEach(function(line) {
        if (line.type === 'chord' || line.type === 'lyric' || line.type === 'instruction') {
          var m = line.content.match(re); if (m) { count += m.length; line.content = line.content.replace(re, replaceText); }
        }
        if (line.type === 'grid') {
          if (line.chords) { var m1 = line.chords.match(re); if (m1) { count += m1.length; line.chords = line.chords.replace(re, replaceText); } }
          if (line.content) { var m2 = line.content.match(re); if (m2) { count += m2.length; line.content = line.content.replace(re, replaceText); } }
        }
      });
    });
    return count;
  }


  // ========================================================================
  // SHARED STATE DECLARATIONS (placed here to avoid conflicts)
  // ========================================================================

  let selectedSectionIds = new Set();
  let lastSelectedSectionId = null;

  const SECTION_TEMPLATES = [
    { name: 'Empty (default)', lines: function() { return [createLine('chord'), createLine('lyric')]; } },
    { name: 'Verse \u2014 4 bar', lines: function() { var arr = []; for (var i = 0; i < 4; i++) { var l = createLine('grid'); l.chords = ''; arr.push(l); } return arr; } },
    { name: 'Chorus \u2014 8 bar', lines: function() { var arr = []; for (var i = 0; i < 8; i++) { var l = createLine('grid'); l.chords = ''; arr.push(l); } return arr; } },
    { name: 'Bridge \u2014 4 bar', lines: function() { var arr = []; for (var i = 0; i < 4; i++) { var l = createLine('grid'); l.chords = ''; arr.push(l); } return arr; } },
    { name: 'Intro / Outro \u2014 chords only', lines: function() { return [createLine('chord'), createLine('chord'), createLine('chord'), createLine('chord')]; } },
    { name: 'Instrumental \u2014 8 bar chords', lines: function() { var arr = []; for (var i = 0; i < 8; i++) arr.push(createLine('chord')); return arr; } }
  ];

})();
