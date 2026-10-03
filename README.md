# Ice Fight — quick experimental prototype

Two landscape phone controllers, each a top-down ice table full of moving action pucks, plus any practical number of independent read-only fight displays. Original procedural cartoon art; arcade-box inspired CSS is provisional while reference-based artwork is prepared separately.

## Run

Node 22+:

```sh
npm ci
npm start
```

Open http://localhost:3000. On a phone, open the computer's LAN IP at port 3000 (same Wi-Fi), **create a rink**, and claim Player 1. Share the room URL/code/QR with a second phone, which claims Player 2. Each player page shows only controls. Open that same room on a separate screen and choose **Watch the fight**. Remote internet play requires the proposed Fly deployment or another explicitly approved reachable host; localhost itself is not remotely accessible.

Room links are public invitations; first claim wins atomically. Player credentials stay in URL fragments and that phone's local storage. Keep controller links private. Reserved slots cannot be reclaimed by another browser just because the player disconnects. Reconnect from the original browser; create a new rink if credentials are lost. A duplicate active controller is refused. No primary display or spectator heartbeat is required.

## Controls / rules

Every control floats: left, right, up (one jump), down (hold crouch), jab, shove. Touch the center to activate with little shove; touch an edge to push the puck away from your finger. Push up through the green seam to transfer the puck to the opponent. It becomes their action, with a stable ID and new ownership epoch. The tables face each other: x and local velocity reverse at the seam. Pucks collide across the seam too.

Hold left/right/down with the original finger even as the puck moves away. Up/attacks fire only on touchdown, never when a puck drifts under a stationary finger. Release/cancel/lost capture/blur/hidden/resize/disconnect/transfer clears holds. Duplicate actions share movement and attack cooldowns. Hitting a puck still pushes it when your fighter is recovering. Attacks commit forward and strike a target once. Idle grounded fighters auto-face the opponent. Visual wobble never destabilizes gameplay roots.

60-second round or KO; either player can request rematch after the result. A disconnected controller pauses the round. If a side has zero pucks, that is displayed explicitly; there is no automatic rescue. Physical strikes only.

## Implementation / tuning

Node HTTP + ws, browser Canvas 2D, no bundler/framework/database. `game.mjs` owns both rink halves and fighters at a nominal 60Hz; 20Hz snapshots, interpolated controller pucks. Fight display uses latest authoritative state. Lightweight JS runtime and checked TypeScript wire contract (`protocol.ts`); this is **not** a fully type-checked TS application. `npm run build` validates the contract/project config; there is no bundled build output.

Input requires monotonic sequence, round, current owner and ownership epoch, and contact against bounded server history (up to 45 ticks / ~750ms). Future ticks rejected. Server handles seam ownership and hold release in the same simulation step. Messages/payloads/slow-client buffers are bounded. WebSocket ping detects dead transport in roughly 2–4 seconds. Single process stores rooms in RAM: restart/deploy loses all rooms. Demo guards: 100 rooms, 10 creations/IP/minute, 600 HTTP requests/IP/minute, 30 socket joins/IP/minute, 200 total sockets, 34 clients/room (two players plus32 viewers), 150 messages/socket/second, and a50MiB/hour snapshot-stream admission guard that rejects NEW rooms/connections after the threshold while current matches continue. Capacity errors are displayed with a reload-to-retry instruction. This reduces growth during a traffic spike but does not bound active-match egress, HTTP assets, upstream DDoS, or the provider invoice; no hard billing cap. Room creation limited to100; inactive rooms expire after one hour. No public matchmaking.

Tune `W`, `H`, `R`, drag/impulse/speed, movement/reach/cooldowns in `game.mjs`; `new Game({roundSeconds:60})` controls round duration. Client drawing uses the same initial 900×420 logical table and radius37; change both client and server if tuning geometry. No prediction/rollback. Real network jitter, touch ergonomics and balance need playtesting.

## Validation

```sh
npm test
npm run build
# Server running at localhost:3000, installed Google Chrome:
node tests/browser.mjs
node tests/phone-flow.mjs
# Recreate original procedural share art:
node scripts/share.mjs
```

Simulation tests cover transfers/conservation/rejected stale epochs, contact impulse while stunned, held cancellation, duplicate movement/cooldowns, forward one-hit attacks, pause, timeout/KO/rematch, delayed historical inputs, zero-puck state, and seam collisions. Browser tests use actual Chrome pages and mouse/pointer events: 568×320 and844×390 landscapes; two phone-sized controllers/two displays; stealing a directional puck; captured hold; duplicate role refusal; reconnect; read-only mirror; phone-first create/claim with no display followed by late Watch. Screenshots live in `test-results/` (local verification artifacts, not committed).

Not yet verified: physical iPhone Safari, real multitouch hardware, public cross-network latency/load, Docker image build in a Docker daemon, Fly runtime, actual Discord unfurl. Keyboard/mouse test input is not a claim of real-phone verification. Audio is a tiny start-gesture bleep, wake lock best effort, no fullscreen/orientation lock requirement.

## Discord sharing

Share the generic landing URL. The server emits OG title/description, canonical absolute generic `og:url`, absolute `og:image`, 1200×630 dimensions/type and Twitter large-image tag on all HTML routes. Metadata never includes room IDs/role secrets; crawler needs no JavaScript. `public/share.png` is an original PNG. Production must set `PUBLIC_URL` correctly. Tests inspect raw HTML, PNG signature/dimensions/MIME and routes. Public Discord unfurl remains unverified until deployment and an actual Discord check.

## Fly.io proposal — approval required before executing

App `icefight` (name not reserved), existing `personal` organization, Ashburn `iad`, **one** always-on shared-cpu-1x/256MB Machine, port8080, Node22 Alpine, HTTPS, `/health`, shared IPv4 and IPv6. No persistent volume/database/Redis, no multi-region or extra HA Machine. Dockerfile and `fly.toml` are prepared. Existing Fly authentication/account/apps were inspected read-only; other apps/projects were untouched.

Official pricing checked: https://docs.fly.io/about/pricing — $2.19 per30days for this Machine in iad, plus $0.02/GB outbound internet traffic; 31-day months cost slightly more. Actual legacy account allowances/taxes/build charges are unverified. Proposed planning budget $5/month is **not** an enforced spending cap. Usage-based billing continues until resources are stopped/deleted; traffic may exceed that budget. No resources have been created and no deployment has occurred.

Only after explicit approval of provider/configuration/spend:

```sh
fly apps create icefight --org personal
fly deploy --ha=false
fly scale count 1
fly status
```

If app name unavailable, choose/approve replacement and update app + PUBLIC_URL together. Verify one Machine only, HTTPS health, room/claim/reconnect/multiple displays, raw OG tags and image from public hostname. Then share generic landing link on Discord and inspect actual unfurl before claiming success. Never scale horizontally: RAM rooms require a single owner.
