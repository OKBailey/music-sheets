(function(app) {
  'use strict';

  const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

  function noteIndex(note) {
    let idx = NOTES_SHARP.indexOf(note);
    if (idx === -1) idx = NOTES_FLAT.indexOf(note);
    return idx;
  }

  app.transposeNote = function(note, semitones, useFlats) {
    const idx = noteIndex(note);
    if (idx === -1) return note;
    const newIdx = ((idx + semitones) % 12 + 12) % 12;
    return useFlats ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
  };

  app.transposeChordLine = function(line, semitones, useFlats) {
    return line.replace(/\b([A-G][#b]?)([^\s,;|]*)/g, (m, root, rest) => {
      return (root + rest).split('/').map(part => {
        const match = part.match(/^([A-G][#b]?)(.*)/);
        if (!match) return part;
        return app.transposeNote(match[1], semitones, useFlats) + match[2];
      }).join('/');
    });
  };

  app.determineUseFlats = function(key) {
    if (!key) return false;
    return FLAT_KEYS.has(key);
  };

})(window.ChartApp = window.ChartApp || {});
