/* COMMIT — NO SUMMIT: the endless randomized ascent. A separate mode from the towers.
   The world is a 100m live window: rests generate 50m above your peak and despawn 50m below
   it (the void). Every rest-to-rest jump is probe-verified through the real step() at ≤98%
   power, so the shaft is always climbable; springs/doors are inserted bonuses, never links
   the chain depends on. Commit pads (summit-like flags) appear every 100-200m and BANK your
   height: on death only committed height counts. Randomness lives in the seeded generator
   and in cosmetics — never inside step(), so the Commit Contract holds here too. */
"use strict";

const END = {
  seed: 0, rnd: Math.random,
  peak: 0, floor: 0, startFloor: 0, genTop: 0,
  bank: 0, nextClaim: 0, claims: 0,
  lastRest: null, prevRest: null, prevRest2: null, dead: false
};
const ENDLESS_META = { id: 0, name: "NO SUMMIT", tag: "ENDLESS ASCENT", summit: 0 };

/* chain rest types: solids weighted heavier; bounce/dir/warp are inserted bonuses only */
const END_REST_TYPES = [
  PLAT_SOLID, PLAT_SOLID, PLAT_SOLID, PLAT_CRUMBLE, PLAT_ICE,
  PLAT_MOVE_H, PLAT_MOVE_V, PLAT_CLOCK, PLAT_ORBIT
];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* same platform shape buildLevel makes, so step()/render() need no endless-specific paths.
   SOLIDS in endless is [wallL, wallR, ...PLATS] — despawn nulls slot i and i+2 together. */
function endPlat(x, top, w, ty, o) {
  o = o || {};
  const plat = {
    x, y: top - PLATFORM_HEIGHT, w, h: PLATFORM_HEIGHT, idx: PLATS.length,
    crumble: ty === PLAT_CRUMBLE,
    bounce: ty === PLAT_BOUNCE,
    ice: ty === PLAT_ICE,
    move: ty === PLAT_MOVE_H ? PLAT_MOVE_H : ty === PLAT_MOVE_V ? PLAT_MOVE_V : ty === PLAT_ORBIT ? PLAT_ORBIT : 0,
    dir: ty === PLAT_DIR ? 1 : 0,
    dvx: o.dvx || 0, dvy: o.dvy || 0,
    clock: ty === PLAT_CLOCK ? 1 : 0,
    duty: o.duty || CLOCK_DEFAULT_DUTY,
    warp: ty === PLAT_WARP ? 1 : 0,
    warpTo: o.warpTo != null ? o.warpTo : 0,
    claim: !!o.claim, claimed: false,
    bx: x, by: top - PLATFORM_HEIGHT,
    amp: o.amp || MOVER_DEFAULT_AMP,
    period: o.period || MOVER_DEFAULT_PERIOD,
    phase: o.phase || 0,
    dead: false, bounceT: 0, respawnT: 0
  };
  PLATS.push(plat);
  SOLIDS.push(plat);
  return plat;
}
function endPop() { PLATS.pop(); SOLIDS.pop(); }
const endClampX = (x, w) => Math.min(Math.max(x, 12), VIEW_W - 12 - w);

/* coarse reachability probe: real step() from the source rest, first landing must be the
   accept rest (a fold through a door accepts its destination). Early-exit keeps it cheap. */
function endReach(src, dst, acceptIdx) {
  const per = (src.move || src.clock) ? src.period : (dst.move || dst.clock) ? dst.period : 0;
  const phases = per ? [0, per * 0.25, per * 0.5, per * 0.75] : [0];
  for (const ph of phases) {
    const fr = rectOf(src, ph);
    const xs = [fr.x + fr.w / 2 - CHAR_SIZE / 2, fr.x + 1, fr.x + fr.w - CHAR_SIZE - 1];
    for (const bx of xs) {
      for (let ang = SOLVER_ANGLE_MIN; ang <= SOLVER_ANGLE_MAX; ang += ENDLESS_PROBE_ANGLE_STEP) {
        const rad = ang * Math.PI / 180;
        for (const pw of ENDLESS_PROBE_POWERS) {
          /* judge by the visible arc (preview semantics): the mark is the eventual landing,
             bonks and wall scrapes along the way included, exactly as the player sees them */
          const pr = previewArc(
            { x: bx, y: fr.y + fr.h },
            { x: Math.cos(rad) * pw * MAX_LAUNCH_SPEED, y: Math.sin(rad) * pw * MAX_LAUNCH_SPEED },
            ph, END.floor
          );
          if (pr.mark && pr.mark.ok && pr.mark.idx === acceptIdx) return true;
        }
      }
    }
  }
  return false;
}

/* ballistic check for inserted bonuses: a spring/door throw must land on the chain rest */
function endThrow(pad, vx, vy, acceptIdx) {
  const b = { x: pad.x + pad.w / 2 - CHAR_SIZE / 2, y: pad.y + pad.h, vx, vy, grounded: false };
  let t = worldT;
  for (let i = 0; i < 600; i++) {
    t += FIXED_DT;
    const ev = step(b, t);
    if (ev && ev.t === "land") return ev.s.idx === acceptIdx;
    if (b.y < END.floor - 200) return false;
  }
  return false;
}

/* a bonus between two chain rests: never load-bearing, removed if it breaks the chain.
   Placement reads base coords (bx/by): render mutates x/y of movers every frame. */
function insertSpecial(prev, rest) {
  const rnd = END.rnd;
  const kind = (rnd() * 3) | 0;
  const prevTop = prev.by + prev.h;
  const gap = rest.by - prevTop;
  const y = prevTop + 40 + rnd() * Math.max(20, gap - 80);
  const w = 90 + rnd() * 40;
  /* sit beside the direct arc's corridor, not inside it, or the chain recheck below
     would (correctly) delete almost every bonus */
  const mid = (prev.bx + prev.w / 2 + rest.bx + rest.w / 2) / 2;
  const x = endClampX(mid + (rnd() < 0.5 ? -1 : 1) * (120 + rnd() * 80) - w / 2, w);
  /* a bonus stacked over either neighbour would be a graze trap; skip it instead */
  const ovA = Math.min(prev.bx + prev.w, x + w) - Math.max(prev.bx, x);
  const ovB = Math.min(rest.bx + rest.w, x + w) - Math.max(rest.bx, x);
  if (ovA > ENDLESS_MAX_OVERLAP * Math.min(prev.w, w) || ovB > ENDLESS_MAX_OVERLAP * Math.min(rest.w, w)) return;
  let pad;
  if (kind === 2) {
    pad = endPlat(x, y, w, PLAT_WARP, { warpTo: rest.idx });
    if (!endReach(prev, pad, rest.idx)) { endPop(); return; }
  } else if (kind === 1) {
    const dvx = (rest.x + rest.w / 2 > x + w / 2 ? 1 : -1) * (60 + rnd() * 120);
    pad = endPlat(x, y, w, PLAT_DIR, { dvx, dvy: DIR_DEFAULT_VY });
    if (!endThrow(pad, dvx, DIR_DEFAULT_VY, rest.idx)) { endPop(); return; }
  } else {
    pad = endPlat(x, y, w, PLAT_BOUNCE, {});
    if (!endThrow(pad, 0, BOUNCE_SPEED, rest.idx) &&
        !endThrow(pad, 120, BOUNCE_SPEED, rest.idx) &&
        !endThrow(pad, -120, BOUNCE_SPEED, rest.idx)) { endPop(); return; }
  }
  if (!endReach(prev, rest, rest.idx)) { endPop(); return; }
  if (END.prevRest && !endReach(END.prevRest, prev, prev.idx)) { endPop(); return; }
  if (END.prevRest2 && !endReach(END.prevRest2, END.prevRest, END.prevRest.idx)) endPop();
}

function genNext() {
  const rnd = END.rnd;
  const prev = END.lastRest;
  const due = END.nextClaim <= END.genTop + ENDLESS_DY_MAX;
  let y, x, w, ty, o = {};
  if (due) {
    y = Math.min(Math.max(END.nextClaim, END.genTop + ENDLESS_DY_MIN), END.genTop + ENDLESS_DY_MAX);
    w = ENDLESS_CLAIM_W; ty = PLAT_SOLID; o.claim = true;
    x = endClampX(prev.bx + prev.w / 2 + (rnd() * 2 - 1) * ENDLESS_DX_MAX - w / 2, w);
  } else {
    y = END.genTop + ENDLESS_DY_MIN + rnd() * (ENDLESS_DY_MAX - ENDLESS_DY_MIN);
    w = ENDLESS_W_MIN + rnd() * ENDLESS_W_VAR;
    ty = END_REST_TYPES[(rnd() * END_REST_TYPES.length) | 0];
    x = endClampX(prev.bx + prev.w / 2 + (rnd() * 2 - 1) * ENDLESS_DX_MAX - w / 2, w);
    if (ty === PLAT_MOVE_H || ty === PLAT_MOVE_V) { o.amp = 30 + rnd() * 30; o.period = 1.8 + rnd(); o.phase = rnd(); }
    else if (ty === PLAT_ORBIT) { o.period = 2 + rnd() * 0.8; o.amp = 25 + rnd() * 15; o.phase = rnd(); }
    else if (ty === PLAT_CLOCK) { o.duty = CLOCK_DEFAULT_DUTY; o.period = 2 + rnd() * 0.8; o.phase = rnd(); }
  }
  let rest = null;
  for (let tries = 0; tries < 4 && !rest; tries++) {
    /* near-stacks (similar widths, one under the other) have no honest arc at ANY rise:
       going around the underside leaves only a graze corridor. Ban heavy overlap outright. */
    const overlap = Math.min(prev.bx + prev.w, x + w) - Math.max(prev.bx, x);
    const stacked = overlap > ENDLESS_MAX_OVERLAP * Math.min(prev.w, w);
    const cand = endPlat(x, y, w, ty, o);
    /* two-rest lookahead: a full-power arc apexes ~205px up, i.e. past TWO small rises, so
       the new rest must not bonk the previous jump NOR the one before it */
    if (!stacked && endReach(prev, cand, cand.idx) &&
        (!END.prevRest || endReach(END.prevRest, prev, prev.idx)) &&
        (!END.prevRest2 || endReach(END.prevRest2, END.prevRest, END.prevRest.idx))) rest = cand;
    else {
      endPop();
      /* escape the previous arc's apex zone: step sideways, keep the rise modest */
      x = endClampX(prev.bx + prev.w / 2 + (rnd() < 0.5 ? -1 : 1) * (110 + rnd() * 70) - w / 2, w);
      y = END.genTop + ENDLESS_DY_MIN + rnd() * 50;
      if (tries >= 1) { ty = PLAT_SOLID; o = {}; w = Math.max(w, 110); }
    }
  }
  /* geometric guarantee: a wide ledge fully beside the previous rest (10px gap), never above it */
  if (!rest) {
    let fx = prev.bx + prev.w + 10;
    if (fx + 120 > VIEW_W - 12) fx = prev.bx - 130;
    rest = endPlat(endClampX(fx, 120), END.genTop + ENDLESS_DY_MIN, 120, PLAT_SOLID, {});
  }
  if (rest.claim) {
    END.nextClaim = rest.y + rest.h + ENDLESS_CLAIM_MIN + rnd() * (ENDLESS_CLAIM_MAX - ENDLESS_CLAIM_MIN);
    END.claims++;
  } else if (!due && rnd() < ENDLESS_SPECIAL_CHANCE) {
    insertSpecial(prev, rest);
  }
  END.prevRest2 = END.prevRest;
  END.prevRest = END.lastRest;
  END.lastRest = rest;
  END.genTop = rest.y + rest.h;
}

/* the void eats everything below the window; slots null out and never regenerate */
function endDespawn() {
  for (let i = 0; i < PLATS.length; i++) {
    const p = PLATS[i];
    if (!p) continue;
    const top = p.by + p.h + ((p.move === PLAT_MOVE_V || p.move === PLAT_ORBIT) ? p.amp : 0);
    if (top < END.floor) { PLATS[i] = null; SOLIDS[i + 2] = null; }
  }
}

function endlessUpdate() {
  if (mode !== "endless" || state === "dead") return;
  END.peak = Math.max(END.peak, body.y);
  END.floor = Math.max(END.startFloor, END.peak - ENDLESS_WINDOW);
  while (END.genTop < END.peak + ENDLESS_WINDOW) genNext();
  endDespawn();
  /* feet below the line = the void took you (also covers landing on a ledge under the line) */
  if (body.y < END.floor) endlessDie();
}

/* landing on a commit pad banks the height — the only height the void can't take */
function endlessClaim(plat) {
  const h = plat.y + plat.h;
  if (h <= END.bank) return;
  END.bank = h;
  plat.claimed = true;
  life.endlessBest = Math.max(life.endlessBest || 0, END.bank);
  save();
  floats.push({ x: plat.x + plat.w / 2, y: h + FALL_POPUP_DY, txt: "COMMITTED · " + (h / PX_PER_METER).toFixed(0) + "m", c: COL.green, t: 0 });
  spawnDust(plat.x + plat.w / 2, h, RM ? 6 : 14, COL.green);
  if (!RM) shake = Math.max(shake, 4);
  sfx("claim");
}

function endlessDie() {
  END.dead = true;
  state = "dead";
  aim = null;
  pendingV = null;
  stopHum();
  stopSlide();
  const score = END.bank;
  const isBest = score > (life.endlessBest || 0);
  life.endlessBest = Math.max(life.endlessBest || 0, score);
  save();
  flash = Math.min(FALL_FLASH_MAX, 0.4);
  if (!RM) shake = Math.max(shake, 8);
  spawnDust(body.x + CHAR_SIZE / 2, END.floor, RM ? 8 : 18, COL.red);
  sfx("die");
  $("dScore").textContent = (score / PX_PER_METER).toFixed(0) + "m";
  $("dPeak").textContent = (END.peak / PX_PER_METER).toFixed(0) + "m";
  $("dLaunch").textContent = run.launches;
  $("dTime").textContent = fmt(run.time);
  $("deadBest").textContent = "ENDLESS BEST · " + ((life.endlessBest || 0) / PX_PER_METER).toFixed(0) + "m" + (isBest && score > 0 ? " · NEW BEST" : "");
  /* dynamic page link: the frame's own URL, iframe-safe (itch.io etc.) */
  const pageUrl = location.href.split("#")[0].split("?")[0];
  $("dShare").value = "COMMIT · NO SUMMIT · committed " + (score / PX_PER_METER).toFixed(0) + "m (peak " + (END.peak / PX_PER_METER).toFixed(0) + "m) in " + fmt(run.time) + " · " + run.launches + " launches. The void keeps uncommitted height. Play: " + pageUrl;
  openOv("dead");
}

function startEndless(seed) {
  if (mode === "tower") save();
  mode = "endless";
  LVL = ENDLESS_META;
  SUMMIT = 0;
  GOAL = null;
  RAW_PLATS = [];
  CEIL = [];
  SECTIONS = [];
  NOTES = [];
  ZONES.length = 0;
  SOLIDS.length = 0;
  PLATS.length = 0;
  SOLIDS.push(
    { x: -BOUNDARY_MARGIN, y: -1000, w: BOUNDARY_MARGIN, h: 1e7, wall: true },
    { x: VIEW_W, y: -1000, w: BOUNDARY_MARGIN, h: 1e7, wall: true }
  );
  END.seed = (seed != null ? seed : (Date.now() ^ (Math.random() * 0xffffffff))) >>> 0;
  END.rnd = mulberry32(END.seed);
  END.bank = 0;
  END.claims = 0;
  END.dead = false;
  const spawn = endPlat(VIEW_W / 2 - 70, 120, 140, PLAT_SOLID, {});
  END.lastRest = spawn;
  END.prevRest = null;
  END.prevRest2 = null;
  END.genTop = 120;
  END.peak = 120;
  END.startFloor = 120 - ENDLESS_START_GRACE;
  END.floor = END.startFloor;
  END.nextClaim = 120 + ENDLESS_CLAIM_MIN + END.rnd() * (ENDLESS_CLAIM_MAX - ENDLESS_CLAIM_MIN);
  STARS.length = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    STARS.push({ x: END.rnd() * VIEW_W, y: END.rnd() * ENDLESS_STAR_SPAN, r: END.rnd() * 1.4 + 0.4, p: END.rnd() * 6.28 });
  }
  while (END.genTop < END.peak + ENDLESS_WINDOW) genNext();
  run = defaultRun();
  worldT = 0;
  pendingV = null;
  aim = null;
  body.x = spawn.x + spawn.w / 2 - CHAR_SIZE / 2;
  body.y = 120;
  body.vx = 0;
  body.vy = 0;
  body.grounded = true;
  body.on = spawn;
  body.slide = 0;
  body.slideT = 0;
  state = "ready";
  stopHum();
  stopSlide();
  safePos.x = body.x;
  safePos.y = body.y;
  trail.length = 0;
  floats.length = 0;
  confetti.length = 0;
  shards.length = 0;
  flightContacts.length = 0;
  flash = 0;
  shake = 0;
  warpGlow = 0;
  crumbleT = 0;
  crumbleStage = 0;
  bounceChain = 0;
  aimT = AIM_FUSE_TIME;
  idleT = 0;
  camY = clampCam(body.y - VIEW_H * CAM_ANCHOR);
  for (const k in hudCache) delete hudCache[k];
  updateTowerTag();
}

claimHook = endlessClaim;
cullHook = () => END.floor;
