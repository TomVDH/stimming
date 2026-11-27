# Rain on glass (`rain`)

- **Shelf:** Main #22
- **Tier / Size:** `webgl2` · 55 KB
- **Verdict:** A deeply atmospheric, well-engineered WebGL2 and Web Audio desk toy with clean lifecycle handling, needing only a toys.json sound metadata fix and minor Bar v3 selector hygiene.

## Bugs
- toys.json:618 marks 'sound': false for 'rain', whereas docs/toys/rain.md:12 says 'Sound: Yes' and rain/main.js synthesises full rain, wind, squeak, and drip audio.
- rain/main.js:1246 checks only '.s2-sheet' in keydown, missing Bar v3's '.sg-sheet' when the Dev popover is focused or if a sheet check is needed under Signal bar.

## Labels, Copy & Menu Settings
- toys.json:618 has \"sound\": false, which conflicts with the toy having sound enabled in initPage and \"Sound | Yes\" in docs/toys/rain.md:12.
- No Reset action or Settings reset callback is provided to restore default Weather ('rain'), Wind (0), and freshly fogged glass after heavy wiping.

## Gameplay Improvements (up to 5)
1. Let a long-press or stationary hold breathe warm condensation onto the glass, blooming a fresh dense fog patch around the finger.
2. Add a gentle window-tap gesture (quick double-tap or right-click) that jolts the pane so nearby clinging drops break loose and race downward at once.
3. Allow dragging across a large resting drop to pull and steer its water trail directly along the finger's path before gravity takes over.
4. Include a passing bus or emergency vehicle event in the street scene whose sweeping light and low rumble briefly rattle the pane.

## Graphics Polish (up to 3)
1. Add subtle internal caustic glow and chromatic dispersion at drop rims in COMP_FS when a drop refracts a bright street lamp or tail light.
2. Render faint residual smear tracks and tiny micro-beads along the edges of wiped finger strokes in the fog and mist buffers so wipes look physically streaked on glass.
3. Give the blurred street backdrop occasional distant lightning flashes during 'Storm' weather that briefly illuminate the building silhouettes and reflect in every raindrop.
