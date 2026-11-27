# ShadyOS (`shadyos`)

- **Shelf:** Main #30
- **Tier / Size:** `webgl2` · 177 KB
- **Verdict:** A richly detailed, witty WebGL2 + Canvas 2D bootleg desktop toy with crisp architecture and strong lifecycle discipline, needing only WebGL context-loss handling and minor metadata sync.

## Bugs
- shadyos/main.js#L87-L90 and shadyos/gl.js#L134: Missing onContextLoss(canvas, { lost, restored }) from ../shared/gl.js, so WebGL context loss is never prevented and permanently kills rendering.
- shadyos/apps/talk.js#L126-L136: chat's later() timers continue firing and calling ctx.wake() even when the page is hidden or asleep in standby (nap === 3).

## Labels, Copy & Menu Settings
- toys.json#L862: "sound" is set to false, whereas shadyos has full procedural Web Audio (shadyos/sound.js) and docs/toys/shadyos.md lists Sound: Yes.
- shadyos/main.js#L31-L66: Bar spec has persistent settings (haunt, hum, trail, boot) and manually stored localStorage keys (mode, age, untitled, folders), but omits a reset handler in the bar spec to restore defaults.
- docs/toys/shadyos.md#L30-L92: Toy documentation sections (Direction, Controls, Renderer, Files, Sound, etc.) are still placeholder "To write." blocks.

## Gameplay Improvements (up to 5)
1. Allow dragging files out of the Basement browser window onto the desktop or straight into the Bin dock icon.
2. Let users drag the desktop icons around the wallpaper and leave faint phosphor burn-in rectangles where they used to sit.
3. Add a physical degauss button in the Control Panel or menu that coils and snaps the CRT geometry with a resonant thump before clearing smears.
4. Let two flung windows collide and bounce off each other with a glass clink and a brief jelly ripple.

## Graphics Polish (up to 3)
1. Upgrade the window glass shader in shadyos/gl.js (WIN_FS) with subtle chromatic refraction at the rounded bevel edges using the SDF gradient.
2. Add subpixel RGB aperture-grille phosphor triads and subtle glass reflection curvature to POST_FS in shadyos/gl.js scaled by uAge and uDpr.
3. Give the smear plate (acc in shadyos/main.js) a very slow phosphor decay or hue shift toward amber/violet as old window trails linger.
