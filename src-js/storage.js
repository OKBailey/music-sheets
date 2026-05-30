(function(app) {
  'use strict';

  const STORAGE_KEY = 'chart-creator-state';
  const STORAGE_CHARTS_KEY = 'chart-creator-saved';

  let autoSaveTimeout = null;

  app.autoSave = function(immediate = false) {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

    const doSave = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(app.state));
        if (app.updateAutoSaveStatus) app.updateAutoSaveStatus('Auto-saved');
      } catch (e) {
        console.warn('Auto-save failed:', e);
        if (app.updateAutoSaveStatus) app.updateAutoSaveStatus('Save failed');
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          app.showToast('Autosave failed: Storage full', 'error');
        }
      }
    };

    if (immediate) {
      doSave();
    } else {
      if (app.updateAutoSaveStatus) app.updateAutoSaveStatus('Saving...');
      autoSaveTimeout = setTimeout(doSave, 500);
    }
  };

  app.autoLoad = function() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        app.state = app.normalizeState(parsed);
        return true;
      }
    } catch (e) {
      console.warn('Auto-load failed:', e);
    }
    return false;
  };

  app.getSavedCharts = function() {
    try {
      const data = localStorage.getItem(STORAGE_CHARTS_KEY);
      const charts = data ? JSON.parse(data) : [];
      let modified = false;
      charts.forEach(c => {
        if (!c.data) c.data = {};
        if (!c.data.id) {
          c.data.id = app.generateId();
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
  };

  app.saveChartToLibrary = function() {
    if (!app.state.id) app.state.id = app.generateId();
    const name = app.state.title || 'Untitled Chart';
    const charts = app.getSavedCharts();
    const existing = charts.findIndex(c =>
      (c.data.id && c.data.id === app.state.id) ||
      (!c.data.id && c.name === name)
    );
    const entry = {
      name,
      data: JSON.parse(JSON.stringify(app.state)),
      savedAt: new Date().toISOString(),
      key: app.state.key || '',
      sectionsCount: app.state.sections.length,
      isFavorite: existing >= 0 ? charts[existing].isFavorite : false
    };
    if (existing >= 0) {
      charts[existing] = entry;
    } else {
      charts.push(entry);
    }
    try {
      localStorage.setItem(STORAGE_CHARTS_KEY, JSON.stringify(charts));
      if (app.renderSavedCharts) app.renderSavedCharts();
      app.showToast(`"${name}" saved`, 'success');
    } catch (e) {
      console.error('Library save failed:', e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        app.showToast('Storage quota exceeded! Export JSON or prune library.', 'error');
        alert('Local storage is full! Please export your chart as JSON or delete older saved charts to free up space.');
      } else {
        app.showToast('Failed to save to library.', 'error');
      }
    }
  };

  app.loadChartFromLibrary = function(id) {
    const charts = app.getSavedCharts();
    const chart = charts.find(c => c.data.id === id);
    if (chart) {
      app.pushUndo();
      app.state = app.normalizeState(chart.data);
      if (!app.state.id) app.state.id = id;
      if (app.syncFormFromState) app.syncFormFromState();
      if (app.renderEditor) app.renderEditor();
      if (app.renderPreview) app.renderPreview();
      if (app.updateStatusBar) app.updateStatusBar();
      app.showToast(`Loaded "${chart.name}"`, 'info');
    }
  };

  app.deleteChartFromLibrary = function(id) {
    let charts = app.getSavedCharts();
    const chart = charts.find(c => c.data.id === id);
    const name = chart ? chart.name : 'Chart';
    charts = charts.filter(c => c.data.id !== id);
    try {
      localStorage.setItem(STORAGE_CHARTS_KEY, JSON.stringify(charts));
      if (app.renderSavedCharts) app.renderSavedCharts();
      app.showToast(`Deleted "${name}"`, 'info');
    } catch (e) {
      console.error('Delete failed:', e);
      app.showToast('Failed to delete chart', 'error');
    }
  };

})(window.ChartApp = window.ChartApp || {});
