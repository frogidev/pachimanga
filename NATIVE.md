# Pachimanga Native

Pachimanga Native is a retained Tauri 2 shell around the production Pachimanga UI. It primarily provides a narrow device-side WeebCentral networking bridge while preserving the same authenticated product experience as the PWA.

The shell loads:

```text
https://pachimanga.frogilab.dev
```

There is no native-only guest/demo mode. Users authenticate with the same Supabase-backed account used on web/PWA.

## Current project status

Native source is maintained, but native distribution is not an active delivery target. PWA/web v1.0.2 is released, including the PR #85 post-release parity/reader batch; that hosted web release does not automatically authorize native publication.

Until the user explicitly opens the native distribution phase and its security/signing/device gates are satisfied:

- Android debug/release workflows remain manual-only.
- Windows/Linux/macOS release workflow remains manual-only.
- iOS release workflow remains manual-only.
- Do not add tag/push triggers for native releases.
- Do not prioritize signing/store/TestFlight/installer work unless explicitly requested.

Normal frontend changes continue to ship through Vercel and are consumed by the remote UI loaded by the shell.

## Why the native shell exists

The browser/PWA can use the private Frogilab relay for WeebCentral. Tauri can instead make supported WeebCentral HTTPS requests from the device through the Rust `weebcentral_request` command.

The hosted product still owns:

- authentication;
- library;
- imports;
- reader UI;
- progress/history;
- settings;
- MangaDex/ComicK paths.

A new installer is normally unnecessary for a pure Next.js/React change.

## Security model

The native boundary is intentionally narrow:

- WebView content comes from the production Pachimanga origin.
- Remote Tauri IPC is scoped to that origin through capability configuration.
- The custom bridge is `weebcentral_request`.
- Supported operations are fixed read-only WeebCentral operations.
- IDs/destinations are validated or constructed inside trusted native code.
- Timeouts/redirect limits are bounded.
- Upstream HTTP failures such as 403/429 are surfaced rather than bypassed.
- The client does not solve CAPTCHAs, rotate proxies, impersonate browsers, or bypass authentication/anti-bot controls.
- Secrets must not be embedded in the native binary.

Never replace the dedicated command with a generic arbitrary-URL fetch bridge.

## Previously validated Android flow

A physical-device Android path has been validated historically:

1. Launch the Tauri shell.
2. Load `pachimanga.frogilab.dev`.
3. Authenticate with the normal Pachimanga account.
4. Detect the Tauri runtime.
5. Route supported WeebCentral requests through `weebcentral_request`.
6. Keep MangaDex/ComicK on their normal application paths.
7. Synchronize library/settings/history/progress through the authenticated account model.

This historical validation is not a substitute for final release validation. The native phase must repeat real-device testing after the PWA product and signing/distribution configuration are finalized.

## Development requirements

Install Rust and Tauri CLI:

```bash
cargo install tauri-cli --version "^2.11" --locked
```

Platform requirements:

- Windows: Rust MSVC, Microsoft C++ Build Tools, WebView2.
- macOS: Xcode command-line tools; production distribution needs Apple signing/notarization.
- Linux: Rust plus WebKitGTK/system packages required by Tauri.
- Android: Android SDK/NDK, supported JDK, Rust Android target, generated Tauri project.
- iOS: macOS/Xcode, Rust iOS targets, Apple signing/provisioning for device/TestFlight/App Store distribution.

## Development checks

For native-impacting changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
node scripts/check-native-version.mjs
```

The `Native Quality` GitHub workflow runs the relevant JS/Rust/version checks for matching changes.

## Desktop development

```bash
cargo tauri dev
cargo tauri build
```

The shell is configured around the production remote UI. When debugging IPC, verify the capability origin still matches the intended production origin.

## Generated mobile projects

Generated Tauri mobile projects are not primary source files and remain ignored:

```bash
cargo tauri android init
cargo tauri android build --apk
```

On macOS:

```bash
cargo tauri ios init
cargo tauri ios build
```

`src-tauri/gen/` is intentionally ignored.

## Workflows

- `.github/workflows/native-quality.yml` — automatic quality checks for matching changes.
- `.github/workflows/android-apk.yml` — manual Android debug/test APK.
- `.github/workflows/android-release.yml` — manual signed Android APK/AAB build.
- `.github/workflows/desktop-release.yml` — manual Windows/Linux/macOS artifacts.
- `.github/workflows/ios-release.yml` — manual iOS signed build/export.

Release workflows remain intentionally manual-only after the current PWA v1.0.2 production baseline until native distribution is explicitly requested.

See `docs/native-release-pipeline.md` for final-phase signing requirements.

## Version invariant

Native version must match in:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Check with:

```bash
node scripts/check-native-version.mjs
```

## When a new native artifact is required

A new native build is required for changes to:

- Rust commands/networking behavior;
- Tauri capabilities/permissions/origins;
- native plugins;
- platform manifests/configuration;
- native signing/bundling;
- icons/metadata embedded in the binary.

A pure hosted UI change normally does not require reinstalling a native shell.

## Final native release gate

Native distribution may start only after an explicit user decision to begin the native phase. The final phase must validate:

- persistent signing credentials and recovery/backup procedures;
- install and upgrade behavior from an older build;
- real-device Android behavior;
- Windows/Linux/macOS packaging on current runners;
- Apple Developer/TestFlight decision and credentials if iOS/macOS native distribution is required;
- authenticated production UI loading;
- origin-restricted IPC;
- WeebCentral bridge behavior;
- no regression in account isolation.

Do not commit certificates, provisioning profiles, keystores, passwords, private keys, or relay/service credentials.