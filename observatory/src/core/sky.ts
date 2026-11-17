// Sky maths. Angles are in degrees. Azimuth runs from north through east.

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

// Local sidereal time. East longitude is positive.
export function lst(ms: number, lonDeg: number): number {
  return wrap360(gmst(ms) + lonDeg);
}

export function toAltAz(raDeg: number, decDeg: number, lstDeg: number, latDeg: number): AltAz {
  const ha = (lstDeg - raDeg) * RAD;
  const dec = decDeg * RAD;
  const lat = latDeg * RAD;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // Azimuth from north through east: atan2(-sin H, tan dec cos lat - sin lat cos H).
  const y = -Math.sin(ha) * Math.cos(dec);
  const x = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
  return { alt: alt * DEG, az: wrap360(Math.atan2(y, x) * DEG) };
}

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
