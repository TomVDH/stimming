# Deep vent

Status: active (built in the Lab; waits for Tom's look). Bean: `stimming-qlbm`. Toy id: `deepvent`. Lab toy, batch 1.
Source: idea 19 in `docs/toy-ideas.md`; section 2 of `docs/plans/next-ten-concepts.md`. Icon: Tom's pick A of `icons/spike-vent-1.html`.

## The toy

Black water at the sea floor. A black smoker chimney puts out a dark plume. Marine snow falls.
The pointer is a lure light. Where it goes, the dark opens on the chimney, its minerals and the plume.
The hand carries the only light. A faint ember at the vent mouth is the one other glow.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D, fixed camera | The reveal is light that wraps a form. Knobs, shadows and falloff need depth. |
| Renderer | Raw WebGL2 (Shader type), one raymarch pass | A few simple shapes; no meshes; no three.js cost. |
| Life at the vent | None | The Look rule cuts props. The MVP has one hero. |
| Presentation | Chimney right of centre, plume bends left with a current, floor fades into black | Leaves room for the light to travel. |

## Hero moment

Move the light and the dark opens: the chimney lights with soft falloff and shadow; rust, ochre and pale bands show; the plume shows its billows where the light reaches; snow flakes near the light flare; a glow of backscatter hangs round the light.

Finesse list:

1. The first frame is a picture: the light rests beside the chimney flank.
2. Water absorbs red first: near light is warm white, far light goes blue-green.
3. Backscatter: the water glows round the light (single scatter of a point light).
4. Heat shimmer above the mouth bends what is behind it.
5. The light trails the pointer on a soft spring, like a lure on a line.

## Controls (Bar v3)

| Control | Content |
|---|---|
| Slider | Light: how far the light reaches |
| Action | Flash (F): the lure flashes, the whole scene shows, then fades |
| Gestures | Move: the light follows. Drag on touch. Click: flash. Arrows: move the light. |

## Sound

Muted by default. The vent roars low under a hiss, panned to the chimney. The light moving makes a soft whoosh, panned with it. A flash rings one soft glassy note; pitch and level jitter.

## Frame loop

Lively while the pointer moves or the light settles; drifting at 30 fps for the plume and snow; asleep 60 s after the last input; hidden stops at once. Reduced motion: the plume and the snow stand still; the light still answers.

## Tasks

1. Blockout: chimney SDF, floor, light, screenshot.
2. Hero to fidelity: materials, plume volume, snow, backscatter, shimmer, grade.
3. Sound. 4. Bar v3. 5. Icon, emblem, Lab entry. 6. QA Q1 to Q10. 7. `docs/toys/deepvent.md`.
