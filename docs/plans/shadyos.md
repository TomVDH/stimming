# ShadyOS (`shadyos`) implementation plan

**Goal:** An original glossy glass desktop OS, aged and quietly possessed. The OS itself is the fidget: drag a window and it smears copies of itself across the screen; fling one and it wobbles like jelly.

**Lore:** A bootleg "Ultimate XTreme Edition" that a script kiddie (handle d4rkm0th) skinned in 2008. It has run on one machine in a basement ever since. Uptime: 6,809 days. The clock says 3:33.

**Architecture:** Raw WebGL2. Canvas 2D paints the desktop and each window face once. The GPU composites a smear plate, a frost blur, spring-mesh windows and an aged-screen pass.

**Tech stack:** WebGL2, Web Audio through `audioKit()`, the shared shell and quality setting.

| | |
|---|---|
| Size, estimate | M to L · $30 to $50 |
| Kits | K1 accumulation without decay (the smear plate) |
| Before the build | Tom picked the look (glass era study plus the warez layer) and the name |

## Rules for this toy

- Fully original. No real OS names, logos, start button, caption-button cluster, icons, wallpapers or sounds.
- 7.css is a reference for the era's glass recipe only. Nothing from it is loaded or copied.
- Possessed means quiet and uncanny. No jump scares, no horror imagery.
- Exception to "no copy on the stage" (Tom): OS chrome carries text. Window titles, short dialog lines, file names and the clock.

## The shot

A dark night-blue desktop with a warm light streak and soft bokeh. A frosted strip runs along the top with the uptime and 3:33.
A glass shelf of glossy icons sits at the bottom. The screen is old: warm cast, light bleed at the edges, burn-in ghosts, dust, a stuck pixel, grain.
Two skins clash: the OS's smoky glass, and the kid's black glass with a flame title bar.

## Hero moments

1. **Smear.** Drag a window: every position stays on the screen, a hall of mirrors.
2. **Jelly.** Fling a window: it bends in flight, bounces off the edges and settles.
3. **Fold.** Double-click a title: the window funnels down into its shelf icon. The shelf brings it back.
4. **Cascade.** Error drops six dialogs in a staircase, each ding a step higher. Stay closes them in a ripple.

## Bar

| Control | Content |
|---|---|
| Chips | Smear, Jelly (what a drag does) |
| Slider | Age: warm cast, bleed, warp, grain, dust |
| Actions | + Window, Error, Clear |
| Settings | Quality (shared); later hum level, haunt on or off |
| How | Drag: smear or fling · Double-click title: fold · Click/Tap shelf: bring back · Space: error |

## Tech

1. **Desktop bake:** wallpaper, flare, burn-in, icons, shelf, strip and watermark, in canvas 2D, once per size.
2. **Window faces:** gloss overlay (side light, corner sheens, stripes, double edges) plus the client, in canvas 2D, once per window.
3. **Smear plate:** an RGBA8 target with no decay. A moving window stamps itself every 5 px. Clear fades it out.
4. **Frost:** the desktop plus the plate, at quarter size, two Gaussian passes. Each window samples it behind itself, then adds its tint and face.
5. **Windows:** a 16 by 12 grid on springs. Stiffness falls with distance from the grab point. Smear stiffens it; Jelly loosens it.
6. **Aged screen:** warp, warm cast, bleed, violet corner, rows, grain, dust, vignette and one stuck pixel.

## Sound

- a 60 Hz mains hum with two harmonics, very quiet
- a click on taps, a glassy ding per dialog, a whoosh on fold
- a soft glass rub while dragging that follows the speed

## Frame loop

Lively at full rate; drifting grain at 30 fps; asleep 60 s after the last input. A hidden tab stops it at once.
Reduced motion: no grain, stiff windows, a quick fold.

## Next

- [ ] Haunt beats: cursor hesitation, the 3:33 clock beat, tidy while you look away, a screensaver
- [ ] Shadows that follow a wobbling window
- [ ] Settings: hum level, haunt on or off
- [ ] The mascot, once the look is settled
- [ ] Real-device fps and sound check with Tom
