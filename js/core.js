/* COMMIT — palette, math helpers, storage. Shared by all modules (classic scripts).
   Tuning numbers live in js/constants.js. */
"use strict";

/* ---------- palette ---------- */
const COL = {
  plat: "#1c2436",      // solid slab body
  edge: "#43547c",      // solid slab top edge
  ink: "#e9edf4",       // the square / bright text
  dim: "#8b93a7",       // faint text / dust
  line: "#26304a",      // grid / rails
  blue: "#5aa7ff",      // aim / trail / progress
  green: "#57e389",     // landing / summit
  amber: "#ffb454",     // ceilings / warnings
  red: "#ff5d5d",       // strikes / falls
  spring: "#3fe0c5",    // bounce pads / reform
  ice: "#bfe3ff",       // ice
  mover: "#d17bff",     // conveyors / lifts
  phase: "#ffd166",     // clock platforms
  zone: "#6fc3ff",      // gust zones
  dir: "#ff9f43",       // direction springs
  orbit: "#7ee0a3",     // orbiters
  warp: "#ff6ec7",      // one-way warp pads
  crumble: "#8a6a3a",   // cracked edge, early stage
  crack: "#07090f",     // crack lines on a crumbling ledge
  deep: "#0a0e1a",      // eyes / editor background
  iceBody: "#152232",
  moverBody: "#1b1230",
  orbitBody: "#10241a",
  clockBody: "#241d0e",
  dirBody: "#2a1608",
  warpBody: "#2b1030"
};

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- math & dom helpers ---------- */
const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = id => document.getElementById(id);
const rgb = c => "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")";

/* altitude sky: cold navy floor -> steel teal -> violet dusk -> warm rose dawn.
   Each stop: [altitude fraction, top rgb, middle rgb, bottom rgb]. */
const SKY = [
  [0.00, [16, 24, 46], [10, 14, 26], [7, 9, 15]],
  [0.34, [18, 50, 58], [12, 27, 35], [8, 16, 24]],
  [0.67, [44, 29, 72], [27, 18, 49], [16, 10, 32]],
  [1.00, [96, 46, 66], [60, 29, 49], [33, 16, 25]]
];
function skyAt(t) {
  let i = 0;
  while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1];
  const f = clamp01((t - a[0]) / (b[0] - a[0]));
  const mix = (u, v) => [lerp(u[0], v[0], f), lerp(u[1], v[1], f), lerp(u[2], v[2], f)];
  return [mix(a[1], b[1]), mix(a[2], b[2]), mix(a[3], b[3])];
}
/* altitude fraction for sky/wind: towers climb once to the summit; the endless shaft
   ping-pongs through the same sky every ENDLESS_SKY_CYCLE so the air keeps changing */
function altFrac(y) {
  if (mode !== "endless") return clamp01(y / SUMMIT);
  const u = ((y / ENDLESS_SKY_CYCLE) % 2 + 2) % 2;
  return u < 1 ? u : 2 - u;
}

/* m:ss.d run clock */
function fmt(s) {
  const tenths = Math.floor(s * 10);
  const m = Math.floor(tenths / 600);
  const sec = Math.floor(tenths / 10) % 60;
  const d = tenths % 10;
  return m + ":" + (sec < 10 ? "0" : "") + sec + "." + d;
}

/* ---------- storage (silent in private mode / quota errors) ---------- */
const LS = {
  get(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
};
