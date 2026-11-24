---
# stimming-cpet
title: 'Solar loop: one voice for the audio, starting with the Sun'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T05:58:16Z
updated_at: 2026-11-24T06:24:45Z
parent: stimming-oh7b
---

Own Solar loop's audio (solarloop/sound.js). Tom's asks: crisp angelic organ-choir hum on the Sun, a deep subtle surround rumble, an airy choir swell on a tap, no grit, no TSHSHSH, no echoing chimes. One change at a time, Tom listens live to each.

- [x] Find the cause of the grit (12-bit crusher sound) by measurement: the hum wave stopped at 4 kHz
- [x] Tom hears the hum with its top opened to 11 kHz: "much cleaner"
- [ ] Hum wobble off (pitch drift, shimmer, loudness swell): Tom listens
- [ ] Organs richer and more organic
- [ ] Space rumble louder as the view closes in: Tom listens
- [ ] Ask Tom which tap layers stay; cut the rest (chimes cut 2026-11-23: no visible cause; rain drips cut, Tom)
- [x] Tom hears the choir swell on the Sun: rejected; the original brass blast is back, exact (Tom: "the best")
- [ ] Pulsar tick: Tom objects to the pop; proposal is a short, quiet burst of band-passed radio noise, no thump. Decide with Tom; the eggs session follows.
- [x] Wooshes: all cut (ede9215e). Rule: add no sound layer Tom has not asked for by name.
- [ ] The hit: Tom heard an "attack sound" on a flare. Check what is left of the hit with Tom.
- [ ] Eggs audio (branch claude/solarloop-eggs-3a554c, bean stimming-239r): telegraph() crackles (Tom may not want them), dim() chord, tick(at, lvl) on the audio clock for the Vela buzz.
- [x] Remove hush() once the micro branch's caller removal reaches feature/stimming-on77 and is merged here
- [ ] Other stars follow the same voice in their own keys
- [ ] Bring the side-branch sounds (eggs, micro) into the same voice
- [ ] Doc Sound section true

## Findings, 2026-11-23

- Offline render of the Sun hum through a copy of the shared chain (kit.out 0.55, compressor -12 dB, 2 ms, 120 ms): the compressor does no gain reduction on the hum. Output equals input times 1.63 (Chrome's auto make-up gain), residual -140 dB. The compressor is not the grit.
- Hum spectrum, 6 to 8 s: most energy 100 Hz to 1 kHz; above 4 kHz is -102 dB. Nothing in the signal sounds like a bit crusher.
- So the grit comes from playback: the output device (Bluetooth headphones in headset mode give a low-bitrate sound), audio underruns, or the Claude app pane. Next: listen with Tom in Chrome.
