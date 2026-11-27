# Per-Toy Reviews (Main Shelf + Lab Slate)

Reviewed **11 / 78** main-shelf and Slate toys (2026-11-27, bean `stimming-03qk`).
Each card covers verified bugs, stale labels or forgotten menu settings, up to 5 gameplay improvements, and up to 3 graphics polishments under the 2.5 MB recommended / 5 MB max / 7.5 to 10 MB S-tier scale budget.

| Shelf | Toy | Tier | KB | Bugs | Settings | Verdict |
|---|---|---|---:|---:|---:|---|
| #2 | [Pop field](pop.md) | `three` | 103 | 6 | 5 | Pop field is tactile, responsive, and richly styled across 18 materials, but lacks WebGL lifecycle/fallback guards, visibility pausing, and a pixel budget cap. |
| #3 | [Fidget board](fidget.md) | `dom` | 492 | 6 | 3 | Solid, tactile SVG/Web Audio desk toy on Bar v3, held back mainly by a missing visibility pause, minor input/audio-wake edge cases, and 46 unmounted parts inflating its footprint to 492 KB. |
| #4 | [Domino Day](domino.md) | `three` | 99 | 6 | 3 | Solid three.js domino simulator with tactile physics and procedural sound, held back by missing tab-visibility and WebGL context-loss handling, minor touch-gesture state leaks, and cluttered Bar v3 help/settings edge cases. |
| #12 | [Soap cutting](soap.md) | `three` | 121 | 5 | 3 | A responsive, richly crafted 3D soap-cutting toy with authentic shaders and Web Audio, held back by missing WebGL context-loss handling, an incomplete tab-hide lifecycle, and an unbounded particle pool. |
| #23 | [TV tree](tvtree.md) | `three` | 434 | 6 | 4 | Healthy, expressive 3D desk toy with 156 GLSL channels and spring-pendulum physics, held back by missing WebGL context-loss handling, an unthrottled idle loop, and leftover Bar v2 DOM/key drift. |
| #25 | [Bubble wand](bubbles.md) | `three` | 54 | 5 | 3 | Physically expressive three.js soap-film toy with rich interference shading and clean idle sleeping, held back by missing WebGL context-loss handling, incomplete tab-hide cleanup (leaking breath audio), and a stuck-Space edge case on blur. |
| #28 | [Sonar](sonar.md) | `webgl2` | 101 | 6 | 5 | Sonar is a richly atmospheric WebGL2/Tone.js console with cohesive active/passive simulation, though it suffers from a Bar v3 label/sync mismatch in Listen mode, missing WebGL context-loss recovery, and no visible-idle sleep. |
| #49 | [Jacob's ladder](ladder.md) | `webgl2` | 68 | 6 | 4 | Solid, atmospheric WebGL2 desk toy with crisp physics and audio, held back by missing context-loss recovery, Bar v3 `help`/emblem metadata gaps, a 1.5 s audio tail when hidden, and a small `uLen` shader glitch on dying arcs. |
| #50 | [Wind tunnel](windtunnel.md) | `webgl2` | 57 | 6 | 4 | Solid, high-craft raw WebGL2 fluid sim with clean Bar v3 integration and thoughtful physics, held back mainly by missing context-loss/help wiring and a few wake-audio and shape-swap edge cases. |
| #51 | [Schlieren candle](schlieren.md) | `webgl2` | 52 | 5 | 5 | Strong, tactile WebGL2 fluid and optical simulation with clean idle sleep, needing context-loss handling, Bar v3 cover/help alignment, a rim-derivative fix, and its main-shelf emblem. |
| #undefined | [East Van postcards](postcard.md) | `three` | 0 | 1 | 1 | Entry exists in toys.json (#52) with no postcard/ folder on disk (tracked in stimming-e0qw). |
