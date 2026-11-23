// Whiteout: the set in metres. y is up; the camera looks along -z.
// The hut stands at the origin, turned so its door faces the lee.

const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };

// The hut turns by this angle about y. Its door face looks left and toward the camera.
export const HUT_ANG = -0.585;
const C = Math.cos(HUT_ANG), S = Math.sin(HUT_ANG);
// Hut local to world, on the ground plane.
export const toWorld = (x, y, z) => [C * x + S * z, y, -S * x + C * z];
export const dirWorld = (x, y, z) => norm(toWorld(x, y, z));

// Half width, half depth, floor, eaves and ridge heights.
export const HUT = { w: 1.7, d: 1.2, floor: 0.42, eave: 2.6, ridge: 3.08 };
// The door and the window on the front face, in hut local x.
export const DOOR = { x: -0.72, hw: 0.44, top: 2.22 };
export const WIN = { x: 0.82, hw: 0.28, y0: 1.42, y1: 1.9 };
// The lamp: a hooded bulkhead over the door, aimed down and out.
export const LAMP_LOCAL = [DOOR.x, 2.42, HUT.d + 0.14];
export const LAMP = toWorld(...LAMP_LOCAL);
export const LAMP_DIR = dirWorld(0, -0.78, 0.62);
export const WALL_N = dirWorld(0, 0, 1);
// The front wall plane: the lamp lights only the side in front of it.
export const WALL_D = -(WALL_N[0] * toWorld(0, 0, HUT.d)[0] + WALL_N[2] * toWorld(0, 0, HUT.d)[2]);

// The mast behind the hut on the right, with three guy wires.
export const MAST = { x: 4.6, z: -3.8, h: 6.3, r: 0.055, guy: 5.0, reach: 3.7 };
export const GUYS = [25, 145, 262].map(a => {
  const r = a * Math.PI / 180;
  return [MAST.x + Math.cos(r) * MAST.reach, 0.05, MAST.z + Math.sin(r) * MAST.reach];
});

// The wind blows toward the left and a little toward the camera.
export const WIND = norm([-1, 0, 0.24]);
// The moon sits behind cloud, high on the right, behind the hut.
export const MOON = norm([0.75, 0.62, -1]);

// The camera: a long lens at eye height.
export const EYE = [2.1, 1.58, 25];
export const AIM = [-0.5, 1.72, 0];
