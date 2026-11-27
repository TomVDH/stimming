---
# stimming-2dm2
title: 'Fruit slice: interaction, physics and visual refinement'
status: in-progress
type: task
priority: normal
created_at: 2026-11-27T20:41:54Z
updated_at: 2026-11-27T22:10:00Z
---

Tom (2026-11-27): address and refine Fruit Slice in graphics, responsiveness and fun factor. Slicing is confusing; squeezing and flicking are unclear; sliced halves clump together; fruit pieces lack proper collision with one another and with their support surface.

- [x] Audit the current toy in code and available QA captures; live browser unavailable
- [x] Define a clearer gesture model for slice, squeeze and flick
- [x] Fix piece-to-piece and piece-to-floor collision behavior
- [x] Refine responsive framing and touch behavior
- [x] Refine graphics and tactile feedback, including the five approved fruits
- [ ] QA at 1280, 375 x 812 and 812 x 375, reduced motion, hidden tab and console
- [x] Get Tom's look before commit

## Direction

Tom picked a physics playground plus messy spectacle. Mess persists during play; explicit Join performs a clean magical reassembly. Scope: full interaction, physics, graphics and responsive pass.

## Implementation

Repeated taps on an open piece now release its configured seeds or stone after the first juice-and-wobble tap. Raycasting includes visible cut-face meshes, so tapping a recessed papaya seed chamber selects its piece. Playwright confirmed three taps on one papaya piece release contents with no browser errors.

Harvest flesh: added a fruit-specific second subsurface sample, backlit diffusion and cell relief to the five new cuts. Lemon, mango and papaya transmit more light; avocado and coconut remain restrained. Playwright compiled and rendered all five without browser errors; regenerated their cutaway previews.

Harvest interior refinement: mango and avocado use cut-face holes with modeled recessed stone hollows; papaya seeds sit in a modeled chamber; lemon uses varied juice-sac cells and membranes; coconut flesh receives radial grain. Playwright checked all five whole and cut fruits without browser errors. Refreshed rotating cutaway previews.

New-fruit seam correction: replaced independently authored half profiles with signed continuous fruit-space shapes. Shared seam normals sample both halves, duplicated longitude vertices share normals, and closed halves keep one origin instead of independently seeking the floor. Removed the coordinate-mismatched generic pore bump from the five new skins; procedural world-space relief remains. Added five continuity tests for position, slope, periodicity and pole closure. Fruit swaps clear outgoing juice, and stems belong to one half only.

Control correction: Tom wants fixed studio lighting. Removed background light rotation, pointer-driven camera sway and light help text. Removed the Fuzz slider and stored overrides; each fruit's definition now sets its fuzz. Playwright confirmed identical light vectors before and after a background drag. Added the approved lemon, mango, avocado, papaya and coconut set with distinct skin profiles, cut interiors and rotating previews. Mango and avocado stones can eject; papaya releases loose seeds. Preserved the original 1–0 key mapping.

Skin material rebuild: `skin-surface.js` now defines distinct relief and layered reflectance for every fruit, with GGX direct lighting, reduced diffuse energy at reflective angles, separate wax coat, patchy bloom and velvet. Removed the universal sheen and restrained skin transmission. Rendered all ten skins under the same lighting in Playwright with no console errors; reviewed captures and reduced excessive citrus relief before the final pass.

Latest refinement: per-fruit skin roughness and dielectric reflection values, procedural micro-roughness, and transparent cut-half portraits in the Star Chart-style ribbon. Each portrait uses 49 rendered views across ±30°, plays at 30 fps on hover, and holds its central view at rest or under reduced motion. The ribbon's glass explicitly passes pointer events through; scroll padding protects the first selection outline. The toy remains under the 2.5 MB budget.

Exclusive gesture state, touch-aware thresholds and cut/squeeze cues; piece throws and table-plane contacts; individual contact shadows; moving piece proxies for loose bits; dynamic Slice/Join and Flick availability; Join clears bits, drops and puddle. Static QA: 284 node tests pass. `npm run check` remains blocked by the existing `shared/flare.js:188` errors. Live look and device QA remain.

Tom's live look found that the first circular contact proxy still allowed long subdivided wedges to clump and intersect, with constant black flashes. The correction replaces that proxy with three lengthwise by up to two radial contacts following each rendered wedge, resolves six bounded passes, and separates the duplicate wet faces at shared cuts. HDR/depth inputs are guarded before bloom and render targets clear explicitly. Contact shadows now spread and fade with lift. No library, asset or render pass was added; Fruit remains 252 KB against the 2.5 MB mark. Static QA: 287 node tests pass; live visual QA remains.

Tom's next live look clarified that shader-clipped children still felt like one tethered parent, squeeze needed a juice-to-contents progression, and flicked pieces must remain in view. Children now inherit momentum once and then own independent translation, lift, axial and table rotation, squeeze count and contents. Repeated squeeze loosens configured seeds/arils and can eject the existing detailed peach stone or rambutan seed; ownership follows one child through further cuts. Direct gestures and F/S act on one last-touched piece. Free pieces and loose stones rebound at camera-aware stage bounds. Fruit is 260 KB, still on the normal 2.5 MB budget.
