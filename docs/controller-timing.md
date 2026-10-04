# Controller time, incoming edge presentation, and fight authority

Local revision on top of `d2ddeda`; not deployed. The user's clarified policy is to favor the home controller's timing and visible position, introduce incoming pucks only at the shared edge, and keep the fight on one coherent authoritative timeline.

## Input time and the shared fight

Controllers estimate server clock offset from a welcome/clock round trip, using the midpoint and the lowest-RTT sample among the last eight samples. Samples refresh every five seconds and on visibility restoration. DOM event timestamps are converted to the server clock; epoch-style browser event timestamps are normalized as well. Until a clock estimate is available, legacy clients use receipt time.

Both rink halves and combat run on one **200 ms delayed server timeline**, at 60 simulation steps/sec, with 20 snapshots/sec. Inputs are sorted by their synchronized event times before simulation, rather than by packet arrival. A controller's own sequence stays ordered across small clock-estimate adjustments. Ownership changes, holds, actions, cooldowns and damage therefore share the same logical chronology. Local grabs and flings still render immediately. All fight displays receive the same authoritative snapshots.

Hits from both fighters are evaluated before either hit's knockback is applied. This allows simultaneous attacks to trade without a player-slot-dependent push changing the second hit's range. Attack-instance, cooldown, direction and one-hit semantics remain authoritative.

The tradeoff is approximately **200 ms of shared fight delay**, plus network and snapshot delivery. Immediate white touch feedback and local puck motion remain local; yellow success feedback/audio wait for the authoritative action acknowledgement and therefore include this buffer. In the browser regression, acknowledgement median was about 220 ms locally and 321 ms with 100 ms each-way delay; local drawing feedback p95 remained about 15 ms. No predicted damage or local combat authority was added.

The buffer is a practical casual-game compromise, **not rollback**. If an event arrives after its logical time has already been simulated, it applies at the next step against current state and reports `lateMs`; it cannot undo already committed hits or reorder past combat. Clock midpoint estimates also cannot eliminate error from asymmetric network paths. Neither perfect fairness at arbitrary latency nor real-phone input-to-photon latency has been established.

Basic correctness checks remain: sequence/round/layout/control/ownership epochs, malformed data, duplicate packets and stale contact history. Contact history now covers 120 ticks (2 seconds), allowing more room for the shared buffer and network delay. A clearly stale/discontinuous mapped timestamp (over 2 seconds old or over 250 ms in the future) clears that controller's pending queue/holds and requests clock resynchronization. Disconnect clears queued inputs; viewport and round boundaries invalidate old controls. These are small correctness measures, not a new anticheat system.

## Receiving a puck

The server records each crossing's mirrored edge X, tick and ownership epoch. On a newly observed incoming epoch, the first painted puck center is **exactly at Y = 0**, at that recorded X. It blends into the live position over **250 ms**, within the requested 500 ms presentation allowance. Repeated snapshots do not restart the blend. A reconnect shows the existing current match snapshot rather than replaying old transfers.

The puck is visible immediately on that first edge frame; there is no hidden staging timer. Native controller input cannot select it before it has actually painted. Once visible, its contact offset maps to a known authoritative sample, so the player can catch its visible lower half immediately.

For that initial grab, the server can reconcile the controller-rink position to the visible catch point **once per crossing**, within the entry-to-snapshot corridor and the first 500 ms of simulated crossing time. This prevents a visible edge catch from leaving the actual grab far inside the rink, while avoiding repeated position resets from the same delayed presentation. An older/out-of-corridor position claim does not relocate the puck; ordinary authoritative contact rules still apply. Stationary and cancelled grab releases now also reconcile their visual position smoothly.

Ownership transfers immediately and atomically in simulation; the entry animation does not prolong the sender's ability to use the action, duplicate an ID, delay a cooldown, or grant a second activation. Only controller-rink position is reconciled—fighter position, facing, hitboxes, cooldowns and damage are not supplied by clients. Real collisions and corrections can remain visible. The design tolerance that the other player will not notice timing differences has not been measured in a two-person playtest.

## Evidence and validation

See [networking measurements](controller-timing-evidence.json).

- With unrelated clock origins and 160 ms versus 20 ms one-way delays, the slower connection's action was authored about 49 ms earlier, arrived later, and executed 50 ms earlier. Neither event was late. The two readonly mirrors received identical snapshots for every compared tick.
- A deliberately late event reported its lateness and executed at the next available step. Cooldown enforcement, duplicate sequence rejection, clock-discontinuity cleanup and continued connection worked.
- Before this revision, the sampled incoming puck first painted about 28.44 logical pixels inside the rink. Afterward it first painted at exactly 0, even though its delivered server snapshot was already about 38 pixels inside.
- Browser checks cover unpainted-input gating, immediate edge catch and return, old-owner rejection, unique ownership/20-puck conservation, bounded entry blending, reconnect and readonly display.
- Release-motion regression still reports zero freeze/rewind for moving throws under 100 ms each-way delay and ordered jitter, with first motion within approximately 16–33 ms in this run. These are Mac Chrome automation measurements, not hardware input-to-photon measurements.
- 40 unit tests and build checks pass, including event order across a transfer, simultaneous attack trades, late events and stale epochs. Existing controller tests also cover feedback, cancelled/multiple holds, resize, disconnect, waiting barrier and shared phone dimensions.

Run an isolated server with `PORT=3001 npm start`, then run `npm test`, `npm run build`, `node tests/timeline-network.mjs`, `node tests/edge-entry-browser.mjs`, `node tests/release-browser.mjs`, `node tests/release-lifecycle-browser.mjs`, `TEST_URL=http://localhost:3001 node tests/response-browser.mjs`, and `TEST_URL=http://localhost:3001 node tests/waiting-browser.mjs` sequentially. Browser tests now wait for actual acknowledgements instead of assuming receipt-time execution. Real iPhone/Safari and two-person remote play remain unverified.
