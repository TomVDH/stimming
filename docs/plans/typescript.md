# TypeScript feasibility

Bean: `stimming-35mm` (epic `stimming-3s8z`). Written 2026-11-14.
Tom picked path (a) on 2026-11-14 (`docs/code-health.md`, decisions 8 to 10). Steps 1 to 3 and the pilot are done (bean `stimming-bn47`).

## Run the check

```bash
npm install
```

```bash
npm run check
```

- `npm run check` runs `tsc --noEmit` over the `include` list in `tsconfig.json`: `shared/` and `foghorn/` today.
- The check runs locally only. No CI job runs it (Tom, 2026-11-14).
- `node_modules/` is git-ignored. The site never loads it; `python3 -m http.server` works without it.
- TypeScript is pinned to 6.0.3. Version 7 is the native build and reads JSDoc differently; move to it as one planned step.
- A toy joins the check when its own chat moves its module script to `<id>/main.js` and adds the folder to `include`.
- `strict` stays off until `shared/` is clean under it (migration step 5).

| Scope | Errors before | Errors after | Real bugs found |
|---|---|---|---|
| `shared/` | 59 | 0 | None. Every error was a missing type: option bags typed from their defaults, `Element` where the code uses an `HTMLElement`, culori's mode literal |
| `foghorn/` | 6 | 0 | None. `initPage` returned a union, so Bar v2 handles looked missing |

The shell contracts now carry JSDoc types in `shared/stim.js`: `InitOptions`, `BarSpec` and its parts (`ChoiceSpec`, `ActionSpec`, `SliderSpec`, `SettingRow`, `KeyEntry`), `ControlHandle`, `BarUI`, `DprOptions` and `Quality`. `audioKit()` and `tone()` are typed too.
`detail()`, `environment()` (`EnvOptions`), `skyAt()` (`SkyPalette`) and `intro()` (`IntroOptions`) are typed.
`intro.js` is clean, but its `VARIETIES` and `TIMING` tables have no typedefs yet (migration step 4).

## Where the code is today

Measured on 2026-11-14 over the 88 entries in `toys.json`.

| Fact | Number |
|---|---|
| Toy logic inside `<script type="module">` in an HTML page | about 134,000 lines |
| Toy logic in `.js` files | about 32,500 lines, in 10 toys: `fidget`, `tvtree`, `window`, `frietkot`, `railgun`, `beer`, `eastvan`, `viaduct`, `nvg`, `washline` |
| Toys with more than 80 % of their logic inline | 79 of 87 |
| `shared/` (the shell, the intro, the shader library) | 3,705 lines of `.js` and `.css`, all in files |
| Pages with the importmap | 68 of 88 |
| Node on the dev machine | v24 (the tests in `tests/*.mjs` already use it) |
| `package.json`, `tsconfig.json` | None |

The main fact: **tsc does not read inline scripts in HTML.** Any TypeScript path checks only `.js` or `.ts` files.
So the first gain is in `shared/` and in the ten toys that already have modules. The other toys gain only when their own chat moves their script into a file.

## Three paths

### (a) JSDoc types and `tsc --noEmit` with `checkJs`

The source stays `.js`. Types live in JSDoc comments (`/** @param {number} w */`, `@typedef`) and in a few `.d.ts` files.
`tsc --noEmit` reads them and reports errors. It writes no file.

- **Deploy:** unchanged. Pages copies the same `.js` files. The importmap stays.
- **Local dev:** unchanged. `python3 -m http.server` serves the same files.
- **Editor:** VS Code shows the types and the errors in each `.js` file at once, with no command.
- **Cost:** a `package.json` with dev dependencies only, a `tsconfig.json`, and `node_modules/` in `.gitignore`.
  Only a chat that runs the check needs `npm ci`.

### (b) `.ts` sources, compiled by esbuild or tsc in the Pages workflow

The source becomes `.ts`. The workflow compiles each file to `.js` before it uploads the site.

- **Deploy:** the workflow gains a compile step. Each page loads the output, not the source.
- **Local dev:** a browser cannot run `.ts`. `python3 -m http.server` stops working for any converted file.
  Every chat then needs a watcher (`esbuild --watch`) or a dev server, all the time.
- **Generated files:** if the output is committed, two chats that edit one `.ts` file also fight over its `.js` file.
  If the output is not committed, the checkout no longer runs as is.
- **Inline scripts:** `.ts` in an HTML page needs a bundler. esbuild alone does not read HTML.

### (c) Vite

Vite serves `.ts` in dev, rewrites the HTML, and builds a `dist/` for Pages.

- **Deploy:** Vite resolves bare imports from `node_modules` and bundles them. The importmap and the CDN go, unless each library is set as external.
  That changes how every toy loads, so every toy needs a new QA pass.
- **Local dev:** `vite` replaces `python3 -m http.server`. Each of the 88 pages is an input in the config.
- **Inline scripts:** Vite compiles `<script type="module" lang="ts">` in HTML, but it does no type check. Type errors still need `tsc` on files.
- **Shared checkout:** every chat starts one dev server. The config file is one more shared file that every new toy edits.

### Comparison

| | (a) JSDoc + `checkJs` | (b) `.ts` + compile in Pages | (c) Vite |
|---|---|---|---|
| Build step | None | One, in CI and in every chat | One, in CI and in every chat |
| `python3 -m http.server` | Works | Breaks for converted files | Replaced |
| Importmap and CDN | Stay | Stay | Go, or need an external list |
| Types for the five libraries | From `node_modules`, check only | Same | Same, and bundled |
| Inline scripts in HTML | Not checked | Not checked | Compiled, not checked |
| GLSL in template strings | A plain string | A plain string | A plain string (a plugin can import `.glsl` files) |
| CI time added | About 30 to 60 s, in a job of its own | About 30 to 60 s, on the deploy path | 1 to 2 min, on the deploy path |
| Effect on toy chats that share one checkout | None until a chat opts in | Every chat runs a watcher | Every chat runs a dev server and edits one config |
| Way back | Delete two files | Convert back or keep the build | Large |

## Recommendation: path (a)

Use JSDoc types and `tsc --noEmit` with `checkJs`. Keep the source in `.js`, keep the importmap, keep `python3 -m http.server`, and keep the Pages workflow as it is.

Reasons:

1. It is the only path that changes nothing for the other toy chats. The repo runs as is, with or without `node_modules`.
2. The code is 80 % inline HTML. Paths (b) and (c) cannot check that code either, so their extra cost buys no extra checks today.
3. The highest-value types are the shell's contracts: the `bar` spec of `initPage`, `audioKit`, `detail()`, `environment()`, `skyAt()`. They are all in `shared/` files, and JSDoc covers them.
4. Path (a) is the first step of path (b) too. If Tom later wants `.ts` files, typed JSDoc converts one to one.

## How the imports resolve

`tsc` must find types for the bare names in the importmap, and for the CDN URLs that `shared/stim.js` imports by URL.

| Import | Types from | Note |
|---|---|---|
| `three`, `three/addons/...` | `@types/three`, pinned to `0.170.x` | three's `exports` map `./addons/*` to `./examples/jsm/*`; `@types/three` mirrors it, so `moduleResolution: "bundler"` finds both |
| three 0.186.1 WebGPU build (`galaxy`, `fire`, `ink`) | `@types/three` at `0.186.x` would clash with `0.170.x` | Leave these three toys out of the check, or map a second name in `paths`. They are inline today, so they are out anyway |
| `culori` | `@types/culori` (DefinitelyTyped) | culori ships no types. Check the `@types` version covers 4.0 |
| `tone` | Ships its own `.d.ts` | Pin `tone@15.0.4` as a dev dependency |
| `gsap` | Ships its own `.d.ts` | Pin `gsap@3.13.0` |
| `simplex-noise` | Ships its own `.d.ts` | Pin `simplex-noise@4.0.3` |
| `https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm` (in `stim.js`) | A shim: `declare module 'https://cdn.jsdelivr.net/npm/culori@4.0.1/+esm' { export * from 'culori'; }` | One `shared/types/cdn.d.ts` holds every URL shim |
| `import(TONE_URL)` (in `stim.js`) | A JSDoc cast on the result: `/** @type {Promise<typeof import('tone')>} */` | `tsc` cannot follow a variable URL |

The dev dependencies hold the same versions as the importmap. A test can read both and fail on a mismatch.
The browser never loads anything from `node_modules`.

## GLSL in strings

No TypeScript path checks GLSL. The shaders stay `/* glsl */` template strings.
The checks that exist stay the GLSL checks: `fxlab/` ("Check a copy" compiles every module in raw WebGL2 and in three.js) and the headless Playwright pass in each toy's QA.
A later option, not part of this plan: a small Node test that compiles each exported GLSL string with the browser in headless mode.

## Proposed files

```text
package.json          dev dependencies only: typescript, @types/three@0.170, @types/culori, tone, gsap, simplex-noise
tsconfig.json         checkJs, noEmit, strict off at first, include: shared/**/*.js only
shared/types/cdn.d.ts the URL shims
.gitignore            + node_modules/
.github/workflows/check.yml   npm ci, then npx tsc; report only at first, not a gate on Pages
```

`tsconfig.json`, first cut:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2023", "dom", "dom.iterable"],
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": false,
    "skipLibCheck": true
  },
  "include": ["shared/**/*.js", "shared/types/*.d.ts"]
}
```

A toy joins the check when its own chat adds its folder to `include`. A file can also opt in alone with `// @ts-check` on its first line.

## Migration order

1. **Tooling, no source change.** Add the files above. `tsc` runs over `shared/` with `strict` off. Fix nothing yet; record the error count in the bean.
2. **`shared/stim.js`.** Write `@typedef` for the bar spec (slots, choice group kinds, actions, slider, key strip, settings rows, dev rows) and type `initPage`, `audioKit`, `pixelRatio`, `fitCanvas`, `quality`. The bar spec is the largest contract every toy writes by hand.
3. **The shader library helpers.** `detail.js`, `weather.js`, `sky.js` (`skyAt`), `flare.js` (`flareAt`, `flareSlots`), `glow.js` (`bloomChain`), `grade.js` (`gradePass`), `environment.js` (`ENV_DEFAULTS` and the `environment()` options). The GLSL strings stay plain.
4. **`shared/intro.js`.** `VARIETIES` and `TIMING` as typedefs, so `introlab/` gets checked keys.
5. **Turn on `strict`** for `shared/` once steps 2 to 4 are clean.
6. **The pilot toy** (below).
7. **The ten toys that already have modules**, one per chat, when Tom picks them: `washline` first (`washline-core` has Node tests), then `railgun`, `viaduct`, `window`, `tvtree`.
8. **Inline toys**: only when a toy's own chat moves its script to `<id>/main.js` for another reason. Never as a sweep.

## Pilot: Fog horn (`foghorn/`)

| Why Fog horn | |
|---|---|
| Size | 620 lines, the smallest environment toy |
| Shared surface | It is the first toy on `shared/environment.js`, and it uses `sky.js`, `water.js` and `weather.js`. Typing it tests the runner's contract end to end |
| Risk | A Lab toy, not on the main shelf |
| Template value | New environment toys start from it, so a typed Fog horn gives every new one typed calls |

Steps, in Fog horn's own chat, after Tom says yes to steps 1 to 3:

1. Move the inline module script to `foghorn/main.js`. The page keeps one `<script type="module" src="main.js">`. The page must draw the same frame; check with the headless Playwright pass.
2. Add `foghorn/` to `include`. Fix what `tsc` reports.
3. Record the error count before and after, and any real bug it found, in the bean.

Pass mark: the page draws the same, the console stays clean, `tsc` reports zero errors for `shared/` and `foghorn/`, and no other chat had to change how it works.

## Effect on toy chats that share one checkout

- Steps 1 to 5 touch only `shared/` and new root files. A toy chat sees new JSDoc comments, nothing else.
- `node_modules/` is git-ignored. A chat that never runs `npm ci` sees no change.
- The check workflow reports only. It never blocks a Pages deploy until Tom makes it a gate.
- `tools/commit.sh` stays the only way to commit. `package.json` and `tsconfig.json` are shared files: commit hunks, never whole files.

## Open questions for Tom

1. Path (a) as the direction: yes or no.
2. Dev dependencies in the repo (`package.json`, `node_modules/` ignored): yes or no. This is the "new tool" decision.
3. The check in CI: report only, or a gate on Pages later.
4. Fog horn as the pilot, or another toy.
