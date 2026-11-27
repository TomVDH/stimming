# Prism (`prism`)

- **Shelf:** Main #7
- **Tier / Size:** `three` · 116 KB
- **Verdict:** Clean, responsive 2D raytracer with sharp WebGL2 bloom and zero idle CPU cost, held back by Bar v3 safe-area selector drift, missing webglcontextlost handling, and a hidden-tab audio suspend gap.

## Bugs
- Missing webglcontextlost handler in prism/index.html:1258: glc listens for webglcontextrestored without a webglcontextlost listener calling e.preventDefault(), so the browser never restores a lost WebGL context.
- Stale Bar v2 selectors in measureBar() (prism/index.html:2643-2660): querying .stim-ui > :is(.s2-tl, .s2-tr, .s2-bl, .s2-br) and .s2-keys returns null offsetParent under Bar v3 (display: none), leaving safeT, safeB, and pipB at 0 instead of reading ui.cover()/ui.onCover(); this lets composition(), spot(), and pipAt() place pieces and sensor PIPs behind .sg-bar and .sg-mono.
- Hidden-tab audio leak and lifecycle gaps (prism/index.html:2410-2411, 2713-2714): prism rolls its own IntersectionObserver/visibilitychange instead of whenVisible and never calls hush(), suspend, or cancelAnimationFrame when hidden; if a tab hides mid-animation before frame() hits its else rest() branch, kit.ac and its five Tone.Oscillator nodes keep running in the background. Also frame()/render() lack try/finally and boot() lacks a .catch() fallback to failed().
- Spurious re-trace and audio hum on PIP tap (prism/index.html:1884, 2504): toggling pq.big in pipHit sets geomDirty = true, forcing a full trace/expose/develop/pack/bleed pass and calling voiceTrack() inside render(), which also triggers an unintended brief hum on window resize and light changes.

## Labels, Copy & Menu Settings
- zoomChip uses Bar v2 styling and zeroed safeT (prism/index.html:76-81, 2320, 2695): it builds a .s2-chip button instead of matching Bar v3's unboxed style, and sets top from safeT (0 under Bar v3).
- reset() does not restore Light choice (prism/index.html:2341-2361): pressing Reset returns pieces and camera to the opening composition, but leaves any chosen laser or element lamp active instead of calling ui.choice.set('-1', true).
- GESTURE_KEYS misses documented shortcuts (prism/index.html:1937, 2622-2636): +, =, -, _, 0, A, and C are absent from GESTURE_KEYS, so pressing them as a first gesture never wakes audioKit.
- Bar v3 help and option polish (prism/index.html:113, 158-164, 181-184, 1746): help repeats three identical 'drag' rows while omitting Shift+drag/right-drag and labelling A 'Add a piece' instead of opening the tray; LIGHTS lacks group headings; #stage aria-label omits spectrograms; gramLines ticks start at 450 nm and miss 400 nm when Potassium widens the range.

## Gameplay Improvements (up to 5)
1. Add a 50/50 beam splitter and an adjustable aperture/multi-slit mask to KINDS so users can build split-beam paths and clear focal-ray lens demonstrations.
2. Let prisms and lenses cycle glass material (Crown, Flint, High-index) or focal curvature subtly via a compact toggle or secondary ring action to vary rainbow spread.
3. Add tinted optical filter pieces (or dichroic mirrors) that transmit one spectral band and reflect the rest, letting players isolate and recombine colours downstream.
4. Drive subtle polyphonic glass harmonics from element-lamp spectral lines or beam-on-sensor hits while moving pieces, fading cleanly to silence when the table settles.
5. Support dragging a second lamp or toggling between collimated beam and narrow fan/point source so lenses and curved mirrors produce richer caustics.

## Graphics Polish (up to 3)
1. Add subtle chromatic bevel dispersion and internal volumetric scatter along segments inside glass (ins === 1 in FS_SEG / glassBody) so thick prisms and lenses feel solidly refractive rather than flat tints.
2. Animate the dust/smoke haze UV gently in FS_COMP while the loop is busy and upgrade buildDust() to a sharper multi-scale bokeh/micro-mote canvas texture within the expanded budget.
3. Scale or fade sensor/spectrogram PIPs and their .pips glass rings smoothly with p.z when p.dying is true (prism/index.html:1638, 1844) instead of vanishing abruptly on sweep().
