# Tornado alley: Cloud tube probe (stimming-x0ru)

Dev row `Funnel: Shells / Cloud tube`, default Shells. `?funnel=tube` picks the tube for one load.
The tube is the deck's material on a tube round each axis: the deck's noise recipe (three octaves, a fine octave, Worley lumps, erosion), stretched up the tube and spun by each layer's spin phases.
The onion is five thin radial bands in its density, with clear air between them.
The dust at the foot is unchanged.

## Stills

All frames are 1828 x 984, `?tor=<F>&age=20`, Golden hour. Each pair is the same tornado at the same moment.
`*-crop.jpg`: Shells left (or top), Cloud tube right (or below).

| File | Shot |
|---|---|
| `f1-*` | `?tor=F1` |
| `f25-*` | `?tor=F2.5` |
| `f45x3-*` | `?tor=F4.5,F4.5,F4.5` |
| `near-*` | `?tor=F3.5&near=5&age=25`, a close look at the horn |

## GPU time, ms

EXT_disjoint_timer_query_webgl2, 1828 x 984 frame, funnel pass at 914 x 492.
Six interleaved rounds per mode: 72 pass samples and 48 frame samples.
Other work shared the GPU, so the medians are not stable. The minimum is the clean figure.

| Shot | Pass, Shells | Pass, Tube | Frame, Shells | Frame, Tube |
|---|---|---|---|---|
| F1 | 11.0 | 9.5 | 11.6 | 13.4 |
| F2.5 | 9.2 | 8.7 | 14.9 | 13.4 |
| 3 x F4.5 | 12.4 | 14.7 | 16.0 | 17.1 |

A quieter F1 run on the previous tune gave 9.1 and 9.3 for the pass, 11.5 and 11.7 for the frame.
The cost is the same within noise for one tornado. For three F4.5 wedges the tube costs about 7 to 15 per cent more.

## Read

Better with the tube:
- The cloud wraps round the funnel in a helix, so the spin reads in a still.
- The funnel and the deck are one material. No line shows where they join.

Worse with the tube:
- The cone is dimmer, softer and more see-through. It reads as smoke, not condensation.
- The puffy billows of the shells go; the streaks lean toward hair.
- The bands do not read at scene distance: they are a pixel or two wide.
- At F4.5 the two modes look the same: a dark wedge in the dust and the deck.
