# Pachimanga Native

Pachimanga Native is a Tauri 2 shell around the production Pachimanga UI. It exists primarily to provide a narrow device-side networking bridge for WeebCentral while keeping the same authenticated product experience as the web/PWA.

The shell loads:

```text
https://pachimanga.frogilab.dev
```

There is no native-only guest or demo mode. Users must sign in or register with the same Supabase-backed account used on web/PWA.

## Why the native shell exists

The web/PWA can use the private Frogilab relay for WeebCentral. The native app can instead make the supported WeebCentral HTTPS requests directly from the user's device through the Rust command `weebcentral_request`.

Everything else remains part of the hosted product:

- authentication
- library
- imports
- reader UI
- progress/history
- settings
- MangaDex/ComicK paths

Normal frontend changes therefore deploy through Vercel and usually do not require a new native installer.

## Security model

The native boundary is intentionally narrow:

- The shell loads the production Pachimanga origin.
- Remote Tauri IPC is scoped to that origin through the Tauri capability configuration.
- The custom bridge is `weebcentral_request`; do not replace it with a generic arbitrary-URL HTTP proxy.
- Supported operations are fixed read-only WeebCentral operations such as health, search, manga metadata, chapters, chapter HTML, and pages.
- WeebCentral identifiers and destinations are validated/constructed inside trusted native code.
- Timeouts and redirect limits are enforced.
- HTTP failures such as 403/429 are surfaced instead of being bypassed.
- The client does not solve CAPTCHAs, rotate proxies, impersonate browsers, or bypass upstream authentication/access controls.

Authentication is still enforced by the hosted Next.js/Supabase layer before users reach application routes.

## Current validated Android flow

The native bridge has been validated on a physical Android device.

The high-level flow is:

1. Launch Pachimanga Native.
2. The WebView loads `pachimanga.frogilab.dev`.
3. The user signs in/registers if no valid Supabase session exists.
4. Browse detects the Tauri runtime.
5. WeebCentral requests use the Rust `weebcentral_request` command.
6. Manga metadata/chapter/page discovery stays on the native path for WeebCentral.
7. MangaDex and ComicK continue using their normal application/network paths.
8. Library, reader settings, history, and progress synchronize under the authenticated user account.

A long-strip WeebCentral chapter has also been used for real-device reader validation. Reader changes should continue to be tested on both long-strip/manhwa content and conventional page layouts.

## End-user requirements

End users do not need Rust, Node.js, Android Studio, or Xcode. They need:

- a supported Pachimanga build or the PWA;
- internet access;
- a Pachimanga account.

## Development requirements

Install Rust and the Tauri CLI:

```bash
cargo install tauri-cli --version "^2.11" --locked
```

Platform requirements:

- Windows: Rust MSVC toolchain, Microsoft C++ Build Tools, WebView2.
- macOS: Xcode command-line tools; polished direct distribution needs normal Apple signing/notarization.
- Linux: Rust plus WebKitGTK/system packages required by Tauri.
- Android: Android SDK/NDK, supported JDK, Rust Android target, generated Tauri Android project.
- iOS: macOS/Xcode, Rust iOS targets, and Apple signing/provisioning for device/TestFlight/App Store distribution.

## Desktop development

From the repository root:

```bash
cargo tauri dev
cargo tauri build
```

The shell is configured around the production remote UI. When debugging IPC, verify that the capability origin still matches the production domain.

## Android/iOS generated projects

Tauri mobile projects are generated as needed and are not treated as primary source files:

```bash
cargo tauri android init
cargo tauri android build --apk
```

On macOS for iOS:

```bash
cargo tauri ios init
cargo tauri ios build
```

`src-tauri/gen/` is intentionally ignored.

## CI and releases

The repository contains both test/debug and release-oriented native workflows.

- `.github/workflows/android-apk.yml` — Android test/debug APK path.
- `.github/workflows/android-release.yml` — signed Android release APK/AAB path when signing secrets are configured.
- `.github/workflows/desktop-release.yml` — Windows/Linux/macOS release artifacts.
- `.github/workflows/ios-release.yml` — iOS signed build/export path; App Store Connect/TestFlight upload is a separate step unless explicitly automated.
- `.github/workflows/native-quality.yml` — tests, lint, typecheck, Rust check, and native version consistency.

See `docs/native-release-pipeline.md` for signing details.

## Version invariant

The native version must stay consistent across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Check with:

```bash
node scripts/check-native-version.mjs
```

## When a new native installer is required

Create a new native release when changing any of the following:

- Rust commands or networking behavior
- Tauri capabilities/permissions
- native plugins
- platform manifests/configuration
- native signing/bundling
- icons/metadata that are baked into the binary

Normal Next.js/React UI changes do not require reinstalling Android/macOS/desktop builds because the shell loads the hosted production UI.

## Private small-group distribution

For a private group of roughly tens of users, direct native distribution is sufficient for Android/desktop. iPhone/iPad users can use the PWA for free; a cleaner native iOS distribution path requires Apple Developer signing, typically through TestFlight for a small invited group.

Do not commit signing certificates, provisioning profiles, keystores, passwords, or private keys.
