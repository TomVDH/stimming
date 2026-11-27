# Cloud chamber (`chamber`)

- **Shelf:** Main #31
- **Tier / Size:** `webgl2` · 32 KB
- **Verdict:** A richly atmospheric, scientifically grounded WebGL2 cloud chamber with crisp droplet advection, distinct particle track physics, and procedural Geiger-like audio.

## Bugs
- chamber/index.html:129-135: canvas does not listen for webglcontextlost or webglcontextrestored, so a GPU context reset leaves the chamber frozen with no recovery or fallback message.
- chamber/index.html:607-609: deposit(dt) runs inside step(dt) after mistPass(dt), so warm() (line 673) leaves tracks created on its final iteration un-born; when the live loop starts, those tracks trigger audio ticks simultaneously on frame 1 if sound is enabled.

## Labels, Copy & Menu Settings
- chamber/index.html:98-116: initPage bar config has persistent settings and manually saved localStorage keys ('stimming.chamber.src', 'stimming.chamber.mag', and source.placed position) but provides no onReset handler to restore defaults.
- chamber/index.html:530: audioKit({ keys: new Set([' ']) }) only wakes audio on Space, omitting keyboard shortcuts '1', '2', and '3' that also trigger interactive changes.

## Gameplay Improvements (up to 5)
1. Allow dragging the radioactive source speck directly when starting a pointer drag near source.x/source.y, while keeping open-mist dragging to stir the vapour.
2. Add a reversible magnetic field polarity (or bidirectional slider from -1 to +1) so positrons, muons, and beta electrons visibly curl in opposite directions when flipped.
3. Support a right-click or two-finger tap to fire an energetic gamma photon that produces a distinct electron-positron pair-production V-fork at the tap point.
4. Let holding Space or the Shower button sustain a high-altitude cosmic ray storm that gradually saturates the mist until released.

## Graphics Polish (up to 3)
1. Render a subtle glass chamber rim, frost condensation vignette around the cold baseplate perimeter, and a faint metallic pin tip holding the mantle/beta source speck in OUT_FS.
2. Give the raking light beam in OUT_FS gentle volumetric shadow casting or light-scattering streaks behind thick alpha tracks so dense ionization clouds subtly occlude the lamp downstream.
3. Add subtle chromatic dispersion and micro-droplet sparkle in OUT_FS where fresh track condensation (s.r) peaks under the raking lamp, contrasting crisp individual droplets against the diffused vapour trail (s.g).
