---
# stimming-2572
title: 'Window seat: fly it with the arrow keys (bank, climb, dive)'
status: completed
type: task
priority: normal
created_at: 2026-11-15T09:17:54Z
updated_at: 2026-11-15T09:23:48Z
---


Tom (2026-11-15): arrow keys bank the plane and climb or dive.

- [x] Left and right bank the plane, up to 30 degrees; the autopilot holds the bank, then takes over again
- [x] Up and down climb and dive between 7 and 12 km, above the mid layer and below the cirrus
- [x] The nose pitches a few degrees while climbing or diving
- [x] Altitude is a uniform; the sky and the horizon dip follow it
- [x] The head moves to Shift and the arrow keys; the key strip says so
- [x] Mirror seats bank the right way
- [x] QA: keys, clean console, fps, 1280 and 375 px screenshots

## Notes

- The stick: held arrow keys set `stick.roll` and `stick.pitch` (-1, 0, 1); window blur releases them.
- Bank: 8 degrees a second, 30 at most; the autopilot holds it 20 s, then flies its own turns. A mirrored seat flips the sign.
- Climb: 0.15 km/s, eased over about 1.2 s, slowing to a stop within 0.6 km of 7 or 12 km. The nose pitches 1 degree per 25 m/s.
- Attitude: `ATT` = Rz(pitch) Rx(bank), in JS, in the shaders (`uAtt`, mat3) and on the wing group (Euler order ZYX).
- Altitude: `uAlt` replaces the constant `H` in the shader. The sky table and the horizon dip rebake in a worker every 0.2 km.
- The head moved to Shift and the arrow keys; the key strip shows "arrows: bank, climb, dive" in place of "D: dim the glass" (Dim keeps its button).
- QA (headless shell, ANGLE D3D11): bank left and right, a 25 s dive to 7 km, a 35 s climb to 12 km; 60 fps; no console errors; 375 and 812 x 375 px clean.
- Changing the shader source drops Chrome's cached program once; the stand-in covers that first visit.

