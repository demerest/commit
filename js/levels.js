/* COMMIT — level engine. Tower DATA lives in separate descriptor files (levels/tower-N.js),
   each a single COMMIT_LEVEL({...}) call whose argument is a JSON object (see COMMIT_LEVELS.md).
   Descriptors are classic scripts so the game still runs from file:// with zero fetch.
   Platform authoring [x, topY, width, type]: 0 solid, 1 crumble, 2 bounce, 3 ice,
   4 mover·horizontal, 5 mover·vertical, 6 clock (phase), 7 mover·orbit, 8 direction spring,
   9 one-way warp pad.
   Movers append [amp, period, phase] (px, s, cycle fraction); x/topY is the oscillation centre
   (orbit: circle centre). Clock appends [duty, period, phase]. Dir spring appends [vx, vy].
   Warp appends [targetIdx]: landing on the pad folds you to that platform's top centre. */
"use strict";

const LEVELS = [];
function COMMIT_LEVEL(d) { LEVELS.push(d); }

let LVL = null, SUMMIT = 5080;
let RAW_PLATS = [], CEIL = [], PLATS = [], SOLIDS = [], GOAL = null;
let SECTIONS = [], NOTES = [], STARS = [], ZONES = [];

/* Parse one descriptor into live world arrays. SOLIDS = everything step() collides with
   (boundary slabs, platforms, ceilings, goal); PLATS = authorable platforms only. */
function buildLevel(n) {
  LVL = LEVELS[n - 1];
  SUMMIT = LVL.summit;
  RAW_PLATS = LVL.plats;
  CEIL = LVL.ceil;
  SOLIDS.length = 0;
  PLATS.length = 0;
  ZONES.length = 0;

  /* floor + side walls, just outside the playfield */
  SOLIDS.push(
    { x: -BOUNDARY_MARGIN, y: -BOUNDARY_MARGIN, w: VIEW_W + 2 * BOUNDARY_MARGIN, h: BOUNDARY_MARGIN, ground: true },
    { x: -BOUNDARY_MARGIN, y: 0, w: BOUNDARY_MARGIN, h: SUMMIT + BOUNDARY_HEADROOM, wall: true },
    { x: VIEW_W, y: 0, w: BOUNDARY_MARGIN, h: SUMMIT + BOUNDARY_HEADROOM, wall: true }
  );

  RAW_PLATS.forEach(([x, top, w, ty, amp, per, ph], i) => {
    const plat = {
      x, y: top - PLATFORM_HEIGHT, w, h: PLATFORM_HEIGHT, idx: i,
      crumble: ty === PLAT_CRUMBLE,
      bounce: ty === PLAT_BOUNCE,
      ice: ty === PLAT_ICE,
      move: ty === PLAT_MOVE_H ? PLAT_MOVE_H : ty === PLAT_MOVE_V ? PLAT_MOVE_V : ty === PLAT_ORBIT ? PLAT_ORBIT : 0,
      dir: ty === PLAT_DIR ? 1 : 0,
      dvx: ty === PLAT_DIR ? (amp || 0) : 0,
      dvy: ty === PLAT_DIR ? (per || DIR_DEFAULT_VY) : 0,
      clock: ty === PLAT_CLOCK ? 1 : 0,
      duty: ty === PLAT_CLOCK ? (amp || CLOCK_DEFAULT_DUTY) : 0,
      warp: ty === PLAT_WARP ? 1 : 0,
      warpTo: ty === PLAT_WARP ? (amp || 0) : 0,
      bx: x, by: top - PLATFORM_HEIGHT,
      amp: amp || MOVER_DEFAULT_AMP,
      period: per || MOVER_DEFAULT_PERIOD,
      phase: ph || 0,
      dead: false, bounceT: 0, respawnT: 0
    };
    PLATS.push(plat);
    SOLIDS.push(plat);
  });

  for (const z of (LVL.zones || [])) {
    ZONES.push({ x: z[0], y: z[1], w: z[2], h: z[3], ax: z[4], ay: z[5] });
  }
  for (const [x, top, w] of CEIL) {
    SOLIDS.push({ x, y: top - PLATFORM_HEIGHT, w, h: PLATFORM_HEIGHT, ceil: true });
  }
  GOAL = { x: LVL.goal[0], y: SUMMIT - PLATFORM_HEIGHT, w: LVL.goal[1], h: PLATFORM_HEIGHT, goal: true };
  SOLIDS.push(GOAL);

  SECTIONS = LVL.sections;
  NOTES = LVL.notes;

  /* deterministic star field per tower (LCG, seed varies by tower id) */
  STARS.length = 0;
  let seed = 13 + n * 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < STAR_COUNT; i++) {
    STARS.push({
      x: rnd() * VIEW_W,
      y: rnd() * (SUMMIT * 0.4 + VIEW_H),
      r: rnd() * 1.4 + 0.4,
      p: rnd() * 6.28
    });
  }
}
