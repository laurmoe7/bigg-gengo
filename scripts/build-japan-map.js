// Builds the Japan map in renderer/mapdata.js (simplified SVG paths) from Natural Earth's 10m states and provinces (public domain):
//   node scripts/build-japan-map.js <ne_10m_admin_1_states_provinces.geojson>
// It draws the 47 prefectures (Okinawa in a box at the bottom right, as Japanese maps do), the coasts of the neighbours for context,
// and the seas, mountains, lakes and islands from renderer/geodata.js. The other maps in mapdata.js (the world and the continents)
// come from BiggTaal's build and are kept as they are.
const fs = require('fs'), path = require('path');
const G = require('../renderer/geodata.js');
const src = process.argv[2];
if (!src) { console.error('usage: node scripts/build-japan-map.js <ne_10m_admin_1_states_provinces.geojson>'); process.exit(1); }
const ne = JSON.parse(fs.readFileSync(src, 'utf8'));
const OUT = path.join(__dirname, '..', 'renderer', 'mapdata.js');
const rad = Math.PI / 180, r1 = (n) => Math.round(n * 10) / 10;

const ringsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap((poly) => poly.map((ring, i) => ({ ring, hole: i > 0 })));
const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
function dp(pts, tol) { // Douglas-Peucker on an open line
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, at = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len; if (d > max) { max = d; at = i; } }
    if (max > tol && at > 0) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function dpRing(pts, tol) { // a closed ring: split it at the point farthest from the start, simplify both halves
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts = pts.slice(0, -1);
  if (pts.length < 4) return pts;
  let far = 1, fd = -1; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  return dp(pts.slice(0, far + 1), tol).concat(dp(pts.slice(far).concat([pts[0]]), tol).slice(1, -1));
}
function pathOf(rings, proj, tol, minArea) { // one path string and the centre of the biggest ring
  let d = '', best = null, bestA = 0; const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) {
    let pts = ring.map(([lo, la]) => proj(lo, la)); const A = Math.abs(area(pts));
    if (A > bestA) { bestA = A; best = pts; }
    if (A < minArea) continue;
    pts = dpRing(pts, tol); if (pts.length < 3) continue;
    pts.forEach(([x, y]) => { box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); });
    d += 'M' + pts.map(([x, y]) => r1(x) + ',' + r1(y)).join('L') + 'Z';
  }
  const c = best ? [best.reduce((s, p) => s + p[0], 0) / best.length, best.reduce((s, p) => s + p[1], 0) / best.length] : null;
  return { d, c: c && [r1(c[0]), r1(c[1])], area: bestA, box };
}
// Lambert azimuthal equal-area, centred on Japan
const LAM0 = 137.5, PHI0 = 37, R = 1500;
const laea = (lo, la) => { const l = lo * rad, p = la * rad, l0 = LAM0 * rad, p0 = PHI0 * rad, k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l - l0))); return [R * k * Math.cos(p) * Math.sin(l - l0), -R * k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l - l0))]; };
// Okinawa is moved into a box at the bottom right (its own islands keep their shape and distances)
const OKI = { dlon: 16.6, dlat: 3.4 }, okiProj = (lo, la) => laea(lo + OKI.dlon, la + OKI.dlat);
const keepRing = (iso, ring) => { // far-off islands that would make the map tiny: the Ogasawara and Izu islands (Tokyo), the Amami islands (Kagoshima), the Daitō islands (Okinawa)
  const maxLat = Math.max(...ring.map((p) => p[1])), minLon = Math.min(...ring.map((p) => p[0]));
  if (iso === 'JP-13') return maxLat > 34.3;
  if (iso === 'JP-46') return maxLat > 29.6;
  if (iso === 'JP-47') return minLon < 129.5;
  return true;
};

const jp = ne.features.filter((f) => f.properties.iso_a2 === 'JP' && f.geometry);
const out = { shapes: [], pts: {}, ctr: {}, small: [], vb: null, r: 22, feat: {}, inset: null };
const frame = [Infinity, Infinity, -Infinity, -Infinity], grow = (b) => { frame[0] = Math.min(frame[0], b[0]); frame[1] = Math.min(frame[1], b[1]); frame[2] = Math.max(frame[2], b[2]); frame[3] = Math.max(frame[3], b[3]); };
const areas = {};
for (const f of jp) {
  const iso = f.properties.iso_3166_2, id = iso.slice(3), proj = iso === 'JP-47' ? okiProj : laea;
  if (!G.PREFECTURES.some((p) => p.id === id)) { console.warn('no prefecture for', iso); continue; }
  const rings = ringsOf(f.geometry).filter((r) => !r.hole && keepRing(iso, r.ring)).map((r) => r.ring);
  const o = pathOf(rings, proj, 0.45, 2);
  out.shapes.push([id, o.d]); out.ctr[id] = o.c; out.pts[id] = o.c; areas[id] = o.area; grow(o.box);
  if (iso === 'JP-47') out.inset = o.box;
}
out.small = Object.keys(areas).filter((id) => areas[id] < 150); // small ones get a ring when they are lit up
// the box around Okinawa
const ib = out.inset, pad = 14; out.inset = [r1(ib[0] - pad), r1(ib[1] - pad), r1(ib[2] - ib[0] + 2 * pad), r1(ib[3] - ib[1] + 2 * pad)];
// the neighbours, for context: their coasts within reach of the frame
const W = [frame[0] - 160, frame[1] - 160, frame[2] + 160, frame[3] + 160];
for (const f of ne.features.filter((x) => ['KR', 'KP', 'CN', 'RU', 'TW'].includes(x.properties.iso_a2) && x.geometry)) {
  const rings = ringsOf(f.geometry).filter((r) => !r.hole).map((r) => r.ring).filter((ring) => ring.some(([lo, la]) => { const [x, y] = laea(lo, la); return x > W[0] && x < W[2] && y > W[1] && y < W[3]; }));
  if (!rings.length) continue;
  const o = pathOf(rings, laea, 1.2, 40); if (o.d) out.shapes.unshift(['', o.d]);
}
// seas, mountains, lakes and islands
for (const p of G.JAPAN_PLACES) { const [x, y] = laea(p.at[1], p.at[0]); out.feat[p.id] = { p: [r1(x), r1(y)] }; grow([x, y, x, y]); }
const m = 30; out.vb = [r1(frame[0] - m), r1(frame[1] - m), r1(frame[2] - frame[0] + 2 * m), r1(frame[3] - frame[1] + 2 * m)];

// write it into mapdata.js, keeping the other maps
let maps = {};
if (fs.existsSync(OUT)) { const vm = require('vm'), c = {}; vm.createContext(c); vm.runInContext(fs.readFileSync(OUT, 'utf8') + ';this.M = MAPS;', c); maps = c.M; }
maps.japan = out;
fs.writeFileSync(OUT, '// Simplified outlines for the Bonus Lessons maps. Do not edit by hand.\n// The world and the continents: Natural Earth (public domain), built by BiggTaal\'s scripts/build-maps.js. Japan: Natural Earth 10m states and provinces (public domain), built by scripts/build-japan-map.js.\nconst MAPS = ' + JSON.stringify(maps) + ';\nif (typeof module !== \'undefined\' && module.exports) module.exports = MAPS;\n');
console.log('japan:', out.shapes.length, 'shapes,', JSON.stringify(out).length, 'bytes; vb', out.vb.join(' '), '; small', out.small.join(' '));
