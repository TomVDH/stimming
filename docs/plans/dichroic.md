# Dichroic glass (`dichroic`)

Status: built as a Lab toy, 2026-11-23. Bean `stimming-pj5e`. Idea 39, group F: quiet to use, rich to look at.

## The idea

Move the light; the glass shifts colour as you move it.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| Choice | Default | Why |
|---|---|---|
| Object | A small folded screen: three flat panes of dichroic glass, fused at their upright edges into a zigzag, 10 to 15 cm tall, standing on a white table | Dichroic glass is a coating on flat glass: flat panes show it most truly. The three leaves face three ways, so at any lamp place one leaf reads gold, one blue, one between, side by side. The leaves overlap from most lamp places, so the coloured light stacks and mixes on the table. Simple shapes, few of them (Look rule). |
| Presentation | 3D: a fixed eye above and in front, looking down 36 degrees; the table fills the frame and falls off into the dark room | The colour is an angle effect: it needs depth. The table must show the patches. |
| Light | One small lamp in a tight beam that you hold: it hangs over the table point under your finger | Direct: the lamp goes where you point. Behind the glass gives transmitted colour; in front gives reflected colour. |
| Coating | Gold (reflects gold, passes blue) | The classic pair. Magenta (passes green) and Cyan (passes red) are the two other chips. |

Kept apart from Glass (`glass/`): Glass breaks panes; its Rainbow pane is one type among nine. Here nothing breaks: the toy is the light.

## How it renders

Stack type: Shader. Raw WebGL2 on `shared/gl.js`, bloom from `shared/glow.js`. Three small programs.

1. **Table light map.** A 1280 square map over the table holds the light that lands on each point, as 12 spectral samples in three RGBA16F targets. Per point: the lamp, filtered by each pane the ray crosses (transmission); plus, per pane, the lamp's mirror image across that pane (reflection), filtered by the other panes on both legs. Soft edges come from the lamp's size. The map redraws only when the lamp or the coating moves.
2. **Scene.** One ray per pixel. A pane hit splits the ray into a reflected and a transmitted ray, two levels deep (seven rays at most, one loop, one shading site). Each leaf reads the light map on the table, or the dark room and the lamp's disc.
3. **Final.** Spectral samples to RGB, bloom, tone, vignette, dither.

The coating: reflectance R(lambda, theta) is a band with soft edges. Its edges move toward blue as the angle grows: lambda(theta) = lambda0 sqrt(1 - sin^2(theta) / n^2), n = 1.75. Transmission is 1 - R, less a little loss. Plain glass Fresnel takes over at grazing angles.

## Hero moment

Drag the lamp round the glass. Each leaf flips between reflected gold and transmitted blue as the lamp crosses its face. On the table the blue light behind the glass and the gold light thrown off its faces slide and turn, cross, and mix where they overlap.

## Bar (Bar v3)

- Choice Coating: Gold, Magenta, Cyan (keys 1 to 3). A change morphs the band over 0.6 s.
- Action Orbit (Space): the lamp circles the glass once, 10 s.
- Slider Height: how high the lamp hangs, 17 to 42 cm.
- Keys: arrows move the lamp.

## Sound

- A glass ring for each leaf when the lamp crosses its face, panned to the leaf, one note per leaf.
- A soft glass hum while the lamp moves; its pitch follows the reflected colour.
- A small clink when the coating changes.
- Muted by default.

## Loop

Lively while the lamp moves or the coating morphs; then it sleeps at once. No ambient drift: a still life. Reduced motion: the lamp follows without overshoot; Orbit is slower.

## Tasks

- [x] References: flat dichroic panes (Spectra side tables), dichroic cubes, filter angle shift.
- [x] Blockout at 1280 x 800 (`docs/qa/dichroic/01-blockout-1280.jpg`).
- [x] Hero to high fidelity; sound; bar; icons; Lab entry; QA Q1 to Q10. Toy doc: `docs/toys/dichroic.md`.
