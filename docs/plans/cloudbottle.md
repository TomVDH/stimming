# Cloud in a bottle (`cloudbottle`)

Status: built as an MVP, 2026-11-22; Fire's fluid ported, 2026-11-23; waits on Tom. Bean `stimming-ec87`. Toy doc: `docs/toys/cloudbottle.md`. Idea 129, group A: "Pump, then release; a cloud snaps into being."

## The hero moment

A clear glass jug stands on a dark bench with a little water in it. A rubber stopper seals the neck; a hose runs from the stopper to a rubber squeeze bulb on the bench.
Squeeze the bulb: air goes in, the pressure climbs, and the stopper creeps up in the neck and creaks.
Pull the stopper, or squeeze past the limit: it pops. The air in the jug cools at once and a white fog fills it in a fraction of a second, with a wisp out of the mouth.
The fog rolls and swirls in the side light. Squeeze again: the stopper goes home, the air warms under pressure and the fog clears.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, a fixed camera a little above the jug, three-quarter light | The fog is a volume; only 3D shows it fill the round jug and catch the light from the side. |
| Renderer | Raw WebGL2 on `shared/gl.js`: a fog pass at half size and its blur, a bench pass, a scene pass, bloom from `shared/glow.js`, the grade from `shared/grade.js` | Small programs link fast on D3D11. Signed distances draw the jug, stopper, hose and bulb. |
| Fog shading | Fire's smoke shading (`shared/fire.js`), copied as `K3 lighting` | Tom, 2026-11-22: "fire toy smoke shader -- always". |
| Fog motion | Fire's fluid, ported to raw WebGL2 in `fluid.js` | Tom, 2026-11-23: yes to the port. |
| Vessel | A large round glass jug with a short neck | The classic lecture demonstration (reference). Glass gives crisp edge light that frames the fog. |
| Pump | A rubber squeeze bulb on the bench, on a hose to the stopper | A pump in frame makes each stroke visible; a bulb is one bold shape, no prop. |
| Light | Black room; one cool key from the back left, a faint warm rim from the right | Fog scatters forward: a back side light makes it glow white on black, as in lecture photos. |
| Gauge | None | The stopper's creep, the creak and the clearing fog show the pressure. No prop. |
| Slider | Smoke: the nuclei, from clean air to a whiff of smoke | Fewer nuclei give a thin fog; more give a dense white cloud. A true physical knob. |

## Reference (photos looked at, 2026-11-22)

- Lecture demonstration, University of Iowa: a 5-gallon glass jug with a stopper, a clear hose to a floor pump, black backdrop.
- Kitchen jar with a match whiff: the fog is milky and nearly uniform; on release a wisp curls out of the mouth.
- A plastic bottle with a needle through the stopper: pumping stiffens it; the stopper shoots out by itself.

## Physics, as the toy runs it

- Each squeeze adds about 0.045 bar. Past 0.55 to 0.65 bar the stopper pops by itself.
- On release the gas expands; the fog fraction follows the pressure drop: a small drop gives a faint haze.
- Fog density = fraction x smoke. It forms over 0.2 s, then thins with tau 40 s as the walls warm the air.
- The fluid: the warm glass drives a slow roll, up the walls and down the middle; warm gas under the shoulder clears the top first. A pop pulls the gas up the neck; a squeeze jets air down it.
- Each squeeze on a sealed jug multiplies the fog by 0.5: three or four squeezes clear it.

## Bar v3

| Control | Content |
|---|---|
| Actions | Pump (Space), Release (Enter) |
| Slider | Smoke |
| How | Click: squeeze the bulb · Drag the stopper up: pull it · Space: pump · Enter: release |

## Frame loop

- Lively while the stopper moves, the fog forms or the hand acts. Drifting at 30 fps while fog swirls.
- 60 s after the last input the swirl eases to a stop over 2 s; the loop sleeps.
- Reduced motion: the fog forms with no swirl and fades in place; the pop is a short hop.

## Sound

Muted by default. A rubber wheeze per squeeze, pitch up with the pressure. Stick-slip creaks as the stopper creeps.
The pop: a sharp crack, a low hollow note of the jug, and a hiss of escaping air. A soft thunk as the stopper lands. Each one jittered.
