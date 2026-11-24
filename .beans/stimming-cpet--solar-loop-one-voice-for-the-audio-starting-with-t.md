---
# stimming-cpet
title: 'Solar loop: one voice for the audio, starting with the Sun'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T05:58:16Z
updated_at: 2026-11-24T07:45:56Z
parent: stimming-oh7b
---

Own Solar loop's audio (solarloop/sound.js). Tom's asks: crisp angelic organ-choir hum on the Sun, a deep subtle surround rumble, an airy choir swell on a tap, no grit, no TSHSHSH, no echoing chimes. One change at a time, Tom listens live to each.

- [x] Find the cause of the grit (12-bit crusher sound) by measurement: the hum wave stopped at 4 kHz
- [x] Tom hears the hum with its top opened to 11 kHz: "much cleaner"
- [ ] Hum wobble off (pitch drift, shimmer, loudness swell): Tom listens
- [ ] Organs richer and more organic
- [ ] Space rumble louder as the view closes in: Tom listens
- [x] Ask Tom which tap layers stay; cut the rest (Tom kept the brass blast and the glow chord) (chimes cut 2026-11-23: no visible cause; rain drips cut, Tom)
- [x] Tom hears the choir swell on the Sun: rejected; the original brass blast is back, exact (Tom: "the best")
- [x] Pulsar tick removed: sound, Dev row, the beam and egg triggers, the lab button (Tom, 2026-11-24)
- [ ] Pulsar: a new sound for the beam sweep and the Vela voice egg; Tom picks it
- [x] Wooshes: all cut (ede9215e). Rule: add no sound layer Tom has not asked for by name.
- [ ] The hit: Tom heard an "attack sound" on a flare. Check what is left of the hit with Tom.
- [ ] Eggs audio (branch claude/solarloop-eggs-3a554c, bean stimming-239r): telegraph() crackles (Tom may not want them), dim() chord, tick(at, lvl) on the audio clock for the Vela buzz.
- [x] Remove hush() once the micro branch's caller removal reaches feature/stimming-on77 and is merged here
- [x] Dev Sound rows: hum, rumble and interaction levels; on/off for tap blast, tap glow, lift, pulsar tick, telegraph, Dimming (Tom)
- [x] Sun choir redo: choir plus slowed choir, Ionian and pentatonic crossfade, no wobble, 7 s reverb (Tom picked it by ear)
- [x] Other stars follow the same voice in their own keys: choir.js presets, synths for the giants and odd stars, gains matched to the Sun (2026-11-24)
- [x] Choir lab (solarloop/lab.html): wobble toggles, holds, synth, space and sci-fi filters, tap settings, Match loudness, preset copy
- [x] Tap sounds per star: blast wave, glow wave, glow chord, levels
- [ ] Tom listens to every star in the toy and tunes in the lab
- [x] Taps no longer pile up: tap bus with one glow, one blast, a soft limiter; gentler glow fade (Tom: louder and louder)
- [x] Lab restructured (Tom: overwhelmed): key and voices first, live updates, voice count, star JSON
- [x] Lab: toy actions in a pinned bar, harmony switch, version menu (synth draft, first draft, organ choir), plain STE copy (Tom)
- [ ] Tom decides the giants' level: the loudness match put them 8 to 11 dB down, under the rumble (Tom: they were rawer before)
- [ ] Tom refines the tap sounds per star
- [ ] Bring the side-branch sounds (eggs, micro) into the same voice
- [ ] Doc Sound section true

## Findings, 2026-11-23

- Offline render of the Sun hum through a copy of the shared chain (kit.out 0.55, compressor -12 dB, 2 ms, 120 ms): the compressor does no gain reduction on the hum. Output equals input times 1.63 (Chrome's auto make-up gain), residual -140 dB. The compressor is not the grit.
- Hum spectrum, 6 to 8 s: most energy 100 Hz to 1 kHz; above 4 kHz is -102 dB. Nothing in the signal sounds like a bit crusher.
- So the grit comes from playback: the output device (Bluetooth headphones in headset mode give a low-bitrate sound), audio underruns, or the Claude app pane. Next: listen with Tom in Chrome.
