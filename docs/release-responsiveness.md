# Release trajectory fix (local, not deployed)

**Motion policy superseded:** see [continuous owning-controller authority](owner-motion.md). The temporary prediction,250ms entry blend and server puck correction described below are historical; timestamp-based combat remains unchanged.


These measurements describe the `d2ddeda` release-handoff revision before subsequent networking revisions. See [the subsequent controller-timing revision](controller-timing.md) for current networking behavior and additional validation.

The old client stored a fixed position on pointerup for up to 500 ms. It removed that override after a release acknowledgement and a later snapshot, then immediately rendered the ordinary interpolation pair. The older half of that pair could still describe the drag. The result was a stationary puck followed by a backward step and replay.

The client now uses the same timestamped pointer samples and 620-unit/sec fling cap as the server, continues the released puck visually, and reconciles against the authoritative release position/velocity and tick included in the matching acknowledgement. Only post-release snapshots feed this reconciliation. A temporary local timeline lead drains at 20% of normal time; the final spatial offset decays over 90 ms before returning to the ordinary interpolation path. Ownership and epochs always come from the server. Barrier/wall bounds are respected locally; puck-to-puck collisions remain authoritative, so genuine collision corrections can still be visible.

A re-grab of a predicted released puck maps its contact offset onto a known server snapshot and keeps that coordinate offset for later moves. The server still validates the snapshot tick, contact circle, current ownership/epoch, input sequence and phase. This avoids rejecting a legitimate touch on the temporarily advanced visual puck without broadening hit tolerance or predicting combat.

## Captured measurements

Mac Chrome with 100 ms delay in each direction (200 ms RTT), plus a separate 50 ms each-way run. Jitter adds repeating 0/+35/-25/+70/-10 ms variation independently to each direction, while preserving WebSocket/TCP message order. These are browser automation measurements, not physical iPhone input-to-photon measurements.

Freeze is the longest consecutive period with less than 0.1 logical pixel of movement per frame during the first 350 ms. First motion is the first rendered displacement over 1 pixel after the pointerup command. Backward step is the largest single-frame rewind through the first 1,400 ms, including handoff. Stationary releases are intentionally stationary and excluded from this moving-throw table; their raw trajectories are retained in the data file.

| Run (RTT ms) | Throw | Network | Freeze ms | First motion ms | Max backward px |
|---|---|---|---:|---:|---:|
| before200 | fast | fixed delay | 235.1 | 286.5 | 8.45 |
| before200 | hold-flick | fixed delay | 232.8 | 309.6 | 3.00 |
| before200 | fast | ordered jitter | 334.3 | >350 | 1.85 |
| before200 | hold-flick | ordered jitter | 333.3 | >350 | 4.63 |
| after200 | fast | fixed delay | 0.0 | 17.5 | 0.00 |
| after200 | hold-flick | fixed delay | 0.0 | 29.9 | 0.00 |
| after200 | fast | ordered jitter | 0.0 | 17.0 | 0.00 |
| after200 | hold-flick | ordered jitter | 0.0 | 32.3 | 0.00 |
| after100 | fast | fixed delay | 0.0 | 29.8 | 0.00 |
| after100 | hold-flick | fixed delay | 0.0 | 29.7 | 0.00 |
| after100 | fast | ordered jitter | 0.0 | 17.3 | 0.00 |
| after100 | hold-flick | ordered jitter | 0.0 | 30.2 | 0.00 |

[Frame-by-frame rendered and authoritative trajectories](release-trajectories.json) include all three scenarios (fast, hold-then-flick, stationary), server snapshot tick and render tick. “Authoritative” is the latest delivered server sample, not an estimate of the unseen current server position. Independent runs have different pointer timing; the relevant comparison is the freeze/rewind at release, not equal final displacement.

## Validation and reproduction

31 unit tests and TypeScript build checks pass. Browser checks cover fixed delay and ordered jitter; immediate release motion and full handoff; stationary release; hold-then-flick; barrier bounce; re-grabbing a fast predicted puck; authoritative in-flight transfer and 20-puck conservation; independent two-touch release/cancel; resize and disconnect cleanup. Existing feedback/cooldown/ownership rejection, held transfer, waiting/reconnect, matched 568×320 and 844×390 controllers, and readonly-display checks also pass. Defensive unit coverage rejects pre-release, grabbed and out-of-order samples. WebSocket message reordering is not simulated because this transport preserves message order.

Run `PORT=3001 npm start`, then:

```sh
npm test
npm run build
BASELINE=1 node tests/release-browser.mjs
node tests/release-browser.mjs
DELAY=50 node tests/release-browser.mjs
node tests/release-lifecycle-browser.mjs
TEST_URL=http://localhost:3001 node tests/response-browser.mjs
TEST_URL=http://localhost:3001 node tests/waiting-browser.mjs
```

The baseline harness serves the client from commit `ba896ad`; authoritative fling math is unchanged. Run browser suites sequentially. Extensive repeated runs can hit the existing demo room/egress admission limits; restart the isolated local server rather than changing those production limits. Browser traces are written under ignored `test-results/`.

The waiting browser test now compensates for the moving puck's accepted grab anchor instead of assuming the earlier observer sample was its exact anchor. The lifecycle test reads fresh negotiated canvas bounds after resizing. Neither change loosens product validation.

This release is local only. No Fly configuration, spending, deployment or public behavior was changed. Real iPhone/Safari and real remote-player testing remain to be done after approval/deployment.
