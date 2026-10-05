# Ice Fight — quick experimental prototype

## Local homepage and lobby cleanup

Homepage and room setup now use validated keyboard-submittable room entry, accessible inline feedback, loading/disabled states, network retries, guarded player-link storage, and styled expired-room recovery. The invitation layout adapts to narrow phones. Shared arcade action styles and shorter discovery-oriented copy preserve the original visual identity and game behavior.

The original artwork and social-sharing PNG remain intact. Responsive 400/800/1200 px WebP display images reduce banner transfer size by approximately 98%/94%/89% versus the PNG. Static assets use ETag revalidation so changed files are fetched while unchanged responses can return 304.

Validation: `npm test` (49 tests), `npm run build`, `node tests/lobby-browser.mjs`, `node tests/phone-flow.mjs`, `node tests/banner-browser.mjs`, and `node tests/waiting-browser.mjs` passed locally. Homepage/lobby captures cover 1440×900, 768×1024, 390×844, 320×568, and 844×390, plus 200% root text scaling. Physical iPhone Safari and production network performance remain unverified. This cleanup has not been deployed.

Two landscape phone controllers, each a top-down ice table full of moving action pucks, plus any practical number of independent read-only fight displays. Original arcade banner with a medium-brown-skinned red fighter now used for the lobby and share image. The gameplay still uses its lightweight procedural cartoon fighters.

Current local motion architecture and measured before/after results: [owning-controller authority](docs/owner-motion.md). This revision is **not deployed**. Earlier validation/revision notes below are historical unless linked from that document.

## Run

Node 22+:

```sh
npm ci
npm start
```

Open http://localhost:3000. On a phone, open the computer's LAN IP at port 3000 (same Wi-Fi), **create a rink**, and claim Player 1. Share the room URL/code/QR with a second phone, which claims Player 2. Each player page shows only controls. Open that same room on a separate screen and choose **Watch the fight**. Remote internet play requires the proposed Fly deployment or another explicitly approved reachable host; localhost itself is not remotely accessible.

Room links are public invitations; first claim wins atomically. Player credentials stay in URL fragments and that phone's local storage. Keep controller links private. Reserved slots cannot be reclaimed by another browser just because the player disconnects. Reconnect from the original browser; create a new rink if credentials are lost. A duplicate active controller is refused. No primary display or spectator heartbeat is required.

## Controls / rules

Every control floats: left, right, up (one jump), down (hold crouch), and light/medium/heavy punches plus light/medium/heavy kicks (LP/MP/HP/LK/MK/HK): ten per player, twenty total. Grab within the central72% of the puck diameter (radius0.72R). Tap force is independent: a quick tap within25% gives a constant6-unit nudge; farther out it rises to140 at the edge. A sustained grab stays pinned. It stops autonomous movement, follows your finger with bounded controller-owned drag speed, and releases with sampled fling velocity (max6200 logical units/sec). Hold still before lifting to release without a fling. Outside that center, shove strength rises continuously from6 to the unchanged edge maximum140, directed away from contact; physics shove still works during recovery. Push up through the green seam to transfer the puck to the opponent. It becomes their action, with a stable ID, new ownership epoch, and unchanged ORIGINAL color. Current ownership is determined by which phone holds it, not by its color. The tables face each other: x and local velocity reverse at the seam. Collisions are resolved by the owning phone on its half; an incoming puck begins colliding there after its edge frame.

Hold left/right/down with the original finger even as the puck moves away. Up/attacks fire only on touchdown, never when a puck drifts under a stationary finger. Release/cancel/lost capture/blur/hidden/resize/disconnect/transfer clears holds. Duplicate actions share movement and attack cooldowns. Hitting a puck still pushes it when your fighter is recovering. Attacks commit forward and strike a target once. Idle grounded fighters auto-face the opponent. Visual wobble never destabilizes gameplay roots.

300-second round (exactly5× the former60 seconds) or KO; either player can request rematch after the result. A disconnected controller pauses the round. If a side has zero pucks, that is displayed explicitly; there is no automatic rescue. Physical strikes only. Attacks vary by damage/reach/windup/recovery: LP5/105/.08/.18; MP9/125/.14/.28; HP15/140/.23/.42; LK7/135/.11/.22; MK11/155/.18/.34; HK18/175/.28/.48. Damage is HP, reach is logical units, times are seconds. Kicks animate a leg; punches animate an arm.

## Implementation / tuning

Node HTTP + ws, browser Canvas 2D, no bundler/framework/database. `public/owner-rink.js` continuously owns each controller’s puck physics at 120Hz, with no server reconciliation. `game.mjs` resolves fighters at 60Hz and coordinates atomic ownership transfers. Controllers report motion at about30Hz; the server relays20Hz snapshots for mirrors and reconnect checkpoints. Gameplay input processes immediately on receipt. Fight display uses latest authoritative state. Lightweight JS runtime and checked TypeScript wire contract (`protocol.ts`); this is **not** a fully type-checked TS application. `npm run build` validates the contract/project config; there is no bundled build output.

Input requires monotonic sequence, round, current owner and ownership epoch, and contact against the owning client’s supplied current puck pose, with a bounded tick age (120 ticks / 2s). Future ticks are rejected. Server validates current ownership/epochs and handles seam ownership and hold release atomically on receipt. Messages/payloads/slow-client buffers are bounded. WebSocket ping detects dead transport in roughly 2–4 seconds. Single process stores rooms in RAM: restart/deploy loses all rooms. Demo guards: 100 rooms, 10 creations/IP/minute, 600 HTTP requests/IP/minute, 30 socket joins/IP/minute, 200 total sockets, 34 clients/room (two players plus32 viewers), 150 messages/socket/second, and a50MiB/hour snapshot-stream admission guard that rejects NEW rooms/spectators after the threshold while current matches and authenticated player reconnects continue. Capacity errors are displayed with a reload-to-retry instruction. This reduces growth during a traffic spike but does not bound active-match egress, HTTP assets, upstream DDoS, or the provider invoice; no hard billing cap. Room creation limited to100; inactive rooms expire after one hour. No public matchmaking.

Tune puck drag/impulse/speed in `public/owner-rink.js`, shared fling sampling in `public/puck-motion.js`, and movement/reach/cooldowns in `game.mjs`; `new Game({roundSeconds:300})` controls round duration. Client drawing uses the same900×420 logical table and radius37; change both client and server if tuning geometry. No prediction/rollback. Real network jitter, touch ergonomics and balance need playtesting.

## Validation

```sh
npm test
npm run build
# Server running at localhost:3000, installed Google Chrome:
TEST_URL=http://localhost:3000 node tests/owner-trajectories-browser.mjs
TEST_URL=http://localhost:3000 node tests/owner-lifecycle-browser.mjs
TEST_URL=http://localhost:3000 node tests/timeline-network.mjs
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


## Tap/glyph refinement

The central gentle-tap region diameter is25% of the full puck width, with a constant6-unit impulse plateau throughout it; force only increases outside that boundary. Central contacts grab/pin the puck; ordinary quick taps (at most12 simulation ticks /200ms) release with a small6-unit impulse, while longer holds and cancellations release without drift. Exact-center taps consistently nudge toward the top seam. Finger motion must exceed6 logical units before intentional dragging begins. Drag targets are anchored to the puck position at acceptance rather than its older hit-validation snapshot, preventing delayed stationary taps from snapping or flinging a moving puck. Deliberate drag/fling and action activation are retained.

Punch pucks are hexagons and kick pucks are squares. One/two/three black dots indicate light/medium/heavy. Original-player colors and transferred ownership outlines remain. Shapes are visual only: all contact, collision, drag bounds and ownership physics keep their original circular radius. The mapping/drawing module is public/puck-art.js.

24 simulation/glyph tests cover the full offset ramp, tiny center impulse and sustained hold immobilization, unchanged edge cap, all shove directions, delayed quick taps, all six attack mappings, intentional hold/drag/fling and existing waiting/transfer/resize/combat behavior. Local mobile browser screenshots and regression results accompany this revision. User approved deployment of this refinement after validation.


## Local responsiveness refinement

White contact feedback is immediate; yellow (with original-player outline) means a server-accepted legal action or waiting-room practice press. Cooldown/recovery/ownership rejection does not flash successful yellow. Generous72% grabs are separate from the25% tap plateau. Local visual drag prediction and frame-coalesced input reduce finger lag while ownership/combat remain authoritative. See [measurements and limits](docs/responsiveness.md). This new refinement has not been deployed.

## Local attack-shape sizing revision

Kick square paths are60×60 instead of50×50 (+20% width/height); rounded corners scale from4 to4.8. Punch hexagon vertex radius is38.5 instead of35 (+10% in both linear dimensions). Dots, directional pucks, original-color/white/yellow feedback, collision radius37, grab radius26.64 and tap plateau radius9.25 are unchanged. Shadows use the same enlarged paths.

Visible hit-area mismatch is intentional under the unchanged circular-physics requirement: hexagon tips extend1.5 logical pixels past the touch circle; rounded square corners extend about3.44 pixels, before outline thickness. Decorative edges may slightly overlap at collision contact or clip at the outer canvas wall. The waiting barrier still clears the enlarged vertical shape extents. These are visual-only changes, tested locally; deployment needs approval for this revision.

Local networking revision: controller clocks synchronize to the server; attacks process immediately on receipt and credit elapsed event time against windup, without an input buffer. Incoming transfers first paint at the seam and continue under recipient-owned physics. See [networking policy and validation](docs/controller-timing.md) for late-event and entry-catch tradeoffs. Not yet deployed.

## Local high-speed puck tuning

Drag speed is now **12,000 logical units/second** and release/fling speed **6,200** (10× their prior values). Shared constants live in `public/puck-motion.js`; owner simulation, fling sampling, legacy simulation and server pose/transfer validation use the new limits. A separate **24,000-unit/second total-speed ceiling** bounds post-collision velocities and accepted motion. Edge touches no longer truncate an already-fast puck to 320. Tap force and stationary-release rules are unchanged.

The rink remains 900 units wide: these caps are 13.33 widths/second while dragging and 6.89 widths/second at fling release. The owning controller still runs its 120Hz clock, with adaptive collision slices limiting travel to 9.25 units per puck. Swept pair checks catch near-tangent contacts between slices; repeated contact/boundary projection prevents fast pucks from skipping collisions. Seam intersection is resolved at y=0, handed off once, and the recipient paints that exact edge before moving. There is no server reconciliation or extra drag easing. The existing 100ms frame catch-up limit remains, so a very long browser stall drops excess simulated time.

Validation: all57 game tests and the build check pass, including eight dedicated high-speed cases (fast drag/fling, head-on/grazing/held collisions, walls/barrier, accepted high-speed mirrored transfer, edge touches, low-frame-rate/jittered dense motion and cancellation). Local Chrome moved a puck700 units within an85ms observation window and released at2283 units/second, above the former fling cap. A four-client lifecycle run with100ms simulated one-way delay plus jitter passed transfer/return, exact-edge arrival, cancel, multitouch, resize, stale-owner rejection, pause/reconnect,20-ID conservation and read-only mirrors with no browser errors. Physical phone performance is not yet verified.

Run a fresh server to load the changed server validator; the validated preview is http://localhost:3013/. This revision is **local only, not deployed**. The production deployment retains the earlier1200/620 limits until explicitly approved for this revision.

## Local low-speed settling refinement

Following the high-speed puck request, the friction change applies to the **puck rink**, not the doughboy sandbox. Above60 logical units/second the existing exponential drag coefficient0.32/sec is unchanged. Below60, an additional dissipative force grows continuously from0 to6 units/sec² as speed falls. The analytic velocity AND distance integration brings pucks to rest without reversing, adding speed, or snapping their position; it gives the same result with different frame/substep durations. A10-unit/sec puck settles in about1.42seconds after another6.73units; a1-unit/sec puck settles in0.16seconds after0.08units. Held pucks bypass this glide calculation.

Owner simulation, shared release-motion helper and legacy simulation use the same integrator. Gentle seam crossings no longer receive the previous minimum6-unit kick. Drag12,000, fling6,200, collision safety24,000 and exact-edge ownership transfer remain in place. Sandbox friction is unchanged.

Validation:62 tests and build checks pass, including continuous threshold force, monotonic decay, finite time-to-rest, exact stopped positions, timestep-independent distance/velocity, gentle transfer without speedup, held controls and stale snapshot resistance. Local Chrome fast-drag/release/cancel and four-client jitter/ownership/reconnect suites also pass. Preview remains http://localhost:3013/. **Not deployed.**
