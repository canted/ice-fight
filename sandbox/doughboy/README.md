# Doughboy physics playground

Run `node sandbox/doughboy/serve.mjs` from the Ice Fight repository, then open http://localhost:3010/. The server binds to localhost. This playground is separate from the production game and is not included in its Docker image.

Drag body parts or individual skates. Pointer release/cancel/lost capture, blur, hidden page, resize, and reset clear holds. Reset with the button or R. Light punch, Medium punch, and Strong punch apply force directly to the head; the neck and body react through constraints. No automatic upright body snap is used.

## Current controls

- Softness: 60% default. Bounded waist tissue deformation grows from 3 to 12 logical units and its positional stiffness decreases as softness increases. This never stretches the skeleton to accommodate an impossible drag.
- Damping: 85% default.
- Ice friction: 10% default. Baseline horizontal skate drag coefficient is slider × 4 per second. Active recovery adds at most 0.3675 per second, scaled by feet effort and recovery demand, with smooth ±5% sinusoidal variation. Zero feet effort leaves baseline friction only. Drag uses exponential time-based velocity attenuation, with no stationary anchors.
- Feet effort and Head effort: 60% each. Effort interpolates linearly along the authored anatomical height, from foot to head; arms inherit their shoulder-region weight. Folding or rotating the character cannot change these weights. Equal endpoints give uniform effort; both zero remove every upright restoring force. Applied spring/angle strength uses a cubic response, so maximum effort remains capable of full recovery while intermediate values yield to punches. The pelvis hinge has 1.4× the angular recovery gain of knees at equal effort. Shoulder spring gain is 2×, while neck gain is 0.4×; their angular stops are unchanged and both still lose all restoring force at zero local effort.

The three head impulses were doubled at the user's request: horizontal fixed-step velocity increments are 28 / 80 / 180 for Light / Medium / Strong, with a downward component 60% as large. Repeated input is capped at 180 horizontal and 108 vertical; the integration cap matches for a 0.25-second impact window. This preserves the requested increase rather than clipping all three to one speed. Reset clears the impact window. At default effort, Strong folds the upper body substantially; feet remain floor contacts by design.

## Joint and structural limits

The specifically requested **lowest torso articulation** is `pelvis / hips`: knee midpoint → pelvis → belly. It now permits **180° total, ±90° from neutral**. The earlier change to the higher `lower spine` hinge was reverted after clarification; that hinge remains ±110°. Upper spine is ±100°, neck ±90°, shoulders ±155°. Knees bend both directions within ±75°. Elbows retain mirrored one-way 2–145° flexion.

Angular coordinates unwrap around the preceding constrained angle. This prevents a joint at one stop from switching to the opposite stop as its raw atan2 angle crosses ±180°. Limits are relative to parent segments, except shins, which remain within ±20° of world vertical.

Independent floor contacts retain their left/right identities and never cross. Minimum skate separation is 70; maximum is derived by adding 15° TOTAL to the previous stance opening (7.5° per side), using thigh length and the previous 150-unit maximum. Bone/spine lengths are projected to a bounded skeleton; tissue offsets have separate bounded envelopes. The pelvis uses a simplified paired-leg support projection rather than a full 3D hip model. Full self-collision is not implemented, so limbs may overlap.

## Validation

```sh
node --test sandbox/doughboy/physics.test.mjs
node sandbox/doughboy/browser-test.mjs
```

18 numerical tests cover both effort endpoints and anatomical blending, zero restoring force at zero effort, softness response, low/medium-friction full recovery, bounded smooth traction, stance widening/no crossing, floor/shin/angular limits, overhead hands, deep inverted-U release/recovery, wrapped angular stops, distinct doubled head impulses, repeated strong punches during opposing four-part drags, structural lengths, and reset.

The previously failing softness check used an obsolete >35-unit deformation expectation incompatible with the requested bounded torso. It now checks a material >8-unit difference within the 3–12-unit envelope. The knee assertion incorrectly demanded ±90° although the current knee stop is ±75°; it tests permitted ±60° in both directions while retaining the neck's ±90° check. The deep-fold fixture was unreachable under the bounded skeleton; it now uses a reachable belly position. Its release failure exposed a real angle-wrap branch flip, fixed by continuous angular coordinates.

Chrome checks the actual served Feet/Head/Ice friction controls, absence of the old single effort slider, three punch buttons, repeated Strong clicks, dragging/recovery, cancel/reset/resize, floor/joint limits, and desktop/390px layouts. Evidence is saved under `test-results/doughboy/`. Physical iPhone Safari and hardware multitouch remain unverified.

## Artwork

The procedural renderer follows the red/right fighter in `art/ice-fight-banner-cherry-v3.png`: red vented helmet, red/white hockey uniform, pads and skates, medium-brown skin, swollen cheek, asymmetrical weary face, and bare fists. Root DESIGN.md records the bare-hands decision. The attachment `libfile_7a53e957a464819192446fb541413573` was not accessible to this executor; its pixels were not inspected. No production art or runtime files are changed by this sandbox revision.
