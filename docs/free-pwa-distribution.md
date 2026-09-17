# PWA distribution and private WeebCentral relay

The authenticated PWA is Pachimanga's active production distribution target for iPhone, iPad, Android, and desktop browsers.

Production:

```text
https://pachimanga.frogilab.dev
```

Native distribution remains deferred until the PWA release-candidate gate in `WORKPLAN.md` is complete.

## Current production evidence — 2026-09-17

Latest observed production runtime:

```text
deployment: dpl_BKK6unsasBkJGmcKUv7eSGLvV2BA
runtime:    c9060fd177b7d3cdf607cbde1945af875e283fa7
state:      READY
```

User-operated production smoke passed:

```text
Protected routes checked: 9
PWA icons checked: 4
```

Recent Vercel production error/fatal inspection was clean in the inspected window.

## Access model

- Authentication is required for normal application use.
- Only auth flows and `/offline` are intentionally anonymous application paths.
- Library, progress, history, settings, imports, local cache, and offline chapter downloads are account-scoped.
- The service worker must never turn authenticated application HTML/data into a reusable public shell.

## PWA caching model

`public/sw.js` intentionally keeps a narrow cache boundary:

- public shell cache: `/offline` + PWA icons only;
- `/api/**`: always network, never service-worker cached;
- navigation: network-first with `/offline` fallback;
- same-origin images and `/_next/static/`: bounded runtime cache;
- runtime cache cap: 250 entries;
- explicitly downloaded chapter page images: dedicated `pachimanga-chapters-v1` cache;
- chapter cache owner is rebound/cleared on account changes and sign-out;
- stale Pachimanga cache versions are removed without deleting unrelated origin caches;
- authenticated application documents are never intentionally cache-first.

## Update lifecycle

A new service worker does not silently replace the active reader session:

1. worker installs and waits;
2. app detects the waiting worker;
3. `Update & reload` is shown;
4. user explicitly activates it;
5. worker claims the page and reloads once.

Installed-mode detection avoids showing redundant install guidance to already-installed users.

Physical-device update validation is still required on iPhone/iPad/Android/desktop.

## Explicit offline chapter downloads

Offline support is intentionally scoped to page bytes rather than the whole private application:

- user explicitly chooses to save a chapter;
- page image URLs are deduplicated;
- downloaded page responses use the dedicated chapter cache;
- cross-origin manga images can be served from that cache when offline;
- removing/clearing offline downloads deletes those page bytes;
- account changes/sign-out clear the previous owner's chapter cache;
- Settings reports browser storage estimate where supported.

A cold offline launch may still reach `/offline` if authenticated route metadata cannot be fetched. Pachimanga does not cache authenticated HTML or provider API responses as a public shell.

## WeebCentral browser/PWA architecture

```text
Browser / installed PWA
    |
    | authenticated Pachimanga session
    v
pachimanga.frogilab.dev (Vercel)
    |
    | server-only relay token
    v
wc-relay.frogilab.dev
    |
    v
operation-limited Pachimanga relay
    |
    v
WeebCentral
```

The relay accepts known read operations only. It is not an arbitrary URL proxy.

Relay invariants:

- protected operations require bearer token;
- token is server-only, never `NEXT_PUBLIC_*`;
- caller cannot choose arbitrary upstream destination;
- IDs/queries are validated/bounded;
- upstream timeouts/redirects are bounded;
- public health exposes no secret/private data;
- `403`/`429`/CAPTCHA/refusal is surfaced, not bypassed;
- no proxy rotation, CAPTCHA solving, credential bypass, or anti-bot circumvention.

## Relay health

Public:

```bash
curl https://wc-relay.frogilab.dev/health
```

Authenticated upstream health requires authorized operator context:

```bash
curl -H "Authorization: Bearer $RELAY_TOKEN" https://wc-relay.frogilab.dev/health/upstream
```

Never paste the relay token into logs, issues, docs, source, screenshots, or chat.

The homelab relay is managed through the Portainer stack `pachimanga-relay`. Publishing a new relay image does not update the homelab automatically; redeployment remains an explicit operator action.

## Vercel relay environment

Server environment only:

```text
WEEBCENTRAL_RELAY_URL=https://wc-relay.frogilab.dev
WEEBCENTRAL_RELAY_TOKEN=<private token>
```

Never prefix either with `NEXT_PUBLIC_`.

After environment changes, redeploy intentionally and repeat production smoke/provider checks.

## Installed-PWA release matrix still required

Do not mark release-candidate PWA evidence complete until tested on real devices:

- iPhone Safari Add to Home Screen;
- iPad standalone;
- Android Chrome install/standalone;
- desktop Chromium install/standalone;
- safe-area/back-navigation/keyboard viewport behavior;
- service-worker update from an older installed version;
- offline navigation to `/offline` without cached private HTML;
- explicit chapter page reuse while offline;
- account/session behavior after update;
- sign-out/account switch clears previous owner's offline chapter pages.

## Validation path

Repository Hygiene and Web Quality are active. For runtime changes use:

```powershell
npm ci
npm run verify
$env:BASE_URL="https://pachimanga.frogilab.dev"
node .\\ops\\production-smoke.mjs
```

Also require exact production `READY` evidence and Vercel error/fatal inspection. Vercel preview/build evidence should be used when platform capacity permits; a Hobby build-rate-limit response is a capacity blocker, not a successful preview.

The optional browser E2E runner is supplemental only and should run only where Playwright + Chromium already exist.
