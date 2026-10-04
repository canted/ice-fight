# Controller time, incoming edge presentation, and fight authority

Local no-buffer revision replacing the unpublished `8baacc8` timing policy, while retaining the `d2ddeda` release fix; not deployed. The user's clarified policy is to favor the home controller's timing and visible position, introduce incoming pucks only at the shared edge, and keep the fight on one coherent authoritative timeline.

## Input time and immediate combat

The previously proposed 200 ms buffer was rejected and has been removed. There is no gameplay input queue or future-timestamp wait. Punches and kicks are evaluated directly in the WebSocket message handler. A successful attack's updated state is broadcast immediately rather than waiting for the next regular snapshot. Hits resolve on the next 60 Hz simulation step; transit, browser rendering, and existing attack windup are not zero-latency operations.

Controllers still synchronize their clocks using round-trip midpoint estimates and the lowest-RTT sample among the last eight samples, refreshing every five seconds and after visibility restoration. Browser event timestamps map to the server clock. Legacy/unsynchronized clients fall back to receipt time. Small estimate changes preserve each controller's sequence.

For a legal attack, elapsed synchronized event time is credited against its windup immediately. Credit stops at the beginning of the active hit window, so a very delayed punch is not silently skipped or given several historical hits. Its active window and recovery remain intact. Remaining cooldown reflects this credited phase, and the authored attack deadline also prevents late/repeated commands from bypassing the original cooldown. Future-skewed timestamps do not schedule attacks in the future.

Hit tests use **current authoritative fighter positions**. Both fighters' active hits are decided before either knockback is applied, allowing same-step trades. Facing, ownership, stun, action legality, cooldowns, one-hit instances and damage remain server-controlled. White puck contact/motion feedback remains immediate; yellow is only the brief accepted-action/practice flash on a puck, not a requirement to wait before processing a punch.

There is **no historical combat rewind**. Reversed packet arrivals are handled promptly in arrival order, with timestamp-based phase credit; an earlier-authored packet cannot undo an already-resolved hit, restore previous ownership, or rewrite intervening stun/position changes. Thus full retrospective fairness under arbitrary latency is not promised. Clock midpoint estimates also retain uncertainty on asymmetric network paths. This is the explicit compromise chosen instead of imposing artificial latency.

Basic correctness checks remain: monotonic sequence, round/layout/control/ownership epochs, malformed data, duplicate packets and 120 ticks (2 seconds) of contact history. Clearly stale/discontinuous mapped timestamps (over 2 seconds old or over 250 ms in the future) release held input and request clock resynchronization. Disconnect releases holds; viewport and round boundaries invalidate old controls. No global ordering buffer or anticheat subsystem remains.

## Receiving a puck

The server records each crossing's mirrored edge X, tick and ownership epoch. On a newly observed incoming epoch, the first painted puck center is **exactly at Y = 0**, at that recorded X. It blends into the live position over **250 ms**, within the requested 500 ms presentation allowance. Repeated snapshots do not restart the blend. A reconnect shows the existing current match snapshot rather than replaying old transfers.

The puck is visible immediately on that first edge frame; there is no hidden staging timer. Native controller input cannot select it before it has actually painted. Once visible, its contact offset maps to a known authoritative sample, so the player can catch its visible lower half immediately.

For that initial grab, the server can reconcile the controller-rink position to the visible catch point **once per crossing**, within the entry-to-snapshot corridor and the first 500 ms of simulated crossing time. This prevents a visible edge catch from leaving the actual grab far inside the rink, while avoiding repeated position resets from the same delayed presentation. An older/out-of-corridor position claim does not relocate the puck; ordinary authoritative contact rules still apply. Stationary and cancelled grab releases now also reconcile their visual position smoothly.

Ownership transfers immediately and atomically in simulation; the entry animation does not prolong the sender's ability to use the action, duplicate an ID, delay a cooldown, or grant a second activation. Only controller-rink position is reconciled—fighter position, facing, hitboxes, cooldowns and damage are not supplied by clients. Real collisions and corrections can remain visible. The design tolerance that the other player will not notice timing differences has not been measured in a two-person playtest.

## Evidence and validation

See [current networking measurements](controller-timing-evidence.json). These are local Mac Chrome/Node tests with simulated network transit, not hardware input-to-photon measurements.

- Measured receipt-to-game-processing was 0.65–0.81 ms in the final two-controller network run; acknowledgement medians were about 14 ms locally and 207 ms with 100 ms each-way simulated transit. The receipt-to-game-processing measurement is taken inside the server handler. The network test requires processing below 20 ms for both clients and verifies a zero configured buffer.
- With unrelated controller clock origins and 160 ms versus 20 ms one-way delays, reversed arrivals are processed immediately. The slower packet receives more elapsed-windup credit; neither packet waits for the other. Readonly fight mirrors match for every compared tick.
- Unit tests cover attacks arriving after their entire nominal duration, retained single-hit windows, authored cooldown protection, simultaneous trades, current-owner rejection and no input queue. Network tests cover duplicates, late packets, clock resets and coherent mirrors.
- Incoming pucks first paint at exactly Y = 0, are not touchable before painting, and can be caught and returned from the visible edge. Ownership and 20-puck conservation remain authoritative.
- Browser regressions cover continuous released motion, fixed delay/ordered jitter, stationary release, hold-then-flick, barrier bounce, quick re-grab, transfer, independent two-touch release/cancel, resize, disconnect, accepted feedback, cooldown rejection, waiting/reconnect and readonly display.

Run an isolated server with `PORT=3001 npm start`, then run `npm test`, `npm run build`, `node tests/timeline-network.mjs`, `node tests/edge-entry-browser.mjs`, `node tests/release-browser.mjs`, `node tests/release-lifecycle-browser.mjs`, `TEST_URL=http://localhost:3001 node tests/response-browser.mjs`, and `TEST_URL=http://localhost:3001 node tests/waiting-browser.mjs` sequentially. Real iPhone/Safari and two-person remote play remain unverified. No deployment was performed.
