/* COMMIT — simulation. The Commit Contract: preview() and flight share step(), pixel-exact.
   Ice rule: landing drifts you the way you came in (sign of vx); a straight-down landing stands still.
   Movers ride a shared fixed-step world clock (worldT); step(b,t) reads their rects purely, so the
   preview simulates the same future platform motion the flight will meet. Launch discards carry. */
"use strict";

const body = { x: VIEW_W / 2 - CHAR_SIZE / 2, y: 0, vx: 0, vy: 0, grounded: true, on: null, slide: 0, slideT: 0 };
let state = "ready", aim = null, pendingV = null;
const kb = { angle: KB_DEFAULT_ANGLE, power: KB_DEFAULT_POWER };
let run = { launches: 0, falls: 0, biggest: 0, time: 0, started: false, dead: [], slide: 0 };
let launchY = 0, bounceChain = 0, crumbleT = 0, crumbleStage = 0;
let aimT = AIM_FUSE_TIME, lastTickSec = 99, idleT = 0, stepN = 0, worldT = 0;
const flightContacts = [];

/* ---------- movers: constant-speed ping-pong, pure functions of the world clock ---------- */
/* triangle wave in [-1,1] over one period */
function tri(u) {
  u = ((u % 1) + 1) % 1;
  return u < 0.5 ? 4 * u - 1 : 3 - 4 * u;
}
function moverXY(plat, t) {
  if (plat.move === PLAT_ORBIT) {
    const a = 2 * Math.PI * (t / plat.period + plat.phase);
    return { x: plat.bx + Math.cos(a) * plat.amp, y: plat.by + Math.sin(a) * plat.amp };
  }
  const off = tri(t / plat.period + plat.phase) * plat.amp;
  return plat.move === PLAT_MOVE_H ? { x: plat.bx + off, y: plat.by } : { x: plat.bx, y: plat.by + off };
}
function moverV(plat, t) {
  if (plat.move === PLAT_ORBIT) {
    const a = 2 * Math.PI * (t / plat.period + plat.phase);
    const sp = plat.amp * 2 * Math.PI / plat.period;
    return { x: -Math.sin(a) * sp, y: Math.cos(a) * sp };
  }
  const u = ((t / plat.period + plat.phase) % 1 + 1) % 1;
  const sp = 4 * plat.amp / plat.period * (u < 0.5 ? 1 : -1);
  return plat.move === PLAT_MOVE_H ? { x: sp, y: 0 } : { x: 0, y: sp };
}
function rectOf(plat, t) {
  if (!plat.move) return plat;
  const pos = moverXY(plat, t);
  return { x: pos.x, y: pos.y, w: plat.w, h: plat.h };
}

/* phase platforms: solid for duty fraction of each cycle, ghost (pass-through) otherwise.
   Pure predicate of (plat,t) read inside step — never mutate plat.dead (keeps preview===flight). */
function solidAt(plat, t) {
  if (!plat.clock) return true;
  const u = ((t / plat.period + plat.phase) % 1 + 1) % 1;
  return u < plat.duty;
}

/* phase ticks are diegetic: only on-screen platforms near the rider (or the one underfoot)
   make a sound, so a tower full of clocks isn't a global metronome */
function updateClocks() {
  for (const plat of PLATS) {
    if (!plat.clock || plat.dead) continue;
    const was = solidAt(plat, worldT - FIXED_DT);
    const now = solidAt(plat, worldT);
    if (was === now) continue;
    const onScreen = plat.y + plat.h > camY - CLOCK_VIS_MARGIN && plat.y < camY + VIEW_H + CLOCK_VIS_MARGIN;
    const near = Math.abs((plat.y + plat.h) - body.y) < CLOCK_NEAR_DIST;
    if (onScreen && (body.on === plat || near)) sfx("phase", { on: now, local: body.on === plat });
  }
}

function findGround(x, y) {
  for (const plat of SOLIDS) {
    if (plat.dead || plat.wall || !solidAt(plat, worldT)) continue;
    const r = rectOf(plat, worldT);
    if (Math.abs((r.y + r.h) - y) < GROUND_SNAP_TOL && x < r.x + r.w && x + CHAR_SIZE > r.x) return plat;
  }
  return null;
}

/* ---------- physics (shared by flight and preview) ---------- */
function hitR(b, r) {
  return b.x < r.x + r.w && b.x + CHAR_SIZE > r.x && b.y < r.y + r.h && b.y + CHAR_SIZE > r.y;
}
function step(b, t) {
  /* gust zones: constant extra accel while the body centre is inside, flight only (pure fn of pos) */
  for (const z of ZONES) {
    const cx = b.x + CHAR_SIZE / 2, cy = b.y + CHAR_SIZE / 2;
    if (cx > z.x && cx < z.x + z.w && cy > z.y && cy < z.y + z.h) {
      b.vx += z.ax * FIXED_DT;
      b.vy += z.ay * FIXED_DT;
    }
  }
  b.vy -= GRAVITY * FIXED_DT;
  if (b.vy < -TERMINAL_FALL_SPEED) b.vy = -TERMINAL_FALL_SPEED;
  let ev = null;
  const y0 = b.y;

  /* horizontal pass: side walls eject */
  b.x += b.vx * FIXED_DT;
  for (const plat of SOLIDS) {
    if (plat.dead || !solidAt(plat, t)) continue;
    const r = rectOf(plat, t);
    if (hitR(b, r)) {
      /* overlap created by the platform's own motion is a top/bottom approach, not a side wall */
      if (plat.move) {
        const pr = rectOf(plat, t - FIXED_DT);
        if (y0 >= pr.y + pr.h - CONTACT_EPS || y0 + CHAR_SIZE <= pr.y + CONTACT_EPS) continue;
      }
      if (b.vx > 0) b.x = r.x - CHAR_SIZE;
      else if (b.vx < 0) b.x = r.x + r.w;
      if (b.vx !== 0) {
        b.vx = 0;
        ev = { t: "wall", x: b.x + CHAR_SIZE / 2, y: b.y + CHAR_SIZE / 2 };
      }
    }
  }

  /* vertical pass: classify against the PREVIOUS-step rect so a rising lift lands you
     in place instead of side-ejecting; ceilings bonk from below */
  b.y += b.vy * FIXED_DT;
  b.grounded = false;
  for (const plat of SOLIDS) {
    if (plat.dead || !solidAt(plat, t)) continue;
    const r = rectOf(plat, t);
    if (hitR(b, r)) {
      const pr = plat.move ? rectOf(plat, t - FIXED_DT) : r;
      const above = y0 >= pr.y + pr.h - CONTACT_EPS;
      const below = y0 + CHAR_SIZE <= pr.y + CONTACT_EPS;
      if (above || (!below && b.vy <= 0)) {
        /* one-way warp pad: a top landing folds the body to the target's top centre, then
           resolves as an ordinary landing THERE (same code path → preview ≡ flight).
           Side hits and bonks are not landings, so they never warp. */
        let land = plat, lr = r, warpFrom = -1;
        if (plat.warp) {
          land = PLATS[plat.warpTo];
          lr = rectOf(land, t);
          warpFrom = plat.idx;
          b.x = lr.x + lr.w / 2 - CHAR_SIZE / 2;
        }
        b.y = lr.y + lr.h;
        if (land.dir) {
          b.vx = land.dvx;
          b.vy = land.dvy;
          ev = { t: "bounce", s: land, x: b.x + CHAR_SIZE / 2, y: b.y, warp: warpFrom };
        } else if (land.bounce) {
          b.vy = BOUNCE_SPEED;
          /* a perfectly vertical landing would bounce on the same pad forever: nudge to the
             nearer side. Pure function of contact position, so preview ≡ flight still holds. */
          if (b.vx === 0) b.vx = b.x + CHAR_SIZE / 2 <= land.x + land.w / 2 ? -BOUNCE_SIDE_NUDGE : BOUNCE_SIDE_NUDGE;
          ev = { t: "bounce", s: land, x: b.x + CHAR_SIZE / 2, y: b.y, warp: warpFrom };
        } else {
          b.vy = 0;
          b.grounded = true;
          ev = { t: "land", s: land, warp: warpFrom };
        }
        if (warpFrom >= 0) break;
      } else {
        b.y = r.y - CHAR_SIZE;
        b.vy = 0;
        ev = { t: "bonk", x: b.x + CHAR_SIZE / 2, y: b.y + CHAR_SIZE };
      }
    }
  }
  return ev;
}

function contactOf(b, ev) {
  return {
    x: b.x + CHAR_SIZE / 2,
    y: b.y + (ev.t === "land" || ev.t === "bounce" ? 0 : CHAR_SIZE / 2),
    t: ev.t,
    ok: ev.t === "land",
    goal: !!(ev.s && ev.s.goal),
    ice: !!(ev.s && ev.s.ice),
    move: (ev.s && ev.s.move) || 0,
    clock: !!(ev.s && ev.s.clock),
    dir: !!(ev.s && ev.s.dir),
    warp: ev.warp == null ? -1 : ev.warp,
    idx: ev.s && ev.s.idx != null ? ev.s.idx : -1
  };
}

/* the dotted arc: same integrator, same world clock, from the current body position */
function preview(v) {
  const b = { x: body.x, y: body.y, vx: v.x, vy: v.y, grounded: false };
  const pts = [], contacts = [];
  let mark = null, markT = 0, t = worldT;
  for (let i = 0; i < PREVIEW_MAX_STEPS; i++) {
    t += FIXED_DT;
    const ev = step(b, t);
    if (i % PREVIEW_DOT_EVERY === 0) pts.push({ x: b.x + CHAR_SIZE / 2, y: b.y + CHAR_SIZE / 2 });
    if (ev) {
      const c = contactOf(b, ev);
      contacts.push(c);
      mark = c;
      markT = t;
      if (ev.t !== "bounce") break;
    }
    if (b.y < PREVIEW_CULL_Y) break;
  }
  return { pts, contacts, mark, markT };
}

/* ---------- aiming ---------- */
function aimV() {
  if (!aim) return null;
  let vx, vy;
  if (aim.mode === "p") {
    vx = (aim.cx - aim.ox) * DRAG_SPEED_PER_PX;
    vy = (aim.oy - aim.cy) * DRAG_SPEED_PER_PX;
  } else {
    const a = kb.angle * Math.PI / 180;
    vx = Math.cos(a) * kb.power * MAX_LAUNCH_SPEED;
    vy = Math.sin(a) * kb.power * MAX_LAUNCH_SPEED;
  }
  const m = Math.hypot(vx, vy);
  if (m > MAX_LAUNCH_SPEED) {
    vx *= MAX_LAUNCH_SPEED / m;
    vy *= MAX_LAUNCH_SPEED / m;
  }
  return { x: vx, y: vy, m: Math.min(m, MAX_LAUNCH_SPEED) };
}
function beginAim() {
  aimT = AIM_FUSE_TIME;
  lastTickSec = 99;
}

/* Pre-aim: aiming may start mid-flight; a launch attempt while airborne buffers the arc
   (pendingV) and fires it on the instant of true landing. Nothing launches mid-air. */
function commitAim() {
  const v = aimV();
  if (!v || v.m < MIN_LAUNCH_SPEED) {
    aim = null;
    pendingV = null;
    if (state === "aim") state = "ready";
    stopHum();
    spawnDust(body.x + CHAR_SIZE / 2, body.y + CHAR_SIZE / 2, PUFF_DUST, COL.dim);
    sfx("puff");
    return;
  }
  if (state === "flight") {
    pendingV = v;
    stopHum();
    sfx("queue");
    return;
  }
  launch(v);
}

function launch(v) {
  body.vx = v.x;
  body.vy = v.y;
  body.grounded = false;
  body.on = null;
  body.slide = 0;
  body.slideT = 0;
  state = "flight";
  aim = null;
  pendingV = null;
  launchY = body.y;
  trail.length = 0;
  launchT = LAUNCH_SQUASH_TIME;
  flightContacts.length = 0;
  bounceChain = 0;
  run.launches++;
  life.launches++;
  run.started = true;
  idleT = 0;
  stopHum();
  stopSlide();
  spawnDust(body.x + CHAR_SIZE / 2, body.y, LAUNCH_DUST, COL.dim);
  sfx("launch");
}

function simStep() {
  if (state !== "flight") return;
  const prevVy = body.vy, prevVx = body.vx;
  const ev = step(body, worldT);
  stepN++;
  if (stepN % TRAIL_EVERY === 0) {
    trail.push({ x: body.x + CHAR_SIZE / 2, y: body.y + CHAR_SIZE / 2 });
    if (trail.length > TRAIL_MAX) trail.shift();
  }
  if (!ev) return;
  flightContacts.push(contactOf(body, ev));

  /* the fold itself: ring bursts at both ends, pink glow, direction-pitched shimmer */
  const warped = ev.warp >= 0;
  if (warped) {
    const src = PLATS[ev.warp];
    spawnWarp(src.x + src.w / 2, src.y + src.h);
    spawnWarp(ev.x, ev.y);
    warpGlow = Math.max(warpGlow, WARP_FLASH);
    if (!RM) shake = Math.max(shake, WARP_SHAKE);
    floats.push({ x: ev.x, y: ev.y + FALL_POPUP_DY, txt: "WARP", c: COL.warp, t: 0 });
    sfx("warp", { up: ev.y >= launchY });
  }

  if (ev.t === "bounce") {
    bounceChain++;
    ev.s.bounceT = SPRING_COMP_TIME;
    launchT = BOUNCE_SQUASH_TIME;
    spawnDust(ev.x, ev.y, RM ? BOUNCE_DUST_RM : BOUNCE_DUST, ev.s.dir ? COL.dir : COL.spring);
    if (ev.s.dir) sfx("dirspring", { vx: ev.s.dvx, vy: ev.s.dvy });
    else sfx("bounce", { chain: bounceChain });
    if (!RM) shake = Math.max(shake, BOUNCE_SHAKE);
    return;
  }

  if (ev.t === "land") {
    const impact = Math.abs(prevVy);
    body.vx = 0;
    body.vy = 0;
    state = "ready";
    landT = LAND_SQUASH_TIME;
    body.on = ev.s;
    crumbleT = 0;
    crumbleStage = 0;
    bounceChain = 0;
    /* a warp arrival stands still: the fold discards momentum, ice drift included */
    body.slide = warped ? 0 : (ev.s.ice ? (prevVx > 0 ? 1 : prevVx < 0 ? -1 : 0) : 0);
    body.slideT = 0;
    run.slide = body.slide;
    if (warped) {
      spawnDust(body.x + CHAR_SIZE / 2, body.y, LAND_DUST_BASE, COL.warp);
    } else if (ev.s.ice) {
      sfx("ice", { impact });
      spawnSpray(body.x + CHAR_SIZE / 2, body.y, body.slide || 1);
      if (body.slide) startSlide();
    } else if (ev.s.move) {
      spawnDust(body.x + CHAR_SIZE / 2, body.y, Math.min(LAND_DUST_MAX, LAND_DUST_BASE + impact / LAND_DUST_IMPACT_DIV), COL.mover);
      sfx("land", { impact });
      sfx("move", { impact });
    } else {
      spawnDust(body.x + CHAR_SIZE / 2, body.y, Math.min(LAND_DUST_MAX, LAND_DUST_BASE + impact / LAND_DUST_IMPACT_DIV), COL.dim);
      sfx("land", { impact });
    }
    if (impact > HARD_LAND_IMPACT && !RM) shake = Math.min(HARD_SHAKE_MAX, (impact - HARD_LAND_IMPACT) / HARD_SHAKE_DIV);

    /* fall economy: a counted drop flashes red and floats a -Xm popup */
    const drop = launchY - body.y;
    if (drop > FALL_COUNT_MIN_PX) {
      run.falls++;
      life.falls++;
      run.biggest = Math.max(run.biggest, drop);
      flash = Math.min(FALL_FLASH_MAX, drop / FALL_FLASH_DIV);
      sfx("fall");
      floats.push({
        x: body.x + CHAR_SIZE / 2, y: body.y + FALL_POPUP_DY,
        txt: "−" + (drop / PX_PER_METER).toFixed(0) + "m",
        c: COL.red, t: 0
      });
    }
    life.best[level] = Math.max(life.best[level] || 0, body.y);
    safePos.x = body.x;
    safePos.y = body.y;
    save();
    if (ev.s.goal) win();
    if (pendingV && state === "ready") {
      const queued = pendingV;
      pendingV = null;
      launch(queued);
    }
    return;
  }

  /* wall / bonk */
  spawnDust(ev.x, ev.y, WALL_DUST, ev.t === "bonk" ? COL.amber : COL.dim);
  sfx(ev.t === "bonk" ? "bonk" : "wall");
  if (!RM) shake = Math.max(shake, WALL_SHAKE);
}

/* ---------- crumble ---------- */
function breakPlatform(plat) {
  plat.dead = true;
  plat.respawnT = CRUMBLE_REFORM_TIME;
  if (run.dead.indexOf(plat.idx) < 0) run.dead.push(plat.idx);
  spawnShards(plat);
  sfx("shatter");
  if (!RM) shake = Math.max(shake, SHATTER_SHAKE);
  if (body.on === plat) {
    body.on = null;
    body.vx = 0;
    body.vy = 0;
    body.grounded = false;
    body.slide = 0;
    body.slideT = 0;
    state = "flight";
    aim = null;
    stopHum();
    stopSlide();
    launchY = body.y;
    flightContacts.length = 0;
    trail.length = 0;
    bounceChain = 0;
  }
  crumbleT = 0;
  crumbleStage = 0;
  save();
}
function updateCrumble(dt) {
  const plat = body.on;
  if ((state === "ready" || state === "aim") && plat && plat.crumble && !plat.dead) {
    crumbleT += dt;
    const p = crumbleT / CRUMBLE_DWELL_TIME;
    const stage = p >= CRUMBLE_STAGE_AT[2] ? 3 : p >= CRUMBLE_STAGE_AT[1] ? 2 : p >= CRUMBLE_STAGE_AT[0] ? 1 : 0;
    if (stage > crumbleStage) {
      crumbleStage = stage;
      sfx("crack", { stage });
    }
    if (p > CRUMBLE_DUST_START && Math.random() < dt * p * CRUMBLE_DUST_RATE) {
      spawnDust(plat.x + Math.random() * plat.w, plat.y + plat.h, 1, COL.amber);
    }
    if (crumbleT >= CRUMBLE_DWELL_TIME) breakPlatform(plat);
  }
}
/* cracked platforms reform after a cooldown so the climb is never permanently blocked */
function updateRespawn(dt) {
  let changed = false;
  for (const plat of PLATS) {
    if (plat.dead && plat.crumble && plat.respawnT > 0) {
      plat.respawnT -= dt;
      if (plat.respawnT <= 0) {
        plat.respawnT = 0;
        plat.dead = false;
        const k = run.dead.indexOf(plat.idx);
        if (k >= 0) run.dead.splice(k, 1);
        spawnDust(plat.x + plat.w / 2, plat.y + plat.h, RM ? REFORM_DUST_RM : REFORM_DUST, COL.spring);
        sfx("reform");
        changed = true;
      }
    }
  }
  if (changed) save();
}

/* ---------- ice: slow drift away from the side you entered from ---------- */
function updateIce(dt) {
  const plat = body.on;
  if ((state === "ready" || state === "aim") && plat && plat.ice && !plat.dead && body.slide !== 0) {
    body.slideT = Math.min(ICE_SLIDE_RAMP_TIME, body.slideT + dt);
    const v = ICE_SLIDE_SPEED * clamp01(body.slideT / ICE_SLIDE_RAMP_TIME);
    body.x += body.slide * v * dt;
    if (Math.random() < dt * ICE_SPRAY_RATE) {
      spawnSpray(body.x + CHAR_SIZE / 2 - body.slide * CHAR_SIZE / 2, body.y, body.slide);
    }
    if (body.x + CHAR_SIZE <= plat.x || body.x >= plat.x + plat.w) {
      body.on = null;
      body.grounded = false;
      body.vx = body.slide * v;
      body.vy = 0;
      body.slide = 0;
      body.slideT = 0;
      state = "flight";
      aim = null;
      stopHum();
      stopSlide();
      launchY = body.y;
      flightContacts.length = 0;
      trail.length = 0;
      bounceChain = 0;
      sfx("slip");
      save();
    }
  }
}

/* ---------- movers: carry the rider each fixed step (exact carry — no relative slide).
   A vertical lift that presses you into a solid drops you honestly. ---------- */
function dropRider(vx, vy, sound) {
  body.on = null;
  body.grounded = false;
  body.vx = vx;
  body.vy = vy;
  body.slide = 0;
  body.slideT = 0;
  state = "flight";
  aim = null;
  stopHum();
  stopSlide();
  launchY = body.y;
  flightContacts.length = 0;
  trail.length = 0;
  bounceChain = 0;
  sfx(sound);
  save();
}
function groundStep() {
  const plat = body.on;
  if ((state === "ready" || state === "aim") && plat && plat.clock && !plat.dead && !solidAt(plat, worldT)) {
    dropRider(0, 0, "phaseout");
    return;
  }
  if ((state === "ready" || state === "aim") && plat && plat.move && !plat.dead) {
    const a = moverXY(plat, worldT - FIXED_DT), b = moverXY(plat, worldT);
    const va = moverV(plat, worldT - FIXED_DT), vb = moverV(plat, worldT);
    if (plat.move !== PLAT_ORBIT && (va.x !== vb.x || va.y !== vb.y)) sfx("reverse", { dir: vb.x || vb.y });
    if (plat.move === PLAT_MOVE_H) body.x += b.x - a.x;
    else if (plat.move === PLAT_ORBIT) {
      body.x += b.x - a.x;
      body.y += b.y - a.y;
    } else body.y = b.y + plat.h;
    if (plat.move === PLAT_MOVE_V || plat.move === PLAT_ORBIT) {
      for (const other of SOLIDS) {
        if (other === plat || other.dead || other.wall || other.ground) continue;
        if (hitR(body, rectOf(other, worldT))) {
          dropRider(0, 0, "bonk");
          return;
        }
      }
    }
  }
}
