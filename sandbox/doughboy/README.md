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

The three physics tests cover one minute idle,20 vigorous drags, recovery, reset while held, all eight slider-extreme combinations, finite positions and exact anchor immobility. Chrome covers drag/flop/recovery, repeated vigorous dragging, reset while held, pointercancel and resizing, at1280×800 desktop and390×844 portrait. Pointer/touch APIs are implemented, but real iPhone Safari and physical multitouch are not verified. Screenshots, browser evidence and recording are under `test-results/doughboy/`.

The preview inherits Ice Fight's Cherry Bomb One display face and coral/gold/mint family. The pale stage makes the cream silhouette and body motion the focus; controls remain separate in a dark sidebar. No existing game/product design files are changed.

A fresh visual finish review returned **ship** for the local sandbox using the desktop standing/flop and mobile screenshots plus source inspection. Its optional canvas tab-stop issue was removed; ordinary controls and R remain keyboard accessible. This is not a claim of a full assistive-technology audit.
