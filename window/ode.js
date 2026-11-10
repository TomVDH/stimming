// A hidden ode: a hand-traced world of continents under the flight.
// Points are in the source map's pixels: x 55 to 1945, y 55 to 1140.
// The map wraps east to west; the far south is one polar coast.
export const ODE_MAP = { x0: 55, y0: 55, w: 1890, h: 1085 };

const LANDS = [
  // The north-west continent and its long northern peninsula.
  [[175, 130], [260, 120], [330, 145], [345, 200], [430, 185], [520, 160], [600, 180], [645, 150], [705, 170], [750, 215], [765, 260],
    [720, 305], [660, 330], [600, 310], [540, 335], [470, 340], [410, 320], [370, 300], [310, 280], [280, 250], [240, 250], [215, 290],
    [190, 340], [180, 300], [200, 240], [185, 190]],
  // The great western continent, with its southern peninsulas.
  [[240, 380], [330, 360], [420, 370], [500, 360], [580, 380], [640, 400], [690, 440], [720, 500], [740, 560], [720, 600], [680, 620],
    [640, 640], [600, 680], [610, 740], [600, 790], [560, 800], [520, 820], [500, 860], [460, 890], [380, 900], [340, 860], [330, 800],
    [380, 760], [400, 700], [370, 690], [320, 720], [260, 720], [230, 690], [200, 640], [190, 580], [220, 560], [210, 500], [230, 460],
    [200, 420]],
  // The small south-western isles.
  [[100, 680], [160, 660], [200, 690], [190, 740], [140, 760], [110, 730]],
  // The central northern continent, with its bays to the south.
  [[905, 300], [980, 270], [1060, 265], [1120, 275], [1180, 300], [1240, 330], [1290, 345], [1360, 350], [1420, 370], [1500, 385],
    [1530, 420], [1490, 450], [1430, 470], [1400, 520], [1360, 560], [1340, 600], [1300, 640], [1250, 650], [1200, 620], [1160, 620],
    [1130, 650], [1080, 640], [1040, 610], [990, 600], [950, 590], [920, 560], [900, 520], [950, 480], [930, 430], [900, 390], [880, 340]],
  // The cold northern land beyond it.
  [[1060, 170], [1150, 160], [1250, 170], [1340, 200], [1370, 240], [1330, 280], [1280, 300], [1220, 290], [1170, 260], [1120, 230],
    [1070, 210]],
  // The eastern continent.
  [[1550, 430], [1620, 400], [1700, 380], [1760, 360], [1830, 370], [1900, 380], [1940, 420], [1935, 480], [1900, 540], [1860, 570],
    [1840, 620], [1790, 650], [1760, 600], [1720, 580], [1680, 560], [1640, 540], [1600, 520], [1570, 480]],
  // The southern continent, narrowing to the south-west.
  [[1110, 665], [1170, 660], [1220, 690], [1230, 740], [1180, 770], [1150, 800], [1120, 840], [1060, 880], [990, 880], [970, 840],
    [1000, 800], [1040, 770], [1060, 730], [1080, 690]],
  // Two island groups in the eastern sea.
  [[1265, 672], [1320, 668], [1340, 690], [1300, 705], [1268, 696]],
  [[1770, 710], [1830, 705], [1850, 740], [1820, 775], [1780, 770]],
  // The polar coast.
  [[30, 1080], [300, 1060], [500, 1000], [700, 980], [800, 960], [900, 1000], [1000, 1020], [1100, 960], [1200, 930], [1300, 970],
    [1450, 940], [1600, 880], [1700, 870], [1800, 900], [1970, 950], [1970, 1160], [30, 1160]],
];

// Corner cutting rounds each outline, so no coast runs as a straight edge.
function chaikin(pts, n) {
  for (let k = 0; k < n; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    pts = out;
  }
  return pts;
}

// The land mask: 1 on land, 0 at sea, blurred into a ramp at each coast.
// It returns the red channel, W by H, row 0 at the north.
export function bakeOde(W = 1024, H = 588, blur = 3) {
  const sx = W / ODE_MAP.w, sy = H / ODE_MAP.h;
  const a = new OffscreenCanvas(W, H), ca = a.getContext('2d');
  ca.fillStyle = '#000'; ca.fillRect(0, 0, W, H);
  ca.fillStyle = '#fff';
  for (const L of LANDS) {
    ca.beginPath();
    chaikin(L, 2).forEach(([x, y], i) => ca[i ? 'lineTo' : 'moveTo']((x - ODE_MAP.x0) * sx, (y - ODE_MAP.y0) * sy));
    ca.closePath(); ca.fill();
  }
  const b = new OffscreenCanvas(W, H), cb = b.getContext('2d');
  cb.filter = `blur(${blur}px)`;
  // Tiles on both sides keep the blur seamless where the map wraps.
  for (const dx of [-W, 0, W]) cb.drawImage(a, dx, 0);
  const px = cb.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = px[i * 4];
  return { W, H, m };
}
