# Native release pipeline

<<<<<<< HEAD
Pachimanga's zero-cost/default distribution method is the authenticated PWA described in `docs/free-pwa-distribution.md`. Native pipelines are available for direct Android/desktop packages and future Apple/TestFlight distribution.

All native packages load the same production UI at `https://pachimanga.frogilab.dev`; they do not provide a guest/demo variant. Login or registration remains mandatory.

A native release is required when the Tauri/Rust bridge, capabilities, platform manifests, native plugins, icons, metadata, signing, or native configuration changes. Normal React/Next.js UI changes deploy through Vercel and are picked up by existing native shells when reopened.

## Small private-group strategy

For a private group of roughly 20–50 users, the intended distribution model is simpler than a full public-store launch:

- Android: direct signed APK from a persistent release key.
- Windows: direct MSI/NSIS package.
- Linux: direct AppImage/DEB/RPM.
- macOS: direct app/DMG; Developer ID signing/notarization if Apple Developer membership is used.
- iPhone/iPad: PWA at zero Apple cost, or TestFlight once Apple Developer distribution is enabled.

Google Play is not required for this private-use model. Apple native distribution is the main area where paid membership materially improves the tester experience.
=======
Pachimanga's free/default distribution method is the PWA described in `docs/free-pwa-distribution.md`. The native pipelines in this document are optional and are intended for direct Android/desktop packages or a future paid Apple Developer workflow.

Pachimanga's Tauri shell loads the production frontend from `https://pachimanga.frogilab.dev`. Native releases are therefore required when the Tauri/Rust bridge, capabilities, platform manifests, native plugins, icons, metadata, or native configuration changes. Normal React/Next.js UI changes continue to deploy through Vercel without requiring a new native installer.
>>>>>>> origin/ci/native-release-pipeline-v2

## Release model

The native version must match in all three files before a release:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

<<<<<<< HEAD
`scripts/check-native-version.mjs` enforces this invariant and verifies that a `vX.Y.Z` Git tag matches the application version.
=======
`scripts/check-native-version.mjs` enforces this invariant and also verifies that a `vX.Y.Z` Git tag matches the application version.
>>>>>>> origin/ci/native-release-pipeline-v2

Recommended flow:

1. Update all three versions, for example to `0.4.1`.
2. Merge the version change to `main`.
3. Create and push tag `v0.4.1`.
<<<<<<< HEAD
4. Android and desktop release workflows build configured artifacts and attach them to the GitHub Release.
5. Run the iOS workflow only when Apple Developer signing is intentionally enabled.
6. Verify release artifacts on real hardware before sharing them with the private group.
=======
4. Android and desktop release workflows build signed artifacts and attach them to the GitHub Release.
5. Run the iOS workflow manually only if Apple Developer signing is intentionally enabled.
>>>>>>> origin/ci/native-release-pipeline-v2

Do not commit signing keys, certificates, provisioning profiles, or passwords.

## Android

Workflow: `.github/workflows/android-release.yml`

Outputs:

- signed arm64 APK for direct installation
<<<<<<< HEAD
- signed arm64 AAB for Google Play if that path is ever used
=======
- signed arm64 AAB for Google Play
>>>>>>> origin/ci/native-release-pipeline-v2

Required GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`: base64 representation of the persistent release/upload keystore
- `ANDROID_KEYSTORE_PASSWORD`: keystore/store password
- `ANDROID_KEY_ALIAS`: key alias
- `ANDROID_KEY_PASSWORD`: private key password

The same keystore must be preserved for future releases. Losing it can prevent direct APK updates and can complicate Play signing depending on how Play App Signing is configured.

The generated Android project remains ignored by Git. The workflow runs `cargo tauri android init`, restores the keystore only inside the ephemeral runner, generates `keystore.properties`, and patches the generated Gradle release signing configuration.

<<<<<<< HEAD
The existing debug/test APK uses a different signing identity from a future persistent release APK. Testers may need to uninstall the debug build once before installing the first release-signed build. Future builds signed with the same persistent release key can then update normally.

`.github/workflows/android-apk.yml` remains useful for debug/test artifacts and bridge validation; it should not be treated as the long-term distribution signing path.

=======
>>>>>>> origin/ci/native-release-pipeline-v2
## Windows

Workflow: `.github/workflows/desktop-release.yml`

Outputs:

- MSI
- NSIS EXE

<<<<<<< HEAD
Configured signing secrets:
=======
Required secrets:
>>>>>>> origin/ci/native-release-pipeline-v2

- `WINDOWS_CERTIFICATE_BASE64`: base64 PFX code-signing certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: PFX password

<<<<<<< HEAD
The workflow imports the certificate into the runner's Current User certificate store, configures its thumbprint for Tauri, uses SHA-256 and a timestamp server, and builds the installers.

For trusted public distribution, use a trusted code-signing certificate. Unsigned installers or self-signed certificates can trigger Windows trust/SmartScreen warnings. For a small friend group, decide explicitly whether those warnings are acceptable before paying for signing.
=======
The workflow imports the certificate into the runner's Current User certificate store, configures its thumbprint for Tauri, uses SHA-256 and a timestamp server, and builds signed installers.

For public distribution, use a trusted code-signing certificate. Unsigned installers or self-signed certificates will still trigger Windows trust warnings.
>>>>>>> origin/ci/native-release-pipeline-v2

## Linux

Workflow: `.github/workflows/desktop-release.yml`

Outputs:

- `.deb`
- `.rpm`
- `.AppImage`
<<<<<<< HEAD
- detached signatures/checksums when the configured signing secrets are available

Configured Linux signing secrets:
=======
- detached `.asc` signatures for DEB/RPM and checksums
- `SHA256SUMS` plus its detached GPG signature

Required secrets:
>>>>>>> origin/ci/native-release-pipeline-v2

- `LINUX_GPG_PRIVATE_KEY`: base64 exported private GPG key
- `LINUX_GPG_KEY_ID`: signing key fingerprint or key id
- `LINUX_GPG_PASSPHRASE`: signing key passphrase

<<<<<<< HEAD
=======
The AppImage is built with Tauri/AppImage signing enabled. DEB/RPM artifacts also receive detached signatures and all Linux packages are covered by a signed SHA-256 manifest.

>>>>>>> origin/ci/native-release-pipeline-v2
Linux does not have one universal operating-system code-signing trust mechanism comparable to Apple or Windows. If Pachimanga later gets an APT/RPM repository, repository metadata should also be signed with the release key.

The Linux runner intentionally uses Ubuntu 22.04 to keep the minimum glibc baseline lower than a newer runner would.

## macOS

Workflow: `.github/workflows/desktop-release.yml`

Outputs:

<<<<<<< HEAD
- app bundle generated by Tauri
- DMG

Configured Apple/macOS secrets:
=======
- signed app bundle/package generated by Tauri
- DMG

Required secrets:
>>>>>>> origin/ci/native-release-pipeline-v2

- `APPLE_CERTIFICATE`: base64 Developer ID certificate (`.p12`)
- `APPLE_CERTIFICATE_PASSWORD`: certificate password
- `APPLE_SIGNING_IDENTITY`: Developer ID Application signing identity
- `APPLE_ID`: Apple account used for notarization
- `APPLE_PASSWORD`: app-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID

<<<<<<< HEAD
A direct unsigned/ad-hoc app can be shared privately but will create Gatekeeper friction. A professional direct-distribution experience requires Developer ID signing and notarization through the Apple Developer program.

If Apple Developer membership is purchased for iOS/TestFlight, use the same membership to establish the proper macOS Developer ID/notarization path rather than creating a second distribution strategy.
=======
For the zero-cost strategy, Mac users can use the PWA. Direct native distribution with a professional Gatekeeper experience requires Apple Developer signing and notarization.
>>>>>>> origin/ci/native-release-pipeline-v2

## iOS / iPadOS

Workflow: `.github/workflows/ios-release.yml`

<<<<<<< HEAD
Current output:

- signed IPA exported using `app-store-connect`

Configured secrets:
=======
Output:

- signed IPA exported using `app-store-connect`

Required secrets:
>>>>>>> origin/ci/native-release-pipeline-v2

- `IOS_CERTIFICATE`: base64 Apple Distribution `.p12`
- `IOS_CERTIFICATE_PASSWORD`: certificate password
- `IOS_MOBILE_PROVISION`: base64 App Store Connect provisioning profile

<<<<<<< HEAD
The App ID/provisioning profile bundle ID must match Pachimanga's Tauri identifier:

```text
dev.frogilab.pachimanga
```

The workflow uses `cargo tauri ios build --ci --export-method app-store-connect`. Producing the IPA is separate from uploading it to App Store Connect/TestFlight. Automatic TestFlight upload should be added only after the Apple Developer/App Store Connect account and preferred CI authentication method are finalized and re-checked against current Apple/Tauri tooling.

For the zero-cost strategy, iPhone/iPad users install the authenticated PWA. Free Apple personal-team provisioning is not a practical friend-distribution path because of device/profile limits and short provisioning lifetime.

For 20–50 invited native iOS users, TestFlight is the preferred target once Apple Developer membership is active. Remember that TestFlight builds expire and must be refreshed periodically.

## Release validation

The release workflows should be considered configuration until exercised with real signing credentials.

Before calling a platform pipeline production-ready:

- verify CI succeeds with real credentials;
- inspect signatures/checksums with platform tools;
- install on real hardware;
- verify mandatory auth works in the packaged app;
- verify the WeebCentral native bridge still works where applicable;
- verify an upgrade from the previous release-signed version;
- verify no secrets were included in repository artifacts/logs.

## Security boundaries

The build pipeline does not change the native bridge architecture. `weebcentral_request` remains the dedicated bridge command and must not be generalized into an arbitrary URL fetch proxy.

Release credentials belong only in GitHub Actions Secrets or an equivalent secret manager. The repository remains free of private signing material.

The native package does not replace application authorization: Supabase authentication and RLS remain required for user data even when the app is installed directly.
=======
The App ID / provisioning profile Bundle ID must match Pachimanga's Tauri identifier: `dev.frogilab.pachimanga`.

The workflow uses `cargo tauri ios build --ci --export-method app-store-connect`. Producing the IPA is separate from uploading it to App Store Connect/TestFlight; automatic upload can be added after the Apple Developer/App Store Connect account and preferred authentication method are finalized.

For the zero-cost strategy, iPhone and iPad users should install the PWA from `https://pachimanga.frogilab.dev/install` instead of using this workflow.

## Security boundaries

The build pipeline does not change the native bridge architecture. `weebcentral_request` remains the dedicated bridge command and should not be generalized into an arbitrary URL fetch proxy.

Release credentials belong only in GitHub Actions Secrets or an equivalent secret manager. The repository remains free of private signing material.
>>>>>>> origin/ci/native-release-pipeline-v2
