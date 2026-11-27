// Fruit-piece contacts on the table. A piece supplies a few circles sampled from
// its rendered hull, so long wedges do not collapse into one undersized proxy.

function resolveCircleContact(a, b, dx, dz, distance, penetration, fallback) {
  const push = Math.max(0, penetration + 0.006);
  if (distance < 1e-6) {
    dx = fallback < 0 ? -1 : 1;
    dz = fallback < 0 ? -0.37 : 0.37;
    distance = Math.hypot(dx, dz);
  }
  const nx = dx / distance, nz = dz / distance;
  const ia = 1 / a.mass, ib = 1 / b.mass, invMass = ia + ib;
  a.slide.x -= nx * push * ia / invMass;
  a.slide.y -= nz * push * ia / invMass;
  b.slide.x += nx * push * ib / invMass;
  b.slide.y += nz * push * ib / invMass;

  const rvx = b.slideV.x - a.slideV.x, rvz = b.slideV.y - a.slideV.y;
  const normalV = rvx * nx + rvz * nz;
  if (normalV >= 0) return;
  const restitution = normalV < -0.35 ? 0.08 : 0;
  const normalImpulse = -((1 + restitution) * normalV) / invMass;
  a.slideV.x -= nx * normalImpulse * ia;
  a.slideV.y -= nz * normalImpulse * ia;
  b.slideV.x += nx * normalImpulse * ib;
  b.slideV.y += nz * normalImpulse * ib;

  // A little tangential friction stops adjacent wet wedges skating through one another.
  const tx = -nz, tz = nx;
  const tangentV = rvx * tx + rvz * tz;
  const tangentImpulse = Math.max(-normalImpulse * 0.28, Math.min(normalImpulse * 0.28, -tangentV / invMass));
  a.slideV.x -= tx * tangentImpulse * ia;
  a.slideV.y -= tz * tangentImpulse * ia;
  b.slideV.x += tx * tangentImpulse * ib;
  b.slideV.y += tz * tangentImpulse * ib;
  if ('turnV' in a && 'turnV' in b) {
    const spin = tangentImpulse * 0.22;
    a.turnV -= spin * ia;
    b.turnV += spin * ib;
  }
}

// Resolve the deepest overlap between two small compound footprints. The caller
// rebuilds the transformed circles and repeats, keeping the solver cheap and stable.
export function resolveCompoundPair(a, b, ac, bc, fallback = 1) {
  let bestPen = 0, bestDx = 0, bestDz = 0, bestDistance = 0;
  for (const x of ac) for (const y of bc) {
    const dx = y.x - x.x, dz = y.z - x.z;
    const gap = x.r + y.r + 0.018;
    const distance = Math.hypot(dx, dz);
    const penetration = gap - distance;
    if (penetration > bestPen) {
      bestPen = penetration; bestDx = dx; bestDz = dz; bestDistance = distance;
    }
  }
  if (bestPen <= 0) return false;
  resolveCircleContact(a, b, bestDx, bestDz, bestDistance, bestPen, fallback);
  return true;
}
