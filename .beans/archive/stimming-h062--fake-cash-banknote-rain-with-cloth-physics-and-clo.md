---
# stimming-h062
title: 'Fake Cash: banknote rain with cloth physics and close-up inspector (Lab)'
status: completed
type: task
priority: normal
created_at: 2026-11-25T22:50:31Z
updated_at: 2026-11-26T18:08:30Z
---

New Lab toy: Fake Cash (id: fakecash).
Stack type: Scene (three.js 0.170.0, WebGL), strict TypeScript in fakecash/src/.
Asset budget: Tom approved up to 5 MB for crisp inspection WebP textures (2026-11-25).

Checklist:
- [x] Process, trim, orient, and compress 14 banknote faces (7 bills) into fakecash/bills/ under 5 MB (4.56 MB total)
- [x] Build fakecash/index.html, fakecash/tsconfig.json, and fakecash/src/ (Scene, custom paper/foil/polymer shader, cloth/aerodynamic rain physics, close-up inspector, Bar v3, synthesized paper audio)
- [x] Register fakecash in toys.json (Lab) and verify tech tags
- [x] Build (npm run build) and type check (tsc --noEmit -p fakecash/tsconfig.json) with 0 errors
- [x] Verify in browser and refine per Tom's feedback before committing via tools/commit.sh

- [x] Upgrade PBR paper + intaglio vertex/parallax displacement, 4-type foil/OVI/thread security shaders, Mark clear polymer windows, backlit SSS + reverse bleed-through, and whimsical backlit sky-atelier backdrop

- [x] Add OBB air-cushion bill collision, vibrant sunlit storybook backlit sky, remove cursor spotlight, add varied paper crinkles/wallet folds that unfurl on click, and boost aerodynamic flutter wobble

## Summary of Changes

- Built Fake Cash (`fakecash/`, strict TypeScript on Three.js 0.170.0) with 7 custom double-sided banknotes (14 WebP faces, 4.56 MB), Bar v3 controls, synthesized Web Audio paper effects, and close-up inspector.
- Added typed security mechanism shading (diffraction holograms, gold/copper metallic foil, OVI colour-shift ink, windowed security threads), crystal-clear Fresnel polymer windows on Mark's £10, physical hero intaglio vertex + parallax relief displacement, and backlit paper subsurface scattering with cotton pulp diffusion and reverse-side ink bleed-through.
- Built a whimsical backlit sunlit sky backdrop with volumetric sunbeams, storybook clouds, revolving banknote guilloche rosettes, and rising iridescent bubbles.
- Added pairwise OBB air-cushion collision so falling notes do not clip through each other, realistic aerodynamic wobble, and varied paper crinkles/wallet folds that physically unfurl when clicked.
