---
target: Fruit Slice toy
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/tomvanderhegden/Library/Mobile Documents/com~apple~CloudDocs/Dev/stimming/fruit/index.html"
target_fingerprint: "sha256:907b7ed28fbfe38462e0b57b32ccf614911e118ae86fb0d4ed6322b07c676ab9"
target_path: /Users/tomvanderhegden/Library/Mobile Documents/com~apple~CloudDocs/Dev/stimming/fruit/index.html
timestamp: 2026-11-27T20-49-49Z
slug: fruit-index-html
---
# Fruit Slice critique

Method: dual-agent (A: fruit_design_review · B: fruit_technical_audit)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Successful actions have rich feedback, but the intended gesture and targeted piece are never previewed. |
| 2 | Match between system and real world | 2 | Excellent fruit materials are undermined by intersecting pieces and scripted support. |
| 3 | User control and freedom | 2 | Join and fruit switching recover broad state, but accidental cuts, flicks, and debris have no local undo. |
| 4 | Consistency and standards | 1 | Slice can join; Flick can slice; swipe changes meaning by state, speed, and path. |
| 5 | Error prevention | 1 | Hidden movement and timing thresholds make failed or accidental gestures likely. |
| 6 | Recognition rather than recall | 1 | Secondary cuts, gap-to-join, hold behavior, and gesture thresholds live in hidden help or memory. |
| 7 | Flexibility and efficiency | 3 | Bar actions, direct manipulation, Space/F/S, and numeric fruit shortcuts are useful accelerators. |
| 8 | Aesthetic and minimalist design | 3 | The stage and fruit craft are strong; overlapping wedges and debris damage the composition. |
| 9 | Error recovery | 2 | Join and fruit switching help, but wrong wedge cuts and accidental flicks cannot be reversed cleanly. |
| 10 | Help and documentation | 2 | Help exists, but it cannot explain the invisible recognizer and the stage ARIA instructions are stale. |
| **Total** |  | **19/40** | **Poor interaction health on a strong visual foundation.** |

## Design Specificity Verdict

Fruit Slice is visually highly authored and specific to Stimming. Ten distinct procedural fruit materials, wet cut faces, translucency, fuzz, droplets, studio lighting, and sound create a memorable tactile object. The weakness is behavioral specificity. After the first cut, scripted offsets replace believable object physics, so the experience changes from touching a convincing fruit into triggering animations on overlapping meshes.

The deterministic detector reported one `cramped-padding` warning against `fruit/index.html`. It is a false positive because `shared/stim.css` supplies the about-section padding and currently hides that section. No verified detector violation remained.

## Overall Impression

The first cut is the peak: it reveals a beautifully rendered interior with strong wetness, sound, juice, and opening motion. Exploration then falls into a valley because slice, squeeze, flick, wedge split, join, and background-light drag compete on one pointer surface. Intersecting pieces and weak support physics break the physical fantasy. The ending is unresolved because joining does not clean up loose contents.

## What Works

- Fruit-specific materials are exceptional rather than palette swaps. Kiwi cells, pomegranate arils, passion-fruit sacs, mangosteen lobes, and fig strands all read differently.
- The dark stage, warm studio lamps, restrained shell, and floor reflection keep the fruit dominant.
- Successful actions layer dent, squash, spring, hop, droplets, puddle, wobble, sound, and reduced-motion alternatives.
- The frame loop sleeps, stops offscreen, adapts detail, and keeps Fruit's own files well under budget.

## Priority Issues

### P1: The gesture classifier can commit contradictory actions

A fast whole-fruit swipe can call `slice()` during pointer movement, then fall through to the release-time flick branch because the gesture was not marked as consumed. Quick wedge slices can miss `cutFrom` and become flicks. `pointercancel` and `lostpointercapture` execute the same semantic completion path as `pointerup`.

Fix: replace overlapping booleans with an exclusive gesture state machine. Seed the candidate piece on pointerdown, use hysteresis, commit exactly one outcome, and make cancellation perform cleanup only. Make slice depend on crossing the visible silhouette, flick on release velocity and short travel, and squeeze tolerant of finger drift.

### P1: Pieces have no piece-to-piece collision model

Fruit pieces spring toward authored offsets and rotations. Each piece is independently placed on the floor from its lowest hull point. There is no pair-overlap test, separating constraint, impulse, friction, stacking, or angular response. Flick direction moves loose bits but not the fruit piece.

Fix: retain the authored opening impulse, then settle pieces with a lightweight deterministic contact solver. Reuse existing hull points or multi-sphere proxies for floor and pair contacts, resolve penetration iteratively, add friction/restitution/angular response, and sleep stable pieces. Loose bits should use the same proxies.

### P1: Control labels and outcomes are semantically unstable

The Slice action calls a toggle and therefore joins when open. Flick silently slices a whole fruit before it can flick. A background/gap tap can join. Some fruits expose Flick without loose contents.

Fix: change Slice to Join when state changes, disable Flick until relevant, adapt it to each fruit's contents, and make joining explicit. Reassembly should pull loose contents back in or provide a clear clean-table/reset action.

### P1: The toy does not show which piece or action it recognized

After several cuts, overlapping meshes make raycast selection unpredictable. The user gets no cut-plane preview, squeeze buildup, target highlight, or rejected-gesture feedback.

Fix: subtly rim or lift the targeted piece, draw a transient cut trail and plane, deepen the dent toward squeeze activation, and show a directional streak for flick. Keep the cues object-based and remove them under reduced motion where appropriate.

### P2: Accessibility and responsive proof lag behind the implementation

The stage label describes four fruits and keys 1-4 although the toy has ten fruits and keys 1-0. Canvas state changes have no live status. Shared CSS suppresses visible focus. Current phone captures predate Flick, while gesture thresholds vary with viewport dimensions.

Fix: update Fruit's label and help, expose concise live state, preserve keyboard routes for essential actions, and run current 1280, 375x812, and 812x375 checks. Visible focus requires a separate shared-shell bean and Tom's approval.

## Persona Red Flags

### Jordan, first-timer

- Slice later joins without changing its label.
- Squeeze does not visibly communicate hold.
- Flick on a whole fruit unexpectedly slices it.
- Failed swipes do not reveal whether distance, speed, start point, or end point was wrong.

### Sam, accessibility-dependent

- The focusable application stage announces stale instructions.
- Whole/open/selected/joined/spilled state is not announced.
- Wedge splitting and light rotation have no equivalent visible keyboard action.
- Shared focus suppression blocks reliable keyboard orientation.

### Casey, distracted mobile user

- Eight pixels of movement cancels squeeze.
- Flick must finish within 320 ms, while slice uses a viewport-relative travel threshold.
- Fingers obscure wedges and no persistent target cue remains.
- Interrupted messy states keep debris until fruit selection changes.

## Minor Observations

- Loose-bit collision uses an all-pairs loop and allocates vectors during resolution.
- Resting loose bits can retain clumps and do not wake when moving pieces enter them.
- WebGL context loss halts without a visible recovery route.
- Source commentary and ARIA text still describe the earlier four-fruit build.

## Questions to Consider

- Is the primary fantasy precise cutting, visceral fruit revelation, or loose-object physics?
- Should Flick ever perform Slice, or should unavailable actions remain unavailable?
- Should the ideal ending restore a clean fruit and table, or preserve a deliberately messy scene behind an explicit clean-up action?
- Should wedges remain art-directed compositions, or become objects the user can throw, stack, and scatter?
