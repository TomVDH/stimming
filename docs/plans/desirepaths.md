# Desire paths (`desirepaths`)

Status: built as a Lab toy, 2026-11-23; waits on Tom's look. Bean: `stimming-l8sg`. Idea 14, group B, a data toy.

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "Your pointer wears trails into a lawn over the session."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| View | Straight down, an aerial plan of one corner of a park: 12 m of lawn across on a wide stage, 5.4 m on a phone. No camera motion. | A desire path is a line on a plan: the planner's right angles against the diagonal the feet chose. From straight above the pointer stands on the spot it wears, one to one. A high oblique squeezes the far paths into a few pixels. |
| Paths | Two paved paths, 1.8 m wide, cross at right angles: one across the lower third, one down the right third. Pale concrete flags with dark joints. | The planner's grid. Its square corners are what the hand cuts. |
| Lawn | Mown in 0.9 m stripes, light and dark by the way the blades lean. | Mowing stripes are the same physics as trampling: a lean changes the sheen. The first frame shows the rule before the hand acts. |
| Light | Morning sun from the upper left, 24 degrees up. Kajiya-Kay sheen on the blades along their lean. The grass stands about 6 cm and casts a short shadow into a worn trough and onto the flags. Slow cloud shadows drift over. | Light carries the scene. Low sun makes the trough read as a dip. |
| First frame | One old desire path already cuts the main corner, half worn: a yellow verge and a bare middle. | The first frame is a picture, and it says what the toy does. |
| Renderer | Raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. Four small programs: stamp, wear, lawn, final. | A field sim and a full-screen shade; no 3D scene. |

## The hero moment

The pointer is a walker. It leaves footprints at a stride, left and right, with a little scatter.

1. **Bend.** One pass bends the blades under each print along the walk. The prints show as sheen, then spring back over about 5 s.
2. **Flatten.** About ten passes flatten the line for good: a lighter, streaked band that lies in the last walk's direction.
3. **Yellow.** Some seventy passes yellow it.
4. **Bare.** Some 170 passes wear it through to bare, compacted earth: pale grey-brown, a few cm lower, with frayed tufts at the edge and the grass's shadow in it.

Wear builds over minutes, not seconds. Where it is left alone the lawn heals: the bend in seconds, the flattening in a few minutes, the bare earth slower.

## Wear field

| Channel | Holds | Rises | Heals |
|---|---|---|---|
| R | Wear: 0 green, 0.35 yellow, 0.6 to 1 bare, up to 1.2 compacted | Under the sole, once flat | About 10 minutes of awake time |
| G | Flattening, the floor of the lean | Under the sole | About 4 minutes, once green again |
| BA | Lean: its axis at twice the angle, times its amount, so walks there and back add up | Under the sole and its brushed halo | Springs back to G in about 5 s |

The field is 16 x 13 m at 2.5 cm a cell. Prints draw as instanced quads into a deposit target; one wear pass adds them and heals the rest.

## Bar

| Control | Content |
|---|---|
| Action | Mow (M): the lawn regrows fresh |
| Slider | Footfall: how hard each pass wears, 0.25 to 4 times |
| How | Move: walk the lawn. Drag: a crowd walks it. Tap: stand still. |

## Sound (muted by default)

- Grass swish: filtered noise that follows the walker's speed over grass, panned with it.
- Earth crunch: dry grit grains over bare earth, more as the wear deepens.
- Flags: a soft scuff on the pavement.
- A light breeze bed while the lawn drifts.

## Frame loop

Lively while the pointer walks or a bend springs back (20 s after the last print). Drifting at 30 fps for the cloud shadows and the wind sheen. Asleep 60 s after the last input; the lawn's clock stops with it. Hidden: stopped. Reduced motion: no clouds and no wind sheen; prints still bend and spring back.

## Tasks

- [x] Plan, references
- [x] Blockout on the stage, screenshot
- [x] Hero: prints, bend, flatten, yellow, bare, heal; light and shadow
- [x] Sound
- [x] Bar v3
- [x] Icon round, emblems, intro emblem
- [x] Lab entry
- [x] QA, toy doc
