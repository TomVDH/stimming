// Both halves sample one continuous fruit-space surface.
export function harvestShape(id, t, ph, e) {
  const x = (e > 0 ? 1 : -1) * t;
  const a = e > 0 ? -ph : ph;
  const envelope = Math.sqrt(Math.max(0, 1 - t*t));
  if (id === 'lemon') return envelope * (1 - 0.22*t**4) * (1 + 0.012*Math.cos(a*6)*(1-t*t));
  if (id === 'mango') return envelope * (1 - 0.14*x - 0.08*x*x + 0.07*Math.sin(a)*x*x);
  if (id === 'avocado') return envelope * (1 - 0.32*x - 0.12*x*x);
  if (id === 'papaya') return envelope * (1 - 0.12*x + 0.025*Math.cos(a*5)*(1-t*t));
  return envelope * (1 + 0.028*Math.cos(a*3)*(1-t*t) + 0.012*Math.cos(a*7 + x*3)*(1-t*t));
}
