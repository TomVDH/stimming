// Fruit skins use separate relief and finish profiles.
const profiles = {
  lemon: { coat: 0.22, rough: 0.52, bloom: 0.02, velvet: 0, height: '-0.004 * pow(vn(p * 90.0), 3.0)' },
  mango: { coat: 0.28, rough: 0.48, bloom: 0.08, velvet: 0, height: '0.001 * vn(p * 100.0) + 0.0015 * vn(p * 15.0)' },
  avocado: { coat: 0.04, rough: 0.76, bloom: 0.08, velvet: 0, height: '0.008 * vn(p * 42.0) + 0.003 * vn(p * 90.0)' },
  papaya: { coat: 0.2, rough: 0.52, bloom: 0.1, velvet: 0, height: '0.0013 * vn(p * 90.0) + 0.002 * vn(p * 12.0)' },
  coconut: { coat: 0, rough: 0.94, bloom: 0.1, velvet: 0.5, height: '0.006 * vn(p * vec3(14.0, 85.0, 85.0)) + 0.003 * vn(p * 40.0)' },
  kiwi: { coat: 0.02, rough: 0.82, bloom: 0.1, velvet: 0.65, height: '0.0018 * vn(p * 85.0) + 0.0025 * vn(p * vec3(18.0, 48.0, 48.0))' },
  pomegranate: { coat: 0.55, rough: 0.36, bloom: 0.04, velvet: 0.0, height: '0.0012 * vn(p * 95.0) + 0.0018 * vn(p * 18.0)' },
  orange: { coat: 0.32, rough: 0.46, bloom: 0.0, velvet: 0.0, height: '-0.005 * pow(vn(p * 75.0), 3.0) + 0.0015 * vn(p * 160.0)' },
  peach: { coat: 0.01, rough: 0.88, bloom: 0.16, velvet: 0.85, height: '0.001 * vn(p * 110.0) + 0.0018 * vn(p * 24.0)' },
  dragon: { coat: 0.22, rough: 0.5, bloom: 0.08, velvet: 0.0, height: '0.0013 * vn(p * 90.0) + 0.003 * vn(p * vec3(10.0, 24.0, 24.0))' },
  rambutan: { coat: 0.08, rough: 0.67, bloom: 0.05, velvet: 0.25, height: '0.003 * vn(p * 28.0) + 0.001 * vn(p * 100.0)' },
  mangosteen: { coat: 0.65, rough: 0.34, bloom: 0.12, velvet: 0.0, height: '0.0014 * vn(p * 65.0) + 0.0025 * vn(p * 12.0)' },
  passion: { coat: 0.14, rough: 0.59, bloom: 0.16, velvet: 0.0, height: '-0.008 * pow(vn(p * 13.0), 2.0) + 0.001 * vn(p * 95.0)' },
  starfruit: { coat: 0.5, rough: 0.33, bloom: 0.0, velvet: 0.0, height: '0.0009 * vn(p * 110.0) + 0.0016 * vn(p * vec3(9.0, 55.0, 55.0))' },
  fig: { coat: 0.07, rough: 0.72, bloom: 0.55, velvet: 0.15, height: '0.0015 * vn(p * 85.0) + 0.002 * vn(p * vec3(12.0, 35.0, 35.0))' },
};

export function skinSurface(id) {
  const s = profiles[id] || profiles.kiwi;
  return /* glsl */`
float skinRelief(vec3 p) { return ${s.height}; }
vec3 skinNormal(vec3 n, vec3 world, float height) {
  vec3 dx = dFdx(world), dy = dFdy(world);
  vec3 a = cross(dy, n), b = cross(n, dx);
  float det = dot(dx, a);
  vec3 gradient = sign(det) * (dFdx(height) * a + dFdy(height) * b) * 0.5;
  return normalize(abs(det) * n - gradient + n * 0.0000001);
}
vec3 skinBRDF(vec3 base, vec3 n, vec3 v, vec3 p, float detailRough, float fuzz) {
  float finishMask = smoothstep(0.3, 0.75, vn(p * 8.0));
  float dust = ${s.bloom.toFixed(3)} * finishMask;
  float rough = clamp(${s.rough.toFixed(3)} + detailRough * 0.35 + dust * 0.22, 0.18, 0.96);
  float coat = ${s.coat.toFixed(3)} * (1.0 - dust) * (1.0 - fuzz);
  float nv = max(dot(n, v), 0.001);
  float reflectance = fresnel(nv, 0.035);
  vec3 diffuse = base * (1.0 - reflectance) * (1.0 - coat * 0.04);
  float nk = max(dot(n, uKeyDir), 0.0), nr = max(dot(n, uRimDir), 0.0);
  vec3 col = diffuse * (uKeyCol * nk * 0.75 + uRimCol * nr * 0.28 + hemi(n) * 0.8);
  col += directSpec(n, v, uKeyDir, uKeyCol, rough, 0.035);
  col += directSpec(n, v, uRimDir, uRimCol, rough, 0.035) * 0.6;
  col += studio(reflect(-v, n), rough) * reflectance * (1.0 - dust * 0.65);
  float cr = mix(0.18, 0.3, finishMask);
  col += coat * (studio(reflect(-v, n), cr) * fresnel(nv, 0.028)
    + directSpec(n, v, uKeyDir, uKeyCol, cr, 0.028) * 0.45);
  float velvet = ${s.velvet.toFixed(3)} * (0.3 + fuzz * 0.7);
  col += sqrt(max(base, vec3(0.0))) * velvet * pow(1.0 - nv, 3.0)
    * (uKeyCol * nk + uRimCol * nr) * 0.22;
  return col;
}`;
}
