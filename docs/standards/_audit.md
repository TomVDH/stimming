# Standards audit (2026-11-16)

Read-only audit for epic `stimming-51dy`. Every rule in force, with its source and status.
Status: `current`, `stale` (files no longer match), `contradicts` (names the other source), `history` (a dated story, not a rule), `dup` (same rule in two places).
`mem/` is Claude's memory folder for this project. The rebuild maps every `current` and `dup` row to one home.

Verified counts: `toys.json` 112 entries, 52 main shelf (numbers 1 to 53, 14 unused), 60 Lab. Menu: 52 main `li`, 59 Lab `li` (`bench` off the menu; `postcard` has no folder). 52 stills; 43 loop ids, 44 mp4 files. 78 pages on Bar v2, 26 on v1. 94 importmaps, all match. Site version 0.11 "Hemelvaart".

Missing paths: `docs/qa/clock/footer-looks.jpg`, `shared/noise.js`, `postcard/`, `window/spike-three.html`, `windowseat/`, `washline/diorama.html`, `lab/ocean/assets/bulker.glb`.

## A. Rules

### Agents, voice, hooks
| area | rule | source | status | note |
|---|---|---|---|---|
| agents | Read ADJUDANT.md first; generated, do not edit | AGENTS.md:3 | dup | GEMINI.md:3; CLAUDE.md:1; ADJUDANT.md:2-3 |
| agents | AGENTS.md is canonical context for every agent | CLAUDE.md:6 | dup | GEMINI.md:5 |
| agents | CLAUDE.md / GEMINI.md hold tool-only overrides | CLAUDE.md:8-13; GEMINI.md:7-11 | current | Both hold no overrides |
| agents | Regenerate ADJUDANT via `/adjudant connect` | ADJUDANT.md:2 | current | Verb list lacks `release` |
| agents | Lead with the action; no stock pleasantries | ADJUDANT.md:8 | current | |
| agents | Number multi-step work; lists cap 5; restate state; no em dashes | ADJUDANT.md:9 | current | mem/MEMORY.md uses em dashes |
| code | Comments: ASD-STE100, one fact, 12 words or fewer, active, present | AGENTS.md:224 | dup | ADJUDANT.md:11-12; .claude/rules/adjudant-code.md:7-8 |
| code | A why-comment stays; a restating comment goes; double density | .claude/rules/adjudant-code.md:8 | current | |
| content | Vault writes only through adjudant; STE density by kind | ADJUDANT.md:15-16 | current | |
| agents | Hooks: destructive bash, git safety, house voice, iCloud paths, path quoting, secret scan | .claude/hookify.*.local.md | current | Path-quote hook misses the repo's own space |

### Process and git
| area | rule | source | status | note |
|---|---|---|---|---|
| process | Beans: `beans prime`; bean first; checklist current; commit bean with code | ADJUDANT.md:19-20 | current | |
| process | Extra bean types: spike, chore, decision | ADJUDANT.md:21 | current | |
| process | `git pull --ff-only` first | ADJUDANT.md:24 | current | |
| process | Feature bean: worktree, `feature/<id>`, merge by PR | ADJUDANT.md:25 | contradicts | AGENTS.md:238-240 (push each change to main) |
| process | Task/bug on main or parent branch; epic no branch; main checkout stays on main | ADJUDANT.md:26-27 | current | |
| process | Perfect one thing first; never roll across all toys; Tom picks | AGENTS.md:236 | dup | PRODUCT.md:41,93; mem/stimming-taste-and-process.md |
| process | One visual change at a time; removals first; roll back at once | AGENTS.md:50; mem/one-visual-change-at-a-time.md | dup | Detail in memory only |
| process | New toys start in the Lab; main shelf only after Tom vets | AGENTS.md:237 | dup | PRODUCT.md:40 |
| process | Commit and push after every change, one logical commit | AGENTS.md:238 | dup | contradicts ADJUDANT.md:25 |
| process | Never `git add -A`, `git commit -a`, whole-file `git add index.html` | AGENTS.md:239 | dup | mem/shared-checkout-commits.md |
| process | Commit only via `tools/commit.sh`; hunks for shared files | AGENTS.md:240 | dup | mem/shared-checkout-commits.md; tools/commit.sh:2-3 |
| process | commit.sh refuses stale drops (`--drop-ok` with reason) | AGENTS.md:241 | dup | tools/commit.sh:16,22 |
| process | Railgun cloud change needs `clouds-check: PASS` or `look-approved:` | AGENTS.md:241 | dup | tools/commit.sh:23 |
| process | commit.sh lock, CAS, `--no-push`, `-F`, env vars | tools/commit.sh:11-25 | current | Undocumented elsewhere |
| process | Never the same file in `--hunks` and `--`; exact hunks from `git show HEAD:file`; exit 3 = not pushed | mem/shared-checkout-commits.md | current | Memory only |
| process | Edit scripts: read fully, build in scratchpad, check, copy | mem/edit-scripts-read-before-write.md | current | Memory only |
| process | Check the menu script parses before push | AGENTS.md:242 | dup | docs/plans/README.md:156 |
| process | Never revert another toy's changes | AGENTS.md:242 | current | |
| process | Show Tom screenshots early; short status lines | AGENTS.md:245 | dup | mem/keep-it-to-the-essence.md |
| process | No design-explanation copy in replies or lab pages | mem/keep-it-to-the-essence.md | current | Memory only |
| process | Guard approved looks; peek before commit | mem/guard-approved-looks.md | current | Memory only |
| process | Build only what Tom asked; show a clip before a verdict | mem/intro-no-soft-pulse.md | current | Memory only |
| process | Re-read toy-ideas Tool-approved/Cut before proposing | mem/idea-pool-swipe-lists.md | current | Memory only |
| process | Open items only when Tom asks | AGENTS.md:247-252 | dup | memory adds "Kaleidoscope zooms too far" |
| process | Audit bugs: one bean per toy, fix in that toy's chat | docs/code-health.md:43 | current | |
| process | Toy build stock prompt; read three files | docs/plans/README.md:12-17 | current | |
| process | Asset downloads need Tom's yes plus CREDITS.md row | mem/east-van-direction.md | current | East Van only |

### QA
| area | rule | source | status | note |
|---|---|---|---|---|
| qa | Headless Playwright with GPU flags; 1280/375 shots | AGENTS.md:243-244 | contradicts | mem/no-playwright-qa.md |
| qa | Browser pane, one screenshot per change | mem/no-playwright-qa.md | contradicts | AGENTS.md:243; plans/README:151-165 |
| qa | Check 1280, 375 x 812, 812 x 375; shell measures collisions | AGENTS.md:219 | dup | PRODUCT, DESIGN; contradicts two-size rules |
| qa | `tests/bar-v2.html` must pass | AGENTS.md:219 | current | tests/run.sh |
| qa | tests/run.sh needs port 8001 | tests/run.sh:3,5 | contradicts | AGENTS, README, launch.json use 8000 |
| qa | "Repo has no test tooling" | docs/plans/README.md:151 | stale | |
| qa | Q1-Q10 checks | docs/plans/README.md:154-165 | current | Partly v1-era |
| qa | Never leave timing holds or debug builds | mem/shared-browser-tab-no-test-builds.md | current | Memory only |
| qa | Restore only own localStorage keys | mem/restore-only-own-keys.md | current | Memory only |
| qa | Hidden-pane captures method | mem/hidden-pane-captures.md | current | Reference |
| qa | Show pages over localhost, not file links | mem/file-links-open-as-data-url.md | dup | AGENTS.md:95 |
| qa | ShadyOS `?qa` pump | AGENTS.md:122 | current | |
| qa | `tools/loadtime.mjs` cold/warm | AGENTS.md:144 | current | |
| qa | Same frame = 1/255 on a few pixels | docs/code-health.md:44 | current | |
| qa | Port: before/after first frame and fps | docs/stack.md:92 | current | |
| qa | Type check local only | docs/code-health.md:42 | current | |

### Code and stack
| area | rule | source | status | note |
|---|---|---|---|---|
| code | Plain HTML/JS, no build, one folder per toy | AGENTS.md:11 | dup | README, PRODUCT |
| code | Shell exports list | AGENTS.md:100-101 | stale | Missing stage, buildSteps, onTouch, buildBar, firstFrame, idle, pageReady, later, keyWord, onReducedChange |
| code | `initPage({ id })` | README.md:84 | stale | |
| code | Site quality High/Standard rules | AGENTS.md:102 | current | |
| code | Skeleton v1 on main shelf except Galaxy | AGENTS.md:103-106 | stale | 78 on Bar v2 |
| code | v1 pages stay until Tom moves them; Galaxy reference | AGENTS.md:220 | current | |
| code | No new page on v1; no restyle of shared bar from a toy | DESIGN.md:466 | current | |
| code | tvtree "155 in seven groups of 25" | AGENTS.md:109 | stale | Arithmetic wrong |
| code | Window seat Vancouver default and flags | AGENTS.md:112-114 | current | |
| code | environment.js, gl.js, fire.js, fxlab bundles | AGENTS.md:115-119 | current/dup | code-health; mem/shared-shader-bundles.md |
| code | One module at a time; reference toy proves it | docs/code-health.md:37,63 | current | |
| code | ShadyOS modules; content.yaml; defaults script | AGENTS.md:120-121 | current | |
| code | legacy.html list of 8 | AGENTS.md:123 | stale | `window` also legacy |
| code | WebGPU Fresh redirects to legacy | AGENTS.md:124 | contradicts | code-health #4 (still frame and one line) |
| code | Fresh is the standard; legacy link | AGENTS.md:200-201 | current | |
| code | toys.json single source, field order, null not missing, version | AGENTS.md:125-126 | current | |
| code | One library set; add none without Tom | AGENTS.md:165 | dup | stack, PRODUCT, DESIGN |
| code | Library table; pinned versions; importmap word for word | AGENTS.md:169-194 | current | PRODUCT lists five (stale) |
| code | Lightest renderer tier; WebGPU where it helps | AGENTS.md:166 | dup | stack.md |
| code | WebGPU toys = 3 | stack.md:39; code-health.md:24 | stale | Five |
| code | Five stack types with reference toys | docs/code-health.md:33,51-57 | current | stack.md says four tiers |
| code | Reference toys are starters; no starter pages | docs/code-health.md:34 | contradicts | stack.md:88 |
| code | Flat three.js toys move to WebGL2; Pop last | docs/code-health.md:35 | current | |
| code | three.js named imports; dispose; one context per toy | stack.md:45,90 | current | |
| code | JSDoc + tsc in shared/; Fog horn pilot | docs/code-health.md:40 | current | tsconfig also has eyes, rain, dijkstra |
| code | package.json dev tools only | package.json:4 | current | |
| code | Kits: copy with K markers | docs/plans/README.md:72-77 | current | Partly superseded |
| code | Frame loop lively/drift/asleep; hidden stops clock | docs/plans/README.md:97-103 | current | Plans only |
| code | try/finally around step/render | docs/plans/README.md:105 | current | Only error rule |
| code | Perf ladder rules | docs/plans/README.md:107-114 | current | Plans only |
| code | No own Quality chips | docs/plans/README.md:118 | current | |
| code | `qualitySetting(sets)`; `#setBtn` popover | docs/plans/README.md:120,147 | stale | Bar v2 |
| code | fitCanvas/pixelRatio; onQuality | docs/plans/README.md:121-123 | current | |
| code | Pointer state machine | docs/plans/README.md:138-142 | current | Plans only |
| code | Settings keys `stimming.<id>.<key>` | docs/plans/README.md:146 | current | |
| code | Never clip on root | AGENTS.md:46 | current | |
| code | TSL select pitfall | mem/tsl-select-branch-pitfall.md | current | Reference |
| code | Scene toys expose camera in Dev | mem/scene-camera-in-dev.md | current | |

### Design
| area | rule | source | status | note |
|---|---|---|---|---|
| design | Dark only; OKLCH tokens | AGENTS.md:164 | dup | README, PRODUCT, DESIGN |
| design | Gabarito; menu labels Iosevka caps | AGENTS.md:164 | contradicts | README.md:100 |
| design | Two voices: Gabarito names, slab caps controls | DESIGN.md:283 | current | |
| design | B612 wordmark only | DESIGN.md:169 | contradicts | AGENTS.md:49 heading trial |
| design | Font trial: headings B612 until PR decides | AGENTS.md:49 | current (temp) | |
| design | Gabarito/B612 from Google | DESIGN.md:257,260 | stale | Self-hosted |
| design | Borrowed colour; shell owns no accent | DESIGN.md:176,251 | current | |
| design | accent OKLCH or gradient | AGENTS.md:126 | dup | DESIGN |
| design | White title; only intro logo takes ink | DESIGN.md:253,461 | current | |
| design | Askew mark | DESIGN.md:285 | current | |
| design | Wordmark eight hues, mark-1..8 | AGENTS.md:47 | dup | DESIGN.md:194-207 |
| design | Neutrals hue 275 | DESIGN.md:184 | current | --stage at 270 |
| design | Bar v2: square slab, hard offset shadow as state | DESIGN.md:177,326,341 | contradicts | README.md:101 |
| design | No glows or shadows | README.md:101 | contradicts | DESIGN, AGENTS footer glow, halo ok |
| design | Shell motion in 30 fps steps | DESIGN.md:179 | current | |
| design | Intro: no breathing or pulse | mem/intro-no-soft-pulse.md | dup | AGENTS.md:141 |
| design | Bare text halo; logo and name none | DESIGN.md:327 | contradicts | bar-v2.md:120 rule 8 |
| design | Two shape families; hexagon and wave specs | DESIGN.md:347-353 | current | |
| design | No square shapes in the tube | AGENTS.md:56 | current | |
| design | Taste: daring, zany, original; not fussy, not bare | AGENTS.md:229-230 | dup | PRODUCT, DESIGN, memory |
| design | Shader-rich toys; S tier | AGENTS.md:231-232 | dup | PRODUCT, memory |
| design | Usable first | AGENTS.md:135 | dup | PRODUCT |
| design | Less neon; practical lamps | mem/less-neon-better-graphics.md | current | Memory only |
| design | Big things move slow | mem/slow-heavy-motion.md | current | |
| design | Per-toy directions (Washing line, East Van, Car wash) | mem/*.md | current | Toy docs |
| design | Creative North Star unnamed | DESIGN.md:164 | open | |
| design | Stage fills first screen; 18 px radius; `.fail` line | DESIGN.md:308,400 | current | |
| design | Main shelf 6 per row, Lab 5 | DESIGN.md:301 | current | |

### Menu
| area | rule | source | status | note |
|---|---|---|---|---|
| menu | index.html is a body fragment | AGENTS.md:28 | dup | pages.yml, README |
| menu | Views `./`, `?all`, `?lab` | AGENTS.md:29-35 | dup | README |
| menu | Series switch, Lab and Clock links in `?all` only | AGENTS.md:34 | dup | DESIGN |
| menu | Clock deals 12 from a shuffled line | AGENTS.md:37 | current | |
| menu | Middle: name and motto; empty with none; no counter | AGENTS.md:38 | dup | DESIGN |
| menu | Tube parts, look, grain, warble | AGENTS.md:39-42 | current | |
| menu | Tube name in B612 | AGENTS.md:43 | contradicts | DESIGN.md:292 (Gabarito 800) |
| menu | Tube dark, behind the clock, plate 124% | AGENTS.md:44-45 | dup | DESIGN |
| menu | Footer glow: six hues in OKLab | AGENTS.md:46 | contradicts | DESIGN.md:226 (five, oklch) |
| menu | Credit chip; Made with AI. | AGENTS.md:46 | current | |
| menu | Clock shows no version | AGENTS.md:46 | contradicts | README.md:67 |
| menu | Site version steps per signed-off toy | AGENTS.md:136 | current | |
| menu | Unattended show | AGENTS.md:48 | dup | DESIGN |
| menu | Loops spec | AGENTS.md:51 | current | 43 ids vs 44 files |
| menu | Selection wedge | AGENTS.md:55 | dup | DESIGN |
| menu | Clock fits the viewport | AGENTS.md:57 | dup | DESIGN |
| menu | Phones: tap to show, second tap opens | AGENTS.md:58 | current | |
| menu | Re-roll after 5 s | AGENTS.md:59 | dup | DESIGN |
| menu | Failure leaves the whole shelf | AGENTS.md:60,67 | current | |
| menu | Loading stages, fonts wait, click hairline, wait dot | AGENTS.md:61-65 | current | |
| menu | Clock waits for the whole page | AGENTS.md:68 | current | |
| menu | Stills per main toy | AGENTS.md:69 | current | |
| menu | Main shelf list | AGENTS.md:70 | current | Order differs from toys.json |
| menu | Lab (58) | AGENTS.md:71 | stale | 60 |
| menu | menulab probe | AGENTS.md:135 | current | |
| menu | `data-done` internal, Tom only | AGENTS.md:147 | current | |

### Intro
| area | rule | source | status | note |
|---|---|---|---|---|
| intro | Clock comet, TV warm-up, no hover during intro | AGENTS.md:53-54 | current | DESIGN dup |
| intro | Intro is the preloader; `progress`, `stage`, `buildSteps` | AGENTS.md:137-143 | current | |
| intro | Failsafe 10 s | AGENTS.md:144 | contradicts | DESIGN.md:414 (5 s) |
| intro | Signal ships; lab; logo never moves | AGENTS.md:145-146 | current | |
| intro | Subtitles lifted -14 | AGENTS.md:199 | contradicts | intro.js:185 (0) |
| intro | Lab tag `sub` | AGENTS.md:199 | current | |

### Bar v2, a11y, content, sound
| area | rule | source | status | note |
|---|---|---|---|---|
| menu | Bar v2 Corners standard; slot table; limits | AGENTS.md:202-213 | current | |
| menu | One bar under the stage | README.md:99 | stale | |
| menu | Shared verbs; Settings vs Dev; key strip | AGENTS.md:214-217 | current | |
| menu | Sheet opens on click | DESIGN.md:385 | current | |
| a11y | Phones under 640: layout move; 34 px targets | AGENTS.md:218 | dup | PRODUCT, DESIGN |
| a11y | Reduced motion respected | AGENTS.md:223 | dup | |
| a11y | No focus ring; keyboard path for every control | bar-v2.md:117; DESIGN.md:180 | current | Conflicts with WCAG 2.4.7 |
| a11y | Text contrast 4.5:1 via halo | bar-v2.md:120 | current | Unmeasured |
| a11y | Never scroll sideways | PRODUCT.md:51 | dup | |
| content | No blurbs on the toy; vignette only | AGENTS.md:221 | contradicts | PRODUCT.md:27,58 content zone |
| content | Morpher has the first vignette | README.md:98 | stale | |
| content | Claude drafts content; Tom edits | PRODUCT.md:42 | current | |
| content | No fabricated photos, quotes or numbers | PRODUCT.md:85 | current | |
| content | No brand names | AGENTS.md:225 | dup | |
| content | Flemish name + IPA; Tom sets | AGENTS.md:125 | dup | |
| content | ShadyOS parodies, no real names | AGENTS.md:122 | current | |
| sound | Synth, muted by default, gesture start, per-toy key | AGENTS.md:222 | dup | |
| sound | Tone via audioKit, connect to kit.out | AGENTS.md:197 | dup | |
| sound | Audio clock scheduling; visible cause; pan; jitter | docs/plans/README.md:91,129-134 | current | Plans only |
| qa | 30 fps floor; idle does no work | AGENTS.md:223 | dup | |
| qa | Finesse bar | docs/plans/README.md:88-95 | current | Plans only |

### Icons and series
| area | rule | source | status | note |
|---|---|---|---|---|
| icons | Inline SVG of the toy's object, live | AGENTS.md:72 | dup | DESIGN |
| icons | No two-tone hard offset shadow | AGENTS.md:73 | dup | |
| icons | GSAP `play/rest` | AGENTS.md:74 | contradicts | mem/icons-interactive.md (enter/move/leave) |
| icons | Per-toy chats; picks.json; three icon styles; menu language | AGENTS.md:76-99 | current/dup | DESIGN, memory |
| icons | No frame by default | mem/icons-menu-language.md | current | Memory only |
| series | Every toy has a series | AGENTS.md:127 | stale | bench, calaeno null |
| series | series.json; one per toy; switch; Wave + Hex ring | AGENTS.md:127-133 | current | |
| series | Series icons as iso blocks | mem/series-icon-taste.md:27 | contradicts | AGENTS.md:131-132 |

### Publishing
| area | rule | source | status | note |
|---|---|---|---|---|
| publishing | Public repo, main | AGENTS.md:19 | dup | |
| publishing | Pages deploys every push; Artifact retired | AGENTS.md:20,159 | dup | memory still has Artifact steps (stale) |
| publishing | pages.yml behaviour | .github/workflows/pages.yml:22-41 | current | Undocumented |
| publishing | Publish three TV tree files | AGENTS.md:111 | stale | Artifact era |
| publishing | No Google links for Gabarito/B612 | AGENTS.md:63 | stale | Six lab/spike pages still link |
| publishing | Run `python3 -m http.server 8000` | AGENTS.md:152 | dup | |
| publishing | README toy table | README.md:9-53 | stale | |

### Counts and history
| area | rule | source | status |
|---|---|---|---|
| history | 42/61; 88 toys 41/47; 20 toy docs | PRODUCT.md:46,80; code-health.md:17 | stale |
| history | plans/README "next twelve", `windowseat` | docs/plans/README.md | stale |
| history | DESIGN drift table; dated ruling stories in AGENTS | DESIGN.md:474-496; AGENTS.md | history |

## B. Gaps

1. JS module style. 2. Naming (ids, files, classes, keys). 3. Error handling (context loss, CDN failure). 4. Perf budget numbers. 5. Accessibility specifics. 6. New-toy checklist. 7. Review process. 8. Dependency updates. 9. Browser support. 10. Test runner docs. 11. Asset licensing and credits. 12. Docs ownership. 13. Commit message format. 14. When a toy doc is required. 15. Lab and probe hygiene (noindex, removal). 16. Security and privacy (CSP, analytics, SRI).

## C. Glossary candidates

toy, main shelf, Lab, Clock, tube, still, loop, Re-roll, series, shot, intro, Signal, variety/look, flash box, Classic, Fresh, legacy, Bar v2, Settings/Dev, sheet, stage, version, signed off, accent/ink, motto/tag, vignette/content zone/annex, port, kit/module/bundle, stack type, reference toy, quality/detail, bean, onnozelaer.
Overloaded: Lab, Clock, tube, still, loop, intro, Classic, sheet, stage, version, port, tag.

## D. Top contradictions

1. How to QA (Playwright vs browser pane; sizes; port 8000 vs 8001).
2. Git workflow (worktree and PR vs push to main).
3. Shelf counts wrong in three files.
4. README is v1-era throughout.
5. Skeleton v1 vs Bar v2.
6. Fonts (Google links remain; B612 trial vs DESIGN).
7. Intro facts (subtitle lift, failsafe).
8. Icon interaction model; series icon style.
9. WebGPU set and fallback.
10. Shadows, halo and copy limits.
