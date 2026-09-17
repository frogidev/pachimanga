# PWA distribution and private WeebCentral relay

The authenticated PWA is Pachimanga's active production distribution target for iPhone, iPad, Android, and desktop browsers.

Production:

```text
https://pachimanga.frogilab.dev
```

The PWA is the full account-based product, not a guest/demo build. Native distribution remains deferred until the PWA release-candidate gate in `WORKPLAN.md` is complete.

## Access model

- Pachimanga authentication is required for normal application use.
- Anonymous requests resolve to the auth experience.
- Only auth flows and `/offline` are intentionally anonymous application paths.
- Library, progress, history, settings, and imports remain account-scoped.
- The service worker must not turn authenticated application HTML/data into a reusable public cache.

## PWA caching model

`public/sw.js` intentionally uses a narrow cache scope:

- a dedicated shell cache pre-caches only the public `/offline` fallback and PWA icons;
- `/api/**` requests are always left to the network and are never service-worker cached;
- navigation remains network-first with the public `/offline` page as the failure fallback;
- same-origin images and `/_next/static/` assets use a separate runtime cache;
- runtime cache growth is bounded to 250 entries and oldest entries are evicted first;
- stale Pachimanga cache versions are removed on service-worker activation while unrelated origin caches are left alone;
- authenticated application documents are never intentionally cache-first.

Any broader offline strategy requires explicit account-isolation design before implementation.

## Update lifecycle

A newly installed service worker does not automatically replace the active app while the user is reading. Instead:

1. the new worker installs and waits;
2. `PwaRegister` detects `registration.waiting` or a newly installed waiting worker;
3. the app shows an `Update & reload` banner;
4. only that explicit action sends the `SKIP_WAITING` message;
5. the waiting worker activates, claims clients, and the controlled page reloads once on `controllerchange`.

The `Later` action dismisses the banner for the current page lifetime; the waiting worker remains available and will be detected again on a later app load. First-time service-worker installation activates normally because there is no previous active worker.

The install page also detects standalone mode. An already-installed PWA sees installed/update guidance instead of redundant browser installation steps.

Real iPhone/iPad/Android/desktop installed-update behavior still requires the physical-device matrix in `WORKPLAN.md`; automated checks only prove the intended service-worker and UI contract.

## WeebCentral browser/PWA architecture

Browsers cannot use the Tauri device-side bridge. When direct hosted access is unsuitable, production browser/PWA traffic can use the locked-down private relay:

```text
Browser / installed PWA
    |
    | Pachimanga session
    v
pachimanga.frogilab.dev (Vercel)
    |
    | server-only relay token
    v
wc-relay.frogilab.dev (Cloudflare Tunnel)
    |
    v
Pachimanga relay on Frogilab infrastructure
    |
    v
weebcentral.com
```

The relay accepts only known read operations such as search, manga metadata, chapter lists, chapter HTML, and page discovery. It is not an arbitrary `?url=` proxy.

Page-image URLs are consumed from original image hosts where possible. Manga image bytes are therefore not intentionally relayed through Supabase/Vercel/the homelab service.

## Relay security contract

Must remain true:

- bearer token required for protected relay operations;
- token is server-only and never exposed through `NEXT_PUBLIC_*` variables;
- caller cannot choose an arbitrary destination URL;
- IDs/query lengths/formats are validated;
- upstream requests have bounded timeouts/redirects;
- response caching/rate limiting are bounded operational controls, not bypass mechanisms;
- public health endpoints expose no secret or private upstream data;
- upstream 403/429/CAPTCHA/refusal is surfaced, not circumvented;
- no proxy rotation, CAPTCHA solving, credential bypass, or browser impersonation system is added.

## Relay setup

Generate a token on the relay host:

```bash
openssl rand -hex 32
```

Store the value as `RELAY_TOKEN`. Do not commit it.

Example host setup after an image is available from `main`:

```bash
mkdir -p /opt/pachimanga-relay
cd /opt/pachimanga-relay
curl -fsSLo docker-compose.yml https://raw.githubusercontent.com/frogidev/pachimanga/main/relay/weebcentral/docker-compose.example.yml
cat > .env <<'EOF'
RELAY_TOKEN=REPLACE_WITH_RANDOM_TOKEN
RATE_LIMIT_PER_MINUTE=600
EOF
chmod 600 .env
docker compose pull
docker compose up -d
```

Before a published image exists, build from a checkout:

```bash
docker build -t pachimanga-weebcentral-relay ./relay/weebcentral
```

Use the local image in the compose file.

Local health:

```bash
curl http://127.0.0.1:8787/health
```

Expected shape:

```json
{"ok":true,"service":"pachimanga-weebcentral-relay"}
```

## Cloudflare Tunnel

Preferred mapping:

```text
wc-relay.frogilab.dev -> http://127.0.0.1:8787
```

If `cloudflared` runs in Docker, place both services on the same private network and target the relay by service/container name rather than exposing the relay port publicly.

Do not port-forward the relay directly from the router.

External health:

```bash
curl https://wc-relay.frogilab.dev/health
```

Authenticated upstream health:

```bash
curl -H "Authorization: Bearer $RELAY_TOKEN" \
  https://wc-relay.frogilab.dev/health/upstream
```

## Vercel configuration

Production/Preview server environments use:

```text
WEEBCENTRAL_RELAY_URL=https://wc-relay.frogilab.dev
WEEBCENTRAL_RELAY_TOKEN=<same relay token>
```

Never prefix either with `NEXT_PUBLIC_`.

After changing Vercel environment variables, redeploy and run the smoke tests below.

## Production smoke checklist

For every runtime change that can affect PWA/auth/source behavior:

1. Confirm the Vercel deployment is for the expected `main` commit and is `READY`.
2. Request `/` anonymously and confirm the auth experience appears.
3. Confirm authenticated content is not exposed through an anonymous response/cache.
4. Sign in with a real test account.
5. Open Library, Browse, Import, History, Settings, one manga detail, and Reader.
6. Search MangaDex, ComicK, and WeebCentral as applicable.
7. For WeebCentral, open a title, chapter, and page set; surface upstream failures explicitly.
8. Add/update a library item and reading progress.
9. Sign out and confirm previous account state is not visible.
10. Sign in as a second account on the same browser and verify isolation.
11. Re-sign in as the first account and verify expected state returns.
12. Inspect Vercel runtime error/fatal logs after the smoke.
13. Repeat install/standalone-specific checks when the change touches manifest/service worker/navigation/safe-area behavior.

The exact release-candidate matrix lives in `WORKPLAN.md`.

## Install on iPhone/iPad

1. Open the production URL in Safari.
2. Authenticate.
3. Use Share -> Add to Home Screen.
4. Launch the installed PWA.
5. Verify the session/auth experience and safe-area/navigation behavior.
6. Test offline fallback by losing network while navigating to a non-cached route; do not expect unsupported account operations to behave as fully offline-first.
7. After a later production deploy, confirm an update prompt appears and accepting it reloads into the new version without losing account isolation.

The PWA has no seven-day sideload signing expiry and does not require an Apple Developer membership.

## Android/desktop browser install

Use the browser's normal Install/Add to Home Screen flow when available. Verify:

- correct name/icon/theme color;
- standalone launch;
- no browser-only navigation assumptions;
- update banner and explicit reload after a new production deployment;
- offline fallback remains account-safe.

## Native applications

Tauri/Android uses the dedicated device-side `weebcentral_request` bridge instead of the browser relay for its native WeebCentral path.

Native distribution is not the active release path. Android/desktop/iOS workflows remain manual-only until the final phase described in `WORKPLAN.md` and `native-release-pipeline.md`.
