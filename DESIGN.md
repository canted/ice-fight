# Ice Fight — design direction

This document records the product and interaction direction confirmed in the October 5, 2026 interview. It guides future design work; it does not authorize changes to the current interface. Visual-system details such as typography, palette, and component specifications have not been established by this interview.

## Audience and setting

Ice Fight is primarily for friends playing together who want a laugh from a quirky, unique game. Remote friends are a close secondary audience.

A separate view-only display is essential: it shows the fighters. Each player's landscape touch device shows only controls. The experience must support watching the fight while manipulating the controls on a separate device.

## Essential game identity

Preserve these elements:

- A recognizable fighting game with two fighters facing each other.
- Two phones facing across a shared ice rink.
- Slippery action controls that players can steal from one another.

The unreliable environment is central to the entertainment. Players hustle to gain the upper hand while the controls themselves slip away. Chasing controls, stealing a friend's best move, and chaotic fighting all contribute to the fun.

## Fighter appearance

**Bare hands are a lasting character-design rule.** Ice Fight fighters have visible bare hands and clenched fists, with skin tone consistent with their faces. Do not give them hockey gloves, boxing gloves, or padded mitts. This user decision overrides gloves shown in reference artwork.

Keep the hockey clothing and other gear grounded in the banner: helmets, team jerseys, pads, striped socks, and skates, with exaggerated weary, swollen, punch-drunk facial expressions. The red/right fighter has medium-brown skin.

The ragdoll experiment must use parent-relative anatomical joint limits: elbows and knees bend one way; neck, shoulders, hips and spine have bounded travel. Preserve a soft, yielding body and planted feet/shins rather than a rigid mannequin.

Recorded October 5, 2026 at the user's explicit request. Applied to the local doughboy playground in this revision. This decision does not itself authorize rewriting the original banner or production assets; preserve those until a separately scoped update.

## Competition and failure

Luck is an important factor in the chaos. Skill and clever, improvised techniques should still let a player gain an advantage.

Failure itself is entertaining. Design should preserve the visible, funny struggle of trying to succeed in an unreliable environment.

Playtest success means observable laughter together with a pull toward competition: players want to win and keep hustling despite the chaos.

## Discovery and feedback

Lead players to the edge of interactivity, then let them figure out the rest. Hints should be subtle and sometimes coy.

The familiar fighting genre should be visually clear. The game's name and the two opposing fighters already help establish the goal.

Successful control activation needs perceptible feedback. The current yellow flash provides this indication; preserve the distinction between an attempted press and a successfully triggered action.

Let players discover flinging for themselves. Do not explain every available gesture.

Give a subtle indication that the top edge connects to the opponent's screen. Existing cues include ice touching only at that edge and an orange starting barrier that disappears when play begins.

## Copy guidance for a later pass

The user identified the following current text as inappropriate for the intended experience:

- “grab/drag/fling”
- “open seam”
- “edge: gentle shove”
- “no pucks. the ice stays empty...”

These labels explain mechanics too directly. Future copy should support discovery with restrained hints. A puck count is unnecessary for the intended player experience.

These are recorded directions for later work. This interview does not request their removal or replacement now.

## Open experiments

The current experiment is finding the right balance and enough gameplay evolution to make the game fun and engaging while preserving its essential elements.

- Players might start with fewer controls and build toward the current ten buttons. This is a possibility to test, not a decided progression system.
- An empty half of the rink might offer a playful interaction, such as a fan running onto the ice. This is an exploratory idea, not an approved feature.
- Later levels could change things up, but expansion to that scale is not a commitment.

## Evaluation questions

Use playtests to assess whether the experience delivers the confirmed goals:

- Do friends laugh at the action and at their own failures?
- Do they try to win and hustle despite the chaos?
- Can skill and improvised tactics produce an advantage while luck keeps play uncertain?
- Do players discover interactions through feedback and subtle cues?
- Does attention move successfully between the phone controls and the separate fighter display?

## Homepage and lobby implementation record

The October 5 cleanup preserves the existing arcade identity rather than establishing a replacement visual world. These conventions are evidenced by `public/style.css` and `public/lobby.js`:

- Cherry Bomb One remains the display face, with blue and coral offset lettering shadows and the original fighter artwork. The homepage uses responsive WebP derivatives; the original social-sharing PNG is retained.
- Setup surfaces share square gold actions and coral offset shadows. Outlined gold actions distinguish watching and secondary recovery from claiming a player. Keyboard focus uses a visible pale-blue outline.
- Setup colors are scoped to `.landing`: panel `#10151c`, foreground `#eefff7`, secondary text `#cbdbe4`, gold `#f9da77`, border `#fff1a1`, and coral accent `#ff664c`.
- The room-code field has a persistent label. Loading actions prevent duplicate submission, errors are announced inline, and failed joining keeps the entered code available for correction.
- Invitation headings remain separate from the QR image. Narrow screens stack the invitation content; optional iPhone setup guidance is disclosed on demand.
- Essential setup instructions explain the two phones and separate display. Mechanics copy invites play without teaching grab, drag, or fling gestures.

Controller copy, puck counts, combat rules, and controller interaction remain outside this cleanup.
