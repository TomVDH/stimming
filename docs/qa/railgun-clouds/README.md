# Railgun clouds: the still rig

Step 1 of the cloud plan (`docs/plans/railgun-clouds-review.md`, section 8). Tom approved the plan on 2026-11-16 at 15:58. Bean `stimming-1jza`.

## Run it

```bash
npx -y -p playwright@1.63.0 node tools/clouds-check.mjs
```

- It serves the checkout itself on a free port. It takes about one minute.
- Its last line is `clouds-check: PASS storms.js@<sha> index.html@<sha>` or `clouds-check: FAIL (<checks>)`.
- `--out <dir>` keeps the stills and `report.md`. `--try lobe` runs a test change that must fail the bounds check.
- Exit code: 0 pass, 1 a check fails, 2 the harness fails (for example a patch anchor moved).

## What it renders

`__qa.still()` in the toy makes each still repeatable: it freezes the clocks, fixes the cirrus offset, stops lightning and ambient events, pins the quality rung and puts the rock at fall 0.45.

| Frame | Suns (Time slider) |
|---|---|
| Wide, 1280 × 800 | 0.05 night, 0.2 blue hour, 0.36 sunset, 0.5 first look, 0.72, 1.0 noon |
| Phone, 375 × 812 | 0.36, 0.5 |

## The checks

| Check | How | Fails when |
|---|---|---|
| Bounds | The served shader marks a ray whose cloud touches the card edge (green), the cylinder wall (magenta) or the top cut (blue). | More than 20 marked pixels. |
| Steps | Four times the march steps; both stills blurred 3 × 3; storm pixels only. | More than 3% of storm pixels change. |
| Visible | Each storm alone (`__qa.stormSolo(k)`) against no storms, wide frame, first look. | A storm shows on fewer than 2500 pixels. |
| Colour | OKLCH of each storm's lit third and its lightness spread, first look and noon. | The lit side reads blue, the spread is under 0.08, or it drifts from `golden/stats.json`. |
| Golden | Each still against `golden/`, storm pixels only (whole frame on the phone). | More than 2% of pixels differ. |
| Frame time | Headless GPU time. | Never: a note only. Headless timing on a busy machine is noise. |

## The golden set

- `golden/` holds the look on main at 649313f3 with the rig's QA hook: a "before", not a target.
- Known failure on that look: storm 0, the towering cumulus at 135 km, shows on about 670 pixels. The high range hides it. Plan step 2 places the storms again.
- Write a new golden set only after Tom approves the look: `--update-golden`. Put his words in the commit.

## References

`ref/` waits for Tom's pick (decision 3 of the plan): one photo per row of the review's section 6, with its source and licence.

## The commit guards

`tools/commit.sh` sources `tools/commit-guard.sh`:

- **Drops.** It refuses a commit that drops 3 or more, and a quarter or more, of the lines that another bean added in the last 12 commits to a file. That is a stale copy, as a whole file or as hunks diffed against the wrong base: e9fc9c83 and bb4e4154 did it on 2026-11-16. The guard reads the commit's result, so it catches both. Pull `--ff-only` or commit `--hunks`. To drop them on purpose, pass `--drop-ok` and say why.
- **Clouds.** It refuses a change to `railgun/storms.js`, `railgun/stormlab.html` or the cloud, air, sky, storm and band sections of `railgun/index.html`, unless the message holds `clouds-check: PASS` or `look-approved:` with Tom's words.
- Test the guards on history: `tools/commit-guard.sh <commit>...`.
