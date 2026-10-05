# Continuous owning-controller puck authority

Local revision; not deployed. The earlier direct instruction, “please deploy now thanks”, deployed commit `3f5c726` (“remove old art”), not this implementation. That deployment's health/route/OG checks were not motion validation.

Each phone now runs the physical puck model for its half continuously at 120Hz. That includes drag, release, friction, wall/barrier bounces and puck collisions. Owned puck positions are rendered directly from that model. There is no release expiry, 80% timeline, reconciliation blend, or return to server interpolation. Same-owner/same-epoch server positions are ignored for the entire ownership period, including after regrabs. No stationary finger activates a drifting puck.

The production server constructs `Game({clientMotion:true})`. It never steps puck physics or resolves a competing collision. It receives approximately30Hz bounded position/velocity checkpoints for mirrors and reconnects;20Hz snapshots still carry the server-resolved fight. IDs, action types, original colors and ownership epochs remain server-controlled. Legacy server-physics mode and old presentation helpers remain only for historical regression comparisons; the controller runtime no longer imports the presentation helpers.

At a crossing, the source removes its puck from usable local state and retires its held pointer. The server atomically validates current owner/epoch/round/control/layout, clears its combat hold, increments ownership epoch, mirrors X and both velocity components, and grants the puck at Y=0. The recipient must paint that edge state before stepping, colliding, or accepting a touch on it. It then continuously simulates the puck itself. Delayed source checkpoints and old-epoch attacks cannot reclaim it. A rejected transfer restores the sender's own edge checkpoint, stopped, rather than an old server position. There is never an automatic zero-puck rescue.

Collisions are solved within the currently owning half. Two opposite-side pucks do not collide across the seam before grant; the receiving owner resolves overlap after the edge frame. This is the explicit simplification that avoids two authorities solving the same collision. A network gap during grant is expected: measured281ms with100ms each-way transit plus ordered jitter.500ms is not a guaranteed bound on arbitrary real networks.

Touch packets carry the actual owned puck pose/contact. The server validates that contact and current ownership, while combat legality, fighter positions, facing, damage, cooldowns and one-hit instances remain server-resolved. Synchronized event timestamps still credit elapsed attack windup immediately; there is no200ms input buffer and no historical combat rewind. This trusts the controller's puck physics rather than attempting server anticheat simulation.

Cancel/lost capture/resize clear local and combat holds. Hidden controllers explicitly pause the match. Disconnect invalidates control epochs, clears both server hold sets and pauses combat. Reconnect seeds a new local model once from the latest server checkpoint; unreported motion can be lost at that boundary. Layout changes clear holds but retain local positions. Round reset uses new spawn state. RAF stalls are capped to100ms of local simulation per update, avoiding a long catch-up burst on resume.

## Evidence

[Summary JSON](owner-motion-evidence.json), raw3.4-second traces for all eight cases [before](owner-trajectories-before.json.gz) and [after](owner-trajectories-after.json.gz). Cases: slow, fast, wall bounce, puck collision;100ms each-way delay, with and without ordered jitter. The baseline is clean commit `3f5c726`. Tests preserve WebSocket ordering even when jitter bunches delivery.

The slow-fling rendered-distance/physics-speed ratio with fixed delay was0.743 during200–700ms and0.782 during800–1300ms, then1.000 during1500–2500ms before the change. Afterward it was1.010,0.991,0.992. The new jitter case also stays near1.0. All captures extend beyond3.3seconds after release. Fast/wall/collision traces include genuine physical reversals; a negative X delta alone is not classified as a rewind. Browser timing and collisions can vary between runs.

A deterministic four-second test injects repeated conflicting/stale checkpoint coordinates and verifies the entire local trajectory stays byte-for-byte identical to an unperturbed local simulation. Separate tests prove the production server keeps checkpoint coordinates unchanged over hundreds of simulation steps, local wall/barrier/collision handling, both-direction atomic grants, old owner rejection, unique IDs, first-paint gating, held release and trusted local combat contact.

Four actual headless Chrome pages (two controllers at844×390 and844×320, two read-only displays) passed transfer, exact-edge first paint, catch/regrab, return transfer, two pointer IDs, cancellation/lost capture, resize, activity pause/resume, reconnect and20 unique IDs with no browser errors. Mouse seam input is native; explicit pointer lifecycle events are synthetic. Screenshots: `test-results/owner-controller.png`, `test-results/owner-display.png`.

The combat network suite passed distinct client clocks,160ms/20ms transit, reversed arrival, no queue, cooldown/duplicate rejection, clock reset cleanup and43 matching mirror snapshots. Server input processing measured0.09–0.41ms in that run. Unit tests and TypeScript contract check pass; JS is not fully typechecked. Real iPhone Safari, physical multitouch and remote two-person feel remain unverified.

## Reproduce

Run `PORT=3003 npm start` in one terminal, then:

```sh
npm test
npm run build
TEST_URL=http://localhost:3003 node tests/owner-trajectories-browser.mjs
TEST_URL=http://localhost:3003 node tests/owner-lifecycle-browser.mjs
TEST_URL=http://localhost:3003 node tests/timeline-network.mjs
```

Use separate isolated servers or allow creation/join rate limits to reset between larger suites. Baseline capture requires a clean `3f5c726` server on a separate port and `BASELINE=1 TEST_URL=http://localhost:3004 node tests/owner-trajectories-browser.mjs`. The baseline script loads that commit's client source. Earlier release/edge browser scripts use retired prediction internals and are historical; the owner suites replace them.
