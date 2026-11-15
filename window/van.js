// Window seat's Vancouver world: a baked map of the Lower Mainland.
// tools/vancouver/bake.py makes both files; it names the sources.
// Elevation: Mapzen Terrain Tiles (NRCan CDEM). Land cover: ESA WorldCover 2021.

// The map's box in degrees: west, east, south, north.
const BOX = [-124.3, -121.3, 48.85, 49.9];
// Kilometres per degree at the box's middle latitude.
const KM_LON = 72.48, KM_LAT = 111.2;
// A place in degrees to map km: x east of the west edge, y north of the south edge.
const at = (lat, lon) => [(lon - BOX[0]) * KM_LON, (lat - BOX[2]) * KM_LAT];

export const VAN = {
  // The map's size in km, and the flight loop: the map, then 142 km of far country.
  km: [(BOX[1] - BOX[0]) * KM_LON, (BOX[3] - BOX[2]) * KM_LAT],
  loop: 360,
  // The coast file's size in pixels; the land file holds three tiles of half that.
  size: [2048, 1100],
  // The land file's top height in km; bake.py holds the same number.
  emax: 2.7,
  // The track runs east at 49.13 N: over Ladner, Surrey, Langley and the valley floor.
  // The wing hides the ground ahead; the clear view is aft and 15 to 40 km out.
  // So the city, the inlet and the North Shore pass 17 to 35 km to the north.
  track: at(49.13, 0)[1],
  // Eastbound flights start south of the city (Tom, 2026-11-15).
  // Howe Sound and the North Shore mountains stand in view, aft of the wing.
  // Westbound flights, on a right-hand seat, start over the valley near Hope.
  startE: at(0, -123.08)[0], startW: at(0, -121.6)[0],
  // Airports: the main runway's centre, its true heading in degrees, half its length in km.
  // Positions: Canada Flight Supplement, by Wikipedia's Lower Mainland airport list.
  // Headings: the runway number plus 16 degrees of magnetic variation.
  // twin: a parallel runway's offset in km. planes: aircraft on final at once.
  airports: [
    // Vancouver International: 08R/26L, with 08L/26R 1.7 km to the north.
    { at: at(49.1875, -123.1839), hdg: 99, half: 1.75, twin: 1.7, apron: 1.5, planes: 3 },
    { at: at(49.0253, -122.36), hdg: 89, half: 1.45, twin: 0, apron: 0.9, planes: 2 },   // Abbotsford
    { at: at(49.0739, -123.0075), hdg: 89, half: 0.85, twin: 0, apron: 0.6, planes: 1 }, // Boundary Bay
    { at: at(49.2161, -122.71), hdg: 99, half: 0.75, twin: 0, apron: 0.6, planes: 1 },   // Pitt Meadows
    { at: at(49.1528, -121.9389), hdg: 89, half: 0.6, twin: 0, apron: 0.6, planes: 1 },  // Chilliwack
  ],
};

// One picture file as RGBA bytes, row 0 at the north.
async function pixels(url) {
  const blob = await (await fetch(url)).blob();
  // No colour conversion: the bytes are data, not colours.
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const cv = new OffscreenCanvas(bmp.width, bmp.height), cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(bmp, 0, 0);
  return { w: bmp.width, h: bmp.height, data: cx.getImageData(0, 0, bmp.width, bmp.height).data };
}

// The two maps as RGBA bytes, ready for textures.
// coast: red the sea share, green the fresh water share.
// land: red the height (the root of its share of emax), green built-up, blue forest.
export async function loadVan(base = './') {
  const [coast, sheet] = await Promise.all([pixels(`${base}van-coast.png`), pixels(`${base}van-land.png`)]);
  // The land sheet stacks its three grey tiles from top to bottom.
  const w = sheet.w, h = sheet.h / 3, land = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    land[i * 4] = sheet.data[i * 4];
    land[i * 4 + 1] = sheet.data[(i + w * h) * 4];
    land[i * 4 + 2] = sheet.data[(i + 2 * w * h) * 4];
    land[i * 4 + 3] = 255;
  }
  return { coast: { w: coast.w, h: coast.h, data: new Uint8Array(coast.data.buffer) }, land: { w, h, data: land } };
}
