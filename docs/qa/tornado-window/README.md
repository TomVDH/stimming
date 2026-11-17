# Tornado alley: Window, rain, bokeh and grain rows (stimming-5yrr)

Dev group Window: Glass (on, off), Drops, Fog, Bokeh, Rain, Grain. The defaults keep the shot as it was: glass off, rain 0, grain 0.035.
Each row sets a value in the shared environment runner. No shared file changes.

All frames are 1600 x 900, `?time=golden&tor=F2.5&age=20`, ACES, the loop paused. Each frame is the same moment.

| File | Rows |
|---|---|
| `base.jpg` | The defaults |
| `glass.jpg` | Glass on, Drops 0.6, Fog 0.15 |
| `bokeh.jpg` | Glass on, Bokeh 0.12: the focus goes to the pane |
| `grain.jpg`, `grain-crop.jpg` | Grain 0.1 (crop: 0.035 left, 0.1 right) |

`?glass=1&wet=0.6&fog=0.2&bokeh=0.1&rain=0.5&grain=0.05` sets the rows for one load.

## Rain

The scene draws the near rain itself, not the runner's rain in the air.
The low sun at the eye's back lights the streaks warm against the storm; the sky's fill lights the rest.
Rain veils the distance: the far plain and the sky go grey, the near ground less.
The streaks slant with the wind across the frame, about 25 degrees at full wind.

| File | Rows |
|---|---|
| `rain-golden-off.jpg` | Rain 0 |
| `rain-golden-05.jpg` | Rain 0.5 |
| `rain-golden-1.jpg` | Rain 1 |
| `rain-golden-glass.jpg` | Rain 0.5, Glass on, Bokeh 0.06 |
| `rain-dusk-05.jpg` | Rain 0.5, `?time=dusk` |

Each rain still is a new load: the tornado's place differs between them.

## Drop blur

The focus is on the far plain, so the drops on the pane are soft discs. The falling rain stays sharp.
`tornado/pane.js` draws the drop field (refraction, cover, glint) at quarter size, then blurs it with a disc gather and a small second gather.
The runner's glass step reads that field in place of the sharp drops. Drop blur 0 gives the runner's sharp pane back.

| File | Rows |
|---|---|
| `drops-crop-0-010-025.jpg` | Glass on, Drops 0.8; Drop blur 0, 0.01, 0.025 (top left of the frame) |
| `drops-golden.jpg` | Glass on, Drops 0.8, Drop blur 0.01 |
| `drops-dusk.jpg` | The same, `?time=dusk` |
