// Tornado alley: the vehicles' shapes, as data. traffic.js traces them; vmesh.js builds meshes from them.
// Pure: no browser and no GL, so node tests can read it.
// A plane with normal n through q: its unit normal and offset.
export const pq = (n, q) => { const l = Math.hypot(...n), u = n.map(v => v / l); return [...u, u[0] * q[0] + u[1] * q[1] + u[2] * q[2]]; };
// The plane and its mirror across the vehicle's middle.
export const pqm = (n, q) => [pq(n, q), pq([-n[0], n[1], n[2]], [-q[0], q[1], q[2]])];
// The windshield: a plane through the hood's back edge (y, z) with normal (0, ny, nz).
export const WS = [[1.32, 0.92, 0.802, 0.597], [1.08, 1.07, 0.75, 0.66], [1.15, 1.77, 0.55, 0.83]];
export const ws = k => pq([0, WS[k][2], WS[k][3]], [0, WS[k][0], WS[k][1]]);
// Each kind's wheel arches: centre height, front z, rear z, radius; and the well's inner wall x.
export const ARCH = [[0.4, 1.8, -1.88, 0.52, 0.6], [0.38, 1.45, -1.45, 0.48, 0.58], [0.38, 1.8, -1.8, 0.49, 0.62]];
// A hull: box centre, half size, edge cut, id, planes, arch cuts (1 front, 2 rear).
export const H = (c, h, e, id, pl, cut = 0) => ({ c, h, e, id, pl, cut });
export const B = (c, h, e, id) => ({ c, h, e, id });
export const mirrorB = b => B([-b.c[0], b.c[1], b.c[2]], b.h, b.e, b.id);
export const HULLS = [
  [
    // The pickup's front end: a tall face, a hood that falls a little to the nose.
    // The nose narrows in plan, its corners round off; the fenders' shoulders roll over.
    H([0, 0.88, 1.88], [1, 0.44, 0.96], 0.07, 1, [[0, 0.999, 0.0437, 1.36], pq([0, 1, 0.9], [0, 1.18, 2.84]), pq([0, -1, 0.8], [0, 0.5, 2.84]),
      ...pqm([1, 0, 0.12], [1, 0, 2.2]), ...pqm([1, 0, 1], [0.9, 0, 2.84]), ...pqm([1, 1.2, 0], [1, 1.25, 0])], 1),
    // The crew cab: raked windshield, sides that lean in above the belt, a rounded roof.
    H([0, 1.19, -0.23], [1, 0.75, 1.15], 0.08, 2, [ws(0), ...pqm([1, 0.16, 0], [1, 1.32, 0]), ...pqm([0.6, 1, 0], [0.84, 1.94, 0]),
      pq([0, 1, -0.8], [0, 1.92, -1.28]), pq([0, 0.05, -1], [0, 1.3, -1.38])], 2),
    // The bed's side walls, flush with the cab's belt; a 7 cm gap stands between cab and bed.
    H([0.965, 0.895, -2.2], [0.035, 0.435, 0.75], 0.02, 1, [], 2),
    H([-0.965, 0.895, -2.2], [0.035, 0.435, 0.75], 0.02, 1, [], 2),
    // A chrome bumper that wraps the corners.
    H([0, 0.5, 2.86], [1, 0.13, 0.08], 0.04, 5, [...pqm([1, 0, 1], [0.88, 0, 2.94])]),
  ],
  [
    // The wagon's nose: a hood that falls to a rounded front, fenders that roll over.
    H([0, 0.73, 1.735], [0.95, 0.37, 0.735], 0.07, 1, [pq([0, 1, 0.14], [0, 1.08, 1.2]), pq([0, 1, 1.1], [0, 0.92, 2.36]), pq([0, -1, 0.9], [0, 0.5, 2.42]),
      ...pqm([1, 0, 0.1], [0.95, 0, 1.6]), ...pqm([1, 0, 0.9], [0.84, 0, 2.47]), ...pqm([1, 1.1, 0], [0.95, 1, 0])], 1),
    // The long body: raked windshield, sides that lean in, a hatch that leans in at the back.
    H([0, 1.06, -0.725], [0.95, 0.7, 1.705], 0.08, 2, [ws(1), ...pqm([1, 0.22, 0], [0.95, 1.1, 0]), ...pqm([1, -0.35, 0], [0.95, 0.55, 0]),
      ...pqm([0.55, 1, 0], [0.72, 1.76, 0]), pq([0, 1, 0.35], [0, 1.755, 0.25]), pq([0, 0.28, -1], [0, 1.1, -2.43]),
      pq([0, 1, -0.7], [0, 1.75, -2.15]), pq([0, -1, -0.7], [0, 0.5, -2.38])], 3),
    // Black bumpers that wrap the corners.
    H([0, 0.5, 2.42], [0.96, 0.14, 0.08], 0.04, 3, [...pqm([1, 0, 1], [0.84, 0, 2.5])]),
    H([0, 0.5, -2.4], [0.96, 0.13, 0.07], 0.04, 3, [...pqm([1, 0, -1], [0.84, 0, -2.47])]),
  ],
  [
    // The van's short nose: a steep hood, a rounded front.
    H([0, 0.78, 2.2], [1, 0.42, 0.55], 0.1, 1, [pq([0, 1, 0.32], [0, 1.18, 1.8]), pq([0, 1, 1.2], [0, 0.86, 2.68]), pq([0, -1, 0.8], [0, 0.48, 2.7]),
      ...pqm([1, 0, 0.08], [1, 0, 1.9]), ...pqm([1, 0, 0.7], [0.86, 0, 2.75]), ...pqm([1, 1, 0], [1, 1.08, 0])], 1),
    // The tall body: a high roof over the windshield, near-upright sides, rounded top edges.
    H([0, 1.355, -0.535], [1, 0.995, 2.235], 0.14, 2, [ws(2), ...pqm([1, 0.05, 0], [1, 1.3, 0]), ...pqm([1, -0.3, 0], [1, 0.55, 0]),
      ...pqm([0.7, 1, 0], [0.86, 2.35, 0]), pq([0, 1, 0.6], [0, 2.35, 0.85]), pq([0, 1, -0.5], [0, 2.35, -2.55]), pq([0, -1, -0.6], [0, 0.5, -2.72])], 3),
    // A black bumper that wraps the corners.
    H([0, 0.47, 2.74], [0.99, 0.13, 0.08], 0.04, 3, [...pqm([1, 0, 1], [0.86, 0, 2.82])]),
  ],
];
// Small parts: plain boxes. ids as vHit's list.
export const pair = b => [b, mirrorB(b)];
export const BOXES = [
  [
    // The bed's bulkhead, tailgate, liner floor and wheel housings.
    B([0, 1.09, -1.48], [0.93, 0.24, 0.02], 0.01, 1), B([0, 0.925, -2.91], [1, 0.405, 0.035], 0.025, 1),
    B([0, 0.83, -2.2], [0.93, 0.03, 0.7], 0, 13), ...pair(B([0.78, 0.94, -1.88], [0.15, 0.1, 0.5], 0.06, 13)),
    // The frame, an air dam, a chrome rear bumper, a hitch, running boards.
    B([0, 0.42, -0.1], [0.6, 0.1, 2.6], 0, 3), B([0, 0.34, 2.78], [0.86, 0.04, 0.08], 0.02, 3),
    B([0, 0.52, -2.98], [1, 0.1, 0.05], 0.035, 5), B([0, 0.46, -3.08], [0.04, 0.035, 0.07], 0.01, 3),
    ...pair(B([1.04, 0.47, -0.05], [0.08, 0.022, 1.22], 0.01, 3)),
    // Tall towing mirrors on short arms.
    ...pair(B([1.18, 1.47, 0.72], [0.11, 0.13, 0.05], 0.03, 3)), ...pair(B([1.05, 1.41, 0.74], [0.05, 0.02, 0.02], 0, 3)),
  ],
  [
    // A bright skid plate, the frame, running boards.
    B([0, 0.34, 2.36], [0.5, 0.03, 0.12], 0.015, 5), B([0, 0.38, 0], [0.6, 0.07, 1.9], 0, 3),
    ...pair(B([1, 0.42, 0], [0.07, 0.02, 0.85], 0.01, 3)),
    // Roof rails, two cross bars, a black gear case, the amber bar at the front.
    ...pair(B([0.68, 1.8, -0.95], [0.03, 0.035, 1.1], 0.01, 3)),
    B([0, 1.85, -0.25], [0.72, 0.02, 0.03], 0, 3), B([0, 1.85, -1.65], [0.72, 0.02, 0.03], 0, 3),
    B([0, 1.96, -1], [0.5, 0.09, 0.55], 0.05, 3), B([0, 1.85, 0.12], [0.6, 0.045, 0.07], 0.03, 4),
    // Mirrors on short arms at the windshield's foot.
    ...pair(B([1.06, 1.2, 0.86], [0.08, 0.075, 0.05], 0.025, 3)), ...pair(B([0.97, 1.17, 0.9], [0.04, 0.02, 0.02], 0, 3)),
  ],
  [
    // The rear bumper, a step, the frame.
    B([0, 0.47, -2.8], [0.99, 0.12, 0.06], 0.04, 3), B([0, 0.37, -2.88], [0.4, 0.02, 0.08], 0.01, 3),
    B([0, 0.38, 0], [0.6, 0.06, 2.2], 0, 3),
    // The roof rack: two rails, four cross bars; its instrument cases; the amber bar.
    ...pair(B([0.8, 2.4, -0.7], [0.03, 0.03, 1.55], 0.01, 3)),
    ...[0, 1, 2, 3].map(k => B([0, 2.42, 0.6 - k * 0.85], [0.8, 0.015, 0.025], 0, 3)),
    B([0.42, 2.535, -0.3], [0.22, 0.1, 0.35], 0.03, 12), B([-0.4, 2.505, -1.1], [0.28, 0.07, 0.4], 0.03, 3),
    B([0, 2.41, 0.55], [0.65, 0.05, 0.08], 0.02, 4),
    // The mast's radiation shield, its cross-arm, the vane.
    B([0, 3.1, -2.2], [0.08, 0.13, 0.08], 0.03, 12), B([0, 3.64, -2.2], [0.46, 0.015, 0.015], 0, 5),
    B([-0.46, 3.68, -2.32], [0.004, 0.06, 0.12], 0, 3),
    // Big mirrors at the windshield's foot.
    ...pair(B([1.12, 1.5, 1.5], [0.08, 0.16, 0.05], 0.025, 3)), ...pair(B([1.03, 1.45, 1.53], [0.05, 0.02, 0.02], 0, 3)),
  ],
];
// Each kind's wheels: radius, axle z from the middle, track half width, tyre half width; axles' mid point.
export const WHEELS = [[0.4, 1.84, 0.86, 0.14, -0.04], [0.38, 1.45, 0.8, 0.14, 0], [0.38, 1.8, 0.84, 0.14, 0]];
// The chasers' masts and aerials, three per kind 1 and 2: x, z, radius, foot, top, id.
export const RODS = [
  [0.55, -2.0, 0.018, 1.7, 2.62, 5], [-0.7, -2.2, 0.006, 1.6, 2.75, 3], [-0.5, -2.2, 0.006, 1.6, 2.6, 3],
  [0.0, -2.2, 0.035, 2.35, 3.68, 5], [0.46, -2.2, 0.01, 3.62, 3.74, 5], [0.0, -1.6, 0.03, 2.43, 2.68, 5],
];
// The cup anemometer on kinds 1 and 2: hub, arm length, cup half size. The cups turn with spin.
export const CUPS = [null, { c: [0.55, 2.63, -2.0], r: 0.11, s: 0.025 }, { c: [0.46, 3.74, -2.2], r: 0.12, s: 0.028 }];
// The van's dish: vertex, axis, rim radius, sphere radius; its post (a box, id 3).
export const DISH = { v: [0.0, 2.8, -1.6], ax: [0.55, 0.8, 0.15], rr: 0.42, rs: 0.9, post: { c: [0.0, 2.72, -1.6], h: [0.08, 0.06, 0.08], e: 0.02, id: 3 } };
