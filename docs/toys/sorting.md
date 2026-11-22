# Sorting sounds (`sorting/`)

| | |
|---|---|
| Dutch | Sorteerklanken /sɔrˈteːrˌklɑŋkə(n)/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.78 0.15 20)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 9, group B: pick an algorithm; the bars sort themselves, each swap a tone. Bean `stimming-98c1`. Plan: [sorting.md](../plans/sorting.md), an MVP.

## Rules

- The rods are objects. A swap or a move glides them to new slots; no rod ever copies or changes height.
- Each algorithm is a generator over one array (`sorting/algos.js`). It yields compare, swap, move, read and mark steps. `tests/sorting-algos.test.mjs` proves that each one sorts.
- A rod's note follows its height only: the A major pentatonic, 21 notes from A2 to A6.
- One step costs one tick of the Speed rate. A mark (a pivot, a held key) costs none.

## Direction

- Flat, face on. Rods of glass lit from inside stand on a black glass floor that mirrors them.
- Colour by height, a dusk ramp: deep indigo, violet, rose, warm gold. A sorted row is one gradient.
- White is the flash: a compare lights two rod tips; a swap or a move heats whole rods white. Rods cool in about 0.2 s, so each algorithm leaves its own wake of light.
- A pivot or a held key: a small cool light on the floor under its rod.
- Sorted: a column of white light runs the row in 1.7 s and the rising scale plays; the row keeps a warm sheen until the next shuffle.
- The first frame is a picture: Quick sort a third of the way in, its wake still warm. The sort goes on after the intro.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Choice | Algorithm: Bubble, Insertion, Quick, Merge, Heap, Radix (keys 1 to 6) |
| Actions | Sort (Space: sort, pause, go on), Shuffle (S) |
| Slider | Speed: 3 to 1200 steps a second, log scale, default 60 |
| Settings | Quality |

| Input | Does |
|---|---|
| Tap | Sort; tap again to pause |
| Drag across the rods | Each rod you cross rings and flashes |
| 1 to 6 | Pick an algorithm; a sorted row shuffles first |

## Sound

- A struck glass bar per note, rendered once into a buffer: partials 1, 2 and 2.76, a short strike, a 3 ms attack.
- A compare or a read: a soft tone for each rod. A swap or a move: a bright tone.
- Speed shapes the voice: slow tones ring; fast tones end on a short exponential fade, at a level that falls with the square root of the rate. At most four tones start in a frame, bright ones first.
- Each tone pans with its rod. A generated two-second room at a low send.
- A limiter (ratio 20, 1 ms attack) before the kit's compressor. Headless check: no sample above 0.98 at any speed.
- Shuffle: a riffle of soft notes over a swish. Sorted: the scale upward, one tone per new note, then a soft A major chord.

## Frame loop

- Lively while a sort, a glide, a glow or the sweep runs. No ambient drift: a still, cool row stops the loop at once.
- Hidden: the loop, the sort and every tone stop.
- Reduced motion: no start after the intro; rods jump to their slots; glows fade in 0.06 s; the sweep lights the row at once.

## Files

| File | Holds |
|---|---|
| `sorting/main.js` | State, the step loop, pointer, bar |
| `sorting/algos.js` | The six algorithms as generators, the shuffle |
| `sorting/render.js` | Rods, reflections, floor light, bloom, grade |
| `sorting/sound.js` | Notes, voices, limiter, room |
| `shared/emblems/sorting.svg`, `shared/favicons/sorting.png` | Intro emblem and favicon |
| `icons/spike-sorting-1.html` | Icon round: Current, A, D |

QA captures: `docs/qa/sorting/`.
