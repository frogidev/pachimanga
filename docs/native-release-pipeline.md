# Native release pipeline

Pachimanga's active distribution path is the authenticated PWA. Native artifact workflows are retained for the final platform phase but are intentionally manual-only today.

This document describes the retained pipeline and the prerequisites for re-validating it later. It must not be read as authorization to publish native releases during the PWA phase.

## Current policy

Until the PWA release-candidate gate in `WORKPLAN.md` is complete:

- `.github/workflows/android-apk.yml` is manual-only.
- `.github/workflows/android-release.yml` is manual-only.
- `.github/workflows/desktop-release.yml` is manual-only.
- `.github/workflows/ios-release.yml` is manual-only.
- Do not add `push`/tag triggers to native artifact/release workflows.
- Do not create/publish GitHub Releases or store artifacts merely because a version tag exists.

The release workflows take an explicit version input where applicable and upload build artifacts from that manual run. Automatic tag normalization/release attachment is not the current model.

## Why native releases are separate

The Tauri shell loads:

```text
https://pachimanga.frogilab.dev
```

A native rebuild is therefore required only when changing native/binary concerns such as:

- Rust commands or networking;
- Tauri capabilities/origins;
- plugins;
- platform manifests;
- embedded icons/metadata;
- signing/bundling.

Normal Next.js/React product changes ship through Vercel.

## Version invariant

Before any native artifact build, version must match across:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Validate with:

```bash
node scripts/check-native-version.mjs
```

Do not change only one version source.

## Pre-release gate

Before the final native phase starts:

1. PWA release-candidate checklist is complete.
2. Web production is stable with no known P0/P1 release blockers.
3. Native security boundary has been reviewed.
4. Required signing credentials exist in GitHub Actions Secrets or an equivalent secret manager.
5. Credential ownership, backup, and recovery procedures are documented.
6. Manual workflows pass from current `main`.
7. Install/upgrade behavior is tested on real target devices.
8. The user explicitly approves native distribution.

## Android debug/test APK

Workflow: `.github/workflows/android-apk.yml`

Purpose: manual arm64 debug/test APK for real-device validation.

This is not a production release workflow. Use it when the final phase needs a device build or when an explicitly requested native regression requires it.

## Android release

Workflow: `.github/workflows/android-release.yml`

Manual outputs:

- signed arm64 APK;
- signed arm64 AAB.

Required secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The persistent signing/upload keystore must be preserved. Losing it can break direct APK upgrade continuity and complicate Play distribution depending on Play App Signing configuration.

The generated Android project remains ignored. The workflow initializes the Tauri Android project on the runner, restores the keystore only in the ephemeral runner, creates `keystore.properties`, and applies signing configuration.

Final validation must include installing an older signed build then upgrading to the candidate build without losing application/account behavior.

## Windows

Workflow: `.github/workflows/desktop-release.yml`

Manual outputs include:

- MSI;
- NSIS EXE.

Signing secrets:

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`

For wider distribution, use a trusted code-signing certificate. Unsigned or self-signed installers will trigger normal Windows trust warnings.

Final validation should cover fresh install, upgrade, uninstall, WebView/runtime loading, authentication, and native IPC restriction.

## Linux

Workflow: `.github/workflows/desktop-release.yml`

Manual outputs include:

- `.deb`;
- `.rpm`;
- `.AppImage`;
- detached signatures/checksums where configured.

Signing secrets:

- `LINUX_GPG_PRIVATE_KEY`
- `LINUX_GPG_KEY_ID`
- `LINUX_GPG_PASSPHRASE`

The runner uses Ubuntu 22.04 to keep a lower glibc baseline than newer runners.

Linux has no single universal OS trust mechanism equivalent to Apple/Windows. If a repository is added later, repository metadata must be signed as well.

## macOS

Workflow: `.github/workflows/desktop-release.yml`

Manual outputs include the Tauri macOS application/package artifacts such as DMG/app bundle outputs.

Signing/notarization secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

Professional direct macOS distribution requires appropriate Developer ID signing/notarization. If that infrastructure is not intentionally enabled, the PWA remains the supported Mac path.

## iOS / iPadOS

Workflow: `.github/workflows/ios-release.yml`

Manual output:

- signed IPA exported for App Store Connect when signing is configured.

Expected signing inputs include:

- `IOS_CERTIFICATE`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_MOBILE_PROVISION`

Bundle ID must match the Tauri identifier:

```text
dev.frogilab.pachimanga
```

Building an IPA is separate from TestFlight/App Store upload unless an explicit upload step is later added and reviewed.

During the PWA phase, iPhone/iPad users use the installed PWA instead.

## Security boundaries

Native build/release work must not change the source security architecture as a convenience.

- `weebcentral_request` remains source-specific.
- Remote IPC remains constrained to the intended production origin.
- No arbitrary URL proxy is introduced.
- No signing material is committed.
- No secret is embedded in the frontend/native binary.
- Generated projects/artifacts stay out of source control unless intentionally required.

## Final release procedure

When the native phase is explicitly opened:

1. Create one focused release-preparation branch from current `main`.
2. Update version consistently if needed.
3. Run web + native quality gates.
4. Review native diff/security boundary.
5. Merge green release-prep changes.
6. Run the required manual artifact workflow from the exact intended commit/version.
7. Download and test artifacts before publication.
8. Verify install + upgrade paths.
9. Create/tag/publish releases deliberately after artifact validation; do not restore automatic tag-driven publishing without a new design decision.
10. Record artifact hashes/signing evidence and supported-platform results in the workplan/release notes.

Native publication is the last delivery phase, not a parallel workstream with current PWA polish.