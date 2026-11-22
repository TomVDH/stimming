# Desert eclipse (`eclipse`)

Status: built as a Lab toy, 2026-11-22; waits on Tom's look. Bean: `stimming-07yy`. Idea 17, group C.

Tom's brief: "MVP at high fidelity, with icons for the lab and intro as well, bar v3". Idea: "Drag the moon across the sun. Shadow bands, a corona, then the landscape goes cold."

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D sky and ground on a flat stage. The moon's shadow is a true umbra, 110 km across, on the ground and in the air. The camera does not move. | The umbra in 3D gives the dark wall on one horizon and the 360-degree glow at totality for free. A fixed camera keeps it a diorama. |
| Camera | Eye height on a salt pan, level, facing the sun at 24 degrees up. About 52 degrees across. Horizon at 30% from the foot. | Sun and horizon share the frame, so one look holds the corona and the glow. |
| Place | A white salt pan, flat to the horizon, with a low line of mesas far off. | A plain light ground shows shadow bands best, as observers report. The open pan shows the glow all round. The mesas darken first when the shadow comes. |
| Sun | Drawn at about seven times its true size. The moon is 8% larger than the sun, as near perigee. | At true size the sun is 4 px wide; nothing could be dragged. |
| Renderer | Raw WebGL2 on `shared/gl.js`; bloom from `shared/glow.js`. Four small programs. | Per-pixel sky maths; small programs link fast on D3D11. |

## The hero moment

Drag the moon over the sun. The light thins and cools; the shadow comes from the west, out of the low afternoon sun, so the air round the sun and the far mesas darken first and the dark sweeps in overhead. Just before totality, shadow bands ripple over the pan. Baily's beads break along the limb, the last bead flares as the diamond ring, then totality: the pearl corona, pink prominences, Venus and Jupiter and a few bright stars, the orange glow all round the horizon. The heat shimmer on the pan dies. Drag back out and it plays in reverse; the shadow leaves behind you and the light returns from the west.

## Bar

| Control | Content |
|---|---|
| Slider | Moon: its place along its path across the sun |
| Action | Totality (Space): the moon glides to the centre, or on out |
| How | Drag: move the moon. Space: glide. |

## Sound (muted by default)

Desert wind that follows the heat; it drops as the light goes. A hush: the air loses its top. A bright glass ping at each diamond ring. At totality a low swell, a slow chord, and faint crickets.

## Tasks

- [x] Bean, plan, reference photos
- [x] Blockout and screenshot (`docs/qa/eclipse/01-blockout.jpg`)
- [x] Hero moment, sound, bar
- [x] Icons, emblems, Lab entry
- [x] QA Q1 to Q10, toy doc (`docs/toys/eclipse.md`)
