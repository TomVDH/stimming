---
# stimming-cacs
title: 'Glass: muzzle flash back in the FPS corner, blurrier, hazier, more shaded'
status: scrapped
type: task
priority: normal
created_at: 2026-11-03T21:05:01Z
updated_at: 2026-11-03T21:10:34Z
parent: stimming-x6ef
---

Front camera POV means FPS view. edf9e3a moved the flash to the aim point, which was wrong.

- [ ] The flash sits in the lower right corner of the view again
- [ ] Six points stay, with blurred edges
- [ ] Noise-driven flame and a warm haze give it a shaded look
- [ ] The scene stays coloured, not white
- [ ] QA at 1280 and 375 px, clean console
- [ ] Commit through a private index and push

## Reasons for Scrapping

Tom rejected the noise-driven star: the earlier blown-up globular flash is more convincing. edf9e3a also removed the muzzle reflection on the glass. The flash and the reflection are restored exactly from 1754de1.
