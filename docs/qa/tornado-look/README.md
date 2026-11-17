# Tornado alley: Look preset, Stimming and Photoreal

Dev row `Look`, before Tone map. Default Stimming: the shot as it was.
`?look=photoreal` picks it for one load.

| Value | Stimming | Photoreal |
|---|---|---|
| Sun | 1 | 1.3 |
| Sky fill | 1 | 0.85 |
| White balance (r, g, b) | 1, 1, 1 | 0.92, 1, 1.12 |
| Saturation | 1 | 0.85 |
| Contrast about 0.05 linear | 1 | 1.15 |
| Bloom, threshold | 0.18, 1.4 | 0.07, 0.6 |
| Vignette | 0.38 | 0.22 |
| Grain | 0.035 | 0.02 |
| Lens glare lift (tintK) | 0 | 3 |

White balance, saturation and contrast run at the end of the scene pass, in linear light. The tone curve is ACES in both.

All frames are 1600 x 900, `?tor=F2.5&age=60`, the loop paused. Each pair is the same moment. `*-sbs.jpg`: Stimming left, Photoreal right.

## Photoreal materials, step 1: the near wheat

Superseded on main the same night: `wheat.js` was rewritten with its own sheen along the stalks and its own backlit glow, for both looks; `uPbr` is gone. The stills record the step.

It was `tornado/wheat.js`, behind `uPbr` (Photoreal 1, Stimming 0): each stalk is a thin waxy cylinder along its leaned axis (Kajiya-Kay).
The diffuse follows the sine to the axis. A sheen lies on a cone round the axis, stronger at grazing view. Straw lets the sun through when it stands behind the stand.

| File | Shot |
|---|---|
| `wheat-backlit-sbs.jpg`, `wheat-backlit-crop.jpg` | `?time=golden&eye=1.25&lens=35&storm=0.3&sunaz=-150`: Stimming left, Photoreal right |
| `wheat-frontlit-sbs.jpg` | The same with the sun behind the eye. The sky differs between the two: the deck bake ran on |

## The verge's dark strip

The ditch's normal came from its height, not its slope: the whole ditch floor leaned 27 degrees and went dark.
It now follows a swale 2.2 m wide and 35 cm deep, and a low sun rakes the banks at half strength.
`verge-strip-before-after.jpg`: before on top, after below; sun behind the eye left, sun behind the field right. `?time=golden&eye=1.25&lens=35&storm=0.3`.

## The road's tiling

The noise volume repeats every 16 units; at the aggregate's scale that is every 36 cm, and the stones lined up in rows.
`rdW()` now drifts its slice through the volume's depth with a slow noise, so no tile repeats. Long stains, metres to tens of metres, run with the traffic.
`road-aggregate-before-after.jpg` (`?eye=1.25&lens=35`) and `road-stains-before-after.jpg` (`?eye=3&lens=50`): before left, after right.

## Soft stalks

The lens focuses far, so each near stalk blurs by the aperture's radius: about 3 mm at f/5.6, the same in metres at every depth.
`wheat.js` widens each stalk's edge by that much (`WH_BLUR`). It costs nothing: the walk is the same.
`stalks-blur-before-after.jpg`: before left, after right, `?time=golden&eye=1.25&lens=35&storm=0.3&sunaz=-150`.
