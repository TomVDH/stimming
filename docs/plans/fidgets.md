# Fidget pool: ranking and the top five

Drafted 2026-11-09. Tom decides; nothing here is built.

This ranks the 16 unbuilt ideas in group D of [toy-ideas.md](../toy-ideas.md).
The top five have plans in this folder, on Bar v2 ([bar-v2.md](bar-v2.md)), under the batch rules in [README.md](README.md).
Each pick has a draft feature bean, `Toy: <name>`, under the Lab toys epic (`stimming-oh7b`): Spark wheel `stimming-1dfl`, Rain stick `stimming-6hb9`, Peel `stimming-9lbt`, Worry stone `stimming-1pxz`, Calm jar `stimming-tvg4`.

## How the ranking weighs

1. **Tom's pull.** Peel, Calm jar, Rain stick and Pea pod are on Tom's shortlist of 2026-11-04.
2. **Taste.** Daring, zany, original, shader-rich. Never skeuomorphic or fussy. "Way too involved" and "too minimal" both fail.
3. **Overlap.** A toy that repeats a built toy, or a Fidget board part, drops.
4. **Cost and risk.** Size and estimate use the table in [toy-plan.md](../toy-plan.md).

Fidget board (`fidget/parts/`) already holds 51 parts. Four ideas in this pool are parts there today: `abacus`, `dial` and `safe`, `doorstop`, `switchbank` and `tog`.

## Ranking

| Rank | Toy | id | Tech | Kits | Size | Risk | Estimate | Overlap with built toys |
|---|---|---|---|---|---|---|---|---|
| **1** | [Spark wheel](spark.md) | `spark` | 3D (three.js host) | K6 from Fireworks, K2 bloom and grade | S to M | Low | $12 to $20 | Fireworks shares K6 only. No toy shares the gesture. |
| **2** | [Rain stick](rainstick.md) | `rainstick` | SIM + 2D | none | M | Medium | $20 to $30 | Fidget board `hourglass` is a small cousin. |
| **3** | [Peel](peel.md) | `peel` | 2D (raw WebGL2, a deformed grid) | none | M | Medium | $20 to $35 | Crinkle foil (a sheet under moving light). Pop field's diegetic "peel corner" proposal. |
| **4** | [Worry stone](stone.md) | `stone` | 2D (raw WebGL2) | K1-style accumulation for polish | S to M | Low | $12 to $20 | Heat putty owns "warms in colour". Opal turn (#116) is an unbuilt cousin. |
| **5** | [Calm jar](calmjar.md) | `calmjar` | 2D + GPU particles | K5 from Oil slick | M | Medium | $18 to $28 | Snow globe: high. The plan makes the glitter optics and the size-sorted settle the subject. |
| 6 | Ice tray | `ice` | 3D | none | M to L | High | $30 to $50 | none. Refractive ice with lit cracks is shader-rich, but a twisting tray plus rigid cubes is costly. |
| 7 | Pea pod | `peapod` | SIM + 3D | K4 from Washing line | M | High | $25 to $40 | none. A soft body that splits is fiddly to make satisfying. |
| 8 | Chalk and sponge | `chalk` | 2D | none | S to M | Low | $12 to $20 | Glow paper and Zen sand (draw and wipe). The drying wet streak is the only new part. |
| 9 | Velcro | `velcro` | 2D | none | S to M | Medium | $12 to $20 | Zipper: the same strip, the same speed-led sound. |
| 10 | Worry beads | `beads` | SIM + 3D | K4 | M | Medium | $20 to $30 | Coil (a clacking ring chain), Magnet balls, Pull chain plan. |
| 11 | Geoboard | `geoboard` | SIM + 2D | K4 | M | Medium | $15 to $25 | String harp and the Fidget board `string` part (pluck and twang). Pegboard is skeuomorphic. |
| 12 | Toggle wall | `toggles` | 2D | none | S to M | Low | $12 to $20 | Sequin brush (flip in your trail), Fidget board `switchbank` and `tog`. |
| 13 | Bead board | `beadboard` | 2D | none | S | Low | $10 to $15 | Sequin brush, Glow paper, Fidget board `sketch`. |
| 14 | Doorstop twang | `doorstop` | SIM + 2D | none | S | Low | $10 to $15 | Fidget board `doorstop`: the same toy. |
| 15 | Detent dial | `dial` | 2D | none | S | Low | $10 to $15 | Fidget board `dial` and `safe`: the same toy. |
| 16 | Abacus | `abacus` | 2D | none | S | Low | $10 to $15 | Fidget board `abacus`: the same toy. |

**Top five total:** $82 to $133. Spark wheel and Worry stone are the cheapest pair and wait on nothing but F5 and F3.

## Why these five

1. **Spark wheel.** Cheap, bright and new. K6 and bloom exist. Real spark-test physics gives three metals three looks: forked bursts, long straight streaks, white stars.
2. **Rain stick.** Tom's pick. The sound sells it, and every bead hit lights its pin, so the tube rains light as it rains sound.
3. **Peel.** Tom's pick and the most-asked fidget. The daring part is true: peeling in the dark glows blue at the peel front (triboluminescence).
4. **Worry stone.** Small, shader-rich, calm. Rubbing polishes the stone and wakes its play of colour. Wetting previews the polish, as lapidaries do.
5. **Calm jar.** Tom's pick, but it must not be Snow globe. No dome, no scene: the stage is the inside of the jar. Holographic flakes tumble and flash, and the settle sorts them by size into layers.

Ice tray (6) is the first swap if Tom cuts Calm jar.

## Decisions for Tom

Answer in one batch. A build that waits on one starts after the answer.

| | Question | Blocks | Default in the plans |
|---|---|---|---|
| F1 | Calm jar against Snow globe: is "the inside of the jar, glitter optics and a size-sorted settle" different enough? | Calm jar | Yes. If no, Ice tray takes slot 5. |
| F2 | Peel as its own toy: does Pop field's "peel corner" diegetic proposal drop? | Peel | Peel takes the gesture; the Pop field proposal stays Tom's call, untouched. |
| F3 | Worry stone drops "warms in colour" (Heat putty owns it) and keeps polish and play of colour. Yes? | Worry stone | Yes. Opal stays out, so Opal turn (#116) keeps its own idea. |
| F4 | Abacus, Detent dial, Doorstop twang and Toggle wall are Fidget board parts today. Cut them from the pool? | nothing | Cut. A better build of one goes into Fidget board as a part. |
| F5 | Spark wheel shows only the knurled wheel and the flint, close up: no lighter body, no thumb. Yes? | Spark wheel | Yes (the Look rule: no props). |

Tom, 2026-11-09: "Go for it". Every default above holds. Spark wheel builds first.

## Build order

1. Spark wheel and Worry stone: small, low risk, no kit work beyond a copy.
2. Rain stick: medium, sound-led; tune the hit sounds before the look.
3. Peel: medium; the curl and the feel decide it. Checkpoint early.
4. Calm jar: after F1.

Open each build with:

> Build **<toy>** from `docs/plans/<id>.md`: read the Ground rules in `docs/toy-dev-plan.md`, the batch rules in `docs/plans/README.md`, Bar v2 in `docs/plans/bar-v2.md`, then the plan, and follow its tasks.

QA runs in the built-in browser pane (Tom: no Playwright). The Q numbers refer to the table in [README.md](README.md).
