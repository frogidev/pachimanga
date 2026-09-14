# Free PWA distribution and private WeebCentral relay

Pachimanga can be distributed to iPhone, iPad, Android and desktop browsers as a PWA without an Apple or Google developer membership.

The only part that cannot run directly in a normal browser is the WeebCentral HTML integration. Browsers cannot bypass cross-origin restrictions, and WeebCentral can reject requests from cloud hosting networks. Pachimanga therefore supports an optional locked-down relay running from a trusted network such as the Frogilab homelab.

## Architecture

```text
PWA / browser
    |
    | same-origin HTTPS
    v
pachimanga.frogilab.dev (Vercel)
    |
    | server-only bearer token
    v
wc-relay.frogilab.dev (Cloudflare Tunnel)
    |
    v
Pachimanga relay on homelab
    |
    v
weebcentral.com
```

The relay only accepts these operations:

- `GET /v1/search?q=...`
- `GET /v1/manga/:id`
- `GET /v1/chapters/:id`
- `GET /v1/chapter/:id`
- `GET /v1/pages/:id`

There is intentionally no `?url=` endpoint and no arbitrary HTTP proxy.

The application parses the returned HTML and uses the original page-image URLs. Manga images therefore load from their original image hosts and do not flow through the homelab relay.

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

Use the existing Frogilab Cloudflare Tunnel and map:

```text
wc-relay.frogilab.dev -> http://127.0.0.1:8787
```

If `cloudflared` runs directly on the host, keeping the relay bound to `127.0.0.1` is preferred. If `cloudflared` runs in Docker, put both containers on the same private Docker network and target the relay container by service name instead of exposing it publicly.

The relay should never be port-forwarded from the router.

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

Add these server-side environment variables to the Pachimanga project for Production and Preview as appropriate:

```text
WEEBCENTRAL_RELAY_URL=https://wc-relay.frogilab.dev
WEEBCENTRAL_RELAY_TOKEN=<same RELAY_TOKEN used by the homelab>
```

Do not prefix either variable with `NEXT_PUBLIC_`. The browser must never receive the bearer token.

Redeploy Pachimanga after adding the variables.

When both values are present, all server-side WeebCentral reads automatically use the relay. If either value is missing, Pachimanga keeps the existing direct-host behavior and can fall back to MangaDex.

## 5. Validate PWA WeebCentral access

1. Open `https://pachimanga.frogilab.dev/browse` in Safari or another browser.
2. The source badge should report `PWA/Web · private relay + MangaDex` with a healthy indicator.
3. Search for a known WeebCentral title.
4. Open a title, open a chapter, and verify page images load.
5. Test the same flow after installing the PWA.

## 6. Install on iPhone or iPad for free

1. Open `https://pachimanga.frogilab.dev/install` in Safari.
2. Tap Share.
3. Choose **Add to Home Screen**.
4. Confirm Add.
5. Launch Pachimanga from the Home Screen.

Because this is a PWA, there is no seven-day sideload signing expiry and no Apple Developer membership is required.

## Security properties

- WeebCentral host/path construction lives in the relay; callers cannot choose arbitrary destinations.
- IDs must match the expected WeebCentral identifier format.
- Queries are normalized and length limited.
- The relay requires a constant-time compared bearer token for all source operations.
- The relay has request timeouts, an in-memory response cache, and an IP rate limit.
- Only `/health` is public and it exposes no secret or upstream data.
- The token is stored only in the homelab environment and Vercel server environment.
- Image bandwidth is not proxied through the relay.

## Native applications

Android/Tauri continues using the existing on-device `weebcentral_request` bridge. The relay is for browser/PWA requests and does not widen the native bridge.

macOS/iOS native distribution remains optional. For the zero-cost strategy, iPhone and iPad use the PWA.
