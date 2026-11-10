// Act 2 probe: a gold bus, a dish, a boom and two folding solar wings.
// Metres; y points forward, as on the rocket. The bus base sits at y 0.
import * as THREE from 'three';

// Crinkled foil: a noise bump on a gold metal.
function foilTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 4 + rnd() * 18, v = Math.floor(90 + rnd() * 90);
    g.fillStyle = `rgba(${v},${v},${v},0.35)`;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) g.lineTo(x + (rnd() - 0.5) * r * 2, y + (rnd() - 0.5) * r * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}
// Solar cells: dark blue squares with silver gaps.
function cellTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#b8bcc4'; g.fillRect(0, 0, 256, 384);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = `hsl(228, 55%, ${12 + ((x * 7 + y * 3) % 5)}%)`;
    g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const PANELS = 3, PL = 1.35, PW = 0.95, PT = 0.035;
const ease = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
// A small overshoot just before each hinge locks.
const settle = x => { const t = Math.min(1, Math.max(0, x)); return 1 - (1 - t) ** 3 + 0.04 * Math.sin(t * Math.PI * 2 - Math.PI) * t; };

export function makeProbe() {
  const bump = foilTexture();
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0ac48, metalness: 1, roughness: 0.38, bumpMap: bump, bumpScale: 3, envMapIntensity: 2.5 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 1, roughness: 0.25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, metalness: 0.1, roughness: 0.6, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1b20, metalness: 0.4, roughness: 0.5 });
  const cells = new THREE.MeshStandardMaterial({ map: cellTexture(), metalness: 0.6, roughness: 0.28 });
  const back = new THREE.MeshStandardMaterial({ color: 0x3a3c42, metalness: 0.5, roughness: 0.6 });
  const add = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

  const group = new THREE.Group();
  // The bus: a six-sided prism in foil, with a dark deck on top.
  add(new THREE.CylinderGeometry(1.0, 1.0, 1.6, 6).translate(0, 0.8, 0), gold, group);
  add(new THREE.CylinderGeometry(1.02, 1.02, 0.06, 6).translate(0, 1.63, 0), dark, group);
  add(new THREE.CylinderGeometry(0.75, 0.9, 0.25, 24).translate(0, -0.12, 0), dark, group);
  // The dish faces forward on three short struts.
  const dishPts = [];
  for (let i = 0; i <= 12; i++) { const r = 1.15 * i / 12; dishPts.push(new THREE.Vector2(r, 2.15 + 0.22 * (r / 1.15) ** 2)); }
  // The dish casts but does not take shadow; a thin shell shows acne.
  add(new THREE.LatheGeometry(dishPts, 48), white, group).receiveShadow = false;
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6).translate(0, 2.0, 0).rotateZ(0), silver, group);
  for (let i = 0; i < 3; i++) {
    const s = add(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), silver, group);
    const a = i * Math.PI * 2 / 3;
    s.position.set(Math.cos(a) * 0.5, 1.9, Math.sin(a) * 0.5);
    s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
  }
  // A thin boom grows out the back-left as the wings open.
  const boom = add(new THREE.CylinderGeometry(0.025, 0.025, 1, 6).translate(0, 0.5, 0), silver, new THREE.Group());
  const boomRoot = boom.parent;
  boomRoot.position.set(-0.6, 0.4, -0.6);
  boomRoot.rotation.set(-Math.PI * 0.62, 0, Math.PI * 0.18);
  group.add(boomRoot);
  const boomTip = add(new THREE.BoxGeometry(0.12, 0.12, 0.12), dark, boomRoot);

  // Two wings; each is a chain of hinges with a panel on each.
  const wings = [1, -1].map(side => {
    const root = new THREE.Group();
    root.position.set(side * 0.9, 1.5, 0);
    if (side < 0) root.rotation.y = Math.PI;
    group.add(root);
    add(new THREE.BoxGeometry(0.35, 0.08, 0.08).translate(0.175, 0, 0), silver, root);
    // The drive turns the open wing on its long axis to face the sun.
    const twist = new THREE.Group();
    root.add(twist);
    const hinges = [];
    let parent = twist, x0 = 0.35;
    for (let i = 0; i < PANELS; i++) {
      const h = new THREE.Group();
      // Each fold sits one panel's thickness out, so stowed panels stack.
      h.position.set(x0, 0, 0);
      parent.add(h);
      const p = new THREE.Group();
      p.position.set(0, i % 2 ? -PT : PT, 0);
      h.add(p);
      add(new THREE.BoxGeometry(PL, PT, PW).translate(PL / 2, 0, 0), back, p);
      add(new THREE.PlaneGeometry(PL * 0.96, PW * 0.94).rotateX(-Math.PI / 2).translate(PL / 2, PT / 2 + 0.002, 0), cells, p);
      hinges.push(h);
      parent = h; x0 = PL;
    }
    return { root, twist, hinges };
  });

  // Poses the wings and boom; u runs 0 (stowed) to 1 (open).
  function deploy(u) {
    wings.forEach(({ root, twist, hinges }, w) => {
      // Stowed, the wing hangs down the bus side, folded flat.
      // The yoke swings out first, then the panels unfold in turn.
      const a = settle(u * 1.25 - 0.02 * w);
      root.rotation.z = -(1 - a) * Math.PI / 2;
      for (let i = 1; i < PANELS; i++) {
        const b = settle(u * 1.6 - 0.2 - i * 0.18 - 0.03 * w);
        hinges[i].rotation.z = (1 - b) * (i % 2 ? Math.PI : -Math.PI);
      }
      twist.rotation.x = (w ? -1 : 1) * Math.PI / 2 * ease((u - 0.82) / 0.18);
    });
    const bl = 0.3 + 4.2 * ease(u * 1.4 - 0.4);
    boom.scale.set(1, bl, 1);
    boomTip.position.y = bl;
  }
  deploy(0);
  return { group, deploy };
}
