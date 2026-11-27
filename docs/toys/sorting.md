# Sorting sounds (`sorting/`)

| | |
|---|---|
| Dutch | Sorteerklanken /sɔrˈteːrˌklɑŋkə(n)/ (draft) |
| Motto | Please hold while the numbers get their lives together. |
| Shelf | Main, number 74, series Maths class (since 2026-11-23) |
| Stage | None, version 1.5 (Tom: "no alpha") |
| Accent | `oklch(0.78 0.15 20)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 9, group B: pick an algorithm; the bars sort themselves, each swap a tone. Bean `stimming-98c1`. Plan: [sorting.md](../plans/sorting.md), an MVP. Tom moved it to the main shelf on 2026-11-23: "lets make sorting sounds main too -- promote" (bean `stimming-l7t5`).

## Rules

- The rods are objects. A swap or a move glides them to new slots; no rod ever copies or changes height.
- Each algorithm is a generator over one array (`sorting/algos.js`). It yields compare, swap, move, read and mark steps. `tests/sorting-algos.test.mjs` proves that each one sorts rows of 1 to 256 rods.
- 29 algorithms in nine groups: Exchange, Insertion, Selection, Merge, Quick, Heap, Digits, Networks, Slow. A sort that writes values (counting, bead) has no place here: the rods never copy.
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
| Choice | Algorithm: a list of 29 in nine groups; keys 1 to 6 pick Bubble, Insertion, Quick, Merge, Heap, LSD radix |
| Actions | Sort (Space: sort, pause, go on), Shuffle (S) |
| Slider | Speed: 3 to 12000 steps a second, log scale, default 60 (stored as `pace`) |
| Settings | Rods: 16, 32, 48, 64, 96, 128, 192, 256 (default 48, 32 on a narrow stage; a narrow stage holds at most 128); Quality |

| Input | Does |
|---|---|
| Tap | Sort; tap again to pause |
| Drag across the rods | Each rod you cross rings and flashes |
| 1 to 6 | Pick one of the first six algorithms; a sorted row shuffles first |

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
| `shared/stills/sorting.webp` | The menu's hover still: Quick mid-sort, 512 px |
| `icons/spike-sorting-1.html` | Icon round: Current, A, D |

QA captures: `docs/qa/sorting/`.

## Step counts

One shuffled row; marks do not count. At the top speed, 12000 steps take one second.

| Algorithm | 48 rods | 256 rods |
|---|---|---|
| Binary insertion | 247 | 1950 |
| Quick | 413 | 2996 |
| Merge | 314 | 2581 |
| Heap | 623 | 5144 |
| Bubble | 1596 | 47651 |
| Cycle | 3149 | 95504 |
| Stooge | 29954 | about 2.6 million |
| Slowsort | 40753 | never ends in practice |
