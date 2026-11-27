# Schlieren candle (`schlieren`)

- **Shelf:** Main #51
- **Tier / Size:** `webgl2` · 52 KB
- **Verdict:** Strong, tactile WebGL2 fluid and optical simulation with clean idle sleep, needing context-loss handling, Bar v3 cover/help alignment, a rim-derivative fix, and its main-shelf emblem.

## Bugs
- Missing WebGL2 context-loss handling: schlieren/index.html:149 creates a raw WebGL2 context without onContextLoss from shared/gl.js or webglcontextlost/webglcontextrestored listeners, so a lost GPU context cannot stop the loop or rebuild targets.
- Non-uniform derivative call at mirror rim: COMPOSITE field() (schlieren/index.html:594-595) calls dFdx(d) and dFdy(d) inside if (r < 1.0 + 2.0 * e) (line 631), producing undefined 2x2 quad edge-fringe derivatives where the candle, matchstick, and iron cross r = 1.0.
- Bar v3 overlap on short/narrow stages: layout() (schlieren/index.html:985-997) hardcodes Bar v2 top clearance and an 8 px bottom margin without reading ui.cover() or ui.onCover(), allowing the lower mirror disc and source base to sit behind the bottom Signal bar.
- Incomplete boot error fallback: shader compilation/linking in program() (schlieren/index.html:178-188) and warmUp() (lines 1220-1233) are not guarded to show .fail and fire mark('first-frame') if they throw, leaving the intro stuck up to the 9 s pageReady timeout.
- Minor state/reset leaks: act.reset (schlieren/index.html:1203-1213) does not clear blowing/blowS/blowT, hand.warm, or disturb, and sourceFrame() (line 747-751) never cancels st.dying = 'gutter' if the user wakes the toy with pointer movement before the flame finishes dying.

## Labels, Copy & Menu Settings
- Missing Bar v3 help array: schlieren/index.html:111-142 passes keys without help, so Bar v3 How to play falls back to keys. (Note: Stage 1 flag bar_missing_keys is a false positive because keys is defined at lines 139-141.)
- Key-list pointer mismatch: keys (schlieren/index.html:139-141) uses a one-time COARSE ternary, leaves 'click' in the COARSE branch (['click', 'snap']), and passes ['hold still', 'warm'] which matches 'hold' in shared/signal.js:89 and draws a left-click-hold icon instead of resting the pointer without clicking.
- Missing main-shelf emblem: toys.json:1464 sets emblem to null for schlieren (number 51), so Bar v3's top-left monogram falls back to 'S'.
- Undocumented Dev rows and stale Knife angle state: dev rows ('Knife angle', 'Lift', 'Curl', 'Pace', 'Grain' at lines 129-135) have no hint tooltips, and 'Knife angle' remains active when Filter is set to 'Colour' or 'Shadow'.
- Incomplete stage aria-label: #stage aria-label (schlieren/index.html:46) describes stirring, warming, and snapping, omitting Blow ('B') and source selection ('1' to '4').

## Gameplay Improvements (up to 5)
1. Allow tapping or pinching directly on a lit wick or match head to snuff it out with an ember, complementing the left-edge Blow action.
2. Make a held stationary press act as a physical thermal baffle in body(p) that blocks draughts and deflects the plume around the fingertip, instead of only injecting heat.
3. Aim the Blow stream vertically toward the current pointer y-position when hovering, letting players sculpt eddies anywhere in the upper plume without always extinguishing the flame.
4. Add a fifth cold source (such as a chilled metal block or ice cube) whose dense plume sinks and pools along the floor using negative buoyancy.
5. Add subtle direct interaction with the props: stirring across the mug rim disturbs its surface hot spots, and tapping the hot iron tip triggers a brief vapor sizzle.

## Graphics Polish (up to 3)
1. Replace dFdx/dFdy in COMPOSITE field() (schlieren/index.html:594) with an analytic or central-difference SDF normal from body(p) to remove rim quad artifacts, and add a subtle specular bevel to the mirror cell ring (line 629).
2. Shade solid silhouettes beyond flat uShade (COMPOSITE, line 598) with subsurface wax glow near the candle top, a faint cherry-red thermal glow along ironHeat(s) on the soldering iron tip, and a subtle rim on the mug.
3. Upgrade GRAD (schlieren/index.html:505-514) to an isotropic 9-point Laplacian for Shadow mode curvature (g.z) to reduce diagonal grid aliasing, and scatter uGlow softly onto nearby mirror dust rings.
