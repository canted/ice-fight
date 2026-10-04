# Controller responsiveness — local refinement

## Changes

- Grab radius is now independently72% of puck radius, up from the accidental25% coupling. The constant6-unit tap plateau still ends at25% radius, and ordinary taps outside it keep the progressive ramp to140. Within the grab area, tap impulse is applied on quick release; holding pins the puck and intentional dragging/flinging stays available.
- Immediate white contact/held feedback is local. A220ms yellow fill with original-player-colored outline requires a matching server acknowledgement of a legal action or waiting-room practice contact. Cooldown, recovery, invalid ownership and old input epochs never produce successful yellow attack feedback. Audio confirmation follows the same acknowledgement.
- Owned grabbed pucks follow the finger locally. This is visual prediction only: combat, collisions, transfer and action ownership remain authoritative. Rejected contacts drop prediction. Transfer retires prediction but retains a release-only pointer latch until finger-up, preserving one action per touchdown. Release settles to the first authoritative post-release snapshot; cancellation, resize, phase/round changes, pause and reconnect clear local predictions. A short500ms upper bound prevents a stale release preview from persisting.
- Pointer movement keeps the latest/coalesced sample and sends once per animation frame, plus an unthrottled final sample on release. The old16ms drop throttle could discard the newest sample until another event arrived.
- AudioContext initialization moved before interaction; resume still uses the user's gesture. This avoids expensive cold initialization in the first input handler.

## Measurements

Chrome on the execution Mac; small samples, software timestamps, not a physical-phone or input-to-photon benchmark. Exact sample counts and p95 values are in responsiveness-metrics.json. Long stationary gaps≥100ms are excluded from continuous pointer/send cadence summaries. A frame callback timestamp measures readiness to draw, not when screen pixels illuminate.

| Quantity | Local median | Simulated100ms each direction median |
|---|---:|---:|
| Touch event to send |0.5ms|0.5ms|
| All input events to send (includes frame-coalesced moves) |8.1ms|10.6ms|
| Acknowledgement roundtrip |12.5ms|205.8ms|
| Snapshot arrival gap |52.2ms|52.3ms|
| Intentional interpolation tick gap, excluding network |16.7ms|16.7ms|
| Continuous pointer sample cadence |17.3ms|16.5ms|
| Continuous move send cadence |17.3ms|16.6ms|
| Input-handler-to-drawing-frame p95 |15.8ms|15.8ms|

Cold AudioContext construction measured176.7ms (a later warm instance2.3ms). Before moving construction out of the tap handler, one run had a157ms first-frame outlier; the isolated construction cost strongly supports audio startup as a first-touch hitch source, but is not a general device benchmark.

Read-only WebSocket transport pings from this Mac to the existing Fly iad app:12 samples, min74.1ms, median75.8ms, max77.5ms. These are transport RTT measurements from this host, not the user's phone and not full action latency. No Fly region/resources/spend were changed.

The previous drag path waited for outbound input, server integration/snapshot scheduling, inbound snapshot and interpolation. A roughly76ms RTT plus nominal0–50ms snapshot scheduling and0–50ms interpolation plausibly adds noticeable drag lag; that decomposition is inferred, not a synchronized-clock measurement. The grab-area shrink also made intended drags behave as edge shoves.

## Verification

27 simulation/glyph tests and typecheck passed. Chrome tests cover immediate white versus accepted yellow, cooldown/ownership rejection, rejected held prediction cleanup, a60%-radius grab, near-finger rendering before the delayed server receives movement, release correction, held transfer and reuse of the same pointer, native two-touch cancellation, paired568×320/844×390 layout, waiting barrier, conservation, origin colors, old inputs, reconnect, roles and readonly displays. Tested both local transport and an imposed200ms roundtrip delay. No real iPhone/Safari or public deployment verification of this revision.

## Recommendation

Keep the authoritative server and local visual dragging; do not predict combat success. Gather these same metrics on actual phones/networks next (window.icefightMetrics has bounded diagnostic samples). If players are consistently far from iad, compare a nearer region only after location/latency and migration approval. Region relocation, extra infrastructure, billing changes and rollback networking were not performed.

This refinement is local and awaits deployment approval for the new release.
