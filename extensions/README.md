# Pachimanga Extensions

This folder contains community-contributed extensions for additional manga sources.

## Built-in Official Sources

These are included in the app by default (no installation needed):

| Source | Language | Type | Status |
|--------|----------|------|--------|
| **MangaPlus** | Multi (incl. ES) | Official Shueisha | ✅ Built-in |
| **Webtoon** | Multi (incl. ES) | Official Naver | ✅ Built-in |
| **WeebCentral** | EN | Community | ✅ Built-in |

## Community Extensions (Install via Settings)

These extensions must be installed by the user from **Settings → Extensions → Install Extension**.

Pre-packaged zip files are available in `extensions/packaged/`:

| Extension | Source | Language | Status |
|-----------|--------|----------|--------|
| `lectortmo` | LectorTMO | ES | 📦 Packaged |
| `tumangaonline` | TuMangaOnline | ES | 📦 Packaged |
| `mangalatino` | MangaLatino | ES | 📦 Packaged |
| `submanga` | SubManga | ES | 📦 Packaged |

Source templates (for modification) are in each source folder under `extensions/`.

## How to Install an Extension

You can install extensions in two ways:

### Option A: Pre-packaged Zip File (Recommended)
1. Open **Settings** in Pachimanga
2. Scroll to **Extensions** section
3. Click **"Install Extension"**
4. Switch to **"Zip File"** tab
4. Drag & drop or browse for a `.zip` file from `extensions/packaged/`
5. Click **"Validate Zip"** to verify the package
5. Click **"Install Extension"**

### Option B: Paste Source Code
1. Open **Settings** in Pachimanga
2. Scroll to **Extensions** section
3. Click **"Install Extension"**
4. Switch to **"Paste Code"** tab
4. Copy the entire contents of a `.js` file from this folder
5. Paste into the text area
6. Click **"Install"**

The source will immediately appear in **Browse** and **Search**.

## Creating Your Own Extension

An extension must export two objects:

```javascript
exports.manifest = {
  id: 'unique-source-id',           // Required: unique identifier
  name: 'Display Name',             // Required: shown in UI
  version: '1.0.0',                 // Required: semantic version
  description: 'Description',       // Required
  author: 'Your Name',              // Required
  sourceId: 'source-id',            // Required: used internally
  sourceName: 'Source Name',        // Required: shown in source list
  permissions: ['network'],         // Optional: 'network', 'storage', 'notifications'
  languages: ['es'],                // Optional: ISO language codes
  contentRating: 'teen',            // Optional: 'everyone', 'teen', 'mature'
  website: 'https://example.com',   // Optional
};

exports.source = {
  async search(query) { /* return Manga[] */ },
  async getManga(id) { /* return Manga */ },
  async getChapters(mangaId) { /* return Chapter[] */ },
  async getChapterPages(chapterId) { /* return Page[] */ },
};
```

### Available APIs in Extensions

Extensions run in a sandboxed iframe with an opaque origin (no `allow-same-origin`), loaded from `manifest.json` + `source.js` in the zip, and communicate with the app only through structured-clone messages. They have access to:

- `fetch` - Network requests (CORS rules apply, no cookies are sent)
- `console.log/warn/error` - Logging (prefixed with `[Extension]`)
- `setTimeout/clearTimeout`, `setInterval/clearInterval`
- `Promise`, `JSON`, `Math`, `Date`, `Object`, `Array`, etc.
- `URL`, `URLSearchParams`, `Headers`, `Request`, `Response`
- `crypto.randomUUID()`, `crypto.getRandomValues()`
- `btoa`, `atob`, `encodeURIComponent`, `decodeURIComponent`

**Not available**: `localStorage`, `indexedDB`, `document`, `window`, Node.js APIs

## Extension Development Tips

1. **Test locally first** - Use the browser dev tools to test your parsing logic
2. **Handle errors gracefully** - Throw `Error` with descriptive messages
3. **Respect rate limits** - Add delays between requests if needed
4. **Check robots.txt** - Respect the site's crawling policies
5. **Use semantic IDs** - Prefix with source abbreviation (e.g., `lt-`, `tmo-`, `ml-`)

## Legal Notice

⚠️ **Important**: Many aggregator sites operate in legal gray areas. Extensions for unofficial sites:
- Are installed at user's own risk
- May break when sites change
- Could violate site ToS
- Should respect rate limits and not overload servers

**Official sources** (MangaPlus, Webtoon) are recommended when available.

## Contributing

To add a new extension:
1. Create a folder under `extensions/your-source-name/`
2. Add `your-source-name-extension.js`
3. Test thoroughly
4. Submit a PR

## Template

See any existing extension file for a complete template with helper functions for:
- HTML parsing utilities
- Search, manga detail, chapters, pages
- Error handling
- Spanish language support