/* V2X Senior Division missions (Square One "Masters of Mobility", 2026-27 parameters, REV 1.0).
   Practice versions of the six scored tasks. Fields are drawn from the written parameters; where the parameters
   leave a detail open (the Delta arena map is "TBD", the exact Echo and Foxtrot courses), this is a practice layout.
   Scores follow each task's rubric, but they are practice scores: on the real field, judges decide. */
(() => {
'use strict';
const L = window.Lab;
const bot = L.bot;
const IN = 2.54;                                   // cm per inch
const DEG = 180 / Math.PI;
const stopped = () => Math.abs(bot.vl) < 0.4 && Math.abs(bot.vr) < 0.4;
const speed = () => (bot.vl + bot.vr) / 2;
const anyLit = () => L.devices.robot.display.some(v => v > 0);
const lightsOn = () => bot.lights.some(c => c !== '#000000');
const isAmber = (hex) => { if (!hex || hex === '#000000') return false; const [r, g, b] = L.hexToRgb(hex); return r >= 180 && g >= 50 && g <= 225 && b <= 110; };
// a fixed random sequence for field layouts (not the run's seed, so every run starts from the same field)
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const label = (c, x, y, text, size = 2.6, color = 'rgba(30,40,35,.75)') => { if (L.inFloor) L.mapLabels.push([x, y, text, size, color]); else L.drawLabel(c, x, y, text, size, color); };
const outline = (c, x, y, w, h, color, lw = 0.6, dash) => { c.save(); c.strokeStyle = color; c.lineWidth = lw; if (dash) c.setLineDash(dash); c.strokeRect(x, y, w, h); c.restore(); };
// what the student's robot program uses, for the bonus tiers (set by the app before each run)
const uses = (...types) => types.some(t => L.runBlockTypes && L.runBlockTypes.has(t));
const ENCODER_BLOCKS = ['cb_distance', 'cb_distance_speed', 'cb_turn', 'cb_turn_speed', 'cb_wheel_angle', 'cb_squares', 'cb_degrees', 'cb_speed', 'cb_cruise', 'mb_compass', 'mb_acceleration'];
// a "signal" = the LED matrix, headlights or a sound changes
function signalWatch(st) {
  const key = Array.from(L.devices.robot.display, v => v > 0 ? 1 : 0).join('') + bot.lights.join('');
  const changed = st.sigKey !== undefined && key !== st.sigKey;
  st.sigKey = key;
  const tone = st.toneFlag; st.toneFlag = false;
  return changed || tone;
}
L.on('tone', (dev) => { const r = L.activeRun; if (r && r.state === 'running' && dev.id === 'robot') r.st.toneFlag = r.st.toneAny = true; });
// arms start folded back (0°); the program swings them out
const foldArms = () => { bot.servo[0] = bot.servoT[0] = bot.servo[1] = bot.servoT[1] = 0; };
const overTime = (t, limit) => t > limit ? Math.ceil((t - limit - 1e-9) / 10) : 0;

/* ---------------------------------------------------------------- maps */
Object.assign(L.MAPS, {
  v2xAlpha: { name: 'V2X Alpha: depot floor', w: 300, h: 200, grid: true, boxes: [], start: { x: 150, y: 165, a: 0 }, black: () => false,
    floor(c) { c.fillStyle = '#f1f3f1'; c.fillRect(0, 0, 300, 200); outline(c, 140, 155, 20, 20, '#7b8a80', .5, [1.5, 1]); label(c, 150, 180, 'START', 2.4); } },
  v2xBravo: { name: 'V2X Bravo: platoon lane', w: 240, h: 160, grid: true, boxes: [], start: { x: 25, y: 80, a: Math.PI / 2 }, black: () => false,
    floor(c) { c.fillStyle = '#d9dcd8'; c.fillRect(0, 62, 240, 36); c.fillStyle = '#f2c230'; for (let x = 4; x < 240; x += 14) c.fillRect(x, 79.5, 7, 1); } },
  v2xCharlie: { name: 'V2X Charlie: refuge corridor', w: 240, h: 160, grid: true, boxes: [], start: { x: 38, y: 60, a: Math.PI / 2 }, black: () => false,
    floor(c) {
      c.fillStyle = '#d9dcd8'; c.fillRect(20, 45, 172, 30);
      c.fillStyle = 'rgba(242,194,48,.35)'; c.fillRect(100, 78, 50, 34); outline(c, 100, 78, 50, 34, '#c99a00', .6);
      label(c, 125, 95, 'REFUGE ZONE', 2.6, '#7a5c00');
      c.fillStyle = '#111'; c.fillRect(182, 45, 1.5, 30); label(c, 186, 41, 'FINISH', 2.4);
      label(c, 101, 41, '5 ft corridor (152 cm)', 2.4);
    } },
  v2xDelta: { name: 'V2X Delta: winter supply mat', w: 240, h: 160, grid: false, boxes: [], start: { x: 63, y: 139, a: 0 },
    black: (x, y) => DELTA.lines.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1),
    floor(c) {
      c.fillStyle = '#e4e7e3'; c.fillRect(0, 0, 240, 160); c.fillStyle = '#fbfbf8'; c.fillRect(DELTA.mat.x, DELTA.mat.y, DELTA.mat.w, DELTA.mat.h);
      c.fillStyle = '#111'; for (const [x0, y0, x1, y1] of DELTA.lines) c.fillRect(x0, y0, x1 - x0, y1 - y0);
      const sb = DELTA.startBox; outline(c, sb.x, sb.y, sb.w, sb.h, '#8d9790', .5, [1.5, 1]); label(c, sb.x + sb.w / 2, sb.y + 2.5, 'ROBOT START', 2.2);
      const g = DELTA.ground, e = DELTA.raised;
      c.fillStyle = 'rgba(15,140,140,.12)'; c.fillRect(g.x, g.y, g.w, g.h); c.fillStyle = 'rgba(160,90,20,.22)'; c.fillRect(e.x, e.y, e.w, e.h);
      label(c, g.x + g.w / 2, g.y + g.h + 3.4, 'GROUND LODGE', 2.4); label(c, e.x + e.w / 2, e.y + e.h + 3.4, 'RAISED LODGE ×1.5', 2.4);
      label(c, DELTA.store.x + DELTA.store.w / 2, DELTA.store.y - 3, 'STORAGE AREA', 2.4);
      label(c, 120, 158, 'Practice layout: the official Delta arena map is still TBD', 2.2, 'rgba(30,40,35,.55)');
    } },
  v2xEcho: { name: 'V2X Echo: RECO line course', w: 240, h: 160, grid: false, start: { x: 24, y: 135, a: Math.PI / 2 },
    boxes: [{ x: 118, y: 50, w: 24, h: 19 }, { x: 178, y: 41, w: 24, h: 16 }],
    black: (x, y) => ECHO.dist(x, y) <= L.LINE_W / 2,
    floor(c) {
      c.fillStyle = '#f4f5f2'; c.fillRect(0, 0, 240, 160);
      c.fillStyle = '#cfd3cf'; c.fillRect(9, 120, 30.5, 30.5); label(c, 24, 153, 'START', 2.2);
      c.lineWidth = L.LINE_W; c.strokeStyle = '#111'; c.lineJoin = 'round'; c.lineCap = 'butt';
      c.beginPath(); ECHO.path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
      const f = ECHO.path[ECHO.path.length - 1]; c.fillStyle = '#d33a12'; c.fillRect(f[0] - .6, f[1] - 9, 1.2, 18); label(c, f[0] + 1, f[1] - 11, 'FINISH', 2.4);
    } },
  v2xFoxtrot: { name: 'V2X Foxtrot: egg escort lane', w: 360, h: 240, grid: false, boxes: [], start: { x: 40, y: 120, a: Math.PI / 2 },
    black: (x, y) => x >= FOX.x0 - 2 && x <= FOX.x1 + 2 && ((y >= FOX.top - FOX.lw && y <= FOX.top) || (y >= FOX.bot && y <= FOX.bot + FOX.lw)),
    floor(c) {
      c.fillStyle = '#e7e9e6'; c.fillRect(0, 0, 360, 240);
      c.fillStyle = '#fbfbf8'; c.fillRect(FOX.x0, FOX.top, FOX.x1 - FOX.x0, FOX.bot - FOX.top);
      c.fillStyle = '#d0d3cf'; c.fillRect(FOX.x0, FOX.mid - 12.7, 30.5, 25.4); label(c, FOX.x0 + 15, FOX.mid - 15.5, 'START', 2.2);
      for (const t of FOX.terrain) t.draw(c);
      c.fillStyle = '#111'; c.fillRect(FOX.x0 - 2, FOX.top - FOX.lw, FOX.x1 - FOX.x0 + 4, FOX.lw); c.fillRect(FOX.x0 - 2, FOX.bot, FOX.x1 - FOX.x0 + 4, FOX.lw);
      FOX.checks.forEach((x, i) => { c.fillStyle = i === FOX.checks.length - 1 ? '#d33a12' : '#2f6cf6'; c.fillRect(x - .4, FOX.top, .8, FOX.bot - FOX.top); label(c, x, FOX.bot + FOX.lw + 3, i === FOX.checks.length - 1 ? 'FINISH' : `${(i + 1) * 2} ft`, 2.4); });
      FOX.halves.forEach(x => { c.save(); c.strokeStyle = 'rgba(47,108,246,.6)'; c.lineWidth = .4; c.setLineDash([1, 1]); c.beginPath(); c.moveTo(x, FOX.top); c.lineTo(x, FOX.bot); c.stroke(); c.restore(); });
      label(c, 180, FOX.top - FOX.lw - 4, '12 in wide lane, 10 ft long, with rumble strips, speed bumps, turf and a ramp', 2.4);
    } },
  v2xGolf: { name: 'V2X Golf: 4 × 8 ft exhibition', w: 270, h: 180, grid: true, boxes: [], start: { x: 40, y: 90, a: Math.PI / 2 }, black: () => false,
    floor(c) { c.fillStyle = '#e7e9e6'; c.fillRect(0, 0, 270, 180); c.fillStyle = '#fbfbf8'; c.fillRect(13, 29, 244, 122); outline(c, 13, 29, 244, 122, '#8d9790', .6); label(c, 135, 25, '4 ft × 8 ft exhibition space: draw roads, add boxes, show your own idea', 2.6); } }
});

for (const k of ['v2xAlpha', 'v2xBravo', 'v2xCharlie', 'v2xDelta', 'v2xEcho', 'v2xFoxtrot', 'v2xGolf']) L.MAPS[k].inch = true;      // the parameters are in inches

/* ---------------------------------------------------------------- Alpha: Roz's Depot Calibration */
// The five maneuvers, any order. Distances in cm; turns in degrees, + = right.
const ALPHA = [
  { id: 'f24', label: 'Drive 24 in (61 cm) forward', d: 24 * IN },
  { id: 'b18', label: 'Drive 18 in (46 cm) backward', d: -18 * IN },
  { id: 'l45', label: 'Turn 45° left, then 24 in forward', turn: -45, d: 24 * IN },
  { id: 'r90', label: 'Turn 90° right, then 24 in forward', turn: 90, d: 24 * IN },
  { id: 't180', label: 'Turn 180°, then 12 in forward', turn: 180, d: 12 * IN }
];
const okDist = (got, want) => Math.sign(got) === Math.sign(want) && Math.abs(got - want) <= Math.max(4, Math.abs(want) * 0.1);
const okTurn = (got, want) => want === 180 ? Math.abs(Math.abs(got) - 180) <= 12 : Math.abs(got - want) <= 12;
function alphaSegments(st) {
  const segs = [];
  for (const s of st.raw) {
    if ((s.k === 's' && Math.abs(s.v) < 2) || (s.k === 't' && Math.abs(s.v) < 8)) continue;
    const last = segs[segs.length - 1];
    if (last && last.k === s.k && Math.sign(last.v) === Math.sign(s.v)) last.v += s.v; else segs.push({ ...s });
  }
  return segs;
}
function alphaMatch(st) {
  const segs = alphaSegments(st), used = new Set(), done = {};
  for (const m of ALPHA.filter(m => m.turn !== undefined)) {
    for (let i = 0; i < segs.length - 1; i++) {
      if (used.has(i) || used.has(i + 1)) continue;
      if (segs[i].k === 't' && segs[i + 1].k === 's' && okTurn(segs[i].v, m.turn) && okDist(segs[i + 1].v, m.d)) { used.add(i); used.add(i + 1); done[m.id] = true; break; }
    }
  }
  for (const m of ALPHA.filter(m => m.turn === undefined)) {
    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue;
      if (segs[i].k === 's' && okDist(segs[i].v, m.d)) { used.add(i); done[m.id] = true; break; }
    }
  }
  return { done, segs };
}
function alphaScore(st) {
  const missing = ALPHA.filter(m => !(st.match && st.match.done[m.id])).length + (st.signal ? 0 : 1);
  return Math.max(0, 10 - 2 * missing - overTime(st.endT ?? st.t ?? 0, 60));
}

/* ---------------------------------------------------------------- Bravo: Goose Flock Platooning */
// the lead target's speed (cm/s) over time: [until second, speed]
const LEAD_PLAN = [[6, 0], [10, 15], [16, 0], [22, 8], [28, 0], [32, 6], [999, 0]];
const leadSpeed = (t) => LEAD_PLAN.find(p => t < p[0])[1];
const BR = { open: 12 * IN, pace: 6 * IN };
function bravoGap(st) { return st.lead.x - (bot.x + Math.sin(bot.a) * L.SONAR_FWD); }

/* ---------------------------------------------------------------- Delta: Winter Supply Delivery */
const DELTA = {
  mat: { x: 44, y: 4, w: 152, h: 152 },
  store: { x: 82, y: 125.5, w: 76, h: 30.5 },
  ground: { x: 56, y: 16, w: 23, h: 23 },
  raised: { x: 161, y: 16, w: 23, h: 23 },
  startBox: { x: 48, y: 125, w: 30, h: 29 },
  CUBES: [['red', '#d62f2f', 5, 3], ['blue', '#2f62d6', 3, 4], ['yellow', '#e9c21c', 2, 5], ['green', '#2ea84f', 1, 8], ['black', '#151515', -2, 1]],
  S: 2.54
};
const tape = 1.2;
DELTA.lines = [];
for (const r of [DELTA.store, DELTA.ground, DELTA.raised]) DELTA.lines.push([r.x - tape, r.y - tape, r.x + r.w + tape, r.y], [r.x - tape, r.y + r.h, r.x + r.w + tape, r.y + r.h + tape], [r.x - tape, r.y, r.x, r.y + r.h], [r.x + r.w, r.y, r.x + r.w + tape, r.y + r.h]);
const inRect = (r, x, y, m = 0) => x >= r.x + m && x <= r.x + r.w - m && y >= r.y + m && y <= r.y + r.h - m;
function deltaCubes() {
  const rnd = lcg(2027), list = [];
  for (const [color, fill, pts, n] of DELTA.CUBES) for (let i = 0; i < n; i++) list.push({ color, fill, pts });
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const s = DELTA.store;
  list.forEach((c, i) => { const col = i % 7, row = Math.floor(i / 7); c.x = s.x + 8 + col * 10 + (rnd() - .5) * 4; c.y = s.y + 7 + row * 8.5 + (rnd() - .5) * 3; c.moved = false; });
  return list;
}
function deltaPush(st) {
  const cubes = st.cubes, half = DELTA.S / 2, R = L.ROBOT_R * 0.95 + half;
  const arms = L.armSegs();
  for (const q of cubes) {
    const dx = q.x - bot.x, dy = q.y - bot.y, d = Math.hypot(dx, dy);
    if (d < R && d > 1e-6) { q.x = bot.x + dx / d * R; q.y = bot.y + dy / d * R; }
    for (const [a, b] of arms) {
      const ab = [b[0] - a[0], b[1] - a[1]], len2 = ab[0] * ab[0] + ab[1] * ab[1];
      const t = Math.max(0, Math.min(1, ((q.x - a[0]) * ab[0] + (q.y - a[1]) * ab[1]) / len2));
      const px = a[0] + ab[0] * t, py = a[1] + ab[1] * t, ex = q.x - px, ey = q.y - py, e = Math.hypot(ex, ey), need = half + .45;
      if (e < need && e > 1e-6) { q.x = px + ex / e * need; q.y = py + ey / e * need; }
    }
  }
  for (let it = 0; it < 2; it++) for (let i = 0; i < cubes.length; i++) for (let j = i + 1; j < cubes.length; j++) {
    const a = cubes[i], b = cubes[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < DELTA.S && d > 1e-6) { const k = (DELTA.S - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
  }
  for (const q of cubes) { q.x = Math.max(half, Math.min(L.W - half, q.x)); q.y = Math.max(half, Math.min(L.H - half, q.y)); if (!inRect(DELTA.store, q.x, q.y)) q.moved = true; }
}
function deltaScore(st) {
  let out = 0, lodge = 0;
  for (const q of st.cubes) {
    if (q.moved) out += 1;
    const half = DELTA.S / 2;
    if (inRect(DELTA.ground, q.x, q.y, half)) lodge += q.pts;
    else if (inRect(DELTA.raised, q.x, q.y, half)) lodge += q.pts * 1.5;
  }
  return { out, lodge, total: out + lodge };
}

/* ---------------------------------------------------------------- Echo: RECO Bot Neutralization */
const ECHO = { path: [[20, 135], [100, 135], [100, 80], [160, 80], [160, 30], [215, 30]] };
ECHO.cum = [0]; for (let i = 1; i < ECHO.path.length; i++) ECHO.cum.push(ECHO.cum[i - 1] + Math.hypot(ECHO.path[i][0] - ECHO.path[i - 1][0], ECHO.path[i][1] - ECHO.path[i - 1][1]));
ECHO.len = ECHO.cum[ECHO.cum.length - 1];
ECHO.near = function (x, y) {          // [distance to the line, arc length along it]
  let best = Infinity, s = 0;
  for (let i = 0; i < ECHO.path.length - 1; i++) {
    const a = ECHO.path[i], b = ECHO.path[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (len * len)));
    const d = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
    if (d < best) { best = d; s = ECHO.cum[i] + t * len; }
  }
  return [best, s];
};
ECHO.dist = (x, y) => ECHO.near(x, y)[0];
ECHO.RECOS = [
  { id: 'ground', label: 'Ground RECO', x: 60, y: 147, pts: 5, body: true },
  { id: 'overhang', label: 'Overhang RECO', x: 130, y: 66, pts: 10, body: false },
  { id: 'ledge', label: 'Ledge RECO', x: 190, y: 44, pts: 15, body: false }
];
ECHO.RECOS.forEach(r => { r.s = ECHO.near(r.x, r.y)[1]; });
const RECO_H = 2.5;
function recoHit(r) {
  const x0 = r.x - RECO_H, x1 = r.x + RECO_H, y0 = r.y - RECO_H, y1 = r.y + RECO_H;
  if (r.body) { const cx = Math.max(x0, Math.min(bot.x, x1)), cy = Math.max(y0, Math.min(bot.y, y1)); if (Math.hypot(bot.x - cx, bot.y - cy) < L.ROBOT_R) return true; }
  for (const [a, b] of L.armSegs()) for (let k = 0; k <= 20; k++) { const x = a[0] + (b[0] - a[0]) * k / 20, y = a[1] + (b[1] - a[1]) * k / 20; if (x >= x0 - .45 && x <= x1 + .45 && y >= y0 - .45 && y <= y1 + .45) return true; }
  return false;
}
function echoScore(st) {
  const s = st.maxS || 0, secPts = [[ECHO.RECOS[0].s, 3], [ECHO.RECOS[1].s, 5], [ECHO.RECOS[2].s, 7]];
  let course = secPts.reduce((a, [at, p]) => a + (s >= at ? p : 0), 0) + (st.finished ? 10 : 0);
  const reco = ECHO.RECOS.reduce((a, r) => a + (st.hit[r.id] ? r.pts : 0), 0);
  return { course, reco, total: course + reco };
}

/* ---------------------------------------------------------------- Foxtrot: Fragile Egg Escort */
const FOX = { x0: 25, x1: 25 + 120 * IN, mid: 120, lw: 1.5 * IN };
FOX.top = FOX.mid - 6 * IN; FOX.bot = FOX.mid + 6 * IN;
FOX.checks = [1, 2, 3, 4, 5].map(k => FOX.x0 + k * 24 * IN);
FOX.halves = [0, 1, 2, 3, 4].map(k => FOX.x0 + (k * 24 + 12) * IN);
const stripes = (x0, x1, fill) => (c) => { c.fillStyle = fill; for (let x = x0; x < x1; x += 2.2) c.fillRect(x, FOX.top, 1.1, FOX.bot - FOX.top); };
FOX.terrain = [
  { kind: 'rumble', x0: 62, x1: 80, draw: stripes(62, 80, '#a9aca8') },
  { kind: 'bump', x0: 108, x1: 110.5, draw: (c) => { c.fillStyle = '#c8a24a'; c.fillRect(108, FOX.top, 2.5, FOX.bot - FOX.top); } },
  { kind: 'bump', x0: 128, x1: 130.5, draw: (c) => { c.fillStyle = '#c8a24a'; c.fillRect(128, FOX.top, 2.5, FOX.bot - FOX.top); } },
  { kind: 'turf', x0: 158, x1: 196, draw: (c) => { c.fillStyle = '#9ccf8e'; c.fillRect(158, FOX.top, 38, FOX.bot - FOX.top); } },
  { kind: 'ramp', x0: 218, x1: 252, draw: (c) => { const g = c.createLinearGradient(218, 0, 252, 0); g.addColorStop(0, '#e2ddd0'); g.addColorStop(.5, '#c9bfa6'); g.addColorStop(1, '#e2ddd0'); c.fillStyle = g; c.fillRect(218, FOX.top, 34, FOX.bot - FOX.top); } },
  { kind: 'rumble', x0: 282, x1: 300, draw: stripes(282, 300, '#a9aca8') },
  { kind: 'bump', x0: 314, x1: 316.5, draw: (c) => { c.fillStyle = '#c8a24a'; c.fillRect(314, FOX.top, 2.5, FOX.bot - FOX.top); } }
];
const EGG = { k: 355, c: 5.6, drop: 1.25 };            // the ball in its cradle: a spring, a little damping, and the lip
function foxEgg(st, dt) {
  const v = speed(), w = (bot.vl - bot.vr) / L.WHEELBASE;
  const af = st.pv === undefined ? 0 : (v - st.pv) / dt, al = v * w;
  st.pv = v;
  const e = st.egg;
  e.vx += (-af - EGG.k * e.x - EGG.c * e.vx) * dt; e.vy += (-al - EGG.k * e.y - EGG.c * e.vy) * dt;
  // terrain under the wheels kicks the ball, harder the faster the robot goes
  const fx = bot.x + Math.sin(bot.a) * 3, sp = Math.abs(v);
  for (const t of FOX.terrain) {
    const inside = fx >= t.x0 && fx <= t.x1, was = st.inT[t.x0];
    if (t.kind === 'bump' && inside && !was) { e.vx += -1.05 * sp * (0.8 + L.rand() * 0.4); e.vy += (L.rand() - .5) * 0.5 * sp; }
    if (t.kind === 'ramp' && inside !== !!was) { e.vx += (inside ? -1 : 1) * 0.55 * sp; }
    if (t.kind === 'rumble' && inside) { const k = Math.floor((fx - t.x0) / 2.2); if (k !== st.rumbleK) { st.rumbleK = k; e.vx += (L.rand() - .5) * 0.5 * sp; e.vy += (L.rand() - .5) * 0.5 * sp; } }
    if (t.kind === 'turf' && inside) { e.vx += (L.rand() - .5) * 1.1 * sp * dt * 20; e.vy += (L.rand() - .5) * 1.1 * sp * dt * 20; }
    st.inT[t.x0] = inside;
  }
  e.x += e.vx * dt; e.y += e.vy * dt;
  return Math.hypot(e.x, e.y) > EGG.drop;
}
function foxScore(st) {
  const halves = FOX.halves.filter((x, i) => st.best >= x).length, ends = FOX.checks.filter(x => st.best >= x).length;
  return Math.max(0, halves * 5 + ends * 10 + (st.delivered ? 10 : 0) - 2 * st.outs);
}

/* ---------------------------------------------------------------- the missions */
const MISSIONS = [
  { id: 'v2xAlpha', title: 'Alpha: Roz’s Depot Calibration', due: 'Video due Feb 19, 2027', map: 'v2xAlpha', limit: 120, scored: true, max: 10,
    goal: 'Drive 24 in forward, 18 in backward, turn 45° left + 24 in, turn 90° right + 24 in, and turn 180° + 12 in, in any order. Then stop and signal with lights, the LED screen or a sound. All within 1 minute.',
    setup(st) { st.raw = []; st.px = undefined; st.moved = 0; st.signal = false; st.stillT = 0; st.lastMoveT = 0; st.match = { done: {} }; st.sigKey = undefined; st.toneFlag = false; },
    tick(st, dt, t) {
      st.t = t;
      if (st.px !== undefined) {
        const dx = bot.x - st.px, dy = bot.y - st.py;
        let da = bot.a - st.pa; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const ds = dx * Math.sin(st.pa) - dy * Math.cos(st.pa), arc = Math.abs(da) * L.WHEELBASE / 2;
        const k = Math.abs(ds) < 0.002 && arc < 0.002 ? null : arc < 0.35 * Math.abs(ds) ? 's' : Math.abs(ds) < 0.35 * arc ? 't' : 'a';
        if (k) {
          const v = k === 's' ? ds : k === 't' ? da * DEG : 0, last = st.raw[st.raw.length - 1];
          if (last && last.k === k && Math.sign(last.v) === Math.sign(v)) last.v += v; else st.raw.push({ k, v });
          st.moved += Math.abs(ds); st.lastMoveT = t;
        }
      }
      st.px = bot.x; st.py = bot.y; st.pa = bot.a;
      st.match = alphaMatch(st);
      const sig = signalWatch(st);
      const allDone = ALPHA.every(m => st.match.done[m.id]);
      if (sig && st.moved > 20 && stopped() && t - st.lastMoveT > 0.15 && allDone) st.signal = true;
      if (st.moved > 20 && stopped()) st.stillT += dt; else st.stillT = 0;
      if (st.moved > 20 && st.stillT > (allDone ? 3 : 8)) { st.endT = st.lastMoveT; return ['done', st.signal ? 'Run complete.' : 'The robot stopped without a completion signal.']; }
    },
    score: alphaScore,
    checklist: (st) => [...ALPHA.map(m => [m.label, !!(st.match && st.match.done[m.id]), 2]),
      ['Stop, then signal with lights, the screen or a sound', st.signal, 2],
      [`Done within 60 s${st.endT > 60 ? ` (−${overTime(st.endT, 60)})` : ''}`, st.endT !== undefined ? st.endT <= 60 : (st.t || 0) > 60 ? 'x' : null, 0]],
    bonus: () => uses(...ENCODER_BLOCKS) ? 'Advanced tier: encoders, compass or accelerometer (+2 possible)' : uses('variables_set') ? 'Intermediate tier: variables for distances (+1 possible)' : 'Basic tier: timed moves',
    marks: [[150, 150, 'Start here, facing up']],
    progress: (st) => `Segments: ${alphaSegments(st).map(s => s.k === 's' ? `${s.v > 0 ? '↑' : '↓'}${Math.abs(s.v / IN).toFixed(1)} in` : `${s.v > 0 ? '↻' : '↺'}${Math.abs(s.v).toFixed(0)}°`).join(' ') || 'none yet'}`,
    hints: ['Measure first: how many cm does the robot drive at your speed in 1 second? 1 in = 2.54 cm.', 'The encoder (PID) blocks drive exact distances and angles. Judges give bonus points for closed-loop calibration.', 'Use a variable for each distance so changing one number recalibrates the whole run.'] },

  { id: 'v2xBravo', title: 'Bravo: Goose Flock Platooning', due: 'Video due Feb 26, 2027', map: 'v2xBravo', limit: 60, scored: true, max: 10,
    goal: 'Follow the lead box for 45 s. Over 12 in away: full speed. 6 to 12 in: half speed with amber headlights. Under 6 in: stop before touching, back up 4 in and beep.',
    setup(st) { st.lead = { x: 90, y: 74, w: 12, h: 12 }; L.dyn = [st.lead]; st.ind = {}; st.vOpen = 0; st.em = null; st.contact = false; st.zoneT = { open: 0, pace: 0 }; st.toneFlag = false; },
    tick(st, dt, t) {
      st.lead.x = Math.min(st.lead.x + leadSpeed(t) * dt, L.W - st.lead.w - 1);
      const gap = bravoGap(st), v = speed(), aligned = Math.abs(bot.y - (st.lead.y + st.lead.h / 2)) < 8;
      const beep = st.toneFlag; st.toneFlag = false;
      if (bot.bumps > 0 && !st.contact) st.contact = true;
      if (!aligned) return;
      if (gap > BR.open) {
        st.zoneT.pace = 0; st.zoneT.open += dt;
        if (st.zoneT.open > 0.4 && v > 0) st.vOpen = Math.max(st.vOpen, v);
        if (st.vOpen >= 0.6 * L.MAXV) st.ind.open = true;
      } else if (gap > BR.pace) {
        st.zoneT.open = 0; st.zoneT.pace += dt;
        const ref = Math.max(st.vOpen, 1);
        if (st.zoneT.pace > 0.3 && v > 0.3 * ref && v < 0.7 * ref) st.ind.pace = true;
        if (bot.lights.some(isAmber)) st.ind.amber = true;
      } else {
        st.zoneT.open = st.zoneT.pace = 0;
        if (!st.em) st.em = { x: bot.x, stopped: false, back: 0, beep: false };
        if (stopped() && !st.contact) st.em.stopped = true;
        st.em.back = Math.max(st.em.back, st.em.x - bot.x);
        if (beep) st.em.beep = true;
      }
      if (st.em) {
        if (beep) st.em.beep = true;
        st.em.back = Math.max(st.em.back, st.em.x - bot.x);
        if (st.em.stopped && !st.contact) st.ind.stop = true;
        if (st.em.back >= 2.5 * IN && st.em.back <= 6 * IN) st.ind.back = true;
        if (st.em.beep) st.ind.beep = true;
        if (gap > BR.open + 4) st.em = null;
      }
      if (t >= 45) return ['done', '45-second demonstration complete.'];
    },
    score: (st) => Math.max(0, 10 - 2 * ['open', 'pace', 'amber', 'stop', 'back', 'beep'].filter(k => !st.ind[k] || (k === 'stop' && st.contact)).length),
    checklist: (st) => [['Open path (over 12 in): full speed', !!st.ind.open, 2], ['Pacing zone (6–12 in): about half speed', !!st.ind.pace, 2], ['Pacing zone: amber headlights', !!st.ind.amber, 2],
      [st.contact ? 'Touched the lead box!' : 'Emergency (under 6 in): stops before contact', st.contact ? 'x' : !!st.ind.stop, 2], ['Emergency: backs up about 4 in', !!st.ind.back, 2], ['Emergency: warning beep', !!st.ind.beep, 2]],
    bonus: () => 'Advanced tier: a proportional loop that sets speed from the distance (+2 possible)',
    drawTop(c, s, st) { if (!st.lead) return; const g = bravoGap(st); label(c, bot.x, bot.y - 12, `${(Math.max(0, g) / IN).toFixed(1)} in`, 2.6, g > BR.open ? '#0b8f2f' : g > BR.pace ? '#b07800' : '#d33a12'); },
    draw(c, s, st) { if (!st.lead) return; const x = st.lead.x; c.fillStyle = 'rgba(176,120,0,.12)'; c.fillRect(x - BR.open, 62, BR.open - BR.pace, 36); c.fillStyle = 'rgba(211,58,18,.12)'; c.fillRect(x - BR.pace, 62, BR.pace, 36); },
    marks: [[90, 70, 'Lead box (moves, stops, moves)']],
    progress: (st) => `Lead box speed: ${leadSpeed(st.t || 0)} cm/s`,
    hints: ['Read the sonar in a forever loop and use if / else if / else for the three zones. 12 in = 30.5 cm, 6 in = 15.2 cm.', 'Amber is orange-yellow: try the headlights at R 255, G 140, B 0.', 'For the bonus, compute the speed from the distance (for example speed = (distance − 15) × 3) instead of fixed steps.'] },

  { id: 'v2xCharlie', title: 'Charlie: Refuge Pull-Over', due: 'Video due Mar 5, 2027', map: 'v2xCharlie', limit: 90, scored: true, max: 10,
    goal: 'Drive along the 5 ft corridor. A siren (sound level 200) plays partway down. Signal, turn 45° right into the refuge zone, pause 5 s with a siren animation, then return and cross the finish. The room is noisy, with spikes up to 140.',
    setup(st) {
      st.ph = 'drive'; st.cueAt = null; st.ind = {}; st.sigKey = undefined; st.toneFlag = false; st.leftEarly = false; st.zoneT = 0; st.anim = 0; st.heading0 = null; st.spike = 0;
      L.missionNoise = () => 45 + (st.noise || 0);
    },
    tick(st, dt, t) {
      // the room: a steady hum with short spikes, up to 140
      if (L.rand() < dt * 1.2) st.spike = 0.15; st.spike -= dt;
      st.noise = (L.rand() - .5) * 8 + (st.spike > 0 ? 72 + L.rand() * 19 : 0);
      if (!st.cueAt && bot.x >= 85) { st.cueAt = t; L.soundBurst = { level: 200, until: L.simNow() + 1500 }; st.heading0 = bot.a; }
      const inCorr = bot.y >= 45 && bot.y <= 75 && bot.x >= 20 && bot.x <= 195, inZone = bot.x >= 100 && bot.x <= 150 && bot.y >= 78 && bot.y <= 112;
      const sig = signalWatch(st);
      if (!st.cueAt) { if (!inCorr) st.leftEarly = true; if (bot.x > 60) st.ind.drive = true; }
      else {
        if (sig && st.ph === 'drive') st.ind.signal = true;
        const turned = (bot.a - st.heading0) * DEG;
        if (st.ph === 'drive' && turned > 25) st.ph = 'turn';
        if (st.ph === 'turn' && Math.abs(turned - 45) <= 15 && inZone) { st.ind.turn = true; }
        if (inZone) st.ph = st.ph === 'back' ? 'back' : 'zone';
        if (st.ph === 'zone' && inZone && stopped()) { st.zoneT += dt; if (sig) st.anim++; if (st.zoneT >= 4.8) st.ind.pause = true; if (st.anim >= 2) st.ind.siren = true; }
        if (st.ph === 'zone' && !inZone && st.zoneT > 0) st.ph = 'back';
        if ((st.ph === 'back' || st.ph === 'zone') && inCorr && bot.x >= 182) { st.ind.finish = true; st.endT = t; return ['done', 'Crossed the finish line.']; }
      }
      st.toneFlag = false;
    },
    score: (st) => Math.max(0, 10 - 2 * ['drive', 'signal', 'turn', 'pause', 'siren', 'finish'].filter(k => !st.ind[k]).length - (st.leftEarly ? 2 : 0) - overTime(st.endT ?? 90, 60)),
    checklist: (st) => [['Drive forward along the corridor', !!st.ind.drive, 2], [st.leftEarly ? 'Pulled over before the siren!' : 'No pull-over before the siren', st.leftEarly ? 'x' : !!st.cueAt, 2], ['Signal the turn after the siren', !!st.ind.signal, 2],
      ['Turn about 45° right into the refuge zone', !!st.ind.turn, 2], ['Pause 5 s in the zone', !!st.ind.pause, 2], ['Siren animation while paused', !!st.ind.siren, 2], ['Return and cross the finish within 60 s', !!st.ind.finish && (st.endT ?? 99) <= 60, 2]],
    bonus: () => uses('mb_sound_level') ? 'Advanced tier: reads the sound level, e.g. to calibrate the room on startup (+2 possible)' : 'Basic tier: “on loud sound”',
    drawTop(c, s, st) { const lv = L.soundLevel(L.devices.robot); c.fillStyle = 'rgba(20,25,22,.75)'; c.fillRect(4, 4, 34, 6); c.fillStyle = lv > 150 ? '#d33a12' : lv > 128 ? '#e9a400' : '#2ea84f'; c.fillRect(5, 5, 32 * lv / 255, 4); label(c, 21, 13, `sound ${lv}`, 2.4); },
    draw(c, s, st) { c.save(); c.strokeStyle = st.cueAt ? 'rgba(211,58,18,.9)' : 'rgba(211,58,18,.4)'; c.lineWidth = .5; c.setLineDash([1, 1]); c.beginPath(); c.moveTo(85, 45); c.lineTo(85, 75); c.stroke(); c.restore(); label(c, 85, 78, 'siren plays here', 2.2, '#b02a0a'); },
    marks: [[38, 50, 'Start']],
    progress: (st) => st.cueAt ? `Siren at ${st.cueAt.toFixed(1)} s · phase: ${st.ph}` : 'Waiting for the siren',
    hints: ['Use “on loud sound”, and set the loud sound threshold to 150 in “on start” so the room’s noise spikes (up to 140) don’t trigger it.', 'In the sound event, set a variable such as “pullover” to 1, and let the forever loop do the moves.', 'For the bonus, read the sound level a few times in “on start” and set the threshold a bit above the loudest reading.'] },

  { id: 'v2xDelta', title: 'Delta: Winter Supply Delivery', due: 'Competition day', map: 'v2xDelta', limit: 300, scored: true, max: 100, arms: true,
    goal: 'In 5 minutes, move cubes out of the storage area and into the two lodges. Red 5, blue 3, yellow 2, green 1, ×1.5 in the raised lodge. The black “predator” cube scores −2 in a lodge.',
    setup(st) { st.cubes = deltaCubes(); st.still = 0; st.moved = 0; foldArms(); },
    tick(st, dt, t) {
      deltaPush(st);
      st.moved += Math.abs(speed()) * dt;
      st.still = stopped() ? st.still + dt : 0;
      if (st.moved > 30 && st.still > 10) return ['done', 'The robot stopped for 10 s.'];
    },
    score: (st) => Math.round(deltaScore(st).total * 2) / 2,
    checklist: (st) => { const s = deltaScore(st), inL = st.cubes.filter(q => inRect(DELTA.ground, q.x, q.y, 1.27) || inRect(DELTA.raised, q.x, q.y, 1.27)).length; return [[`Cubes moved out of storage: ${s.out} pts`, s.out > 0 ? true : null, 0], [`Cubes in lodges: ${inL} (${s.lodge} pts)`, s.lodge > 0 ? true : null, 0]]; },
    bonus: () => 'Extra: a door that opens and closes autonomously (+10/+5) and camera color recognition (+5) are judged on the real field',
    draw(c, s, st) { },
    drawTop(c, s, st) { if (!st.cubes) return; for (const q of st.cubes) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(q.x - 1.1, q.y - 1.0, 2.54, 2.54); c.fillStyle = q.fill; c.fillRect(q.x - 1.27, q.y - 1.27, 2.54, 2.54); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = .15; c.strokeRect(q.x - 1.27, q.y - 1.27, 2.54, 2.54); } },
    marks: [[63, 122, 'Robot start'], [120, 122, '20 cubes + 1 black']],
    progress: (st) => `Practice score ${deltaScore(st).total} pts`,
    hints: ['Plan a route with exact moves: the encoder blocks make a plow pattern repeatable.', 'Your robot has servo arms on S1 (left) and S2 (right). They start folded back at 0°; 90° sticks straight out. Arms out make a wide plow.', 'Red cubes are worth the most, and the raised lodge multiplies by 1.5. Keep the black cube out of the lodges.'] },

  { id: 'v2xEcho', title: 'Echo: RECO Bot Neutralization', due: 'Competition day', map: 'v2xEcho', limit: 300, scored: true, max: 55, arms: true,
    goal: 'Follow the 10 ft line to the finish and knock over the three RECO bots beside it. The Overhang and Ledge RECOs sit under or on a structure, so only an arm can reach them.',
    setup(st) { st.maxS = 0; st.hit = {}; st.finished = false; st.lost = false; foldArms(); },
    tick(st, dt, t) {
      const [d, s] = ECHO.near(bot.x, bot.y);
      if (d < 12 && s > st.maxS && s - st.maxS < 10) st.maxS = s;
      for (const r of ECHO.RECOS) if (!st.hit[r.id] && recoHit(r)) st.hit[r.id] = t;
      if (d > 20) { st.lost = true; return ['done', 'The robot lost the line. In competition you may reset to the start box or the last RECO you neutralized.']; }
      if (st.maxS >= ECHO.len - 1) { st.finished = true; if (ECHO.RECOS.every(r => st.hit[r.id])) return ['done', 'Finished with every RECO neutralized!']; return ['done', 'Crossed the finish line.']; }
    },
    score: (st) => echoScore(st).total,
    checklist: (st) => [['Line: start to RECO 1', st.maxS >= ECHO.RECOS[0].s, 3], ['Line: RECO 1 to RECO 2', st.maxS >= ECHO.RECOS[1].s, 5], ['Line: RECO 2 to RECO 3', st.maxS >= ECHO.RECOS[2].s, 7], ['Line: past RECO 3 to the finish', !!st.finished, 10],
      ...ECHO.RECOS.map(r => [`${r.label} knocked over`, !!st.hit[r.id] || (st.maxS > r.s + 25 && !st.hit[r.id] ? 'x' : false), r.pts])],
    bonus: () => 'Extra: time bonus (10, 8, 6, 4, 2) for the five fastest teams that clear every RECO',
    drawTop(c, s, st) {
      for (const r of ECHO.RECOS) {
        const hit = st.hit && st.hit[r.id];
        c.save(); c.translate(r.x, r.y); if (hit) c.rotate(.7);
        c.fillStyle = hit ? '#9aa0a6' : '#7a3db8'; c.fillRect(-RECO_H, -RECO_H, 2 * RECO_H, 2 * RECO_H);
        c.fillStyle = hit ? '#c9ccd0' : '#ffd84a'; c.fillRect(-1.4, -1, .8, .8); c.fillRect(.6, -1, .8, .8); c.restore();
      }
    },
    draw(c, s, st) {
      c.save(); c.fillStyle = 'rgba(60,70,65,.28)'; c.fillRect(118, 50, 24, 19); c.strokeStyle = '#3c4641'; c.lineWidth = .4; c.strokeRect(118, 50, 24, 19);
      c.fillStyle = '#3c4641'; [[118, 50], [140, 50], [118, 67], [140, 67]].forEach(([x, y]) => c.fillRect(x, y, 2, 2)); c.restore();
      c.save(); c.fillStyle = 'rgba(150,110,60,.35)'; c.fillRect(178, 41, 24, 16); c.strokeStyle = '#8a6537'; c.lineWidth = .4; c.strokeRect(178, 41, 24, 16); c.restore();
      label(c, 130, 47, 'canopy (low)', 2.2); label(c, 190, 60, 'ledge (4–6 in high)', 2.2); label(c, 60, 153, 'ground', 2.2);
    },
    marks: [[24, 117, 'Start box']],
    progress: (st) => `Course: ${(st.maxS / IN / 12).toFixed(1)} of ${(ECHO.len / IN / 12).toFixed(1)} ft · score ${echoScore(st).total}`,
    hints: ['Start from a line follower that uses all four channels. Slow down for the 90° corners.', 'Arms: S1 is on the left, S2 on the right, 10 cm long. They start folded back at 0°; 90° sticks straight out to the side.', 'Count encoder degrees or time along the line to know when a RECO is beside you, then swing the arm out and back.'] },

  { id: 'v2xFoxtrot', title: 'Foxtrot: Fragile Egg Escort', due: 'Competition day', map: 'v2xFoxtrot', limit: 300, scored: true, max: 85,
    goal: 'Carry the ping pong ball “egg” down the 10 ft lane over rumble strips, speed bumps, turf and a ramp. Stay inside the black boundary lines. Hard starts, stops and fast bumps spill the egg.',
    setup(st) { st.egg = { x: 0, y: 0, vx: 0, vy: 0 }; st.best = FOX.x0; st.inT = {}; st.dropped = false; st.delivered = false; st.outs = 0; st.pv = undefined; },
    tick(st, dt, t) {
      if (foxEgg(st, dt)) { st.dropped = true; st.dropAt = { x: bot.x, y: bot.y }; return ['done', 'The egg fell out! In competition: back to the last checkpoint, reload, restart.']; }
      if (Math.abs(bot.y - FOX.mid) < 6 * IN + FOX.lw + L.ROBOT_R) st.best = Math.max(st.best, bot.x);
      else { st.outs++; return ['done', 'The robot crossed the boundary line (−2). In competition: back to the last checkpoint.']; }
      if (bot.x >= FOX.x1) { st.delivered = true; return ['done', 'Egg delivered!']; }
    },
    score: foxScore,
    checklist: (st) => [...FOX.checks.map((x, i) => [`Section ${i + 1} (${i * 2}–${i * 2 + 2} ft)`, st.best >= x ? true : st.best >= FOX.halves[i] ? null : false, 15]),
      [st.dropped ? 'The egg dropped!' : st.outs ? 'Crossed the boundary line (−2)' : 'Egg delivered without a drop', st.dropped || st.outs ? 'x' : !!st.delivered, 10]],
    bonus: () => 'Extra: dynamic speed control and active suspension designs can earn up to 5 bonus points',
    drawTop(c, s, st) {
      if (!st.egg) return;
      const e = st.egg, sn = Math.sin(bot.a), cs = Math.cos(bot.a);
      const ox = 0, oy = 2.4, lx = ox + e.y * 1.4, ly = oy - e.x * 1.4;
      const wx = (x, y) => [bot.x + cs * x - sn * y, bot.y + sn * x + cs * y];
      const [cx, cy] = wx(ox, oy); c.strokeStyle = '#6b5200'; c.lineWidth = .35; c.fillStyle = 'rgba(232,180,0,.45)'; c.beginPath(); c.arc(cx, cy, 2.6, 0, 7); c.fill(); c.stroke();
      if (!st.dropped) { const [bx, by] = wx(lx, ly); c.fillStyle = '#ffffff'; c.strokeStyle = '#999'; c.lineWidth = .2; c.beginPath(); c.arc(bx, by, 2, 0, 7); c.fill(); c.stroke(); }
      else if (st.dropAt) { c.fillStyle = '#ffffff'; c.strokeStyle = '#999'; c.beginPath(); c.arc(st.dropAt.x + 6, st.dropAt.y + 5, 2, 0, 7); c.fill(); c.stroke(); }
    },
    marks: [[40, 104, 'Start box']],
    progress: (st) => `Furthest: ${((st.best - FOX.x0) / IN / 12).toFixed(1)} ft · egg ${st.dropped ? 'dropped' : 'safe'}`,
    hints: ['Speed up and slow down gradually: change the speed a little at a time in a loop.', 'Slow down before the bumps and the ramp. The faster you hit a bump, the bigger the jolt.', 'Use channels 1 and 4 of the line sensor to notice a boundary line and steer back toward the middle.'] }
];
for (const m of MISSIONS) { m.group = 'v2x'; m.level = 'V2X'; }
L.CHALLENGES.push(...MISSIONS);
L.MISSION_MAPS = new Set(MISSIONS.map(m => m.map));
L.DELTA = DELTA; L.ECHO = ECHO; L.FOX = FOX;
})();
