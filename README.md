# Ice Fight — quick experimental prototype

Two landscape phone controllers, each a top-down ice table full of moving action pucks, plus any practical number of independent read-only fight displays. Original arcade banner with a medium-brown-skinned red fighter now used for the lobby and share image. The gameplay still uses its lightweight procedural cartoon fighters.

## Run

Node 22+:

```sh
npm ci
npm start
```

Open http://localhost:3000. On a phone, open the computer's LAN IP at port 3000 (same Wi-Fi), **create a rink**, and claim Player 1. Share the room URL/code/QR with a second phone, which claims Player 2. Each player page shows only controls. Open that same room on a separate screen and choose **Watch the fight**. Remote internet play requires the proposed Fly deployment or another explicitly approved reachable host; localhost itself is not remotely accessible.

Room links are public invitations; first claim wins atomically. Player credentials stay in URL fragments and that phone's local storage. Keep controller links private. Reserved slots cannot be reclaimed by another browser just because the player disconnects. Reconnect from the original browser; create a new rink if credentials are lost. A duplicate active controller is refused. No primary display or spectator heartbeat is required.

## Controls / rules

Every control floats: left, right, up (one jump), down (hold crouch), and light/medium/heavy punches plus light/medium/heavy kicks (LP/MP/HP/LK/MK/HK): ten per player, twenty total. Touch inside the inner62% of a puck to activate and grab it. It stops autonomous movement, follows your finger with bounded server-authoritative drag speed, and releases with sampled fling velocity (max620 logical units/sec). Hold still before lifting to release without a fling. Edge contact applies a gentler impulse (max140, formerly430); physics shove still works during recovery. Push up through the green seam to transfer the puck to the opponent. It becomes their action, with a stable ID, new ownership epoch, and unchanged ORIGINAL color. Current ownership is determined by which phone holds it, not by its color. The tables face each other: x and local velocity reverse at the seam. Pucks collide across the seam too.

Hold left/right/down with the original finger even as the puck moves away. Up/attacks fire only on touchdown, never when a puck drifts under a stationary finger. Release/cancel/lost capture/blur/hidden/resize/disconnect/transfer clears holds. Duplicate actions share movement and attack cooldowns. Hitting a puck still pushes it when your fighter is recovering. Attacks commit forward and strike a target once. Idle grounded fighters auto-face the opponent. Visual wobble never destabilizes gameplay roots.

300-second round (exactly5× the former60 seconds) or KO; either player can request rematch after the result. A disconnected controller pauses the round. If a side has zero pucks, that is displayed explicitly; there is no automatic rescue. Physical strikes only. Attacks vary by damage/reach/windup/recovery: LP5/105/.08/.18; MP9/125/.14/.28; HP15/140/.23/.42; LK7/135/.11/.22; MK11/155/.18/.34; HK18/175/.28/.48. Damage is HP, reach is logical units, times are seconds. Kicks animate a leg; punches animate an arm.

## Implementation / tuning

Node HTTP + ws, browser Canvas 2D, no bundler/framework/database. `game.mjs` owns both rink halves and fighters at a nominal 60Hz; 20Hz snapshots, interpolated controller pucks. Fight display uses latest authoritative state. Lightweight JS runtime and checked TypeScript wire contract (`protocol.ts`); this is **not** a fully type-checked TS application. `npm run build` validates the contract/project config; there is no bundled build output.

Input requires monotonic sequence, round, current owner and ownership epoch, and contact against bounded server history (up to 45 ticks / ~750ms). Future ticks rejected. Server handles seam ownership and hold release in the same simulation step. Messages/payloads/slow-client buffers are bounded. WebSocket ping detects dead transport in roughly 2–4 seconds. Single process stores rooms in RAM: restart/deploy loses all rooms. Demo guards: 100 rooms, 10 creations/IP/minute, 600 HTTP requests/IP/minute, 30 socket joins/IP/minute, 200 total sockets, 34 clients/room (two players plus32 viewers), 150 messages/socket/second, and a50MiB/hour snapshot-stream admission guard that rejects NEW rooms/spectators after the threshold while current matches and authenticated player reconnects continue. Capacity errors are displayed with a reload-to-retry instruction. This reduces growth during a traffic spike but does not bound active-match egress, HTTP assets, upstream DDoS, or the provider invoice; no hard billing cap. Room creation limited to100; inactive rooms expire after one hour. No public matchmaking.

Tune `W`, `H`, `R`, drag/impulse/speed, movement/reach/cooldowns in `game.mjs`; `new Game({roundSeconds:300})` controls round duration. Client drawing uses the same900×420 logical table and radius37; change both client and server if tuning geometry. No prediction/rollback. Real network jitter, touch ergonomics and balance need playtesting.

## Validation

```sh
npm test
npm run build
# Server running at localhost:3000, installed Google Chrome:
node tests/browser.mjs
node tests/phone-flow.mjs
node tests/playtest-browser.mjs
node tests/banner-browser.mjs
node tests/waiting-browser.mjs
# Recreate original procedural share art:
node scripts/share-placeholder.mjs
```

Simulation tests cover transfers/conservation/rejected stale epochs, contact impulse while stunned, held cancellation, duplicate movement/cooldowns, forward one-hit attacks, pause, timeout/KO/rematch, delayed historical inputs, zero-puck state, and seam collisions. Browser tests use actual Chrome pages and mouse/pointer events: 568×320 and844×390 landscapes; two phone-sized controllers/two displays; stealing a directional puck; captured hold; duplicate role refusal; reconnect; read-only mirror; phone-first create/claim with no display followed by late Watch. Screenshots live in `test-results/` (local verification artifacts, not committed).

Not yet verified: physical iPhone Safari, real multitouch hardware, public cross-network latency/load, physical-device network variability, actual Discord unfurl. Docker image and Fly runtime are now validated. Keyboard/mouse test input is not a claim of real-phone verification. Audio is a tiny start-gesture bleep, wake lock best effort, no fullscreen/orientation lock requirement.

## Discord sharing

Share the generic landing URL. The server emits OG title/description, canonical absolute generic `og:url`, absolute `og:image`, 1200×630 dimensions/type and Twitter large-image tag on all HTML routes. Metadata never includes room IDs/role secrets; crawler needs no JavaScript. `public/share-v2.png` is the edited original banner, downsampled to1200×630. The legacy /share.png URL serves the same current image. Full-resolution edited art is art/ice-fight-banner-medium-brown-v2.png (built-in Imagegen targeted edit; prompt/provenance in art/EDIT-NOTES.md); the user-supplied ice-fight-banner.png remains untouched. Production must set `PUBLIC_URL` correctly. Tests inspect raw HTML, PNG signature/dimensions/MIME and routes. Public Discord unfurl remains unverified until deployment and an actual Discord check.

## Fly.io deployment — approved and live

App `icefight` at https://icefight.fly.dev (created and deployed), existing `personal` organization, Ashburn `iad`, **one** always-on shared-cpu-1x/256MB Machine, port8080, Node22 Alpine, HTTPS, `/health`, shared IPv4 and IPv6. No persistent volume/database/Redis, no multi-region or extra HA Machine. Dockerfile and `fly.toml` are prepared. Existing Fly authentication/account/apps were inspected read-only; other apps/projects were untouched.

Official pricing checked: https://docs.fly.io/about/pricing — $2.19 per30days for this Machine in iad, plus $0.02/GB outbound internet traffic; 31-day months cost slightly more. Actual legacy account allowances/taxes/build charges are unverified. Proposed planning budget $5/month is **not** an enforced spending cap. Usage-based billing continues until resources are stopped/deleted; traffic may exceed that budget. User explicitly approved this deployment and the icefight name. One live Machine827514a7957618 is running in iad; public health and configuration verified. Both browser acceptance suites also passed against the public HTTPS/WSS hostname.

Commands used for the approved deployment (do not recreate the existing app):

```sh
fly apps create icefight --org personal
fly deploy --ha=false
fly scale count 1
fly status
```

If app name unavailable, choose/approve replacement and update app + PUBLIC_URL together. Verify one Machine only, HTTPS health, room/claim/reconnect/multiple displays, raw OG tags and image from public hostname. Then share generic landing link on Discord and inspect actual unfurl before claiming success. Never scale horizontally: RAM rooms require a single owner.

## Playtest revision: controller viewport and iPhone use

The decorative controller background is edge-to-edge. Both controllers report usable CSS viewport width AND height after safe-area insets and a narrow12px rink-side surround. The server negotiates a common aspect-preserving900×420 fit using the minimum constraints from both phones. Both canvases have identical CSS-pixel width and height; the larger phone gets extra surround, not a larger rink. This does not measure physical inches. On viewport changes the server cancels grabs/holds and advances a layout epoch; logical puck coordinates never rescale or teleport. Stale-layout input is rejected. Lower rink corners are rounded; top seam stays open. Dynamic browser-height changes, orientation and reconnect renegotiate the fit and cancel grabs/holds safely. Fullscreen is offered only when requestFullscreen exists; page code does not promise to hide iPhone Safari tabs. Use Safari Share → Add to Home Screen → Open as Web App, then launch from Home Screen for standalone display. Install before claiming a player if Safari and standalone storage are separate on your device.

Official guidance: https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios ; https://webkit.org/blog/13966/webkit-features-in-safari-16-4/ (unprefixedFullscreen support documented for macOS/iPadOS). The manifest requests standalone mode; no service worker or offline multiplayer.

Touch-action, selection, long-press callout and context-menu suppression are scoped to the rink. Empty ice contacts produce no action or sound. Lobby/forms retain ordinary interaction and controller has an explicit Lobby exit. Real physical iPhone Safari/installed-mode feel still requires user testing.

Latest local validation:15simulation tests and browser grab/drag/fling, stable origin color, all six attack buttons,300second timer, viewport pairing568×320 against844×390, dynamic260/320/390heights, simulated44px side/20px bottom safe areas, resize cancellation, inert background and standalone manifest passed. Source banner SHA256:563e9f74024ba5794f66c23f53b0370f63f1744753ade6dae450ef59507dc6a4 (unchanged).


## Initial waiting rink

Before the second controller connects for the first match, the connected player can shove, grab, drag and fling every local puck. Fighters and the 300-second clock remain frozen. A bright orange plastic barrier closes the top seam; the server clamps dragged targets and resolves physics/collision movement against its 32-unit thickness. No puck crosses ownership while waiting. The absent side stays still.

The first simultaneous connection starts the match without resetting arranged puck positions. A control epoch advances, historical waiting contacts are discarded, and held fingers are cancelled without a fling or combat activation. The orange panels retract toward both edges over 650ms. Normal transfer begins immediately when the match starts. Layout changes still cancel holds and negotiate identical CSS rink dimensions. Waiting reconnects retain the barrier/arrangement; later mid-match disconnects retain the existing frozen pause with an open seam, never reopening practice mode. Rematches also retain normal match pause behavior.

Validated by 19 simulation tests plus Chrome waiting/active pointer tests, reconnect, cancellation, seam containment, preserved arrangement and colors, equal shared dimensions, visible retraction frames, and a read-only fight display. Physical iPhone Safari/multitouch remain unverified.
