// Physically-based WebGL2 metallurgical microscope shaders.
// Pass 1 (DIE_FS): Multi-scale analytical VLSI die lithography + SiO2 thin-film interference
//                  + 4 metallurgical epi-illumination modes (Brightfield, Darkfield, DIC, NIR 1050nm).
// Pass 2 (OPTICS_FS): Variable-radius optical PSF bokeh, Kohler falloff, lateral CA, CMOS grain, filmic tonemap.

const GLSL_HEAD = `#version 300 es
precision highp float;
precision highp int;
`;

export const DIE_FS = GLSL_HEAD + /* glsl */ `
in vec2 vUv;
out vec4 outCol;

uniform vec2 uRes;          // Render target resolution in px
uniform vec2 uCamUm;        // Stage center in microns
uniform float uFovHalfUm;   // Half vertical FOV in microns
uniform float uFocusUm;     // Focal plane Z in microns (-1.5 .. +42)
uniform float uNA;          // Objective numerical aperture (0.15 .. 0.95)
uniform int uChip;          // 0 = NMOS-79, 1 = CMOS-94, 2 = RF-SOC
uniform vec4 uModeW;        // (Brightfield, Darkfield, DIC, NIR)
uniform vec2 uTilt;         // Condenser / illumination tilt (-1..1)

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

/* ---------- deterministic hashes & noise ---------- */
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// Voronoi grain for polycrystalline aluminium/copper hillocks & ceramic alumina.
float voronoiCell(vec2 p, out float edgeDist) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md1 = 8.0, md2 = 8.0;
  float id = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md1) {
        md2 = md1;
        md1 = d;
        id = hash21(n + g + 17.3);
      } else if (d < md2) {
        md2 = d;
      }
    }
  }
  edgeDist = sqrt(md2) - sqrt(md1);
  return id;
}

/* ---------- band-limited analytic primitives (zero Moire aliasing!) ---------- */
// Box-filtered 1D pulse train of duty cycle [0..1] with period 1.
// Smoothly converges to duty cycle when pixel footprint w >= 1.
float aaPulse(float x, float duty, float w) {
  float fw = max(w, 1e-4);
  if (fw >= 1.0) return duty;
  float f = fract(x);
  // Distance to nearest pulse center at 0.5
  float d = abs(f - 0.5) - duty * 0.5;
  float edge = clamp(0.5 - d / fw, 0.0, 1.0);
  // Blend smoothly into analytical mean between 0.35 and 0.95 of a period
  float lod = smoothstep(0.32, 0.92, fw);
  return mix(edge, duty, lod);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

float boxMask(vec2 p, vec2 c, vec2 halfSize, float fw) {
  float d = sdBox(p - c, halfSize);
  return 1.0 - smoothstep(-fw * 0.65, fw * 0.65, d);
}

float inRect(vec2 p, vec2 a, vec2 b) {
  vec2 s = step(a, p) * step(p, b);
  return s.x * s.y;
}

/* ---------- physical SiO2 / Si3N4 thin-film Airy interference ---------- */
// Returns physically-grounded RGB reflectance of a thin dielectric film (nm) on silicon.
vec3 thinFilmSiO2(float dNm, float nFilm, float cosTheta) {
  float sinT2 = max(0.0, 1.0 - cosTheta * cosTheta);
  float cosF = sqrt(max(0.08, 1.0 - sinT2 / (nFilm * nFilm)));
  float opd = 2.0 * nFilm * dNm * cosF;
  // Fresnel amplitude reflection coefficients (air->film, film->Si)
  float r1 = (1.0 - nFilm) / (1.0 + nFilm);
  float r2 = (nFilm - 3.92) / (nFilm + 3.92);
  // CIE-weighted RGB wavelengths (nm) for tungsten-halogen / neutral microscope lamp
  vec3 lam = vec3(612.0, 542.0, 464.0);
  vec3 phase = (TAU * opd) / lam;
  vec3 num = vec3(r1 * r1 + r2 * r2) + 2.0 * r1 * r2 * cos(phase);
  vec3 den = vec3(1.0 + r1 * r1 * r2 * r2) + 2.0 * r1 * r2 * cos(phase);
  vec3 R = clamp(num / max(den, vec3(0.01)), 0.0, 1.0);
  // Subtle spectral saturation & tungsten white balance matching optical micrographs
  return pow(R, vec3(0.88)) * vec3(1.04, 1.00, 0.96);
}

// First-to-second order Michel-Levy Nomarski DIC color ramp.
vec3 michelLevyDIC(float gammaNm) {
  // Real Wollaston prism: background sits at ~530nm first-order grey-straw or violet-grey.
  vec3 lam = vec3(620.0, 545.0, 468.0);
  vec3 s = sin(PI * gammaNm / lam);
  vec3 col = s * s;
  // Warm tungsten metallurgical balance
  return clamp(col * vec3(1.03, 1.00, 0.95), 0.0, 1.0);
}

/* ---------- authentic Silicon Zoo photolithographed mask art ---------- */
// Drawn strictly in 45/90-degree flat Manhattan polygons at true micron scale (invisible at 5x!).
float zooBiplane(vec2 q, float fw) {
  // q in [-1..1], ~140 um across
  float d = 1e5;
  d = min(d, sdBox(q - vec2(0.0, 0.24), vec2(0.76, 0.09)));     // top wing
  d = min(d, sdBox(q - vec2(0.0, -0.14), vec2(0.62, 0.08)));    // bottom wing
  d = min(d, sdBox(q - vec2(-0.42, 0.05), vec2(0.04, 0.20)));   // left strut
  d = min(d, sdBox(q - vec2(0.42, 0.05), vec2(0.04, 0.20)));    // right strut
  d = min(d, sdBox(q - vec2(0.0, 0.02), vec2(0.13, 0.36)));     // fuselage
  d = min(d, sdBox(q - vec2(0.0, -0.52), vec2(0.28, 0.06)));    // tailplane
  d = min(d, sdBox(q - vec2(0.0, 0.44), vec2(0.24, 0.03)));     // prop
  return 1.0 - smoothstep(-fw, fw, d);
}

float zooGecko(vec2 q, float fw) {
  float d = 1e5;
  d = min(d, sdSeg(q, vec2(-0.55, -0.45), vec2(-0.15, -0.15)) - 0.07);
  d = min(d, sdSeg(q, vec2(-0.15, -0.15), vec2(0.28, 0.22)) - 0.12);
  d = min(d, sdSeg(q, vec2(0.28, 0.22), vec2(0.56, 0.48)) - 0.14); // head
  // 45-degree Manhattan legs
  d = min(d, sdSeg(q, vec2(0.18, 0.14), vec2(0.02, 0.48)) - 0.045);
  d = min(d, sdSeg(q, vec2(0.18, 0.14), vec2(0.52, -0.02)) - 0.045);
  d = min(d, sdSeg(q, vec2(-0.12, -0.10), vec2(-0.42, 0.18)) - 0.045);
  d = min(d, sdSeg(q, vec2(-0.12, -0.10), vec2(0.14, -0.44)) - 0.045);
  // curled tail
  d = min(d, sdSeg(q, vec2(-0.55, -0.45), vec2(-0.72, -0.25)) - 0.04);
  return 1.0 - smoothstep(-fw, fw, d);
}

float zooConcorde(vec2 q, float fw) {
  float d = 1e5;
  d = min(d, sdSeg(q, vec2(0.0, 0.78), vec2(0.0, -0.68)) - 0.065); // needle fuselage
  // Ogival delta wing (stepped Manhattan approximation)
  for (int i = 0; i < 6; i++) {
    float fi = float(i) / 5.0;
    float y = mix(0.28, -0.52, fi);
    float hw = mix(0.09, 0.62, fi * fi);
    d = min(d, sdBox(q - vec2(0.0, y), vec2(hw, 0.085)));
  }
  d = min(d, sdBox(q - vec2(-0.22, -0.58), vec2(0.08, 0.10))); // engine nacelles
  d = min(d, sdBox(q - vec2(0.22, -0.58), vec2(0.08, 0.10)));
  return 1.0 - smoothstep(-fw, fw, d);
}

float zooOwl(vec2 q, float fw) {
  float d = 1e5;
  d = min(d, sdBox(q - vec2(0.0, -0.08), vec2(0.36, 0.44)) - 0.12); // body
  d = min(d, sdBox(q - vec2(0.0, 0.36), vec2(0.28, 0.22)) - 0.06);  // head
  d = min(d, sdSeg(q, vec2(-0.26, 0.56), vec2(-0.34, 0.72)) - 0.045); // ear tufts
  d = min(d, sdSeg(q, vec2(0.26, 0.56), vec2(0.34, 0.72)) - 0.045);
  d = min(d, sdSeg(q, vec2(-0.14, -0.54), vec2(-0.18, -0.68)) - 0.04); // talons
  d = min(d, sdSeg(q, vec2(0.14, -0.54), vec2(0.18, -0.68)) - 0.04);
  float mask = 1.0 - smoothstep(-fw, fw, d);
  // Etched eye cutouts
  float eL = 1.0 - smoothstep(0.09 - fw, 0.09 + fw, length(q - vec2(-0.13, 0.38)));
  float eR = 1.0 - smoothstep(0.09 - fw, 0.09 + fw, length(q - vec2(0.13, 0.38)));
  return clamp(mask - max(eL, eR), 0.0, 1.0);
}

// USAF-style critical-dimension resolution bars & alignment vernier crosshair.
float foundryTarget(vec2 p, vec2 c, float fw) {
  vec2 q = p - c;
  if (max(abs(q.x), abs(q.y)) > 140.0) return 0.0;
  float crossH = boxMask(q, vec2(0.0), vec2(88.0, 5.5), fw);
  float crossV = boxMask(q, vec2(0.0), vec2(5.5, 88.0), fw);
  float frame = max(boxMask(q, vec2(0.0), vec2(110.0, 110.0), fw) - boxMask(q, vec2(0.0), vec2(98.0, 98.0), fw), 0.0);
  // Vernier ticks in quadrant
  float ticks = 0.0;
  if (q.x > 16.0 && q.x < 86.0 && q.y > 16.0 && q.y < 86.0) {
    ticks = aaPulse(q.x / 10.0, 0.45, fw / 10.0) * aaPulse(q.y / 48.0, 0.75, fw / 48.0);
  }
  return clamp(max(max(crossH, crossV), max(frame, ticks)), 0.0, 1.0);
}

/* ---------- physical chip sample description ---------- */
struct ChipSample {
  float diff;       // N+/P+ active diffusion (0..1)
  float poly;       // Polysilicon gate/interconnect (0..1)
  float m1;         // Metal 1 coverage (0..1)
  float m2;         // Metal 2 coverage (0..1)
  float m3;         // Top Metal / Bond Pads / Inductors (0..1)
  float via;        // Contact / via holes & pillars (0..1)
  float oxideNm;    // Local SiO2 thickness in nm
  float grating;    // Periodic sub-micron grating factor (SRAM / Bayer / PLA)
  vec3 gratingCol;  // Extra spectral diffraction tint (e.g. SRAM Bragg or Bayer RGGB)
  float padOpen;    // Passivation opening over aluminium bond pad
  float probeMark;  // Probe-card needle scrub gouge on bond pad
  float metalType;  // 0 = Aluminium (silver-cream), 1 = Copper (warm salmon-gold)
  float region;     // 0 = active die, 1 = scribe street, 2 = epoxy fillet, 3 = ceramic cavity, 4 = leadframe
  float heightUm;   // Composite optical surface height in microns
  float topLayerZ;  // Dominant physical Z of top visible feature (for DOF)
};

/* ---------- shared perimeter: seal ring, bond pads, probe marks, scribe, ceramic ---------- */
void evalPerimeter(vec2 p, float fw, int chip, inout ChipSample s) {
  float edge = max(abs(p.x), abs(p.y));
  if (edge > 4000.0) {
    if (edge < 4170.0) {
      s.region = 1.0; // Scribe street / diamond-sawn raw silicon
      // Process control monitor (PCM) test pads inside the scribe street
      float along = abs(p.x) > abs(p.y) ? p.y : p.x;
      float perp = abs(p.x) > abs(p.y) ? abs(p.x) - 4085.0 : abs(p.y) - 4085.0;
      float pcmPad = aaPulse(along / 280.0, 0.42, fw / 280.0) * (1.0 - smoothstep(32.0 - fw, 32.0 + fw, abs(perp)));
      s.m3 = max(s.m3, pcmPad * 0.85);
      s.heightUm = 0.0 + s.m3 * 1.2;
      s.topLayerZ = s.m3 > 0.2 ? 2.4 : 0.0;
    } else if (edge < 4440.0) {
      s.region = 2.0; // Silver-filled conductive die-attach epoxy meniscus
      s.heightUm = -14.0;
      s.topLayerZ = -6.0;
    } else {
      s.region = 3.0; // Matte dark alumina ceramic package cavity
      s.heightUm = -25.0;
      s.topLayerZ = -12.0;
      // Gold-plated Kovar package leadframe fingers radiating beyond the cavity
      if (edge > 4850.0) {
        float perSide = chip == 0 ? 10.0 : (chip == 1 ? 16.0 : 18.0);
        float span = 3550.0;
        float pitch = (2.0 * span) / max(1.0, perSide - 1.0);
        bool horizSide = abs(p.y) > abs(p.x);
        float a = horizSide ? p.x : p.y;
        float r = horizSide ? abs(p.y) : abs(p.x);
        // Fan out slightly with distance from die
        float fan = a * (4700.0 / max(4700.0, r * 0.92 + 400.0));
        if (abs(fan) <= span + pitch * 0.4) {
          float idx = floor(fan / pitch + 0.5);
          float local = fan - idx * pitch;
          float leadW = chip == 0 ? 115.0 : 72.0;
          float lead = 1.0 - smoothstep(leadW - fw, leadW + fw, abs(local));
          float tip = smoothstep(4860.0 - fw, 4860.0 + fw, r);
          if (lead * tip > 0.1) {
            s.region = 4.0;
            s.m3 = lead * tip;
            s.metalType = 1.0; // Gold leadframe
            s.heightUm = -10.0;
            s.topLayerZ = -4.0;
          }
        }
      }
    }
    return;
  }

  // Double metallic moisture seal ring around active die edge (3915 & 3960 um)
  float outerRing = smoothstep(3948.0 - fw, 3948.0 + fw, edge) * (1.0 - smoothstep(3974.0 - fw, 3974.0 + fw, edge));
  float innerRing = smoothstep(3898.0 - fw, 3898.0 + fw, edge) * (1.0 - smoothstep(3914.0 - fw, 3914.0 + fw, edge));
  s.m3 = max(s.m3, outerRing);
  s.m2 = max(s.m2, innerRing);

  // Corner foundry alignment targets / verniers
  for (int sx = -1; sx <= 1; sx += 2) {
    for (int sy = -1; sy <= 1; sy += 2) {
      vec2 corner = vec2(float(sx), float(sy)) * 3720.0;
      s.m3 = max(s.m3, foundryTarget(p, corner, fw));
    }
  }

  // Perimeter bond pads + ESD lead-in + passivation window + realistic probe-card scrub marks
  float perSide = chip == 0 ? 10.0 : (chip == 1 ? 16.0 : 18.0);
  float span = 3380.0;
  float pitch = (2.0 * span) / max(1.0, perSide - 1.0);
  float padRing = 3680.0;
  float padHalf = chip == 0 ? 110.0 : 76.0;

  // Test all 4 sides cleanly
  bool isTopBot = abs(p.y) > abs(p.x);
  float along = isTopBot ? p.x : p.y;
  float rad = isTopBot ? abs(p.y) : abs(p.x);
  float sideId = (isTopBot ? (p.y > 0.0 ? 0.0 : 1.0) : (p.x > 0.0 ? 2.0 : 3.0));

  if (rad > padRing - 240.0 && rad < padRing + 170.0 && abs(along) <= span + padHalf + 20.0) {
    float idx = clamp(floor(along / pitch + 0.5), -perSide * 0.5, perSide * 0.5);
    float centerAlong = idx * pitch;
    if (abs(centerAlong) <= span + 2.0) {
      vec2 q = vec2(along - centerAlong, rad - padRing);
      float padMetal = boxMask(q, vec2(0.0), vec2(padHalf), fw);
      float padWin = boxMask(q, vec2(0.0), vec2(padHalf * 0.84), fw);
      s.m3 = max(s.m3, padMetal);
      s.padOpen = max(s.padOpen, padWin);

      // Inward ESD clamp trace & via stack connecting pad to core
      float leadIn = boxMask(q, vec2(0.0, -padHalf - 55.0), vec2(padHalf * 0.28, 65.0), fw);
      s.m2 = max(s.m2, leadIn);

      // Authentic diamond-tip probe-card scrub mark (tiny asymmetric needle drag in pad center)
      if (padWin > 0.5) {
        vec2 rnd = hash22(vec2(idx + sideId * 31.0, float(chip) * 13.7));
        vec2 pa = (rnd - 0.5) * padHalf * 0.55;
        vec2 pb = pa + vec2(18.0 + rnd.x * 22.0, (rnd.y - 0.5) * 14.0);
        float scrub = 1.0 - smoothstep(4.5 - fw, 4.5 + fw, sdSeg(q, pa, pb));
        float tipPit = 1.0 - smoothstep(7.5 - fw, 7.5 + fw, length(q - pb));
        s.probeMark = max(s.probeMark, max(scrub * 0.85, tipPit));
      }
    }
  }
}

/* ---------- CHIP 0: 1979 8-bit NMOS Microprocessor (6502 / Z80 / 6800 aesthetic) ---------- */
void evalNMOS79(vec2 p, float fw, inout ChipSample s) {
  s.metalType = 0.0; // Wide bright aluminium
  // Base thick thermal SiO2 field oxide (~340nm -> classic deep slate/violet-blue)
  s.oxideNm = 335.0 + vnoise(p * 0.00055) * 24.0;

  // Macro floorplan regions + margin art inside +/- 3580 um (inner edge of pad ring)
  float inCore = inRect(p, vec2(-3580.0), vec2(3580.0));
  if (inCore < 0.5) return;

  // 1. TOP HALF (y: 1200..3320): Massive PLA Instruction Decode ROM Matrix!
  if (p.y > 1120.0 && p.y < 3340.0 && abs(p.x) < 3300.0) {
    // Sub-banks separated by wide Vdd/Vss aluminium buses
    float bankGap = aaPulse((p.y - 1120.0) / 560.0, 0.09, fw / 560.0);
    float colGap = aaPulse((p.x + 3300.0) / 1100.0, 0.06, fw / 1100.0);
    float activePLA = (1.0 - bankGap) * (1.0 - colGap);

    // Dense vertical polysilicon wordlines (pitch 24 um)
    float polyPitch = 24.0;
    float polyLine = aaPulse(p.x / polyPitch, 0.44, fw / polyPitch);
    // Horizontal diffusion & metal bitlines (pitch 28 um)
    float bitPitch = 28.0;
    float diffLine = aaPulse(p.y / bitPitch, 0.42, fw / bitPitch);
    float metalLine = aaPulse((p.y + 7.0) / (bitPitch * 2.0), 0.36, fw / (bitPitch * 2.0));

    // Programmed ROM transistor dots at deterministic bit intersections
    vec2 cell = floor(vec2(p.x / polyPitch, p.y / bitPitch));
    float bitOn = step(0.46, hash21(cell + vec2(3.1, 7.7)));
    vec2 cf = fract(vec2(p.x / polyPitch, p.y / bitPitch)) - 0.5;
    float contact = bitOn * (1.0 - smoothstep(0.18 - fw / polyPitch, 0.18 + fw / polyPitch, max(abs(cf.x), abs(cf.y))));

    s.diff = max(s.diff, diffLine * activePLA);
    s.poly = max(s.poly, polyLine * activePLA);
    s.m1 = max(s.m1, metalLine * activePLA * 0.92);
    s.via = max(s.via, contact * activePLA);
    s.oxideNm = mix(s.oxideNm, 255.0, activePLA * 0.7); // Pale gold-green PLA oxide
    s.grating = max(s.grating, activePLA * 0.45);
    s.gratingCol = vec3(0.86, 0.78, 0.62);

    // Wide horizontal Al power rails between PLA banks
    s.m1 = max(s.m1, bankGap * 0.95);
    s.m1 = max(s.m1, colGap * 0.85);
  }

  // 2. RIGHT SIDE (x: 420..3320, y: -3280..980): 8-bit Register File & ALU Bit-Slices!
  if (p.x > 420.0 && p.x < 3320.0 && p.y > -3280.0 && p.y < 980.0) {
    // 8 distinct vertical bit-slices (pitch 362 um)
    float sliceW = 362.5;
    float sx = (p.x - 420.0) / sliceW;
    float sf = fract(sx);
    float sid = floor(sx);
    float sliceRail = aaPulse(sx, 0.14, fw / sliceW); // Wide vertical bus per bit

    // Horizontal register rows inside each bit-slice (A, X, Y, S, PC, ALU, Mux)
    float rowPitch = 148.0;
    float ry = (p.y + 3280.0) / rowPitch;
    float rid = floor(ry);
    float rowBus = aaPulse(ry, 0.16, fw / rowPitch);

    // Fine transistor fingers & cross-coupled latch traces inside each bit cell
    float fineP = 22.0;
    float cellSeed = hash21(vec2(sid * 3.0, rid * 5.0));
    float polyGate = aaPulse((p.x + cellSeed * 40.0) / fineP, 0.36, fw / fineP)
                   * smoothstep(0.08, 0.12, sf) * smoothstep(0.92, 0.88, sf);
    float diffBar = aaPulse(p.y / 32.0, 0.45, fw / 32.0) * (1.0 - sliceRail);
    // Hand-routed aluminium tap lines with varied widths
    float metalTap = aaPulse((p.x + rid * 17.0) / 48.0, 0.34, fw / 48.0) * step(0.32, hash21(vec2(floor(p.x / 48.0), rid)));
    float viaDot = polyGate * diffBar * aaPulse(p.y / 32.0, 0.22, fw / 32.0);

    s.diff = max(s.diff, diffBar * 0.85);
    s.poly = max(s.poly, polyGate);
    s.m1 = max(s.m1, max(max(sliceRail, rowBus * 0.9), metalTap));
    s.via = max(s.via, viaDot * 0.8);
    // Warm amber-rose thin oxide over active data path
    s.oxideNm = mix(s.oxideNm, 435.0 + mod(rid, 3.0) * 28.0, 0.65);
  }

  // 3. LEFT-MIDDLE (x: -3320..280, y: -1550..980): Hand-Drawn Random Control Logic!
  if (p.x > -3320.0 && p.x < 280.0 && p.y > -1550.0 && p.y < 980.0) {
    // Organic Manhattan routing blocks of varying pitches
    vec2 blk = floor(p / 360.0);
    vec2 bf = fract(p / 360.0);
    float h = hash21(blk + 11.4);
    float dir = step(0.5, hash21(blk + 29.1));

    // Wide organic Al buses along block borders
    float busH = aaPulse(p.y / 360.0, 0.11, fw / 360.0);
    float busV = aaPulse(p.x / 360.0, 0.09, fw / 360.0);

    // Inner meandering signal tracks (18..34 um wide — classic 1979 NMOS density!)
    float pitch = mix(26.0, 42.0, h);
    float trX = aaPulse(p.x / pitch, 0.38, fw / pitch) * step(0.35, hash21(vec2(floor(p.x / pitch), blk.y)));
    float trY = aaPulse(p.y / pitch, 0.38, fw / pitch) * step(0.35, hash21(vec2(blk.x, floor(p.y / pitch))));
    float polyTr = mix(trX, trY, 1.0 - dir);
    float metTr = mix(trY, trX, 1.0 - dir);

    // Recessed green-teal diffusion islands under transistors
    float island = smoothstep(0.14, 0.18, bf.x) * smoothstep(0.86, 0.82, bf.x)
                 * smoothstep(0.14, 0.18, bf.y) * smoothstep(0.86, 0.82, bf.y);
    float diffStrip = aaPulse((dir > 0.5 ? p.x : p.y) / 56.0, 0.44, fw / 56.0) * island;
    float viaCut = metTr * polyTr * aaPulse(p.x / pitch, 0.24, fw / pitch) * aaPulse(p.y / pitch, 0.24, fw / pitch);

    s.diff = max(s.diff, diffStrip);
    s.poly = max(s.poly, polyTr * 0.9);
    s.m1 = max(s.m1, max(max(busH, busV), metTr));
    s.via = max(s.via, viaCut);
    s.oxideNm = mix(s.oxideNm, 305.0 + h * 110.0, 0.72);
  }

  // 4. BOTTOM-LEFT (x: -3320..280, y: -3280..-1700): Giant Interdigitated Clock/Output Driver Transistors!
  if (p.x > -3320.0 && p.x < 280.0 && p.y > -3280.0 && p.y < -1700.0) {
    // 6 huge power-MOSFET serpentine finger arrays
    float col = floor((p.x + 3320.0) / 600.0);
    vec2 q = vec2(mod(p.x + 3320.0, 600.0) - 300.0, p.y + 2490.0);
    float inDriver = boxMask(q, vec2(0.0), vec2(250.0, 660.0), fw);
    float fingers = aaPulse(q.y / 38.0, 0.46, fw / 38.0) * boxMask(q, vec2(0.0), vec2(210.0, 600.0), fw);
    float polySerp = aaPulse((q.y + 19.0) / 38.0, 0.26, fw / 38.0) * boxMask(q, vec2(0.0), vec2(225.0, 610.0), fw);
    float spineL = boxMask(q, vec2(-225.0, 0.0), vec2(24.0, 620.0), fw);
    float spineR = boxMask(q, vec2(225.0, 0.0), vec2(24.0, 620.0), fw);
    s.diff = max(s.diff, inDriver * 0.9);
    s.poly = max(s.poly, polySerp);
    s.m1 = max(s.m1, max(fingers, max(spineL, spineR)));
    s.oxideNm = mix(s.oxideNm, 210.0 + mod(col, 2.0) * 55.0, inDriver * 0.75);
  }

  // Global aluminium bus channels separating major functional blocks
  float busH0 = boxMask(p, vec2(0.0, 1050.0), vec2(3380.0, 44.0), fw);
  float busV0 = boxMask(p, vec2(350.0, -1100.0), vec2(44.0, 2240.0), fw);
  s.m1 = max(s.m1, max(busH0, busV0));

  // Authentic Silicon Zoo hidden mask art (real ~140 um scale, tucked in quiet corner oxide!)
  // 1) Biplane in NW margin beside PLA (-3520, 3180)
  s.m1 = max(s.m1, zooBiplane((p - vec2(-3495.0, 3180.0)) / 82.0, fw / 82.0));
  // 2) Gecko in bus junction elbow (350, 1050) -> offset to quiet pocket (-3480, -1620)
  s.m1 = max(s.m1, zooGecko((p - vec2(-3490.0, -1625.0)) / 78.0, fw / 78.0));
  // 3) Owl tucked in SE pad corner (3480, -3420)
  s.m1 = max(s.m1, zooOwl((p - vec2(3485.0, -3415.0)) / 74.0, fw / 74.0));
}

/* ---------- CHIP 1: 1994 32-bit Superscalar CMOS (Pentium / R4000 / Alpha aesthetic) ---------- */
void evalCMOS94(vec2 p, float fw, inout ChipSample s) {
  s.metalType = 0.0; // Planarized Al-Cu with multi-layer oxide interference
  s.oxideNm = 485.0 + vnoise(p * 0.00042) * 35.0; // Rich CMOS indigo/rose-teal dielectric

  float inCore = inRect(p, vec2(-3580.0), vec2(3580.0));
  if (inCore < 0.5) return;

  // 1. FOUR HUGE 6T SRAM L1/L2 CACHE MACRO BANKS (NW & SE quadrants)
  bool inSramNW = (p.x > -3380.0 && p.x < -340.0 && p.y > 520.0 && p.y < 3360.0);
  bool inSramSE = (p.x > 340.0 && p.x < 3380.0 && p.y > -3360.0 && p.y < -520.0);
  if (inSramNW || inSramSE) {
    vec2 origin = inSramNW ? vec2(-1860.0, 1940.0) : vec2(1860.0, -1940.0);
    vec2 q = p - origin;
    // Sub-array decoders & sense-amp spines (4x4 sub-blocks)
    float spineV = boxMask(q, vec2(0.0), vec2(78.0, 1410.0), fw);
    float spineH = boxMask(q, vec2(0.0), vec2(1510.0, 62.0), fw);
    float subV = aaPulse(q.x / 760.0, 0.045, fw / 760.0);
    float subH = aaPulse(q.y / 710.0, 0.045, fw / 710.0);
    float decoder = max(max(spineV, spineH), max(subV, subH));

    // Ultra-fine 6T bitcell array (bitline pitch 8.5 um, wordline pitch 13 um)
    float bitX = aaPulse(q.x / 8.5, 0.48, fw / 8.5);
    float wordY = aaPulse(q.y / 13.0, 0.44, fw / 13.0);
    float cellActive = 1.0 - decoder;

    s.diff = max(s.diff, wordY * cellActive * 0.7);
    s.poly = max(s.poly, wordY * cellActive);
    s.m1 = max(s.m1, bitX * cellActive * 0.85);
    s.m2 = max(s.m2, max(decoder, aaPulse(q.y / 52.0, 0.22, fw / 52.0) * cellActive * 0.65));
    s.via = max(s.via, bitX * wordY * aaPulse(q.x / 17.0, 0.24, fw / 17.0) * cellActive);

    // Real anisotropic Bragg diffraction grating shimmer across SRAM bitcell pitch!
    float gratingPhase = dot(uTilt, vec2(1.0, 0.35)) * 280.0 + q.x * 0.045 + q.y * 0.022;
    s.grating = max(s.grating, cellActive * 0.92);
    s.gratingCol = thinFilmSiO2(390.0 + gratingPhase, 1.48, 0.92);
    s.oxideNm = mix(s.oxideNm, 310.0 + 40.0 * step(0.0, q.x * q.y), cellActive * 0.65);
  }

  // 2. DENSE STANDARD-CELL SEA-OF-GATES (SW & NE quadrants: Dual Integer + FPU pipelines)
  bool inLogicSW = (p.x > -3380.0 && p.x < 160.0 && p.y > -3360.0 && p.y < 320.0);
  bool inLogicNE = (p.x > -160.0 && p.x < 3380.0 && p.y > -320.0 && p.y < 3360.0);
  if ((inLogicSW || inLogicNE) && !inSramNW && !inSramSE) {
    // Standard cell rows (height 34 um) with alternating Vdd/Vss M1 rails
    float rowH = 34.0;
    float rowRail = aaPulse(p.y / rowH, 0.16, fw / rowH);
    float rowId = floor(p.y / rowH);
    // Polysilicon gate pitch 7.5 um inside rows
    float gatePitch = 7.5;
    float gateCol = floor(p.x / gatePitch);
    float gateOn = step(0.28, hash21(vec2(gateCol, rowId * 1.7)));
    float polyG = aaPulse(p.x / gatePitch, 0.36, fw / gatePitch) * gateOn * (1.0 - rowRail);

    // Dense M1 horizontal & M2 vertical Manhattan signal tracks (12 um pitch)
    float trP = 12.0;
    float segX = floor(p.x / 140.0);
    float segY = floor(p.y / 140.0);
    float m1Track = aaPulse(p.y / trP, 0.40, fw / trP) * step(0.34, hash21(vec2(segX, floor(p.y / trP))));
    float m2Track = aaPulse(p.x / trP, 0.38, fw / trP) * step(0.38, hash21(vec2(floor(p.x / trP), segY)));
    float viaV1 = m1Track * m2Track * aaPulse(p.x / trP, 0.25, fw / trP) * aaPulse(p.y / trP, 0.25, fw / trP);

    // Macro functional block boundaries (creates real CPU sub-unit visual mosaic at 5x-10x!)
    vec2 subId = floor(p / 640.0);
    float subTint = hash21(subId + 4.9);
    float subBorder = max(aaPulse(p.x / 640.0, 0.035, fw / 640.0), aaPulse(p.y / 640.0, 0.035, fw / 640.0));

    s.diff = max(s.diff, (1.0 - rowRail) * 0.55);
    s.poly = max(s.poly, polyG);
    s.m1 = max(s.m1, max(rowRail, m1Track * 0.92));
    s.m2 = max(s.m2, max(m2Track * 0.88, subBorder * 0.85));
    s.via = max(s.via, viaV1);
    s.oxideNm = mix(s.oxideNm, 260.0 + subTint * 240.0, 0.72);
  }

  // 3. TOP-METAL M3/M4 GLOBAL POWER GRID & SYMMETRICAL CLOCK H-TREE
  float pwrX = aaPulse(p.x / 480.0, 0.055, fw / 480.0);
  float pwrY = aaPulse(p.y / 480.0, 0.055, fw / 480.0);
  // Central H-tree clock trunk
  float hTrunk = boxMask(p, vec2(0.0, 0.0), vec2(1720.0, 26.0), fw);
  float hArmL = boxMask(p, vec2(-1700.0, 0.0), vec2(22.0, 1480.0), fw);
  float hArmR = boxMask(p, vec2(1700.0, 0.0), vec2(22.0, 1480.0), fw);
  s.m3 = max(s.m3, max(max(pwrX, pwrY) * 0.85, max(hTrunk, max(hArmL, hArmR))));

  // 4. LASER-TRIMMED REDUNDANCY FUSE BANK (center-north channel)
  if (abs(p.x) < 280.0 && p.y > 1650.0 && p.y < 3280.0) {
    float fuseIdx = floor((p.y - 1650.0) / 48.0);
    float blown = step(0.68, hash21(vec2(fuseIdx, 19.3)));
    float fuseBar = aaPulse((p.y - 1650.0) / 48.0, 0.28, fw / 48.0);
    float blowHole = blown * (1.0 - smoothstep(14.0 - fw, 14.0 + fw, abs(p.x)));
    s.m2 = max(s.m2, fuseBar * (1.0 - blowHole));
    s.via = max(s.via, blowHole * 0.9); // dark laser-ablated crater
  }

  // 5. CMP DUMMY METAL FILL in perimeter gap (3460..3560 um)
  float edge = max(abs(p.x), abs(p.y));
  if (edge > 3430.0 && edge < 3555.0) {
    float fill = aaPulse(p.x / 22.0, 0.45, fw / 22.0) * aaPulse(p.y / 22.0, 0.45, fw / 22.0);
    s.m2 = max(s.m2, fill * 0.8);
  }

  // Authentic Silicon Zoo hidden mask art in quiet margin pockets
  s.m2 = max(s.m2, zooConcorde((p - vec2(-220.0, 3495.0)) / 68.0, fw / 68.0));
  s.m2 = max(s.m2, zooOwl((p - vec2(3495.0, 420.0)) / 64.0, fw / 64.0));
  s.m2 = max(s.m2, zooBiplane((p - vec2(-3495.0, -3495.0)) / 66.0, fw / 66.0));
}

/* ---------- CHIP 2: Mixed-Signal RF & CMOS Image Sensor SoC (Copper Damascene) ---------- */
// Octagonal multi-turn copper spiral inductor SDF.
float octagonalSpiral(vec2 q, float outerR, float turns, float traceW, float pitch, float fw) {
  // L-infinity + L-1 octagonal radius
  vec2 aq = abs(q);
  float octR = max(max(aq.x, aq.y), (aq.x + aq.y) * 0.70710678);
  float innerR = outerR - turns * pitch;
  if (octR > outerR + traceW || octR < innerR - traceW) return 0.0;

  // Spiral phase shift by angle
  float ang = atan(q.y, q.x); // -pi..pi
  float rShifted = octR + (ang / TAU) * pitch;
  float ringF = fract((rShifted - innerR) / pitch);
  float distToTrace = abs(ringF - 0.5) * pitch - traceW * 0.5;
  float mask = 1.0 - smoothstep(-fw * 0.7, fw * 0.7, distToTrace);
  // Clip cleanly at outer/inner turns
  mask *= smoothstep(innerR - fw, innerR + fw, octR) * (1.0 - smoothstep(outerR - fw, outerR + fw, octR));
  return mask;
}

void evalRFSOC(vec2 p, float fw, inout ChipSample s) {
  s.metalType = 1.0; // Thick Damascene Copper top metal!
  s.oxideNm = 395.0 + vnoise(p * 0.0005) * 26.0; // Deep emerald-indigo Si3N4/SiO2 passivation

  float inCore = inRect(p, vec2(-3580.0), vec2(3580.0));
  if (inCore < 0.5) return;

  // 1. TOP-RIGHT QUADRANT (x: 150..3380, y: 150..3380): RF Transceiver — 6 Octagonal Copper Inductors!
  if (p.x > 120.0 && p.x < 3400.0 && p.y > 120.0 && p.y < 3400.0) {
    // Patterned polysilicon ground shield under RF tank
    float pShield = aaPulse(p.x / 26.0, 0.34, fw / 26.0) * aaPulse(p.y / 180.0, 0.85, fw / 180.0);
    s.poly = max(s.poly, pShield * 0.55);

    // 6 octagonal RF spiral inductors (2x3 layout)
    vec2 centers[6] = vec2[6](
      vec2(920.0, 2580.0), vec2(2460.0, 2580.0),
      vec2(920.0, 1220.0), vec2(2460.0, 1220.0),
      vec2(1690.0, 1900.0), vec2(1690.0, 580.0)
    );
    float radii[6] = float[6](560.0, 560.0, 480.0, 480.0, 340.0, 320.0);
    for (int i = 0; i < 6; i++) {
      vec2 q = p - centers[i];
      float r = radii[i];
      float spi = octagonalSpiral(q, r, 4.5, 36.0, 62.0, fw);
      // Underpass center tap in M2 + lead-out trace in M3
      float under = boxMask(q, vec2(0.0, -r * 0.55), vec2(22.0, r * 0.55), fw);
      float guard = max(boxMask(q, vec2(0.0), vec2(r + 85.0), fw) - boxMask(q, vec2(0.0), vec2(r + 58.0), fw), 0.0);
      s.m3 = max(s.m3, spi);
      s.m2 = max(s.m2, max(under, guard));
    }

    // Interdigitated MOM finger capacitor array beside RF tanks
    vec2 cq = p - vec2(1690.0, 3040.0);
    if (abs(cq.x) < 620.0 && abs(cq.y) < 220.0) {
      float fingers = aaPulse(cq.x / 14.0, 0.48, fw / 14.0) * boxMask(cq, vec2(0.0), vec2(580.0, 175.0), fw);
      float capRails = max(boxMask(cq, vec2(0.0, 185.0), vec2(590.0, 18.0), fw), boxMask(cq, vec2(0.0, -185.0), vec2(590.0, 18.0), fw));
      s.m2 = max(s.m2, max(fingers, capRails));
    }
    s.oxideNm = mix(s.oxideNm, 365.0, 0.65);
  }

  // 2. TOP-LEFT QUADRANT (x: -3380..-180, y: 180..3380): CMOS Image Sensor Photodiode Array (Bayer RGGB)!
  if (p.x > -3380.0 && p.x < -180.0 && p.y > 180.0 && p.y < 3380.0) {
    float pixP = 26.0;
    vec2 pid = floor(p / pixP);
    vec2 pf = fract(p / pixP) - 0.5;
    float gridX = aaPulse(p.x / pixP, 0.16, fw / pixP);
    float gridY = aaPulse(p.y / pixP, 0.16, fw / pixP);
    float grid = max(gridX, gridY);
    // Photodiode well & microlens dome inside each pixel
    float well = 1.0 - smoothstep(0.32 - fw / pixP, 0.32 + fw / pixP, length(pf));
    float txGate = boxMask(pf, vec2(0.28, -0.28), vec2(0.10, 0.10), fw / pixP);

    // Authentic Bayer RGGB color filter mosaic (averages neutrally when zoomed out, crisp RGGB at 50x-100x!)
    float bx = mod(pid.x, 2.0);
    float by = mod(pid.y, 2.0);
    vec3 bayer = (bx < 0.5 && by < 0.5) ? vec3(0.76, 0.24, 0.20)
               : (bx > 0.5 && by > 0.5) ? vec3(0.22, 0.42, 0.82)
               : vec3(0.26, 0.66, 0.34);
    float lod = smoothstep(0.25, 0.9, fw / pixP);
    float gratingPhase = dot(uTilt, vec2(0.8, 0.6)) * 220.0 + p.x * 0.05;
    vec3 macroIrid = thinFilmSiO2(430.0 + gratingPhase, 1.52, 0.92);

    s.diff = max(s.diff, well);
    s.m1 = max(s.m1, grid * 0.85);
    s.poly = max(s.poly, txGate);
    s.grating = max(s.grating, (1.0 - grid) * 0.95);
    s.gratingCol = mix(bayer, macroIrid, lod);
    s.oxideNm = 460.0;
  }

  // 3. BOTTOM HALF (y: -3380..-120): Mixed-Signal ADC R-2R Ladders + Digital DSP Core
  if (p.y > -3380.0 && p.y < -120.0 && abs(p.x) < 3380.0) {
    if (p.x < -420.0) {
      // Precision matched capacitor & R-2R resistor ladder arrays (symmetric analog layout!)
      vec2 q = mod(p + vec2(3380.0, 3380.0), 420.0) - 210.0;
      float frame = max(boxMask(q, vec2(0.0), vec2(182.0), fw) - boxMask(q, vec2(0.0), vec2(166.0), fw), 0.0);
      float ladder = aaPulse(q.x / 18.0, 0.44, fw / 18.0) * boxMask(q, vec2(0.0), vec2(150.0, 150.0), fw);
      s.poly = max(s.poly, ladder);
      s.m2 = max(s.m2, frame);
      s.m3 = max(s.m3, aaPulse(p.y / 420.0, 0.06, fw / 420.0));
      s.oxideNm = mix(s.oxideNm, 290.0, 0.7);
    } else {
      // Dense DSP digital standard-cell sea + Cu power mesh
      float rowH = 26.0;
      float rail = aaPulse(p.y / rowH, 0.18, fw / rowH);
      float trX = aaPulse(p.y / 9.5, 0.38, fw / 9.5) * step(0.32, hash21(vec2(floor(p.x / 120.0), floor(p.y / 9.5))));
      float trY = aaPulse(p.x / 9.5, 0.38, fw / 9.5) * step(0.36, hash21(vec2(floor(p.x / 9.5), floor(p.y / 120.0))));
      float cuMesh = max(aaPulse(p.x / 340.0, 0.075, fw / 340.0), aaPulse(p.y / 340.0, 0.075, fw / 340.0));
      s.poly = max(s.poly, aaPulse(p.x / 6.5, 0.35, fw / 6.5) * (1.0 - rail));
      s.m1 = max(s.m1, max(rail, trX * 0.9));
      s.m2 = max(s.m2, trY * 0.85);
      s.m3 = max(s.m3, cuMesh * 0.9);
      s.via = max(s.via, trX * trY * aaPulse(p.x / 9.5, 0.24, fw / 9.5));
      s.oxideNm = mix(s.oxideNm, 330.0 + hash21(floor(p / 520.0)) * 160.0, 0.7);
    }
  }

  // Hidden Silicon Zoo mask art in RF margins
  s.m3 = max(s.m3, zooGecko((p - vec2(-320.0, -3490.0)) / 66.0, fw / 66.0));
  s.m3 = max(s.m3, zooConcorde((p - vec2(3495.0, -35.0)) / 66.0, fw / 66.0));
}

/* ---------- evaluate complete physical die sample ---------- */
ChipSample sampleDie(vec2 p, float fw) {
  ChipSample s;
  s.diff = 0.0; s.poly = 0.0; s.m1 = 0.0; s.m2 = 0.0; s.m3 = 0.0; s.via = 0.0;
  s.oxideNm = 340.0; s.grating = 0.0; s.gratingCol = vec3(0.0);
  s.padOpen = 0.0; s.probeMark = 0.0; s.metalType = 0.0; s.region = 0.0;
  s.heightUm = 0.0; s.topLayerZ = 0.0;

  evalPerimeter(p, fw, uChip, s);
  if (s.region < 0.5) {
    if (uChip == 0) evalNMOS79(p, fw, s);
    else if (uChip == 1) evalCMOS94(p, fw, s);
    else evalRFSOC(p, fw, s);

    // Physical surface height profile (in microns) & dominant focal layer Z
    s.heightUm = s.diff * 0.14 + s.poly * 0.38 + s.m1 * 0.65 + s.m2 * 0.78 + s.m3 * 0.95 - s.via * 0.26 - s.probeMark * 0.42;
    s.topLayerZ = 0.0;
    if (s.diff > 0.25) s.topLayerZ = 0.12;
    if (s.poly > 0.25) s.topLayerZ = 0.48;
    if (s.m1 > 0.25)   s.topLayerZ = 1.20;
    if (s.m2 > 0.25)   s.topLayerZ = 2.25;
    if (s.m3 > 0.25)   s.topLayerZ = 3.45;
  }
  return s;
}

/* ---------- 3D arching gold wirebonds from perimeter pads to ceramic leadframe ---------- */
// Returns vec4(coverage, normalX, normalY, wireZ_um)
vec4 evalWirebonds(vec2 p, float fw, int chip) {
  float edge = max(abs(p.x), abs(p.y));
  if (edge < 3520.0 || edge > 5450.0) return vec4(0.0);

  float perSide = chip == 0 ? 10.0 : (chip == 1 ? 16.0 : 18.0);
  float span = 3380.0;
  float pitch = (2.0 * span) / max(1.0, perSide - 1.0);
  bool isTopBot = abs(p.y) > abs(p.x);
  float along = isTopBot ? p.x : p.y;
  float rad = isTopBot ? abs(p.y) : abs(p.x);

  float idx = clamp(floor(along / pitch + 0.5), -perSide * 0.5, perSide * 0.5);
  float a0 = idx * pitch;
  if (abs(a0) > span + 2.0) return vec4(0.0);

  // Wirebond starts at bond pad (rad = 3680) and arcs out to leadframe finger (rad = 5150)
  float a1 = a0 * 1.09; // gentle fan-out to package
  vec2 startP = vec2(a0, 3680.0);
  vec2 endP = vec2(a1, 5150.0);
  vec2 q = vec2(along, rad);

  // Gold ball-bond squash sitting right on the pad
  float ballR = chip == 0 ? 44.0 : 32.0;
  float dBall = length(q - startP) - ballR;

  // Wire loop shaft (25 um diameter gold wire -> radius 13 um)
  vec2 ba = endP - startP;
  float t = clamp(dot(q - startP, ba) / max(dot(ba, ba), 1.0), 0.0, 1.0);
  vec2 closest = startP + ba * t;
  vec2 perp = q - closest;
  float wireR = 13.5;
  float dWire = length(perp) - wireR;

  // Arch height above die (rises to +38 um at loop apex, drops down to leadframe)
  float wireZ = mix(3.6, -4.0, t) + 36.0 * sin(PI * pow(t, 0.72));
  float ballZ = 6.5;

  // Defocus widens the wire silhouette naturally when focal plane sits far below!
  float cocW = abs(wireZ - uFocusUm) * uNA * uNA * 4.5;
  float effFw = max(fw, cocW * 0.55);

  float wireCov = 1.0 - smoothstep(-effFw, effFw, dWire);
  // Attenuate wire opacity slightly when heavily defocused (real translucent bokeh halo)
  wireCov *= 1.0 / (1.0 + cocW * 0.025);

  float ballCov = 1.0 - smoothstep(-fw * 1.2, fw * 1.2, dBall);

  if (ballCov >= wireCov && ballCov > 0.01) {
    vec2 bn = (q - startP) / max(ballR, 1.0);
    return vec4(ballCov, bn.x, bn.y, ballZ);
  }
  if (wireCov > 0.01) {
    vec2 wn = perp / max(wireR + effFw, 1.0);
    return vec4(wireCov, isTopBot ? wn.x : wn.y, isTopBot ? wn.y : wn.x, wireZ);
  }
  return vec4(0.0);
}

void main() {
  float aspect = uRes.x / max(1.0, uRes.y);
  vec2 ndc = (vUv - 0.5) * 2.0;
  vec2 p = uCamUm + vec2(ndc.x * aspect, ndc.y) * uFovHalfUm;

  // Optical pixel footprint + Abbe diffraction limit (lambda / 2*NA ~ 0.55 / 2*NA um)
  float umPerPx = (2.0 * uFovHalfUm) / max(1.0, uRes.y);
  float opticalLimit = 0.28 / max(0.15, uNA);
  float fw = max(umPerPx, opticalLimit);

  // Sample central point and two orthogonal neighbors for physical height gradient (brightfield dark edges + DIC relief + darkfield scatter!)
  ChipSample s = sampleDie(p, fw);
  float eps = max(fw * 0.85, 0.55);
  ChipSample sx = sampleDie(p + vec2(eps, 0.0), fw);
  ChipSample sy = sampleDie(p + vec2(0.0, eps), fw);
  // Scale-balanced optical slope so Brightfield dark rims, Darkfield scatter and DIC relief hold crisp contrast from 5x to 100x.
  vec2 gradH = vec2(sx.heightUm - s.heightUm, sy.heightUm - s.heightUm) / pow(eps, 0.55);
  float slopeMag = length(gradH);

  // Polycrystalline metal grain (~2.2 um crystal facets) & microscopic CMP polish scratches
  float grainEdge = 0.0;
  float grainId = voronoiCell(p * 0.42, grainEdge);
  float grainLod = 1.0 - smoothstep(1.2, 4.5, fw);
  float alGrain = mix(1.0, 0.90 + 0.18 * grainId - 0.14 * (1.0 - smoothstep(0.0, 0.18, grainEdge)), grainLod);
  // Subtle micro-scratches from CMP slurry
  float scratch = sin(dot(p, vec2(0.18, 0.31)) + vnoise(p * 0.015) * 4.0);
  float cmpScratch = mix(0.0, smoothstep(0.985, 1.0, scratch) * 0.12, grainLod);

  // Illumination & view geometry
  vec3 L = normalize(vec3(uTilt * 0.42, 1.0));
  vec3 N = normalize(vec3(-gradH * 3.8, 1.0));
  float ndl = clamp(dot(N, L), 0.0, 1.0);

  // Compose layered material reflectance (Brightfield physical base)
  vec3 bfCol = vec3(0.0);
  vec3 dfCol = vec3(0.0);
  vec3 dicCol = vec3(0.0);
  vec3 nirCol = vec3(0.0);

  if (s.region < 0.5) {
    // 1. Bare Silicon + SiO2 Thin-Film Oxide Interference (substrate + diffusion + poly)
    float oxThick = s.oxideNm + s.diff * 52.0 + s.poly * 78.0 + dot(uTilt, vec2(12.0, -9.0));
    vec3 film = thinFilmSiO2(oxThick, uChip == 2 ? 1.56 : 1.46, clamp(N.z, 0.5, 1.0));

    // Bare silicon substrate base modulated by SiO2 interference
    vec3 subCol = mix(vec3(0.14, 0.15, 0.17), film * 0.88, 0.82);
    // Diffusion regions slightly darker & shifted in oxide thickness
    subCol = mix(subCol, subCol * vec3(0.76, 0.80, 0.86), s.diff * 0.65);
    // Polysilicon gates: darker bronze-olive / violet sheen under oxide
    vec3 polyCol = mix(vec3(0.26, 0.23, 0.28), film * vec3(0.95, 0.85, 0.72), 0.65);
    subCol = mix(subCol, polyCol, s.poly * 0.82);

    // Blend Bragg grating / Bayer sensor optical reflectance
    if (s.grating > 0.01) {
      subCol = mix(subCol, s.gratingCol * 0.84, s.grating * 0.68);
    }

    // Metallic layers (realistic Al-Si-Cu pale warm silver vs Damascene Cu warm rose-gold)
    vec3 alBase = vec3(0.76, 0.77, 0.74) * alGrain;
    vec3 cuBase = vec3(0.84, 0.61, 0.49) * alGrain;
    vec3 m1Base = mix(alBase * 0.86, cuBase * 0.84, s.metalType * 0.5);
    vec3 m2Base = mix(alBase * 0.94, cuBase * 0.92, s.metalType * 0.75);
    vec3 m3Base = mix(alBase * 1.02, cuBase * 1.04, s.metalType);

    // Subtle passivation overcoat interference tints buried M1/M2 slightly, while open bond pads are pure raw Al
    vec3 passivTint = mix(vec3(1.0), 0.84 + 0.28 * film, 0.35 * (1.0 - s.padOpen));
    vec3 col = subCol;
    col = mix(col, m1Base * passivTint, s.m1 * 0.88);
    col = mix(col, m2Base * mix(vec3(1.0), passivTint, 0.6), s.m2 * 0.93);
    // Open bond pads show bare crystalline aluminium with darker diamond probe scrub marks
    vec3 topMetal = mix(m3Base * mix(vec3(1.0), passivTint, 0.3), alBase * 1.06, s.padOpen);
    topMetal *= (1.0 - s.probeMark * 0.58);
    col = mix(col, topMetal, s.m3);

    // Contact / via holes: crisp dark square craters with bright metal rim
    col = mix(col, col * 0.24, s.via * 0.82);

    // CRITICAL BRIGHTFIELD PHYSICS: sloped etch sidewalls scatter light OUTSIDE the objective NA -> crisp dark step borders!
    float edgeDarken = exp(-slopeMag * 4.2);
    bfCol = col * (0.30 + 0.70 * edgeDarken) * (0.78 + 0.26 * ndl) - cmpScratch * 0.35;

    // 2. DARKFIELD PHYSICS: flat planar surfaces drop to obsidian black; ONLY edges, vias, scratches & gratings scatter light!
    float edgeScatter = 1.0 - exp(-slopeMag * 6.5);
    float metalMask = max(s.m1, max(s.m2, s.m3));
    vec3 scatterTint = mix(film * 1.25 + vec3(0.28), mix(vec3(0.96, 0.92, 0.80), vec3(1.0, 0.78, 0.54), s.metalType), metalMask * 0.7);
    dfCol = vec3(0.010, 0.011, 0.014)
          + scatterTint * (edgeScatter * 0.95 + s.via * 0.45 + s.probeMark * 0.85 + cmpScratch * 1.4)
          + s.gratingCol * s.grating * (0.28 + 0.32 * abs(sin(dot(p, vec2(0.015, 0.01)) + uTilt.x * 5.0)));

    // 3. NOMARSKI DIC PHYSICS: Wollaston prism directional slope contrast mapped through Michel-Levy retardation!
    vec2 shearDir = normalize(vec2(0.74, 0.67) + uTilt * 0.35);
    float shear = dot(gradH, shearDir);
    // Background sits at first-order ~310nm warm pearl-grey; slopes shift +/- 190nm into bright ivory-gold and deep indigo-bronze!
    float gamma = clamp(315.0 + shear * 460.0 + (s.m3 * 45.0 - s.diff * 35.0) + uTilt.x * 65.0, 40.0, 740.0);
    dicCol = michelLevyDIC(gamma) * (0.68 + 0.32 * alGrain);
    dicCol *= (0.72 + 0.28 * exp(-slopeMag * 1.6));
    dicCol = mix(dicCol, dicCol * 0.45, s.probeMark * 0.7);

    // 4. NIR 1050 nm THROUGH-SILICON INSPECTION: crisp monochrome failure-analysis imaging!
    // Silicon becomes transparent; metal & heavily doped diffusion reflect strongly in monochrome silver-grey.
    float nirVal = 0.14 + s.diff * 0.24 + s.poly * 0.20 + s.m1 * 0.46 + s.m2 * 0.52 + s.m3 * 0.62 - s.via * 0.28;
    nirVal *= (0.52 + 0.48 * edgeDarken) * (0.88 + 0.12 * alGrain);
    nirCol = vec3(nirVal * 0.97, nirVal * 0.98, nirVal * 1.00);

  } else if (s.region < 1.5) {
    // Scribe street: raw diamond-sawn grey crystalline silicon + PCM test pads
    float sawn = vnoise(p * 0.35) * 0.14 + vnoise(p * 0.06) * 0.08;
    vec3 rawSi = vec3(0.24, 0.25, 0.27) + sawn;
    vec3 pcm = vec3(0.76, 0.77, 0.74) * alGrain;
    float ed = exp(-slopeMag * 4.0);
    bfCol = mix(rawSi, pcm, s.m3) * (0.45 + 0.55 * ed);
    dfCol = vec3(0.015) + vec3(0.65, 0.68, 0.72) * (1.0 - ed) * 0.8 + vec3(0.18) * sawn;
    dicCol = michelLevyDIC(290.0 + dot(gradH, vec2(0.7, 0.7)) * 420.0) * (0.72 + sawn);
    nirCol = vec3(0.22 + s.m3 * 0.55 + sawn * 0.4);
  } else if (s.region < 2.5) {
    // Silver-filled conductive epoxy fillet around the die edge
    float flake = vnoise(p * 0.22);
    float spec = pow(vnoise(p * 0.55), 4.0);
    bfCol = vec3(0.06, 0.062, 0.068) + vec3(0.14) * flake + vec3(0.28) * spec;
    dfCol = vec3(0.012) + vec3(0.32) * spec;
    dicCol = vec3(0.10, 0.10, 0.11) + vec3(0.15) * flake;
    nirCol = vec3(0.08 + 0.12 * flake);
  } else if (s.region < 3.5) {
    // Matte dark alumina ceramic package cavity
    float cerEdge = 0.0;
    float cer = voronoiCell(p * 0.08, cerEdge);
    bfCol = vec3(0.048, 0.048, 0.054) * (0.84 + 0.32 * cer);
    dfCol = vec3(0.006) + vec3(0.04) * (1.0 - smoothstep(0.0, 0.25, cerEdge));
    dicCol = vec3(0.07, 0.072, 0.078) * (0.85 + 0.30 * cer);
    nirCol = vec3(0.06 * (0.85 + 0.30 * cer));
  } else {
    // Gold-plated Kovar package leadframe finger
    vec3 gold = vec3(0.86, 0.70, 0.34) * (0.90 + 0.16 * alGrain);
    bfCol = gold * (0.68 + 0.32 * ndl);
    dfCol = vec3(0.02) + gold * (1.0 - exp(-slopeMag * 4.5)) * 1.1;
    dicCol = mix(michelLevyDIC(420.0), gold, 0.45);
    nirCol = vec3(0.68 * (0.9 + 0.1 * alGrain));
  }

  vec3 col = bfCol * uModeW.x + dfCol * uModeW.y + dicCol * uModeW.z + nirCol * uModeW.w;

  // Per-pixel circle-of-confusion from focal distance & objective NA^2
  float cocUm = abs(s.topLayerZ - uFocusUm) * (uNA * uNA) * 2.6;
  float cocPx = clamp(cocUm / max(0.35, umPerPx), 0.0, 22.0);

  // Subtle cast shadow under arching wirebonds onto die edge & ceramic cavity
  vec4 wbSh = evalWirebonds(p - vec2(uTilt.x * 24.0 + 16.0, uTilt.y * 24.0 - 18.0), fw * 2.2, uChip);
  if (wbSh.x > 0.01) {
    col *= (1.0 - wbSh.x * 0.36 * (1.0 - uModeW.y));
  }

  // Crisp dicing bevel highlight at the 4000 um silicon die perimeter
  float edge4k = abs(max(abs(p.x), abs(p.y)) - 4000.0);
  float dieBevel = 1.0 - smoothstep(0.0, max(12.0, fw * 2.5), edge4k);
  col = mix(col, mix(vec3(0.10, 0.11, 0.13), vec3(0.62, 0.65, 0.70), uModeW.y), dieBevel * 0.55);

  // Overlay 3D gold ball-bonds & arching wirebonds on top (with realistic focal blur!)
  vec4 wb = evalWirebonds(p, fw, uChip);
  if (wb.x > 0.005) {
    float cylShade = clamp(sqrt(max(0.0, 1.0 - dot(wb.yz, wb.yz))), 0.0, 1.0);
    vec3 wN = normalize(vec3(wb.yz, max(0.15, cylShade)));
    float wSpec = pow(clamp(dot(wN, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 22.0);
    vec3 goldBase = vec3(0.88, 0.69, 0.28);
    vec3 wBf = goldBase * (0.38 + 0.62 * cylShade) + vec3(1.0, 0.94, 0.76) * wSpec * 0.75;
    vec3 wDf = goldBase * (0.18 + 0.95 * (1.0 - cylShade) + wSpec * 0.8);
    vec3 wDic = mix(michelLevyDIC(340.0 + wb.y * 210.0), goldBase, 0.45);
    vec3 wNir = vec3(0.45 + 0.45 * cylShade + wSpec * 0.35);
    vec3 wCol = wBf * uModeW.x + wDf * uModeW.y + wDic * uModeW.z + wNir * uModeW.w;

    col = mix(col, wCol, wb.x);
    float wCoc = clamp(abs(wb.w - uFocusUm) * (uNA * uNA) * 2.2 / max(0.35, umPerPx), 0.0, 22.0);
    cocPx = mix(cocPx, wCoc, wb.x);
  }

  // Pack normalized CoC (0..1 -> 0..22 px) in alpha for Pass 2 optical PSF bokeh.
  outCol = vec4(max(col, vec3(0.0)), clamp(cocPx / 22.0, 0.0, 1.0));
}
`;

export const OPTICS_FS = GLSL_HEAD + /* glsl */ `
in vec2 vUv;
out vec4 outCol;

uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uTime;
uniform float uReduced;
uniform float uDarkfield;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 12-tap Vogel / Poisson optical disk for clean physical out-of-focus bokeh.
const vec2 DISK[12] = vec2[12](
  vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696,  0.457),
  vec2(-0.203,  0.621), vec2( 0.962, -0.195), vec2( 0.473, -0.480),
  vec2( 0.519,  0.767), vec2( 0.185, -0.893), vec2( 0.507,  0.064),
  vec2( 0.896,  0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598)
);

void main() {
  vec2 px = 1.0 / max(uRes, vec2(1.0));
  vec4 center = texture(uSrc, vUv);
  float cocPx = center.a * 22.0;

  vec2 centered = vUv - 0.5;
  float aspect = uRes.x / max(1.0, uRes.y);
  vec2 radial = vec2(centered.x * aspect, centered.y);
  float r2 = dot(radial, radial);

  vec3 col;
  if (cocPx > 0.35) {
    // True circular optical PSF blur weighted by local circle of confusion
    vec3 acc = center.rgb * 1.4;
    float wSum = 1.4;
    float rad = min(cocPx, 14.0);
    for (int i = 0; i < 12; i++) {
      vec4 tap = texture(uSrc, vUv + DISK[i] * px * rad);
      float w = 0.65 + 0.35 * step(0.15, tap.a * 22.0);
      acc += tap.rgb * w;
      wSum += w;
    }
    col = acc / wSum;
  } else {
    // Subtle lateral objective chromatic dispersion only toward the field periphery
    vec2 ca = centered * (0.00075 * r2) * (1.0 - 0.8 * uReduced);
    col.r = texture(uSrc, vUv + ca).r;
    col.g = center.g;
    col.b = texture(uSrc, vUv - ca).b;
  }

  // Natural Kohler optical field-stop vignette (subtle, realistic metallurgical tube lens falloff)
  float vigStrength = mix(0.28, 0.38, uDarkfield);
  float vig = 1.0 - smoothstep(0.22, 1.45, r2) * vigStrength;
  col *= vig;

  // Subtle scientific CMOS shot noise (keeps smooth oxide gradients banding-free)
  float seed = uReduced > 0.5 ? 0.0 : floor(uTime * 12.0) * 0.17;
  float grain = (hash(gl_FragCoord.xy + seed) - 0.5) * 0.014;
  col += grain;

  // Neutral photographic S-curve (no cartoon glow or neon oversaturation)
  col = max(col, vec3(0.0));
  col = (col * (2.45 * col + 0.04)) / (col * (2.38 * col + 0.62) + 0.13);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 1.04));

  outCol = vec4(col, 1.0);
}
`;
