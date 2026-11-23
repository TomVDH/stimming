# Traffic wave (`traffic`)

Status: built, 2026-11-23; waits on Tom's look. Bean `stimming-9nb7`. Idea 93, group B.

Cars circle a ring road. Tap one to brake. The cars behind bunch up into a jam. The jam slides backward against the traffic and lingers long after the first car moves on.

## The real experiment

Sugiyama and others, "Traffic jams without bottlenecks", New Journal of Physics 10 (2008).

| Fact | Value |
|---|---|
| Cars | 22 |
| Ring | 230 m round, so 36.6 m radius |
| Speed the drivers aim for | about 30 km/h |
| Result | A jam cluster forms with no bottleneck and runs backward like a solitary wave |
| Backward speed | about 15 to 20 km/h, the same as jams on a motorway |

The footage is a high view of a circle on a flat lot. A clump of 5 or 6 cars stops, then pulls away, and the clump moves back round the ring.
The paper's space-time plot draws each car's path: time on one axis, place on the ring on the other. Free cars draw steep parallel lines. The jam draws a band of flat steps that leans against them.

## Defaults (Tom's open question: 3D or flat, and the presentation)

- **Flat, top down, at night.** A high camera looks straight down on the ring, as in the footage. The circle stays a true circle, so the place on the ring reads as an angle. Light carries the scene: headlights throw cones along the lane, tail lights glow, brake lights flare red in the jam.
- Lit motorway is a driver's view of a night road with no jam model. Traffic wave is a high view of one ring and one wave.
- **The strip.** A space-time strip beside the ring (below it on a phone). Now is at the edge next to the ring; history streams away from it. Each car draws its path, coloured by speed; the jam draws a red band that leans backward.

## Model

The Intelligent Driver Model on the CPU, 120 Hz substeps.

| Term | Value | Why |
|---|---|---|
| Desired speed v0 | 14 m/s | Free cars cruise near 30 km/h on this ring |
| Time gap T | 0.6 s | The close gaps of the experiment |
| Jam gap s0 | 1.3 m | |
| Acceleration a | 1.6 m/s² | A stop jam at 22 cars slows cars for about 30 s, then heals |
| Comfortable braking b | 1.6 m/s² | |
| Car length | 4.1 to 4.7 m | |

A scan of the model on the ring with a = 1.8 m/s² and identical drivers (stop one car for 1.4 s). The toy uses a = 1.6 m/s² and drivers that differ by a few percent:

| Cars | Free speed | Stop jam lives |
|---|---|---|
| 18 | 36 km/h | about 19 s |
| 22 | 27 km/h | about 43 s |
| 26 | 19 km/h | for good |

So the Cars slider is the real control of the experiment: past about 25 cars the flow cannot heal, and small noise starts jams by itself.

## Hero

1. The first frame is a picture: 22 cars in smooth flow, headlights on the lane.
2. Tap a car: its brake lights flare in the same frame and it stops. Hold keeps it stopped.
3. The car behind brakes, then the next: a red ripple runs back round the ring.
4. The first car pulls away. The clump stays and slides backward at about 18 km/h.
5. The strip draws the backward band as it happens.
6. The jam thins and heals over about 30 s; brake lights flicker in the soft wave for about 60 s.

## Bar v3

| Control | Content |
|---|---|
| Actions | Brake (Space): the car nearest the foot of the ring. Even out (E): spread the cars evenly at one speed. |
| Slider | Cars: 12 to 30, default 22 |
| Settings | Quality |
| How to play | Tap a car; hold a car; Space; E |

## Frame loop

- Lively while a pointer is down, a car brakes, or a jam runs: full rate. Smooth flow alone: 30 fps.
- 60 s after the last input the sim clock eases to a stop over 2 s and the loop sleeps. Any input wakes it.
- Hidden: the loop and the sim clock stop at once.
- Reduced motion: the first frame holds still until a gesture; the sim sleeps 30 s after the last input.

## Sound

Muted by default. Tyre hiss and a low engine drone follow the mean speed. Each car's brake lights coming on make a soft tyre scrub, panned to the car, so the ripple is heard running round. The tapped car makes a short squeal. Even out is a soft swell.

## Tasks

- [x] Model scan (scratch script)
- [x] Blockout, 1280 x 800 screenshot (`docs/qa/traffic/01-blockout.png`)
- [x] Hero to high fidelity; strip
- [x] Sound
- [x] Bar v3 spec
- [x] Icon round `spike-traffic-1`, emblems, intro emblem
- [x] Lab entry: `toys.json`, menu tile and hook
- [x] QA Q1 to Q10; `docs/toys/traffic.md`
