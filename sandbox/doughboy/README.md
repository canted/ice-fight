# Doughboy physics playground

Run from the Ice Fight repository:

```sh
node sandbox/doughboy/serve.mjs
```

Open **http://localhost:3010/**. This server binds only to localhost and does not touch multiplayer routes, rooms, fighters, or deployment configuration. Stop with Ctrl+C in its terminal.

Drag the head, belly, upper legs, or arms. Feet, ankles and knees have zero inverse mass and remain exactly fixed. Reset with the button or R. Sliders adjust softness, damping, and the strength of the standing/rest-pose springs. At minimum stand-up effort the figure may remain slumped; this is intentional. “Give him a nudge” produces an impulse without dragging. “Show the joints” exposes the physical structure.

A custom fixed-step120Hz Verlet/position-constraint ragdoll drives an original rounded Canvas silhouette. Distance constraints maintain limb lengths; compliant torso links allow squish; signed-area floors prevent inverted belly folds. Weak pose springs compete with gravity and soften during a drag. This is an articulated spring model, not a volumetric soft-body solver or a complete fighter. Limbs can overlap; there is no full self-collision, punching, walking, multiplayer, audio, or integration with the live fight.

Pointer capture supports mouse/touch and multiple pointers. Pointerup, pointercancel, lost capture, blur, visibility changes, reset and resize release held parts. Resize scales only the presentation, leaving physical anchor coordinates unchanged. Animation pauses while hidden and caps catch-up after long frames.

Validation:

```sh
node --test sandbox/doughboy/physics.test.mjs
node sandbox/doughboy/browser-test.mjs
```

The five physics tests cover one minute idle,20 vigorous drags, recovery, reset while held, all eight slider-extreme combinations, finite positions, exact anchor immobility, angular limits during extreme drags, and parent-frame rotation invariance. Chrome covers drag/flop/recovery, repeated vigorous dragging, reset while held, pointercancel and resizing, at1280×800 desktop and390×844 portrait. Pointer/touch APIs are implemented, but real iPhone Safari and physical multitouch are not verified. Screenshots, browser evidence and recording are under `test-results/doughboy/`.

The preview inherits Ice Fight's Cherry Bomb One display face and coral/gold/mint family. The pale stage makes the red hockey fighter and body motion the focus; controls remain separate in a dark sidebar. The bare-hands and joint-limit decisions are recorded narrowly in the existing DESIGN.md; production game assets remain unchanged.

A fresh visual finish review returned **ship** for the local sandbox using the desktop standing/flop and mobile screenshots plus source inspection. Its optional canvas tab-stop issue was removed; ordinary controls and R remain keyboard accessible. This is not a claim of a full assistive-technology audit.

## Banner-inspired fighter revision

The interactive renderer now follows the red/right fighter in the actual local banner `art/ice-fight-banner-cherry-v3.png`: red vented helmet, red/white hockey uniform and pads, striped socks, black laced skates, medium-brown skin, tousled hair, swollen cheek, squeezed-shut eye and crooked weary grimace. `fighter-art.mjs` draws the clothing and face directly from live rig points. No new raster assets were needed. The subsequent joint-limit request extends the solver as described below.

The user explicitly chose **bare hands/fists**, overriding gloves in the reference. The lasting rule is recorded in root `DESIGN.md`, section “Fighter appearance”. Exposed wrists, knuckles and thumbs use the face's skin palette. Existing reference artwork and production game assets remain untouched by this sandbox revision.

Attachment `libfile_7a53e957a464819192446fb541413573` could not be materialized because this executor exposes no Library read/materialize route; its pixels were not inspected. The inspected repo banner is the stated visual source, with red/right chosen as the default.

## Anatomical joint limits

Hard local angular limits supplement the soft distance/area constraints. Angles are measured between parent and child segments, never against screen axes. Each step projects child subtrees in anatomical order, so later elbow/neck corrections cannot undo an already-limited ancestor. Drag targets yield when the limb reaches a stop; the silhouette and torso links still squash and wobble.

- Elbows: 2–145 degrees of flexion (interior angles35–178 degrees), opposite signed directions for the mirrored frontal arms.
- Knees: 1–145 degrees of flexion (interior angles35–179 degrees), mirrored outward flexion; knees/ankles/feet stay fixed and the upper thigh moves.
- Neck: ±40 degrees relative to its neutral parent/child angle.
- Shoulders: ±80 degrees from each arm's neutral angle.
- Pelvis/hips: ±65 degrees relative to the pelvis-to-knee-midpoint parent.
- Lower and upper spine: ±38 and ±32 degrees from neutral.

Neutral angles are captured from the authored standing rig on reset. The paired hips use one central pelvis hinge, a deliberate2D simplification rather than independent3D ball joints. This is a frontal mirrored cartoon stance; no axial twisting or full self-collision is modeled. Amber arcs under “Show the joints” display angular ranges.

Five numerical tests now include30 extreme head/hand/hip/belly drags, exact fixed anchors, joint bounds after every step (tolerance1e-7 radians), and rotating the entire parent/body frame to prove limits are not screen-angle clamps. Chrome also checks joint bounds in the dragged flop pose, plus recovery/reset/cancel/resize. Real Safari touch hardware remains unverified.
