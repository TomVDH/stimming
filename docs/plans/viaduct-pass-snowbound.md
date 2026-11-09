# Night viaduct, Pass: snowbound (spec)

> Sub-project 1 of 2 for the Pass rebuild that Tom asked for on 2026-11-09. Bean `stimming-3cmz`.
> Sub-project 2 is the avalanche on tap. It gets its own spec.

**Goal:** Pass becomes a snowbound epic. A long freight with a plough crosses a tall viaduct in a storm. The moon breaks through the cloud.

**Files:**

| File | Change |
|---|---|
| `viaduct/train.js` | New. Train shape only: hulls, consist layout, plough, lamp places. |
| `viaduct/port.js` | The train shape comes from `train.js`. Port's look does not change. |
| `viaduct/pass.js` | Rebuilt on Port's method: a baked still layer plus live parts. |
| `viaduct/index.html` | Pass shows the motion controls and `+ Train`. No other change. |

No shared files outside `viaduct/`.

## 1. Tom's picks

| Question | Pick |
|---|---|
| Direction | Snowbound epic |
| Wide shot | Down the span (three-quarter view) |
| Weather | Moon through storm |
| Train | Long freight |
| Moments | Avalanche on tap (sub-project 2), snow plough train |
| Build | C: one shared train module |

Not picked: storm slider, chase cam on Pass.

## 2. Shared train (`viaduct/train.js`)

The module holds geometry and layout only. Each scene keeps its own hull material, lights and lamps.

```js
makeTrain({ consist, gap }) -> {
  parts: [{ kind, len, geo, off }],  // one entry per vehicle; off from the nose
  span,                               // nose to tail, in metres
  lamps(s, dir, path) -> { head, tails: [L, R] },
  lay(s, dir, path, cb(i, x, z, yaw)) // places each vehicle on the path
}
```

- `path(s)` returns `{ x, z, yaw }` for a track place `s`. Each scene supplies it.
- Vehicle kinds:

  | Kind | Length | Shape |
  |---|---|---|
  | `loco` | 20 m | Port's raked nose, as now |
  | `loco-b` | 20 m | A loco with a flat rear cab, coupled behind the lead |
  | `car` | 24 m | Port's wagon, as now |
  | `box` | 16 m | A short, tall box wagon |
  | `hopper` | 14 m | A wagon with sloped ends |

- Option `plough: true` on the lead `loco` adds a wedge plough under the nose.
- Geometry carries the same attributes Port uses now (`color`, `aKind`). A new `aTop` float marks faces that point up, so a scene can cake snow on them.
- Port uses `consist: ['loco', 'car', 'car', 'car']`. Its screenshots before and after match.

## 3. Layout and camera

- The viaduct is a gentle curve, about 700 m long, across a deep V gorge.
- Piers stand 70 to 110 m tall. They taper and stand in pairs under the deck.
- The deck is Port's precast girder profile, with the same `precast` look: joints, streaks, wet edges.
- A snow shed closes each end of the span. It is a concrete gallery with a dark open side. The train leaves one shed and enters the other.
- `START` and `END` sit inside the sheds, so the train is hidden at each end.
- The wide shot stands at the near end, high and to one side. The span curves away across the frame. Peaks rise behind the far shed.
- Framing holds at 1280 px and 375 px. At 375 px the span runs more steeply into the frame.

## 4. Storm and moon

### 4.1 Snow

Three layers, all driven by one wind value. The wind gusts on a slow noise.

| Layer | Look | Drawn as |
|---|---|---|
| Near | Big soft flakes, a few metres from the camera | Points, live |
| Mid | Short streaks along the wind | Points with stretch, live |
| Far | Slow curtains that hide and show far piers | A full-screen layer from depth, live |

- Snow lights up inside the headlamp beam. This is the train's main signature.
- Reduced motion: the snow stops and the curtains hold still.

### 4.2 Cloud and moon

- A cloud deck sits above the peaks. Gaps in it drift with the wind.
- Through each gap, moonlight falls on the peaks, piers and deck. Outside the gaps, the scene is in storm shadow.
- The gap mask moves slowly, so a peak takes 8 to 20 s to come out and fade again.
- Spindrift blows off the ridges as thin, bright plumes where the moon hits them.

### 4.3 Snow on things

- Piers carry snow on the side that faces the wind.
- The deck edge and the shed roofs carry a snow line.
- Train tops (`aTop`) and the windward flank are caked with snow.

## 5. Freight and plough

- Consist: `['loco', 'loco-b', 'box', 'hopper', ...]`, 16 wagons in a fixed mixed order. Span about 400 m.
- Speed profile: Port's `trainSpeed()`, with a slower cruise. The long train takes about 25 s to pass a point.
- The lead plough throws two plumes of snow off the deck, left and right. Plume size grows with speed and drops to nothing at rest.
- The spray catches the headlamp and the moon.
- Lamps: Port's flare rules apply. The head lamps flare; markers on the wagons are pins.

## 6. Performance

Pass follows Port's method.

- The still layer bakes once: the gorge, piers, peaks, sheds and deck.
- The bake writes two layers: base light and moonlight. A full-screen pass adds the moonlight layer through the moving gap mask. The moon moves with no new bake.
- These parts draw live: train, snow, spray, headlamp beam, cloud gaps on the sky.
- The quality ladder, MSAA rules and `composer.setPixelRatio` are the same as Port's.
- Idle: with no train and reduced motion on, the page does no per-frame work.

## 7. Controls

- Bar v1 as now: the Pass and Port chips, `+ Train`, Settings, (i).
- Tap the train or `+ Train` sends a freight.
- Tune desk (`?tune`): one group per section (Sky, Cloud, Snow, Span, Train, Lens), as on Port.

## 8. Out of scope

- Sub-project 2: avalanche on tap.
- Sound, chase cam, storm slider.
- Port's sub-projects 2 and 3.

## 9. Checks

Tom said no Playwright. Check in the browser pane while it is visible.

1. The console is clean on Pass and on Port.
2. Port: screenshots before and after the `train.js` move match.
3. Pass screenshots at 1280 px and 375 px: the wide shot, the moon on the peaks, the freight mid-span with spray.
4. Frame times in the wide shot and with the freight on the span, recorded in the bean.
5. The freight leaves one shed, crosses, and enters the other; no end shows.
