/* A virtual HuskyLens (DFRobot SEN0305) on the front of the Cutebot Pro.
   No image processing: the simulator knows where every object is, so the camera projects each object onto its
   320 × 240 screen with a pinhole model and reports a frame (box) for each learned color it can see.
   So far only Color Recognition is simulated; the other algorithms return an empty result. */
(() => {
'use strict';
const L = window.Lab;
const bot = L.bot;
const SW = 320, SH = 240;
// mounted at the front of the robot, 9 cm up, looking 25° down; 60° wide field of view
const CAM = { fwd: 6.5, h: 9, tilt: 25 * Math.PI / 180, hfov: 60 * Math.PI / 180 };
const FX = (SW / 2) / Math.tan(CAM.hfov / 2), FY = FX;
const ct = Math.cos(CAM.tilt), st = Math.sin(CAM.tilt);
const COLORS = { ...L.CUBE_COLORS, cardboard: '#c9a06a' };          // the cube palette, plus the arena's cardboard boxes
const DEFAULT = ['red', 'blue', 'yellow', 'green'];
const ALG = ['Face Recognition', 'Object Tracking', 'Object Recognition', 'Line Tracking', 'Color Recognition', 'Tag Recognition', 'Object Classification', 'QR Recognition', 'Barcode Recognition'];
const COLOR_ALG = 4;
const KEY = 'cutebotpro-lab-husky';
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v.filter(c => COLORS[c]) : null; } catch (e) { return null; } };

const H = L.husky = { SW, SH, COLORS, ALG, COLOR_ALG, learned: load() || DEFAULT.slice() };
H.save = () => { try { localStorage.setItem(KEY, JSON.stringify(H.learned)); } catch (e) {} };

/* ---------- geometry ---------- */
function pose() { const s = Math.sin(bot.a), c = Math.cos(bot.a); return { x: bot.x + s * CAM.fwd, y: bot.y - c * CAM.fwd, s, c }; }
// world point (cm, z = height) → [screen x, screen y, depth] or null when behind the camera
function project(p, x, y, z) {
  const dx = x - p.x, dy = y - p.y, f = dx * p.s - dy * p.c, l = dx * p.c + dy * p.s, zr = CAM.h - z;
  const d = f * ct + zr * st;
  if (d < 0.5) return null;
  return [SW / 2 + FX * l / d, SH / 2 + FY * (zr * ct - f * st) / d, d];
}
// screen pixel → floor point, or null above the horizon
function toFloor(p, sx, sy) {
  const ln = (sx - SW / 2) / FX, vn = (sy - SH / 2) / FY, den = st + vn * ct;
  if (den <= 1e-3) return null;
  const k = CAM.h / den, f = k * (ct - vn * st), l = k * ln;
  return [p.x + f * p.s + l * p.c, p.y - f * p.c + l * p.s];
}
function segHitsRect(x0, y0, x1, y1, r) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0;
  for (const [pp, q] of [[-dx, x0 - r.x], [dx, r.x + r.w - x0], [-dy, y0 - r.y], [dy, r.y + r.h - y0]]) {
    if (Math.abs(pp) < 1e-9) { if (q < 0) return false; continue; }
    const t = q / pp; if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/* ---------- what the camera can see ---------- */
// boxes in the arena, plus whatever the open mission adds (Delta's cubes, Echo's RECO bots)
H.objects = function () {
  const out = L.boxes().map(b => ({ x: b.x, y: b.y, w: b.w, d: b.h, h: 10, z: 0, color: 'cardboard', box: b }));
  for (const q of L.liveCubes) out.push({ x: q.x - L.CUBE / 2, y: q.y - L.CUBE / 2, w: L.CUBE, d: L.CUBE, h: L.CUBE, z: 0, color: q.color });
  if (L.visionHook) out.push(...L.visionHook());
  return out;
};
// each visible object as a screen frame {color, x0, y0, x1, y1, depth}
H.frames = function () {
  const p = pose(), objs = H.objects(), boxes = objs.filter(o => o.box), out = [];
  for (const o of objs) {
    const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
    const inside = (r) => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;          // e.g. a RECO on its ledge
    if (!o.box && boxes.some(b => !inside(b.box) && segHitsRect(p.x, p.y, cx, cy, b.box))) continue;     // hidden behind a box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, dep = Infinity, n = 0;
    for (const x of [o.x, o.x + o.w]) for (const y of [o.y, o.y + o.d]) for (const z of [o.z, o.z + o.h]) {
      const q = project(p, x, y, z); if (!q) continue; n++;
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); dep = Math.min(dep, q[2]);
    }
    if (n < 4) continue;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(SW, x1); y1 = Math.min(SH, y1);
    if (x1 - x0 < 3 || y1 - y0 < 3) continue;
    out.push({ o, color: o.color, x0, y0, x1, y1, depth: dep });
  }
  return out;
};
/* Color Recognition: one frame per patch of a learned color; touching patches of one color merge, like on the device.
   noisy = Real-world mode: frames jitter a few pixels and small ones are sometimes missed. */
H.detect = function (learned, noisy) {
  const byId = new Map();
  for (const f of H.frames()) {
    const id = learned.indexOf(f.color) + 1; if (!id) continue;
    const list = byId.get(id) || []; byId.set(id, list);
    let m = { x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1 };
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (m.x0 <= b.x1 + 2 && b.x0 <= m.x1 + 2 && m.y0 <= b.y1 + 2 && b.y0 <= m.y1 + 2) { m = { x0: Math.min(m.x0, b.x0), y0: Math.min(m.y0, b.y0), x1: Math.max(m.x1, b.x1), y1: Math.max(m.y1, b.y1) }; list.splice(i, 1); }
    }
    list.push(m);
  }
  let out = [];
  for (const [id, list] of byId) for (const b of list) {
    let w = b.x1 - b.x0, h = b.y1 - b.y0, x = b.x0 + w / 2, y = b.y0 + h / 2;
    if (noisy) {
      if (w * h < 400 && L.rand() < 0.08) continue;
      x += (L.rand() - .5) * 4; y += (L.rand() - .5) * 4; w += (L.rand() - .5) * 3; h += (L.rand() - .5) * 3;
    }
    out.push({ id, x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) });
  }
  const dc = (b) => Math.hypot(b.x - SW / 2, b.y - SH / 2);
  out.sort((a, b) => a.id - b.id || dc(a) - dc(b));
  return out;
};
// the color of the object in the learning box around the crosshair (most overlap, then nearest)
const LB = 24;
H.centerColor = function () {
  const ov = (f) => Math.max(0, Math.min(f.x1, SW / 2 + LB) - Math.max(f.x0, SW / 2 - LB)) * Math.max(0, Math.min(f.y1, SH / 2 + LB) - Math.max(f.y0, SH / 2 - LB));
  const hits = H.frames().filter(f => ov(f) > 0).sort((a, b) => ov(b) - ov(a) || a.depth - b.depth);
  return hits.length ? hits[0].color : null;
};
H.learnCenter = function (learned, id) {
  const c = H.centerColor(); if (!c) return null;
  const old = learned.indexOf(c); if (old >= 0) learned.splice(old, 1);          // one ID per color
  id = Math.max(1, Math.min(Math.round(id) || learned.length + 1, learned.length + 1));
  learned[id - 1] = c;
  return c;
};

/* ---------- the camera's screen ---------- */
const FW = 160, FH = 120;                    // the floor is sampled at half the screen's resolution
const floorCv = document.createElement('canvas'); floorCv.width = FW; floorCv.height = FH;
const fctx = floorCv.getContext('2d');
let lastFloor = 0;
H.draw = function (cv, info) {
  const c = cv.getContext('2d'), p = pose(), now = performance.now();
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || SW;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * SH / SW); }
  const k = cv.width / SW;
  // the floor, sampled a few times a second
  if (now - lastFloor > 120) {
    lastFloor = now;
    const img = fctx.createImageData(FW, FH);
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const g = toFloor(p, (i + .5) * SW / FW, (j + .5) * SH / FH), o = (j * FW + i) * 4;
      let r = 120, gg = 140, b = 160;
      if (g) { const out = g[0] < 0 || g[1] < 0 || g[0] > L.W || g[1] > L.H; if (out) { r = 42; gg = 51; b = 46; } else if (L.isBlack(g[0], g[1])) { r = gg = b = 25; } else { r = 226; gg = 228; b = 222; } }
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    fctx.putImageData(img, 0, 0);
  }
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(floorCv, 0, 0, cv.width, cv.height);
  c.setTransform(k, 0, 0, k, 0, 0);
  // objects, far to near, as their projected outline
  const frames = H.frames().sort((a, b) => b.depth - a.depth);
  for (const f of frames) {
    const o = f.o, pts = [];
    for (const x of [o.x, o.x + o.w]) for (const y of [o.y, o.y + o.d]) for (const z of [o.z, o.z + o.h]) { const q = project(p, x, y, z); if (q) pts.push(q); }
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const hull = []; const cross = (o2, a, b) => (a[0] - o2[0]) * (b[1] - o2[1]) - (a[1] - o2[1]) * (b[0] - o2[0]);
    for (const q of pts) { while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], q) <= 0) hull.pop(); hull.push(q); }
    const lo = hull.length + 1; for (let i = pts.length - 2; i >= 0; i--) { const q = pts[i]; while (hull.length >= lo && cross(hull[hull.length - 2], hull[hull.length - 1], q) <= 0) hull.pop(); hull.push(q); }
    c.fillStyle = COLORS[o.color]; c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
    c.beginPath(); hull.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.fill(); c.stroke();
  }
  // what the HuskyLens reports, drawn like on its own screen
  if (info.mode === COLOR_ALG || info.mode < 0) {          // before a run: a preview with the learned colors
    for (const b of H.detect(info.learned, false)) {
      const col = COLORS[info.learned[b.id - 1]] || '#fff';
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      c.strokeStyle = col; c.lineWidth = 1.5; c.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      c.font = '600 11px Lexend, system-ui, sans-serif'; const t = `Color: ID${b.id}`, tw = c.measureText(t).width + 6;
      const ty = Math.max(0, b.y - b.h / 2 - 15);
      c.fillStyle = col; c.fillRect(b.x - b.w / 2, ty, tw, 14); c.fillStyle = info.learned[b.id - 1] === 'yellow' ? '#18211c' : '#fff'; c.fillText(t, b.x - b.w / 2 + 3, ty + 11);
    }
  }
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.setLineDash([3, 3]); c.strokeRect(SW / 2 - LB, SH / 2 - LB, LB * 2, LB * 2); c.setLineDash([]);
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(SW / 2 - 8, SH / 2); c.lineTo(SW / 2 + 8, SH / 2); c.moveTo(SW / 2, SH / 2 - 8); c.lineTo(SW / 2, SH / 2 + 8); c.stroke();
  c.font = '600 11px Lexend, system-ui, sans-serif'; c.fillStyle = 'rgba(10,14,12,.6)'; const label = info.mode >= 0 ? ALG[info.mode] : 'Color Recognition (preview)';
  c.fillRect(0, 0, c.measureText(label).width + 10, 16); c.fillStyle = '#fff'; c.fillText(label, 5, 12);
  if (info.mode >= 0 && info.mode !== COLOR_ALG) { c.fillStyle = 'rgba(10,14,12,.6)'; c.fillRect(60, 108, 200, 24); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('Not simulated yet: no results', SW / 2, 124); c.textAlign = 'left'; }
};
// the camera's view on the arena, a faint wedge
H.drawFov = function (c) {
  const p = pose(), a = bot.a, r = 60;
  c.fillStyle = 'rgba(231,102,11,.07)'; c.strokeStyle = 'rgba(231,102,11,.35)'; c.lineWidth = .3;
  c.beginPath(); c.moveTo(p.x, p.y);
  c.lineTo(p.x + Math.sin(a - CAM.hfov / 2) * r, p.y - Math.cos(a - CAM.hfov / 2) * r);
  c.lineTo(p.x + Math.sin(a + CAM.hfov / 2) * r, p.y - Math.cos(a + CAM.hfov / 2) * r); c.closePath(); c.fill(); c.stroke();
};
})();
