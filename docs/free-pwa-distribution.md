# Free PWA distribution and private WeebCentral relay

Pachimanga can be distributed to iPhone, iPad, Android, and desktop browsers as a PWA without an Apple or Google developer membership.

The PWA is not a guest/demo version. The same mandatory Pachimanga login/registration and per-user Supabase data model applies after launch.

The only part that cannot use the same network path as a normal browser is the device-side Tauri WeebCentral bridge. Browsers instead use the optional locked-down Frogilab relay described here when WeebCentral cannot be accessed reliably from the hosted web runtime.

## Access model

Users may receive the production URL freely, but application content remains behind Pachimanga authentication:

```text
https://pachimanga.frogilab.dev
```

Unauthenticated users are sent to `/auth`. After signing in, they can use browse/import/library/reader/install flows under their own account.

The PWA/service worker must not turn authenticated application HTML/data into a shared public cache. Authenticated responses are intended to remain private and account-scoped.

## Architecture

```text
PWA / browser
    |
    | HTTPS + Pachimanga session
    v
pachimanga.frogilab.dev (Vercel)
    |
    | server-only relay token
    v
wc-relay.frogilab.dev (Cloudflare Tunnel)
    |
    v
Pachimanga relay on homelab
    |
    v
weebcentral.com
```

The relay only accepts known read operations such as:

- search
- manga metadata
- chapter lists
- chapter HTML
- page discovery

There is intentionally no caller-controlled `?url=` endpoint and no arbitrary HTTP proxy.

The application parses the returned source responses and uses original page-image URLs where possible. Manga image bytes therefore do not intentionally flow through Supabase or the homelab relay.

## 1. Generate a relay token

On the homelab:

```bash
openssl rand -hex 32
```

Store the result as `RELAY_TOKEN`. Do not commit it.

## 2. Run the relay on the homelab

After the relay image has been published from `main`:

```bash
mkdir -p /opt/pachimanga-relay
cd /opt/pachimanga-relay
curl -fsSLo docker-compose.yml https://raw.githubusercontent.com/frogidev/pachimanga/main/relay/weebcentral/docker-compose.example.yml
cat > .env <<'EOF'
RELAY_TOKEN=REPLACE_WITH_THE_RANDOM_TOKEN
RATE_LIMIT_PER_MINUTE=600
EOF
chmod 600 .env
docker compose pull
docker compose up -d
```

Before the image is published, build it directly from a repository checkout:

```bash
docker build -t pachimanga-weebcentral-relay ./relay/weebcentral
```

Then replace the `image:` line in the compose file with `pachimanga-weebcentral-relay`.

Local health check:

```bash
curl http://127.0.0.1:8787/health
```

Expected response:

```json
{"ok":true,"service":"pachimanga-weebcentral-relay"}
```

## 3. Publish it through Cloudflare Tunnel

Use the Frogilab Cloudflare Tunnel and map:

```text
wc-relay.frogilab.dev -> http://127.0.0.1:8787
```

If `cloudflared` runs directly on the host, keeping the relay bound to `127.0.0.1` is preferred. If `cloudflared` runs in Docker, place both containers on the same private Docker network and target the relay by service/container name instead of exposing it publicly.

The relay should never be port-forwarded directly from the router.

External service health:

```bash
curl https://wc-relay.frogilab.dev/health
```

Authenticated upstream health:

```bash
curl -H "Authorization: Bearer $RELAY_TOKEN" \
  https://wc-relay.frogilab.dev/health/upstream
```

## 4. Configure Vercel

Add these server-side environment variables to the Pachimanga Vercel project for Production and Preview as appropriate:

```text
WEEBCENTRAL_RELAY_URL=https://wc-relay.frogilab.dev
WEEBCENTRAL_RELAY_TOKEN=<same RELAY_TOKEN used by the homelab>
```

Do not prefix either value with `NEXT_PUBLIC_`. The browser must never receive the bearer token.

Redeploy Pachimanga after adding or changing the values.

## 5. Validate authenticated PWA access

Use a real Pachimanga account for the smoke test:

1. Open `https://pachimanga.frogilab.dev` in Safari/another browser.
2. Confirm an anonymous session receives the login/register screen instead of Library/Browse.
3. Sign in.
4. Open Browse and search a known WeebCentral title.
5. Open a title, chapter, and reader; verify page images load.
6. Add a manga and change reader settings.
7. Sign out and verify the previous account's library/settings are no longer visible.
8. Re-sign in and verify account state returns.
9. Repeat after installing the PWA.

## 6. Install on iPhone or iPad for free

1. Open `https://pachimanga.frogilab.dev` in Safari and sign in/register.
2. Open the install page from the authenticated application if needed.
3. Tap Share.
4. Choose **Add to Home Screen**.
5. Confirm Add.
6. Launch Pachimanga from the Home Screen and sign in if the session is not already available there.

Because this is a PWA, there is no seven-day sideload signing expiry and no Apple Developer membership is required.

For a small private group, this is the recommended zero-cost iPhone/iPad distribution path unless native TestFlight distribution is intentionally enabled.

## Security properties

- Pachimanga authentication is required before normal application use.
- WeebCentral host/path construction lives in trusted code; callers cannot choose arbitrary destinations.
- IDs are validated against expected formats.
- Queries are normalized and length-limited.
- The relay requires a bearer token for protected source operations.
- The relay uses request timeouts, response caching, and rate limiting.
- Public health endpoints must expose no token or private upstream data.
- The token is stored only in homelab/Vercel server environments.
- Image bandwidth is not intentionally proxied through Supabase or the relay.
- Supabase service-role credentials are not required by the browser and must never be exposed client-side.

## Native applications

Android/Tauri uses the existing on-device `weebcentral_request` bridge rather than the homelab relay for its native WeebCentral path. The bridge is deliberately source-specific and does not widen into an arbitrary HTTP proxy.

macOS/iOS native distribution remains optional. For a zero-cost private strategy, iPhone/iPad use the authenticated PWA. If Apple Developer membership is enabled later, TestFlight is the practical native distribution path for a small invited group.
