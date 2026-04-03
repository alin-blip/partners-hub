

# Fix "Add to Home Screen" Icon

## Problem
The app has no **Web App Manifest** (`manifest.json`) and no properly sized PNG icons. When a user taps "Add to Home Screen" on mobile, the browser needs:
1. A `manifest.json` file declaring app name, icons, theme color, etc.
2. PNG icons in multiple sizes (at minimum 192×192 and 512×512)
3. An `<link rel="manifest">` tag in `index.html`
4. An `<link rel="apple-touch-icon">` for iOS

Currently there is only a `favicon.ico` (122KB, standard ICO format) — no manifest, no apple-touch-icon, no large PNGs.

## What needs to happen

### 1. Generate PWA icons from existing favicon
- Convert `favicon.ico` to PNG icons: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180×180)
- Place them in `public/`

### 2. Create `public/manifest.json`
```json
{
  "name": "EduForYou UK – Agent Management Platform",
  "short_name": "EduForYou",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 3. Update `index.html` `<head>`
Add three lines:
```html
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f97316">
```

### Files to modify
- `public/manifest.json` — new
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — generated from favicon
- `index.html` — add manifest + apple-touch-icon + theme-color meta

### Live platform impact
Zero risk. These are purely additive static files — no database, no RLS, no auth changes. Existing users and agents are unaffected.

