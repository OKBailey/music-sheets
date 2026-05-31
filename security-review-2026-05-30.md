# Security Review — Chart Creator

**Date:** 2026-05-30
**Project:** Tauri + vanilla HTML/CSS/JS music chart editor. Client-side desktop app with localStorage persistence, CDN-loaded PDF libraries, and a Tauri WebView shell.
**Scope:** `app.js`, `src-js/*.js`, `index.html`, `style.css`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`

---

## Findings

### HIGH — XSS via `showToast` with user-supplied content

**Files:** [ui.js](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/ui.js:24), [import-export.js](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/import-export.js:128), [storage.js](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/storage.js:77)

The `showToast` function builds toast content with `innerHTML`, interpolating a `message` parameter directly into the HTML string:

```js
toast.innerHTML = `<span style="font-weight:bold">${icon}</span> <span>${message}</span>`;
```

Several call sites pass user-controlled data into `message`:

- `importJSON` ([import-export.js:128](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/import-export.js:128)):
  ```js
  app.showToast(`Loaded "${data.title || 'chart'}"`, 'success');
  ```
  `data.title` comes from a user-supplied JSON file. A malicious chart file with `"title": "<img src=x onerror=alert(1)>"` would execute script in the WebView.

- `saveChartToLibrary` ([storage.js:77](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/storage.js:77)):
  ```js
  app.showToast(`"${name}" saved`, 'success');
  ```
  `name` is derived from `app.state.title`, which the user types into a form input.

- `loadChartFromLibrary` ([storage.js:103](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/storage.js:103)) and `deleteChartFromLibrary` ([storage.js:112](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/storage.js:112)) have the same pattern.

**Impact:** In a Tauri desktop app, the WebView is the application context. Successful XSS allows arbitrary code execution within the app's WebView sandbox. While this app has minimal Tauri capabilities (`core:default`), an attacker who crafts a malicious `.json` chart file and shares it could execute JavaScript when the victim imports it. Given the app's purpose (music charts shared among band members, worship teams, etc.), file sharing is a realistic threat vector.

**Fix:** Replace `innerHTML` with `textContent` for user-supplied values. Build the toast structure using DOM APIs:

```js
const toast = document.createElement('div');
toast.className = `toast ${type}`;
const iconSpan = document.createElement('span');
iconSpan.style.fontWeight = 'bold';
iconSpan.textContent = icon;
const msgSpan = document.createElement('span');
msgSpan.textContent = message;
toast.appendChild(iconSpan);
toast.appendChild(msgSpan);
```

---

### MEDIUM — CDN scripts loaded without Subresource Integrity (SRI)

**File:** [index.html](/Users/randymitchell/Desktop/Antigravity/music-sheets/index.html:329)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

Both `<script>` tags lack `integrity` attributes. If the CDN is compromised, the network path is MITM'd, or the hosting account is hijacked, the loaded script could be replaced with malicious code. In a Tauri app, the WebView devtools are typically hidden from users, making it hard to notice unexpected network requests or injected behavior.

**Fix:** Add SRI hashes:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
```

Alternatively, bundle these libraries locally in `dist/` and drop the CDN dependency entirely. This also makes the app work offline — a meaningful improvement for a music tool used in rehearsal rooms and venues.

---

### MEDIUM — CSP allows unused CDN (`jsdelivr.net`)

**File:** [tauri.conf.json](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-tauri/tauri.conf.json:25)

```json
"script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net"
```

The CSP permits scripts from `jsdelivr.net`, but the app only loads from `cdnjs.cloudflare.com`. An unnecessary allowlist entry widens the attack surface: a compromised or malicious jsDelivr package could be loaded if an XSS or injection bug exists elsewhere.

**Fix:** Remove `https://cdn.jsdelivr.net` from `script-src`.

---

### LOW — No CSP when running in dev mode

**File:** [index.html](/Users/randymitchell/Desktop/Antigravity/music-sheets/index.html:1)

The HTML file has no `<meta http-equiv="Content-Security-Policy">` tag. The CSP in `tauri.conf.json` only applies inside the Tauri WebView. When running the dev server (`npx http-server dist -p 1420`), there is no CSP at all. While this is a local dev environment, it means the app loads CDN scripts without any policy enforcement during development, and any CSP violations that would be caught in the Tauri build are invisible during the fast dev cycle.

**Fix:** Add a `<meta>` CSP to `index.html` that mirrors the Tauri CSP:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'">
```

---

### LOW — `style-src 'unsafe-inline'` in CSP

**File:** [tauri.conf.json](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-tauri/tauri.conf.json:25)

The CSP allows `style-src 'unsafe-inline'`. The app uses inline styles extensively for dynamic font scaling, color coding of sections, and zoom adjustments. Removing `unsafe-inline` would require a significant refactor to use CSS custom properties or dynamically injected `<style>` blocks with nonces. However, `unsafe-inline` combined with any HTML injection bug makes CSS-based data exfiltration possible (though not trivial).

**Mitigation:** This is the lowest-priority item. The real fix is eliminating the XSS vector (HIGH finding above), which renders `unsafe-inline` styles moot as an attack surface. If the XSS vector is closed, this becomes informational.

---

### INFO — localStorage stores unencrypted chart data

**File:** [storage.js](/Users/randymitchell/Desktop/Antigravity/music-sheets/src-js/storage.js:4)

All charts, titles, lyrics, and arrangement notes are stored in `localStorage` as plain JSON. On macOS, `localStorage` data for Tauri apps lives in `~/Library/Application Support/com.chartcreator.music/`. This is a single-user machine, so the risk is minimal, but:

- If the user syncs their Application Support folder via iCloud or a backup solution, chart data is transmitted and stored in plain text.
- No encryption at rest. A process with filesystem access can read all chart content.

**Mitigation:** For a local-only music chart tool, this is acceptable. If chart sharing or cloud sync becomes a feature, consider encrypting stored data or using Tauri's `tauri-plugin-store` with the `encrypt` feature.

---

## What's Already Good

- **Minimal Tauri capabilities.** Only `core:default` permissions. No filesystem, shell, or network plugin access beyond what the WebView provides natively.
- **No `eval()` or dynamic code execution.** No `Function()`, `setTimeout` with strings, or `eval()` anywhere in the codebase.
- **DOM rendering uses `textContent` or `createTextNode`** in the preview panel (`preview.js`), editor (`editor.js`), and library list (`ui.js`). The XSS vector is isolated to `showToast`.
- **File download filenames are sanitized** — `exportJSON` strips non-alphanumeric characters from the filename before download.
- **Import path validates JSON structure** — `importJSON` checks for `Array.isArray(data.sections)` before processing.
- **No remote resource loading in PDF export** — jsPDF renders locally without fetching external fonts or images.
- **Undo stack uses `JSON.parse(JSON.stringify())` for deep cloning** — no prototype pollution risk from state manipulation.

---

## Summary

| Severity | Finding | Location |
|----------|---------|----------|
| HIGH | XSS via `innerHTML` in `showToast` with user data | `ui.js:24`, `import-export.js:128`, `storage.js:77` |
| MEDIUM | CDN scripts without SRI integrity hashes | `index.html:329` |
| MEDIUM | CSP allows unused `jsdelivr.net` script source | `tauri.conf.json:25` |
| LOW | No CSP in dev mode | `index.html` |
| LOW | `style-src 'unsafe-inline'` | `tauri.conf.json:25` |
| INFO | Plaintext localStorage | `storage.js` |

The HIGH finding is the only one that warrants immediate attention. It's a classic `innerHTML` interpolation bug in a toast notification — easy to fix by switching to `textContent` with DOM construction. Given that this is a music chart tool where users share `.json` files, the file-import XSS path is a realistic attack vector.

