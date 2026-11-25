---
# stimming-s4zf
title: 'Share cards: standard SEO images per toy in Stimming''s style'
status: draft
type: feature
priority: normal
created_at: 2026-11-25T08:58:17Z
updated_at: 2026-11-25T18:32:58Z
parent: stimming-0cau
---

Tom, 2026-11-25: standard generation of SEO images in our style, with the toy's full-colour icon.
First note: session 'Stimming latest pull', 2026-11-09: "standard og/SEO images with a bold brut title and the toy's emblem. Comes later."

Each toy gets one og:image (1200 x 630) made from its data: name, full-colour menu icon or emblem, accent, series. A script makes them; no hand work per toy.

- [ ] Ask Tom: the look (title type, icon, still or flat ground, accent), and which pages get one (toys, menu, labs)
- [ ] Ask Tom: the source of the icon: the live menu tile, the emblem, or both
- [ ] Spike: a generator script in tools/ and three sample cards for Tom
- [ ] Meta tags: og:image, twitter:card per toy page (touches every toy page: Tom's yes, own worktree and PR)
- [ ] Pages: the cards publish with the site
- [ ] Bench: a share-card view that renders a toy's 1200 x 630 card from the chosen icon

## Notes

- Tom, 2026-11-25: part of the new toy bench. The cards come from the icon the bench picks. The bench session has the handoff.

- Tom, 2026-11-25: the look is set from a sample (docs/qa/share-cards/preview.html): the live full-colour menu tile, the askew menu wordmark, Iosevka name and motto, a faint still under an arced mask, the subtitle only when the toy has one. Cut: Dutch name, number, accent bars, heavy gradients. Next, in the bench: random lit letters, icon and image that do not compete, subtitle in B612, better title blending, and whether the card takes the intro or Signal style.

- Tom, 2026-11-25, round 2 (bench session): the whole wordmark in its rainbow colours; one-line titles; the subtext (motto) in B612; the tech badges on the card. The sample now has a 72 px grid: wordmark and badges in the head row, icon, label, title and subtext in the foot block, the art lined up on its own edge. accesslab/access-data.js exports TAG and TAG_NAME for the badges.
