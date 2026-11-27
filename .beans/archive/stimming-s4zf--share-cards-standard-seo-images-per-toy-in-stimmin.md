---
# stimming-s4zf
title: 'Share cards: standard SEO images per toy in Stimming''s style'
status: completed
type: feature
priority: normal
created_at: 2026-11-25T08:58:17Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-0cau
---

Tom, 2026-11-25: standard generation of SEO images in our style, with the toy's full-colour icon.
First note: session 'Stimming latest pull', 2026-11-09: "standard og/SEO images with a bold brut title and the toy's emblem. Comes later."

Each toy gets one og:image (1200 x 630) made from its data: name, full-colour menu icon or emblem, accent, series. A script makes them; no hand work per toy.

- [x] Ask Tom: the look (title type, icon, still or flat ground, accent)
- [ ] Ask Tom: which pages get one (toys, menu, labs); main-shelf toys have cards now
- [x] Ask Tom: the source of the icon: the live menu tile, the emblem, or both
- [x] Spike: a generator script in tools/ and three sample cards for Tom
- [x] Meta tags: og:image, twitter:card per toy page (touches every toy page: Tom's yes, own worktree and PR)
- [ ] Pages: the cards publish with the site
- [x] Bench: a share-card view that renders a toy's 1200 x 630 card from the chosen icon

## Notes

- Tom, 2026-11-25: part of the new toy bench. The cards come from the icon the bench picks. The bench session has the handoff.

- Tom, 2026-11-25: the look is set from a sample (docs/qa/share-cards/preview.html): the live full-colour menu tile, the askew menu wordmark, Iosevka name and motto, a faint still under an arced mask, the subtitle only when the toy has one. Cut: Dutch name, number, accent bars, heavy gradients. Next, in the bench: random lit letters, icon and image that do not compete, subtitle in B612, better title blending, and whether the card takes the intro or Signal style.

- Tom, 2026-11-25, round 2 (bench session): the whole wordmark in its rainbow colours; one-line titles; the subtext (motto) in B612; the tech badges on the card. The sample now has a 72 px grid: wordmark and badges in the head row, icon, label, title and subtext in the foot block, the art lined up on its own edge. accesslab/access-data.js exports TAG and TAG_NAME for the badges.

- Tom, 2026-11-25: the icon is the emblem as a luminance mask in white ("the luminosity mask ones, not the gradient ones"); the tech tags minimal, small at the title's cap line. tools/sharecards.mjs writes all 73 main-shelf cards to shared/cards/<id>.jpg (4.9 MB, 121 KB at most). The Share tab is stimming-a8j0. Open: the meta tags (Tom's yes, own worktree and PR), and the cards publish once pushed.

- Tom, 2026-11-25: "Yes, add the tags". tools/ogtags.mjs writes one marked block after <title> on all 73 main-shelf pages: og:type, site_name, title, description (the motto, or a plain line), url, image with its size and alt, twitter:card summary_large_image. A rerun replaces the block. Branch feature/stimming-s4zf, merge by PR.
