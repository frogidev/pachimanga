# Pachimanga Native

Pachimanga Native is a Tauri 2 shell around the production Pachimanga web UI. It exists primarily to provide a narrow native networking bridge for WeebCentral.

The normal PWA continues to work without Tauri. When the same UI is opened inside the native shell, `window.__TAURI__` is available and Browse can call the Rust command `weebcentral_request`. Those requests originate from the user's device instead of Vercel.

## Security model

- The native shell loads only `https://pachimanga.frogilab.dev`.
- Tauri remote IPC is explicitly scoped to that exact production origin.
- The only custom permission exposed to that origin is `weebcentral_request`.
- The Rust command accepts only six fixed read-only operations: health, search, manga, chapters, chapter, and pages.
- WeebCentral IDs are validated before any request is made.
- Requests use a clear Pachimanga user agent, a 12-second timeout, and a maximum of three redirects.
- HTTP 403 and 429 responses are surfaced to the UI. The native client does not solve CAPTCHAs, rotate proxies, impersonate a browser, or bypass access controls.

## End-user requirements

End users do not need Rust, Node.js, or a development environment. They only need an installed Pachimanga native binary for their platform and internet access.

The app still uses the hosted Pachimanga UI, Supabase, and normal MangaDex fallback. The native binary only adds device-side WeebCentral networking.

## Developer requirements

Install Rust and the Tauri CLI:

```bash
cargo install tauri-cli --version "^2.11" --locked
```

Platform build requirements:

- Windows: Rust MSVC toolchain, Microsoft C++ Build Tools, and WebView2. Windows 11 already includes WebView2; Tauri installers can provision it on supported older systems.
- macOS: Xcode command-line tools. Distribution requires normal Apple code signing/notarization.
- Linux: Rust plus the WebKitGTK/system packages required by Tauri for the target distribution.
- Android: Android Studio/SDK, a supported JDK, Rust Android targets, and the generated Tauri Android project.
- iOS: macOS with Xcode, an Apple signing identity for device/App Store distribution, Rust iOS targets, and the generated Tauri iOS project.

## Desktop development and build

From the repository root:

```bash
cargo tauri dev
cargo tauri build
```

The shell intentionally loads the production Pachimanga URL, so native IPC is granted only to the production domain configured in `src-tauri/capabilities/remote-pachimanga.json`.

## Android/iOS initialization

Tauri mobile projects are generated locally and are not committed until we intentionally decide to maintain platform-specific generated projects:

```bash
cargo tauri android init
cargo tauri android build
```

On macOS for iOS:

```bash
cargo tauri ios init
cargo tauri ios build
```

## Current native flow

1. Browse detects the Tauri runtime.
2. Search tries WeebCentral through the native Rust command.
3. If native WeebCentral is unavailable or returns no results, the existing hosted MangaDex fallback remains available.
4. Native WeebCentral search results route through `/native/manga/...` so metadata and chapter lists also come from the device.
5. Chapters route through `/native/reader/...`; the HTML used to discover page URLs is fetched natively.
6. Reading progress/library data continue using the existing Pachimanga local-first storage and optional Supabase sync.

If WeebCentral refuses a request from the user's device, Pachimanga reports the upstream status and stops rather than attempting to circumvent the restriction.
