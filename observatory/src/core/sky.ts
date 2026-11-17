// Sky maths.
// Angles are in degrees.
// Azimuth runs from north through east.

export type AltAz = { alt: number; az: number };

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const wrap360 = (d: number): number => ((d % 360) + 360) % 360;

// Greenwich mean sidereal time for a UTC time in ms (Meeus 12.4).
export function gmst(ms: number): number {
  const jd = ms / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  const g = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000;
  return wrap360(g);
}

// Local sidereal time in degrees for a UTC time in ms.
// East longitude is positive.
export function lst(ms: number, lonDeg: number): number {
  return wrap360(gmst(ms) + lonDeg);
}

// The altitude and azimuth of a star at an LST and latitude.
export function toAltAz(raDeg: number, decDeg: number, lstDeg: number, latDeg: number): AltAz {
  const ha = (lstDeg - raDeg) * RAD;
  const dec = decDeg * RAD;
  const lat = latDeg * RAD;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // Azimuth runs from north through east.
  // It is atan2(-sin H, tan dec cos lat - sin lat cos H).
  const y = -Math.sin(ha) * Math.cos(dec);
  const x = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
  return { alt: alt * DEG, az: wrap360(Math.atan2(y, x) * DEG) };
}

// The RA and Dec at an altitude and azimuth: toAltAz in reverse.
export function toRaDec(a: AltAz, lstDeg: number, latDeg: number): { ra: number; dec: number } {
  const alt = a.alt * RAD;
  const az = a.az * RAD;
  const lat = latDeg * RAD;
  const sinDec = Math.sin(alt) * Math.sin(lat) + Math.cos(alt) * Math.cos(lat) * Math.cos(az);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const y = -Math.sin(az) * Math.cos(alt);
  const x = Math.sin(alt) * Math.cos(lat) - Math.cos(alt) * Math.sin(lat) * Math.cos(az);
  const ha = Math.atan2(y, x) * DEG;
  return { ra: wrap360(lstDeg - ha), dec: dec * DEG };
}

/* ---------- the star shell's sky matrix ---------- */
// sky/stars.ts draws the stars on a shell.
// One matrix turns the shell.
// Scene axes: x east, y up, z south.
export type Vec3 = { x: number; y: number; z: number };

// A star's unit direction on the shell, at LST zero.
// x points to the meridian, y west, z to the pole.
export function shellDir(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * RAD, dec = decDeg * RAD, cd = Math.cos(dec);
  return { x: cd * Math.cos(ra), y: -cd * Math.sin(ra), z: Math.sin(dec) };
}

// The sky matrix for an LST and a latitude.
// It is 3 by 3, row by row.
// It turns the shell by the LST about the pole.
// Then it tilts the pole up to the latitude, due north.
// Rows are the scene x, y and z.
// Columns take the shell's x, y and z.
export function skyRows(lstDeg: number, latDeg: number): number[] {
  const L = lstDeg * RAD, cl = Math.cos(L), sl = Math.sin(L);
  const cp = Math.cos(latDeg * RAD), sp = Math.sin(latDeg * RAD);
  return [
    -sl, -cl, 0,
    cp * cl, -cp * sl, sp,
    sp * cl, -sp * sl, -cp,
  ];
}

// A shell direction in scene axes, through the sky matrix m.
export function turn(m: number[], d: Vec3): Vec3 {
  return {
    x: m[0] * d.x + m[1] * d.y + m[2] * d.z,
    y: m[3] * d.x + m[4] * d.y + m[5] * d.z,
    z: m[6] * d.x + m[7] * d.y + m[8] * d.z,
  };
}

// The altitude and azimuth of a unit direction in scene axes.
export function dirAltAz(d: Vec3): AltAz {
  return { alt: Math.asin(Math.max(-1, Math.min(1, d.y))) * DEG, az: wrap360(Math.atan2(d.x, -d.z) * DEG) };
}
