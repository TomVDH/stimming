# Code standards

Rules for code in Stimming. Terms follow `GLOSSARY.md`. Decisions and history: [[stimming/decisions]].
When this file and the shipped code disagree on a fact, the code wins: fix this file. Code that looks wrong is a bug bean.

## Base

- Plain HTML and JS. No build step. One folder per toy: `<id>/index.html`.
- `package.json` holds dev tools only. The site loads nothing from `node_modules/`.
- A toy page loads only from its own folder, `shared/`, jsDelivr and cdnjs.

## Stack types

A new toy picks one type in its bean, before its first line of code. Use the lightest type that draws the idea.

| Type | Renderer | Pick it for | Reference toy |
|---|---|---|---|
| Sketch | DOM, SVG or Canvas 2D | Shapes, type, a few thousand objects at most | `fidget` |
| Shader | Raw WebGL2, GLSL | Per-pixel maths seen flat | `vortex` |
| Environment | Raw WebGL2 on `shared/environment.js` | A place: sky, water, weather, glass | `foghorn` |
| Scene | three.js 0.170, WebGL | A camera that moves through lit 3D objects | `glass` |
| Compute | three.js 0.186.1, WebGPU and TSL | Over 100k agents, a fluid or a grid sim | `galaxy` |

- Offer WebGPU wherever it helps performance. The renderer guide and costs: `docs/stack.md`.
- Raw WebGL2: a full-screen triangle, `fitCanvas`, `whenVisible`, the site quality. Use `shared/gl.js`.
- three.js: named imports only; dispose geometry, materials and renderer on leave.
- One WebGL context per toy, released on leave.

## Libraries

Tom picked one set. Add no other library, and bump no version, without Tom.

| Role | Library |
|---|---|
| Rendering | Raw WebGL2; three.js 0.170.0 (Galaxy, Fire, Ink Water, Spark wheel and Cauldron use 0.186.1 WebGPU) |
| Colour | culori 4.0.1 |
| Sound | Tone.js 15.0.4 |
| Motion | GSAP 3.13.0 (the menu uses the cdnjs UMD build) |
| Noise | simplex-noise 4.0.3 |
| YAML | js-yaml 4.1.0, ShadyOS only, `dist/js-yaml.mjs` by full URL |
| Sound effects | ZzFX 1.3.2, Fireworks only, `zzfx@1.3.2/ZzFX.js` by full URL |

Every toy page that uses them carries this importmap, word for word:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
    "culori": "https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm",
    "tone": "https://cdn.jsdelivr.net/npm/tone@15.0.4/+esm",
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm",
    "simplex-noise": "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm"
  }
}
</script>
```

- A Compute toy maps `three`, `three/webgpu`, `three/tsl`, `three/addons/` and `three.core.js` to three 0.186.1 instead. Copy that block word for word from `galaxy/index.html`.
- `shared/stim.js` imports culori by the same URL, so it loads once.
- A bump: Tom's yes, a chore bean, one library at a time. Its reference toy proves it with a same-frame check. Then every importmap changes in one commit.

## Shared code

- `shared/` holds the shell and the shared modules. Rules for working there: `shared/AGENTS.md`.
- The shell's API is the JSDoc in `shared/stim.js`. Read it; this file lists no exports.
- A toy chat that needs a change in `shared/` opens its own bean and gets Tom's yes first.
- A toy adopts a shared module in that toy's own chat, never from a workbench chat.
- One module at a time. A reference toy proves it first. The audit order: `docs/code-health.md`.

## Toy page

- Controls: Bar v2. The toy passes one `bar` spec to `initPage`; the shell builds every control. Spec and limits: `docs/plans/bar-v2.md`.
- Never build a new page on the old bar. Never restyle the shared bar from a toy.
- A heavy toy reports load progress: `stage(name)` and `buildSteps(n)` in `shared/stim.js`.
- Settings persist under `stimming.<id>.<key>`.
- Never build a toy's own Quality chips. Size canvases with `fitCanvas()` or `pixelRatio()`; call `onQuality(resize)`.
- A toy may keep its own Low tier in front of Standard.
- Sound: Web Audio, muted by default, starts after a gesture, remembered in `stimming.<id>.sound`. Tone.js comes from `audioKit()`: `await kit.tone()`, connect to `kit.out`.
- Delayed sound runs on the audio clock (`ac.currentTime + delay`), keeps a handle per node, and cancels when the tab hides.
- Pointer: a press becomes a drag after 8 px or a hold after 260 ms; otherwise a tap. Capture on press; `pointercancel` and `lostpointercapture` end every gesture.

## Builds

- Fresh is the standard: the menu always opens `index.html`.
- A port keeps the old page as `<id>/legacy.html` (`noindex`) when it looks different, and sets `legacy: true` in `toys.json`. The Settings sheet then shows one Classic or Fresh link.
- A Compute toy with no `navigator.gpu` goes to its `legacy.html` when one exists. Otherwise it shows its still and one line. `legacy.html` never redirects.

## `toys.json`

- The one source for each toy's name, Dutch name, IPA, motto, number, series, release stage, toy version, emblem, accent, sound, legacy and lab tag. Add a new toy here.
- One entry per toy, every field present, in this order: `name`, `nl`, `ipa`, `tag`, `tagNl`, `number`, `series`, `stage`, `version`, `emblem`, `accent`, `sound`, `legacy`, `sub`. Use null, not a missing key.
- Main shelf first by number, then the Lab by name.
- `version` is a string. Main shelf toys start at `"1.5"`; Lab toys hold null.
- Docs carry no counts or lists of toys. `toys.json` is the list.

## Frame loop and performance

| State | Rule |
|---|---|
| Lively (input, or an event in flight) | Full frame rate |
| Drifting (ambient motion only) | 30 fps |
| Asleep | 60 s after the last input, ease to a stop over 2 s; the loop stops. Input wakes it. |
| Hidden | The loop and the sim clock stop at once (`whenVisible`) |
| Reduced motion | No ambient drift; gestures still answer, more softly |

- Budgets: 30 fps or better. First frame under 3 s on a cold load (`tools/loadtime.mjs`). The toy's own files under 1 MB; more needs Tom's yes. Idle: no rAF loop and no running audio nodes.
- Slow-frame step: after 4 s, a frame-time average above 1/38 s for 2 s steps down one rung (pixel ratio, then effect buffers, then counts). It never steps up and never writes `stimming.quality`. On High it falls back to Standard.
- Same frame: a shift of 1/255 on a few pixels. A larger change needs Tom's look.

## Errors

- Wrap `step()` and `render()` in `try`/`finally`.
- Raw WebGL2 toys handle context loss with `onContextLoss` from `shared/gl.js`. three.js toys listen for `webglcontextlost`.
- Any boot failure (CDN, shader compile, device) shows the stage's `.fail` line. Never a blank stage or a stuck intro.
- The console stays clean at load and in play. A known warning carries a comment.

## Files and names

- A toy id is its folder name and its `toys.json` key: lowercase, one word.
- Script under about 800 lines stays inline in `index.html`. Past that, split into `<id>/main.js` and named modules. An old toy splits only when it is ported.
- Dev pages: `spike-*.html`, `probe-*.html`, `lab.html`, all `noindex`. A probe page goes when its check ends. Pages does not publish them (`stimming-z9je` builds this).
- `shared/*.js` files carry `// @ts-check` and JSDoc on their exports. `npm run check` runs `tsc --noEmit`. Toys opt in when ported.
- Prettier and ESLint (`stimming-chp1` sets them up) run only on files a chat creates or owns. Never reformat a shared or old file whole.

## Comments

ASD-STE100, double density: one fact per line, twelve words or fewer, active voice, present tense. A why-comment stays; a comment that restates the next line goes. Full register: `.claude/rules/adjudant-code.md`.

## Assets, privacy, browsers

- Procedural first. A downloaded model, texture, sound or font needs Tom's yes (file, source, size, licence) and a row in `CREDITS.md`.
- No analytics, cookies or trackers. `localStorage` holds settings only.
- Scripts come from jsDelivr and cdnjs only, at pinned versions. Each page carries a Content-Security-Policy meta tag (`stimming-oqrt` rolls it out).
- Support: the latest Chrome desktop, Safari desktop, iOS Safari and Firefox.
- Never use brand names for toys. Exceptions: Domino Day, Strandbeest.
