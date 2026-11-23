#version 300 es
precision highp float;
// Light per pixel, added up: stars, galaxies and ghost rings.
in vec2 v_off;
flat in vec4 v_col;
flat in vec4 v_shape;
flat in float v_kind;
flat in vec2 v_pos;
// The Moffat power: lower means wider seeing wings.
uniform float u_beta;
// Spike gain, 0 for a clear aperture.
uniform float u_spikes;
// Spike axes: 2 for a cross, 3 for a hexagonal pupil's six arms.
uniform float u_spikeAxes;
// The achromat's violet halo, as a share of the light.
uniform float u_halo;
// Defocus in px for green light, signed: a star becomes a disc.
uniform float u_defocus;
// The achromat's red and blue focus apart from green, in px of blur.
// Mirrors need none: 0.
uniform float u_chroma;
// Off-axis coma and astigmatism grow toward the field's edge.
uniform vec2 u_axis;
uniform float u_field;
uniform float u_coma;
// The secondary's shadow, as a share of the disc's radius.
uniform float u_obstr;
// The grating's spectra: rows of temperature, columns of wavelength.
uniform sampler2D u_atlas;
out vec4 o;
const float PI = 3.14159265;

// The colour of one wavelength in nm, dim at the ends of sight.
vec3 wavelengthRGB(float l) {
  vec3 c = l < 440.0 ? vec3((440.0 - l) / 60.0, 0.0, 1.0)
    : l < 490.0 ? vec3(0.0, (l - 440.0) / 50.0, 1.0)
    : l < 510.0 ? vec3(0.0, 1.0, (510.0 - l) / 20.0)
    : l < 580.0 ? vec3((l - 510.0) / 70.0, 1.0, 0.0)
    : l < 645.0 ? vec3(1.0, (645.0 - l) / 65.0, 0.0)
    : vec3(1.0, 0.0, 0.0);
  float k = l < 420.0 ? 0.3 + 0.7 * (l - 380.0) / 40.0 : l > 700.0 ? 0.3 + 0.7 * (760.0 - l) / 60.0 : 1.0;
  return clamp(c, 0.0, 1.0) * k;
}

// One colour's star image: a seeing disc, or a defocused disc.
float psf(float r2, vec2 off, float a, float D) {
  float core = (u_beta - 1.0) / (PI * a * a) * pow(1.0 + r2 / (a * a), -u_beta);
  if (D > 0.3) {
    float r = sqrt(r2), soft = 0.5 + 0.5 * a;
    float disc = smoothstep(D + soft, D - soft, r) * smoothstep(u_obstr * D - soft, u_obstr * D + soft, r);
    // A refractor's disc has a bright rim from diffraction.
    disc *= 1.0 + (u_obstr > 0.0 ? 0.0 : 0.6 * smoothstep(0.55 * D, D, r));
    // Four vanes cast thin shadows across a reflector's disc.
    if (u_obstr > 0.0) disc *= smoothstep(0.0, 0.03 * D + 0.6, min(abs(off.x), abs(off.y)));
    float donut = disc / (PI * D * D * (1.0 - u_obstr * u_obstr) * (u_obstr > 0.0 ? 1.0 : 1.25));
    core = mix(core, donut, smoothstep(0.6 * a, 2.0 * a, D));
  }
  return core;
}

vec2 turn(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
}

void main() {
  vec3 col = v_col.rgb;
  float F = v_col.a;
  float r2 = dot(v_off, v_off);
  vec3 c = vec3(0.0);
  if (v_kind < 0.5) {
    // Star, in px: x Moffat width, y quad half size, z spike length.
    float a = v_shape.x;
    // Off axis, the star smears outward: coma's tail and astigmatism's stretch.
    vec2 off = v_off;
    float k = 1.0;
    if (u_coma > 0.0) {
      vec2 rel = v_pos - u_axis;
      float e = dot(rel, rel) / (u_field * u_field);
      vec2 dir = length(rel) > 1.0 ? normalize(rel) : vec2(1.0, 0.0);
      float rad = dot(off, dir), tan_ = dot(off, vec2(-dir.y, dir.x));
      float shift = rad - 1.2 * a * e * u_coma;
      k = 1.0 + e * u_coma * (shift > 0.0 ? 2.4 : 0.8);
      off = vec2(shift / k, tan_ / (1.0 + 0.5 * e * u_coma));
    }
    float rr = dot(off, off);
    vec3 core;
    if (u_chroma != 0.0) {
      // Each colour focuses apart: green sharp, red and blue soft, or the reverse.
      core = vec3(psf(rr, off, a * 1.05, abs(u_defocus + u_chroma)), psf(rr, off, a, abs(u_defocus)), psf(rr, off, a * 1.1, abs(u_defocus + 1.15 * u_chroma)));
    } else core = vec3(psf(rr, off, a, abs(u_defocus)));
    core /= k;
    // Scattered light makes a faint wide wing.
    float wing = 0.01 / (PI * 16.0 * a * a) * pow(1.0 + r2 / (16.0 * a * a), -1.5);
    c = col * (core + wing);
    float h = 3.5 * a;
    c += vec3(0.45, 0.25, 1.0) * u_halo / (PI * h * h) * exp(-r2 / (h * h));
    if (u_spikes > 0.0 && v_shape.z > 0.0) {
      float L = v_shape.z, w = 0.45 * a;
      float s = 0.0;
      for (int i = 0; i < 3; i++) {
        if (float(i) >= u_spikeAxes) break;
        // One axis carries two arms; the first axis is vertical.
        vec2 q = abs(turn(v_off, 1.5707963 + float(i) * 3.1415927 / u_spikeAxes));
        // Each arm dies off fast, so stretched frames keep short spikes.
        float t = 1.0 / ((1.0 + q.x / L) * (1.0 + q.x / L));
        s += t * exp(-q.x / L - q.y * q.y / (w * w));
      }
      c += col * u_spikes * s / (2.0 * u_spikeAxes * L * w * 1.7725);
    }
    // Light fades out inside the quad, so no square edge shows.
    float fade = 1.0 - smoothstep(0.7, 1.0, sqrt(r2) / v_shape.y);
    o = vec4(c * F * fade, 1.0);
  } else if (v_kind < 1.5) {
    // Galaxy: x scale length in px, y axis ratio, z angle.
    // w is 1 for a spiral.
    float re = v_shape.x, q = v_shape.y;
    vec2 p = turn(v_off, v_shape.z);
    p.y /= q;
    float R = length(p);
    float disk = exp(-R / re) / (2.0 * PI * q * re * re);
    float rb = 0.18 * re;
    float bulge = exp(-R / rb) / (2.0 * PI * q * rb * rb);
    float lit;
    if (v_shape.w > 0.5) {
      // Two arms wind round a small bulge.
      float th = atan(p.y, p.x);
      float arms = 1.0 + 0.45 * sin(2.0 * th - 3.2 * log(R / re + 0.05));
      lit = 0.75 * disk * arms + 0.25 * bulge;
    } else {
      float re2 = 0.45 * re;
      lit = exp(-R / re2) / (2.0 * PI * q * re2 * re2);
    }
    o = vec4(col * F * lit, 1.0);
  } else if (v_kind > 2.5) {
    // Grating spectrum: x length, y width, w the temperature row.
    float t = v_off.x / v_shape.x + 0.5;
    float I = texture(u_atlas, vec2(t, v_shape.w)).r;
    float s = v_shape.y;
    float across = exp(-0.5 * v_off.y * v_off.y / (s * s)) / (2.5066 * s);
    o = vec4(wavelengthRGB(380.0 + 380.0 * t) * I * F * across * 2.2 / v_shape.x, 1.0);
  } else {
    // Ghost ring, in px: x radius, y ring width.
    float d = sqrt(r2), rad = v_shape.x, w = v_shape.y;
    float ring = exp(-pow((d - rad) / w, 2.0)) + 0.12 * smoothstep(rad, 0.0, d);
    float norm = 2.0 * PI * rad * w * 1.7725 + 0.12 * PI * rad * rad / 3.0;
    o = vec4(col * F * ring / norm, 1.0);
  }
}
