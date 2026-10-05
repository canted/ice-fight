# Homepage and lobby audit

Audited October 5, 2026 using the Impeccable technical audit playbook. Scope: local homepage `/` and a newly created `/room/:code` lobby. No application changes made.

## Implementation integrity verdict

**Pass, with isolated inconsistencies.** The original fighter artwork, arcade title, two-phone setup, and separate Watch action express Ice Fight's specific product. The interface is functional and compact. The homepage's explicit fling instructions conflict with the discovery direction confirmed in DESIGN.md. Lobby buttons and links also use different visual treatments despite sharing the same action area.

The bundled detector reported `dark-glow` and `repeating-stripes-gradient`. Neither is a verified issue on the audited surfaces: the hero's original blurred shadow is overridden by its later hard-offset arcade shadow, and the repeating stripes apply to the controller rink outside this scope. No ignores were added.

## Health score

| Dimension | Score / 4 | Evidence |
|---|---:|---|
| Accessibility | 2 | Low-contrast input placeholder and unannounced asynchronous error status; native controls, accessible input name, and visible browser keyboard focus are present. |
| Performance | 2 | Lean code, but a roughly 1.5 MB PNG is used at all screen sizes without responsive alternatives, intrinsic dimensions, or asset cache policy. |
| Responsive design | 3 | No horizontal document overflow at tested sizes; small QR-card heading wraps awkwardly and the phone input is 41 px tall. |
| Theming | 0 | Colors and dimensions are literal values rather than a shared token system. This rubric score does not imply that a theme switch or dark/light mode is required. |
| Implementation integrity | 3 | Product-specific identity with isolated copy and action-style inconsistencies. |
| **Total** | **10 / 20** | **Acceptable: significant work needed under the skill's rubric.** |

Scores describe this scoped audit, not WCAG certification or measured production performance.

## Summary

Nine findings: **0 P0, 2 P1, 6 P2, 1 P3**. Priorities are readable room entry, accessible error feedback, reliable joining, and lighter homepage artwork. Existing game functionality and intentional discovery should be preserved.

## Detailed findings

### [P1] Room-code placeholder has insufficient contrast

- Location: `public/app.js:7`, `public/style.css:2`.
- Category: Accessibility.
- Evidence: Chrome renders the placeholder as `rgb(117,117,117)` on `rgb(40,70,83)`, approximately 2.15:1 contrast. Its accessible name exists, but there is no visible label beyond this placeholder.
- Impact: Players with low vision can have difficulty identifying the room-entry field.
- Standard: WCAG 1.4.3, normal-text minimum 4.5:1.
- Correction: Add a persistent visible label and specify a placeholder color with sufficient contrast.
- Suggested command: `$impeccable harden`.

### [P1] Lobby claim errors are not announced

- Location: `public/app.js:8`, `#roomstatus`.
- Category: Accessibility.
- Evidence: An asynchronous claim failure updates a plain paragraph without `role="status"` or an appropriate live region. Focus remains on the claim action.
- Impact: Screen-reader users may not hear why claiming failed or what to do next.
- Standard: WCAG 4.1.3, status messages.
- Correction: Give claim feedback an appropriate live region; keep actionable retry guidance accessible.
- Suggested command: `$impeccable harden`.

### [P2] Invalid room entry loses the join interface

- Location: `public/app.js:7`, `server.mjs:12`.
- Category: Implementation integrity.
- Evidence: Clicking Join with an empty input navigates to `/room/`, returning a plain “Not found” page. Unknown valid-format codes return plain expired-room text with no clickable recovery action.
- Impact: A common input mistake forces players to use browser navigation to recover.
- Correction: Validate the six-character hexadecimal code before navigation and provide a usable missing/expired-room state with a lobby/home link.
- Suggested command: `$impeccable harden`.

### [P2] Room entry does not submit with Enter

- Location: `public/app.js:7`.
- Category: Accessibility / interaction.
- Evidence: Filling the room-code input and pressing Enter leaves the user on `/`; the input and button are not in a form. Tab followed by button activation is available, so this is not a keyboard trap.
- Impact: Keyboard users and phone users expecting their keyboard's submit action need an extra step.
- Correction: Use a form with a submit handler and an appropriate mobile enter-key hint.
- Suggested command: `$impeccable harden`.

### [P2] Homepage artwork has unnecessary transfer and layout cost

- Location: `public/app.js:7`, `public/share-v3.png`, `server.mjs:11`.
- Category: Performance.
- Evidence: The approximately 1.5 MB, 1200 × 630 PNG is used even when rendered around 318 px wide on a 390 px phone. The image lacks width/height attributes and responsive sources. Asset responses specify no cache policy or validators.
- Impact: Slower first loading on mobile connections and avoidable repeat transfers; missing intrinsic dimensions create a layout-shift risk before decoding. Cold-load shift and production latency were not measured.
- Correction: Serve optimized responsive display images, reserve their aspect ratio, and establish a version-aware cache policy. Preserve the share image required by social metadata. Do not lazy-load a prominent first-viewport image indiscriminately.
- Suggested command: `$impeccable optimize`.

### [P2] Invitation heading breaks around the QR image

- Location: `public/app.js:8`, `public/style.css:2`, `.card img`.
- Category: Responsive design.
- Evidence: At 320 px, the floated 115 px QR splits the heading into “INVITE / YOUR” alongside the QR and “OPPONENT” below it. The card fits the viewport, but the heading is visually fragmented.
- Impact: The invitation becomes harder to scan on small phones.
- Correction: Use a responsive grid or stack the heading and QR at narrow widths while keeping the QR usable.
- Suggested command: `$impeccable adapt`.

### [P2] Homepage explains a mechanic designated for discovery

- Location: `public/app.js:7`, step 03; confirmed direction in `DESIGN.md`, Discovery and feedback.
- Category: Implementation integrity.
- Evidence: “Hold the center to grab and drag. Release to fling, or tap the edge for a gentle shove” explicitly teaches the mechanic. The user confirmed that flinging should be discovered independently and hints should be subtle, sometimes coy.
- Impact: The introductory copy bypasses the intended discovery experience.
- Correction: In a later copy pass, retain essential setup guidance and replace the mechanical tutorial with a restrained invitation to experiment. No replacement copy or progression system is approved by this audit.
- Suggested command: `$impeccable clarify`.

### [P2] Lobby action styling splits between buttons and links

- Location: `public/app.js:8`, `public/style.css:2–4`.
- Category: Implementation integrity / theming.
- Evidence: Player-claim buttons have square borders, uppercase labels, and hard-offset shadows. Watch and New rink are rounded `.button` links. The arcade treatment selects `.landing button` instead of a shared action class.
- Impact: Actions in the same role-selection area look like unrelated component families, without an explicit hierarchy explaining the difference.
- Correction: Define a shared action treatment and intentional variants for player selection versus viewing/navigation, preserving semantic buttons and anchors.
- Suggested command: `$impeccable polish`.

### [P3] Styling lacks reusable tokens and has layered overrides

- Location: `public/style.css:2–4`.
- Category: Theming.
- Evidence: Colors, spacing, borders, and shadows are literal values. The base landing styles are repeatedly overridden by later arcade styles; button treatment is duplicated rather than expressed through a common component contract.
- Impact: Future edits risk inconsistent values and make it harder to identify which style is authoritative. No user-facing theme-switch failure was found.
- Correction: Extract the confirmed incumbent values into shared tokens and consolidate rules without replacing the visual identity.
- Suggested command: `$impeccable document`.

## Patterns and positive findings

The principal gaps are the join flow's error handling and fragmented shared styling. Native buttons and anchors preserve keyboard behavior, and Chrome's default visible focus outline remains intact. The room-code input has an accessible name. Images have alt text. Both pages have a main landmark and one primary heading. Major actions measure at least 44 px high; the phone room input measures 41 px, below the audit's preferred 44 px target but above WCAG 2.2's 24 px minimum, so it is not counted as a conformance failure.

All images loaded in the tested captures. No horizontal document overflow occurred at 1440 × 900, 390 × 844, 320 × 568, or 844 × 390. The role-selection and separate Watch action support the confirmed phone/display split. No animation or reduced-motion defect was identified in these static surfaces. The client source and stylesheet are small; no large framework bundle is involved.

## Evidence and limits

Screenshots: `test-results/audit-home-{desktop,phone,small,landscape}.png` and `test-results/audit-lobby-{desktop,phone,small,landscape}.png`. Local captures are ignored by Git. Browser measurements covered element bounds, image loading, keyboard focus, Enter submission, empty-code navigation, and homepage document overflow with a 200% root font-size override. That override is not a complete browser text-zoom test because many font sizes use pixel units.

The audit used installed headless Chrome and current local source, not the deployed site. Physical Safari, real QR scanning, assistive-technology testing, network throttling, production Core Web Vitals, and a full automated WCAG suite were not run. Scope excludes controller and fighter-display gameplay.

## Actions in priority order

1. `$impeccable harden`: readable room entry, announced claim feedback, validated joining, recoverable expired-room states, and Enter submission.
2. `$impeccable optimize`: responsive banner images, reserved image dimensions, and asset caching.
3. `$impeccable adapt`: narrow invitation-card layout.
4. `$impeccable clarify`: homepage mechanics copy aligned with the confirmed discovery direction.
5. `$impeccable document`: record the incumbent tokens and component contracts if a reusable visual-system record is wanted.
6. `$impeccable polish`: unify action treatments and verify the finished changes.

You can ask to run these one at a time, all at once, or in any order. Re-run `$impeccable audit` after fixes to compare results.
