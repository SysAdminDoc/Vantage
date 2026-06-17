# Vantage Widget API v1.0

**Status**: Implemented as of v1.3.0 (Unreleased).
**Semver**: This API is governed by semantic versioning. Breaking changes require a major version bump.

---

## Overview

Vantage widgets are sandboxed `<iframe>` elements embedded in the new tab page. A third-party widget is a remote-origin HTML document that:

1. Loads in a `<iframe sandbox="allow-scripts allow-popups">` container
2. Communicates with the Vantage host via `postMessage` (cross-origin)
3. Declares its type, size, and data requirements in a JSON manifest
4. Receives a `vantage:*` message API for configuration, theme, and size updates

**Security model**: Third-party widgets run in an isolated context. They cannot:
- Access `chrome.*` APIs
- Read Vantage settings or other widgets' data
- Execute arbitrary code outside the sandbox
- Navigate the top frame or escape the sandbox

Vantage validates inbound messages by checking both `event.source` (must be the widget's iframe) and `event.origin` (must match the manifest `src` origin). Outbound messages use the manifest origin as `targetOrigin`. Widget log/error messages are truncated to 2 KB and rate-limited to 20 per 10-second window.

---

## Widget Manifest

Each widget declares itself via a simple JSON manifest (bundled with or hosted by the widget provider).

### Example Manifest

```json
{
  "id": "github-trending",
  "name": "GitHub Trending",
  "version": "1.0.0",
  "author": "example.com",
  "description": "Trending repositories from GitHub",
  "icon": "https://example.com/widgets/github-trending/icon.png",
  "src": "https://example.com/widgets/github-trending/widget.html",
  "sizes": {
    "default": { "width": 320, "height": 240 },
    "large": { "width": 480, "height": 360 }
  },
  "minVantageVersion": "1.0.0",
  "permissions": ["external-fetch"],
  "analytics": false
}
```

### Manifest Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Unique identifier (alphanumeric + dash, no spaces) |
| `name` | string | ✅ | Display name (≤50 chars) |
| `version` | string | ✅ | Semantic version (e.g., `1.0.0`) |
| `author` | string | ✅ | Author/organization name |
| `description` | string | ✅ | One-line description (≤120 chars) |
| `icon` | string | ✅ | Icon URL (square, recommended 256×256; fallback: text monogram) |
| `src` | string | ✅ | Widget HTML URL; must be HTTPS |
| `sizes` | object | ✅ | Min/default/max dimensions (`default` required; others optional) |
| `minVantageVersion` | string | ✅ | Minimum Vantage version required (e.g., `1.0.0`) |
| `permissions` | array | ❌ | Declared capabilities: `["external-fetch", "localstorage-read"]` (future expansion) |
| `analytics` | boolean | ❌ | Whether widget uses external analytics (default: false). If true, Vantage shows disclosure. |
| `homepage` | string | ❌ | Homepage URL for the widget |
| `license` | string | ❌ | SPDX license identifier (e.g., `MIT`, `Apache-2.0`) |

---

## Message Protocol

Widgets and the Vantage host communicate via `window.postMessage()`. All messages are JSON objects with a `type` field.

### Message Flow

```
Host → Widget: vantage:init (widget config, theme, size)
Widget → Host: vantage:ready (widget is loaded and interactive)
Host → Widget: vantage:theme-change (user changed theme)
Host → Widget: vantage:resize (user resized widget)
Widget → Host: vantage:log (optional, for debugging)
Widget → Host: vantage:error (if widget encounters an error)
```

### Messages Emitted by Host → Widget

#### `vantage:init`

Sent once when the widget loads. Contains the widget's initial configuration and theming.

```javascript
{
  "type": "vantage:init",
  "widget": {
    "id": "github-trending",
    "size": "default",  // or "large", "small", etc.
    "data": {
      // User-defined settings specific to this widget instance
      "language": "en",
      "maxItems": 5
    }
  },
  "theme": {
    "name": "mocha",  // or "latte", "macchiato", "frappe", "system"
    "colors": {
      "surface0": "#1e1e2e",
      "surface1": "#313244",
      "text": "#cdd6f4",
      "accent": "#89b4fa",
      "red": "#f38ba8",
      "green": "#a6e3a1",
      "yellow": "#f9e2af"
    }
  },
  "vantageVersion": "1.0.0",
  "userLanguage": "en"  // Browser's active language
}
```

#### `vantage:theme-change`

Sent when the user changes the theme in Vantage settings.

```javascript
{
  "type": "vantage:theme-change",
  "theme": { ... }  // Same structure as `vantage:init.theme`
}
```

#### `vantage:resize`

Sent when the user changes the widget's size (e.g., from "default" to "large").

```javascript
{
  "type": "vantage:resize",
  "size": "large",
  "sizes": {
    "width": 480,
    "height": 360
  }
}
```

---

### Messages Emitted by Widget → Host

#### `vantage:ready`

The widget must emit this after it finishes loading and is ready to receive the `vantage:init` message.

```javascript
window.parent.postMessage({
  "type": "vantage:ready"
}, "*");
```

#### `vantage:log` (optional)

Log a message for debugging. Vantage may display this in DevTools or suppress it based on settings.

```javascript
window.parent.postMessage({
  "type": "vantage:log",
  "level": "info",  // "info", "warn", "error"
  "message": "Widget loaded from API endpoint"
}, "*");
```

#### `vantage:error` (optional)

Report an error to the host. Vantage may display an error state in the widget container.

```javascript
window.parent.postMessage({
  "type": "vantage:error",
  "message": "Failed to fetch data: 401 Unauthorized",
  "code": "AUTH_FAILED"
}, "*");
```

#### `vantage:resize-request` (optional, future v1.1.0)

Request a larger container size. Future versions may implement dynamic resizing.

```javascript
window.parent.postMessage({
  "type": "vantage:resize-request",
  "size": "large"
}, "*");
```

---

## Widget Lifecycle

### Loading

1. **Manifest discovery**: Vantage fetches the widget manifest from a user-provided URL or a curated registry.
2. **Validation**: Check `minVantageVersion`, permissions, and HTTPS compliance.
3. **Container creation**: Create an `<iframe>` with `sandbox` attributes and insert into DOM.
4. **Message listener**: Vantage listens for `vantage:ready` from the iframe.
5. **Init message**: Once ready, Vantage sends `vantage:init` with config + theme.
6. **Rendering**: Widget receives init, renders its UI, and is interactive.

### Runtime

- **Theme changes**: User changes theme in Vantage settings → `vantage:theme-change` sent.
- **Resize requests**: User resizes widget (drag corner) → `vantage:resize` sent.
- **Error handling**: If widget emits `vantage:error`, Vantage shows an error badge; user can remove or refresh the widget.

### Unloading

- **User removes widget**: Vantage destroys the iframe and removes it from the layout.
- **Extension reload**: Vantage saves widget config to `chrome.storage.local`; re-creates iframe on reload.

---

## Widget HTML Template

### Minimal Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Example Widget</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;  /* Inherit from Vantage */
      color: #cdd6f4;  /* Default text color */
    }
  </style>
</head>
<body>
  <div id="widget-content">Loading...</div>

  <script>
    let config = null;
    let theme = null;

    // Listen for messages from the host
    window.addEventListener('message', event => {
      const { type, widget, theme: newTheme, vantageVersion } = event.data;

      if (type === 'vantage:init') {
        config = widget;
        theme = newTheme;
        render();
      } else if (type === 'vantage:theme-change') {
        theme = newTheme;
        applyTheme();
      }
    });

    // Notify host that widget is ready
    window.parent.postMessage({ type: 'vantage:ready' }, '*');

    function render() {
      const content = document.getElementById('widget-content');
      content.innerHTML = `
        <h3>Hello from ${config.id}</h3>
        <p>Theme: ${theme.name}</p>
        <button>Click me</button>
      `;
      applyTheme();
    }

    function applyTheme() {
      document.body.style.color = theme.colors.text;
      document.body.style.background = `rgba(${hexToRgb(theme.colors.surface0)}, 0.5)`;
    }

    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    }
  </script>
</body>
</html>
```

---

## Security Considerations

### What Widgets CAN Do

✅ Render HTML/CSS/JS locally  
✅ Make CORS requests (subject to `Cross-Origin-Resource-Sharing` headers)  
✅ Use `localStorage` within the iframe's origin  
✅ Respond to clicks, keyboard input, form submission  
✅ Use standard Web APIs (`fetch`, `setTimeout`, `Intl`, etc.)  

### What Widgets CANNOT Do

❌ Access `chrome.*` extension APIs  
❌ Read other widgets' data or Vantage settings  
❌ Execute code outside the iframe  
❌ Modify the Vantage DOM  
❌ Bypass CORS restrictions  
❌ Use `allow-top-navigation` or `allow-top-navigation-by-user-activation`  

### Content Security Policy

Vantage does **not** inject a CSP into the widget iframe. The iframe's CSP is whatever the widget's own HTTPS server returns. Widget authors should set a strict `Content-Security-Policy` header on their widget HTML — for example:

```
content-security-policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src * data:; font-src 'self' data:; connect-src *
```

Vantage enforces isolation through the `sandbox` attribute (`allow-scripts allow-popups` — no `allow-same-origin`), origin-validated `postMessage`, and the HTTPS-only `src` requirement.

---

## Versioning & Deprecation

### Semantic Versioning

The widget API uses semver:

- **Major** (1.0 → 2.0): Breaking changes to message format, permissions, or lifecycle
- **Minor** (1.0 → 1.1): New message types (e.g., `vantage:resize-request`), new optional fields
- **Patch** (1.0.0 → 1.0.1): Bug fixes, no new features

### Backward Compatibility

- **Current version**: v1.0.0 (stable)
- **Minimum supported by Vantage host**: v1.0.0
- **Sunset plan**: v1.x will be supported for ≥2 years; deprecation announced ≥6 months in advance

### Future Enhancements (v1.1.0+)

- `vantage:storage` — widgets can request 100 KB of sandboxed persistent storage
- `vantage:notification` — widgets can trigger browser notifications (with user opt-in)
- `vantage:resize-request` — widgets propose dynamic resize
- `vantage:drag-data` — drag-and-drop between widgets

---

## Registry & Discovery

Widgets can be discovered via:

1. **Vantage official registry** (future, opt-in)
2. **User-provided manifest URL** (immediate, v1.0.0)
3. **GitHub releases** (manifest hosted on GitHub Pages)

To add a widget in Vantage:
- Open Settings → Widgets
- Click "Add external widget"
- Paste the widget manifest URL (HTTPS required)
- Confirm permissions + sandbox config

---

## Examples

### GitHub Trending Widget

Manifest URL: `https://example.com/widgets/github-trending/manifest.json`

```json
{
  "id": "github-trending",
  "name": "GitHub Trending",
  "src": "https://example.com/widgets/github-trending/widget.html",
  "sizes": { "default": { "width": 360, "height": 480 } }
}
```

### Stock Price Ticker

```json
{
  "id": "stock-ticker",
  "name": "Stock Ticker",
  "src": "https://example.com/widgets/stock-ticker/index.html",
  "sizes": {
    "compact": { "width": 280, "height": 180 },
    "default": { "width": 360, "height": 240 }
  },
  "permissions": ["external-fetch"],
  "analytics": false
}
```

---

## Testing & Debugging

### Local Testing

1. Create a widget HTML file and manifest locally
2. Serve both via `python3 -m http.server 8000` (localhost)
3. Update manifest `src` to `http://localhost:8000/widget.html`
4. In Vantage settings, add external widget with manifest URL `http://localhost:8000/manifest.json`
5. Inspect iframe via DevTools (right-click iframe → Inspect → Console)

### Error Handling

- Widget fails to load: Vantage shows "Failed to load widget" and an error icon
- Widget is slow: Vantage shows a loading spinner (5s timeout before error)
- Widget emits `vantage:error`: Vantage shows error state; user can dismiss

### Logging

Widgets can emit `vantage:log` messages. Vantage logs these to `chrome.storage.local` (50-entry ring buffer). Users can export logs via Settings → Data → Copy Debug Log.

---

## Support & Feedback

- **GitHub Issues**: https://github.com/SysAdminDoc/Vantage/issues (tag with `widget-api`)
- **Discussions**: https://github.com/SysAdminDoc/Vantage/discussions
- **Version stability**: This API (v1.0) is locked until v2.0 or explicitly deprecated.

---

## License

This Widget API specification is provided under the MIT License, same as Vantage itself. Widget developers are free to build and distribute widgets under any license.

---

**Widget API v1.0.0**  
*Frozen as of Vantage v1.0.0 (May 2, 2026)*  
*Semver stability guaranteed.*

