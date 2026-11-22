# BZ reaction (`bz/`)

| | |
|---|---|
| Dutch | BZ-reactie /beːˈzɛt reːˈjɑksi/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.7 0.19 33)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 3, group A: a petri dish of the Belousov-Zhabotinsky reaction on a lightbox. Bean `stimming-e75e`. Plan: [bz.md](../plans/bz.md), an MVP.

## Rules

- One dish, one reaction. No dye choice, no modes.
- Every ring, spiral and seam comes from the sim. Nothing is drawn by hand.
- The first frame is a picture: three targets already pulse, and their fronts meet on clean seams.

## Direction

- Flat, top down, as a lab photo shows a dish. The lightbox is a warm pool of light just wider than the dish; the room around it is dark.
- Real ferroin colours, from photos of real dishes: a red-orange layer, and pale blue-white fronts with a sharp leading edge and a fading tail.
- The dye is lit by Beer-Lambert absorption of the lightbox: reduced ferroin absorbs green and blue; oxidised ferriin absorbs a little red.
- The meniscus climbs the wall: the dye is deeper there, and a dark line hugs the glass.
- The glass wall is a grey band with bright inner and outer edges. One room light glints on the rim, top left, and leans toward a hovering mouse.
- CO2 bubbles sit on the bottom: a dark lens rim around a bright core.
- A seed shows as a pale blue dot, as a dust grain does at the centre of a real target.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Shuffle (S): a fresh dish with three or four new seeds. Clear (C): the dye fades back to red and the dish empties. |
| Slider | Speed: how fast the reaction runs; stored as `stimming.bz.speed` |
| Settings | Quality (shared) |

| Input | Does |
|---|---|
| Tap the dish | Seeds a pacemaker; its first ring leaves at once, then one every 1.1 to 1.5 s |
| Drag across fronts | Cuts them; each pair of free ends curls into a pair of spirals |
| Drag across red | Leaves a pale stir scar that fades |
| Touch | The same; one finger at a time |

## The sim

- Barkley's excitable medium on a 768 x 768 grid that spans the dish. U is the fast front; V is the slow recovery, read as the oxidised dye.
- Space step 0.55, time step 0.02, a = 0.75, b = 0.02, epsilon = 0.02. A 3 x 3 isotropic Laplacian. Below the threshold the U step is implicit.
- The wall has no flux: a neighbour outside the dish reads the centre cell.
- A pacemaker fires a small disc only where the dye has recovered, so a seed in a refractory zone skips a beat.
- A cut sets U to 0, raises V, and writes a stir scar W into the third channel. W blocks the front for about 1.6 sim units, so the cut ends move on before the gap can heal, and then curl.
- Spirals turn faster than the seeds pulse, so in time they take over the dish, as in a real dish.
- Twelve seeds at most; the oldest gives way.
- The sim lifts the ping-pong step of Turing skin, marked as the Turing kit in `bz/sim.js`.

## Sound

Web Audio, muted by default.

- A seed lands with a drop's plip: a sine that chirps up, then a faint glass tick. It pans with the seed.
- Each ring that leaves a seed rings one quiet glass note, D minor pentatonic, one note per seed. A dish of seeds plays a slow polyrhythm.
- A drag swishes: band-passed noise that follows the drag speed.
- Shuffle and Clear swirl the dish.
- A low hum swells with the length of live fronts, read back from the GPU every 0.4 s.

## Frame loop

- Lively for 2.5 s after input: full rate. Then drifting at 30 fps.
- 60 s after the last input the reaction slows to a stop over 2 s, and the loop sleeps.
- An empty dish (after Clear) sleeps 2 s after the last input.
- Hidden: the loop and the sim clock stop at once.
- Reduced motion: the sim runs at a quarter rate and sleeps 8 s after the last input.

## QA

Captures in `docs/qa/bz/`. Headless Chromium with `--use-angle=gl` on Tom's PC.

| # | Result |
|---|---|
| Q1 | `node --check` passes on `main.js`, `sim.js`, `sound.js` and the menu script. |
| Q2 | Clean console through tap, drag, S, C, Shuffle, Clear and the slider. |
| Q3 | 1280 x 800, 375 x 812 and 812 x 375 captures, and one per hero moment. |
| Q4 | Empty dish: 0 rAF calls in 2 s. Drifting: 30 per second. 64 s idle: 0. |
| Q5 | Hidden: 0 rAF calls in 2 s. |
| Q6 | Reduced motion: clean console; 0 rAF calls 11 s after a tap. |
| Q7 | Two actions and one slider; four How to play rows. |
| Q8 | S and C act from the stage. |
| Q9 | The context runs after a tap and is suspended after Clear settles. |
| Q10 | Drag on this PC: median 16.7 ms, p95 16.8 ms. |
