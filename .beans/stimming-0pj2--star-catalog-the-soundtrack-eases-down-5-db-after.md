---
# stimming-0pj2
title: 'Star Chart: the sound rests at 28 s idle and cuts at 90 s'
status: in-progress
type: task
priority: normal
created_at: 2026-11-25T02:54:02Z
updated_at: 2026-11-25T18:17:35Z
parent: stimming-e35i
---

Tom, 2026-11-24: "after about 15s the soundtrack reduces volume by 5 db -- upon click or activation it will slowly come to its reg volume as well".

Tom, 2026-11-25 (replaces the 15 s, 5 dB ask): "if the toy is left unattended -- sound will auto cut out -- leave the cut out for 1:30m - also the choir -- after about 25-30s of undisturbed activity -- it will layer down and reduce volume -- leaving bass moreso exposed -- upon activation or mouse activity -- it will slowly bleed into reg volume and layering again".

- [x] choir.js: rest gains per octave layer and the melody, v.rest()
- [x] sound.js: restC, a closing low pass, settle(), stir(), fade(), unfade()
- [x] main.js: one idle timer; mouse moves count for the sound; the loop sleep no longer stops the sound
- [x] 28 s idle: the choir rests (-6 dB, mid 0.45, high 0.12, melody 0.1, low pass to 1.4 kHz); low singers and rumble hold
- [x] 90 s idle: a 4 s fade, then the sound stops and the context suspends
- [x] Input or a mouse move: back over 8 s, from the bass up after a cut
- [x] Choir base level 0.85 (Tom, 2026-11-25: down 15 percent, rumble as is)
- [x] Doc lines
- [ ] Tom listens

Tom, 2026-11-25, added: "it may dull the audio a little too when it fades out -- it will come full in undull as it scales up again"; "the choir reduces by 15% volume by default now as well".

QA (in-app pane, hidden): ?idle=0.1 runs rest, fade, cut and return; ?idle=0.75 cuts after the loop sleep: context suspended, 0 rAF in 2 s; mute stops at once; clean console. A hidden tab is not checked live.
