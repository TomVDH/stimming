// Shared GLSL: the wet pane in one piece.
// Beads, running drops, fog, and the view that the fog scatters into discs.
// These always go together, so one call makes the pane and one call lights it.
// Paste GLASS_RAIN first, then WET_GLASS. It declares no uniforms.
// It compiles in raw WebGL2 and in a three.js ShaderMaterial.
//
// Use:
//   WgPane g = wgPane(p, 1.0, m, flow, wet, speed, 0.4, fog, patches, edge);
//   vec2 at = uv + g.off / vec2(asp, 1.0);        // the pane is one unit tall here
//   vec3 col = wgView(g, texture(tScene, at).rgb, texture(tBok, at).rgb, 0.0, glass, veil, glint);
// p is a point on the pane in metres. zoom above 1 makes larger drops.
// m and flow come from wetGlassMotion(). speed is the air speed over the pane in m/s.
// beads thins the still beads. patches (0 to 1) grows fog patches on the pane.
// edge is the signed distance to the frame, negative inside.
// tBok is the scene through shared/bokeh.js, at half size.
// scatter 0 keeps clear glass sharp; 1 puts the focus on the pane.
// glass tints the view. veil is the room light the fog scatters. glint lights the drops.
// The numbers are Train Ride's.

export const WET_GLASS = /* glsl */`
struct WgPane { vec2 off; float rim; float spec; float cover; float clear; float fog; };

WgPane wgPane(vec2 p, float zoom, vec2 m, float flow, float wet, float speed, float beads, float fog, float patches, float edge) {
  vec2 off = vec2(0.0);
  float rim = 0.0, spec = 0.0, cover = 0.0, clear = 0.0;
  // The shared drops are sized for a pane 0.44 m away; this one is 1 m.
  vec3 L = vec3(0.28, 0.5, 0.82);
  vec2 pr = p / zoom * 0.45;
  // The wind strips the larger beads at speed.
  grBeads(pr, wet, 1.0 - 0.5 * smoothstep(5.0, 40.0, speed), beads, L, off, rim, spec, cover);
  // Slow or still, drops hold and slip; by 18 m/s the air drives them freely.
  grRuns(pr, m, flow, wet, 1.0 + speed / 18.0, 1.0 - smoothstep(4.0, 18.0, speed), L, off, rim, spec, cover, clear);
  off *= zoom / 0.45;
  // Runs wipe the fog; a drop clears most of it.
  float f = clamp(grFog(p, fog, edge, patches) * (1.0 - clear * 0.95) * (1.0 - cover * 0.8), 0.0, 1.0);
  return WgPane(off, rim, spec, cover, clear, f);
}
// The scene behind fog: discs where the fog is thick, sharp where it is not.
vec3 wgBlur(WgPane g, vec3 sharp, vec3 bok) {
  return g.fog > 0.02 ? mix(sharp, bok, smoothstep(0.02, 0.45, g.fog)) : sharp;
}
// The lit pane. sharp and bok are the scene at the pixel plus g.off.
vec3 wgView(WgPane g, vec3 sharp, vec3 bok, float scatter, vec3 glass, vec3 veil, vec3 glint) {
  vec3 blur = wgBlur(g, sharp, bok);
  vec3 col = mix(sharp, blur, smoothstep(0.05, 0.55, g.fog));
  // A drop is a small lens, so the view inside it stays sharp.
  col = mix(col, bok, scatter * (1.0 - g.cover)) * glass;
  // Fog scatters light into a milky veil.
  col = col * (1.0 - 0.8 * g.fog) + (blur * 1.1 + veil) * g.fog * 0.9;
  col *= 1.0 - 0.7 * g.rim;
  return col + glint * g.spec;
}
`;

// The pane's budget at a detail level (shared/detail.js): 0 low, 1 standard, 2 high.
// bokehScale is the bokeh target's share of the frame size.
export const wetGlassDetail = level => ({ bokehScale: level > 0 ? 0.5 : 0.25 });

// The motion every wet pane needs: the runs flow, and the air slants them.
// Call step(dt, speed) each frame. Read flow, m and speed for the shader.
export function wetGlassMotion() {
  const s = {
    flow: 0, speed: 0, m: [0, -1],
    // snap true jumps to the speed at once; a still frame uses it.
    step(dt, speed, snap = false) {
      s.speed = snap ? speed : s.speed + (speed - s.speed) * (1 - Math.exp(-dt / 0.3));
      s.flow += dt * (0.25 + s.speed / 14);
      const x = -s.speed / 6, l = Math.hypot(x, 1);
      s.m[0] = x / l;
      s.m[1] = -1 / l;
      return s;
    },
  };
  return s;
}
