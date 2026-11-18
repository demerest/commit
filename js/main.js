/* COMMIT — persistence (commit.v3, per-tower runs), level switching, input, loop, boot, test hook. */
"use strict";

let level = 1, runs = {};
let life = { best: {}, bestTime: {}, summits: {}, launches: 0, falls: 0, seen: false, unlocked: 1 };
let safePos = { x: VIEW_W / 2 - CHAR_SIZE / 2, y: 0 };
let acc = 0, lastT = performance.now(), manual = false, rafId = 0;

const totalSummits = () => Object.values(life.summits).reduce((a, b) => a + (+b || 0), 0);
const defaultRun = () => ({
  launches: 0, falls: 0, biggest: 0, time: 0, started: false, dead: [], slide: 0, wt: 0,
  x: VIEW_W / 2 - CHAR_SIZE / 2, y: 0
});

/* ---------- persistence ---------- */
function save() {
  runs[level] = { ...run, x: safePos.x, y: safePos.y, slide: body.slide, wt: worldT };
  LS.set("commit.v3", { level, runs, life });
}
function sanitize() {
  run.time = Math.max(0, +run.time || 0);
  run.launches = Math.max(0, +run.launches || 0);
  run.falls = Math.max(0, +run.falls || 0);
  run.biggest = Math.max(0, +run.biggest || 0);
  run.slide = (run.slide === 1 || run.slide === -1) ? run.slide : 0;
  run.wt = Math.max(0, +run.wt || 0);
  run.dead = Array.isArray(run.dead) ? run.dead.filter(i => Number.isInteger(i) && i >= 0 && i < PLATS.length) : [];
  for (const L of LEVELS) {
    life.best[L.id] = Math.max(0, +life.best[L.id] || 0);
    life.summits[L.id] = Math.max(0, Math.round(+life.summits[L.id] || 0));
    if (life.bestTime[L.id] != null) {
      life.bestTime[L.id] = +life.bestTime[L.id];
      if (!Number.isFinite(life.bestTime[L.id]) || life.bestTime[L.id] < 0) life.bestTime[L.id] = null;
    }
  }
  life.launches = Math.max(0, +life.launches || 0);
  life.falls = Math.max(0, +life.falls || 0);
  life.unlocked = Math.min(Math.max(1, Math.round(+life.unlocked || 1)), LEVELS.length);
  life.seen = !!life.seen;
}
function load() {
  let d = LS.get("commit.v3");
  if (!d) {
    /* migrate v2 (single run) then v1 (lifetime only) */
    const v2 = LS.get("commit.v2");
    if (v2) {
      const L = v2.life || {};
      d = {
        level: 1,
        runs: { 1: { ...(v2.run || {}), x: v2.x, y: v2.y, slide: 0 } },
        life: {
          best: { 1: +L.best || 0 },
          bestTime: { 1: L.bestTime != null ? +L.bestTime : null },
          summits: { 1: +L.summits || 0 },
          launches: +L.launches || 0, falls: +L.falls || 0,
          seen: !!L.seen, unlocked: (+L.summits || 0) > 0 ? 2 : 1
        }
      };
    } else {
      const v1 = LS.get("commit.v1");
      if (v1 && v1.life) {
        const L = v1.life;
        life = {
          ...life,
          best: { 1: +L.best || 0 },
          bestTime: { 1: L.bestTime != null ? +L.bestTime : null },
          summits: { 1: +L.summits || 0 },
          launches: +L.launches || 0, falls: +L.falls || 0, seen: !!L.seen
        };
      }
      sanitize();
      buildLevel(1);
      worldT = 0;
      pendingV = null;
      return;
    }
  }
  if (d.life) life = { ...life, ...d.life };
  if (d.runs && typeof d.runs === "object") runs = d.runs;
  sanitize();
  level = Math.min(Math.max(1, Math.round(+d.level || 1)), life.unlocked);
  buildLevel(level);
  run = { ...defaultRun(), ...(runs[level] || {}) };
  sanitize();
  worldT = run.wt;
  pendingV = null;
  for (const i of run.dead) {
    PLATS[i].dead = true;
    PLATS[i].respawnT = CRUMBLE_REFORM_TIME;
  }
  if (Number.isFinite(run.x) && Number.isFinite(run.y) && run.y >= 0 && run.y <= SUMMIT) {
    body.x = Math.min(Math.max(run.x, 0), VIEW_W - CHAR_SIZE);
    body.y = run.y;
  }
  body.on = findGround(body.x, body.y);
  body.slide = (body.on && body.on.ice) ? run.slide : 0;
  body.slideT = body.slide ? ICE_SLIDE_RAMP_TIME : 0;
  safePos.x = body.x;
  safePos.y = body.y;
  camY = clampCam(body.y - VIEW_H * CAM_ANCHOR);
}

/* ---------- level switching ---------- */
function setLevel(n) {
  if (n === level || n < 1 || n > LEVELS.length || n > life.unlocked) return;
  save();
  level = n;
  buildLevel(n);
  run = { ...defaultRun(), ...(runs[n] || {}) };
  sanitize();
  worldT = run.wt;
  for (const i of run.dead) {
    PLATS[i].dead = true;
    PLATS[i].respawnT = CRUMBLE_REFORM_TIME;
  }
  body.x = Math.min(Math.max(run.x, 0), VIEW_W - CHAR_SIZE);
  body.y = run.y;
  body.vx = 0;
  body.vy = 0;
  body.grounded = true;
  body.on = findGround(body.x, body.y);
  body.slide = (body.on && body.on.ice) ? run.slide : 0;
  body.slideT = body.slide ? ICE_SLIDE_RAMP_TIME : 0;
  state = "ready";
  aim = null;
  pendingV = null;
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
  save();
}

/* ---------- win / reset ---------- */
function win() {
  state = "win";
  stopHum();
  stopSlide();
  life.summits[level] = (life.summits[level] || 0) + 1;
  if (life.bestTime[level] == null || run.time < life.bestTime[level]) life.bestTime[level] = run.time;
  let newUnlock = false;
  if (level < LEVELS.length && life.unlocked < level + 1) {
    life.unlocked = level + 1;
    newUnlock = true;
  }
  save();
  $("wTime").textContent = fmt(run.time);
  $("wLaunch").textContent = run.launches;
  $("wFall").textContent = run.falls;
  $("wDrop").textContent = (run.biggest / PX_PER_METER).toFixed(1) + "m";
  $("winSub").textContent = (SUMMIT / PX_PER_METER) + " meters of decisions you couldn't take back.";
  $("winUnlock").textContent = newUnlock ? "TOWER " + (level + 1) + " UNLOCKED — " + LEVELS[level].tag.toLowerCase() + " awaits." : "";
  $("winUnlock").hidden = !newUnlock;
  $("bNext").hidden = level >= LEVELS.length;
  $("share").value = "COMMIT · " + LVL.name + " · " + (SUMMIT / PX_PER_METER) + "m in " + fmt(run.time) + " · " + run.launches + " launches · " + run.falls + " falls · biggest drop " + (run.biggest / PX_PER_METER).toFixed(1) + "m. No air control. No mercy.";
  if (!RM) {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      confetti.push({
        x: body.x + CHAR_SIZE / 2, y: body.y + 20,
        vx: (Math.random() - 0.5) * CONFETTI_SPREAD_X,
        vy: Math.random() * CONFETTI_UP_VAR + CONFETTI_UP_MIN,
        r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * CONFETTI_SPIN,
        c: [COL.blue, COL.green, COL.amber, COL.red, COL.ink][i % 5],
        t: 0
      });
    }
  }
  sfx("win");
  if (newUnlock) sfx("unlock");
  openOv("win");
}
function resetRun() {
  body.x = VIEW_W / 2 - CHAR_SIZE / 2;
  body.y = 0;
  body.vx = 0;
  body.vy = 0;
  body.grounded = true;
  body.slide = 0;
  body.slideT = 0;
  state = "ready";
  aim = null;
  pendingV = null;
  stopHum();
  stopSlide();
  run = defaultRun();
  worldT = 0;
  for (const plat of PLATS) {
    plat.dead = false;
    plat.bounceT = 0;
    plat.respawnT = 0;
  }
  body.on = findGround(body.x, body.y);
  crumbleT = 0;
  crumbleStage = 0;
  bounceChain = 0;
  aimT = AIM_FUSE_TIME;
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
  camY = clampCam(body.y - VIEW_H * CAM_ANCHOR);
  save();
}

/* ---------- input ---------- */
function toLogical(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}
cv.addEventListener("pointerdown", e => {
  if (overlayOpen || (state !== "ready" && state !== "flight")) return;
  e.preventDefault();
  audio();
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  const p = toLogical(e);
  aim = { mode: "p", id: e.pointerId, ox: p.x, oy: p.y, cx: p.x, cy: p.y };
  pendingV = null;
  if (state === "ready") state = "aim";
  idleT = 0;
  beginAim();
  sfx("aim");
  startHum();
});
cv.addEventListener("pointermove", e => {
  if (!aim || aim.mode !== "p" || e.pointerId !== aim.id || pendingV) return;
  const p = toLogical(e);
  aim.cx = p.x;
  aim.cy = p.y;
});
function endPointer(e, cancel) {
  if (!aim || aim.mode !== "p" || e.pointerId !== aim.id) return;
  if (cancel) {
    aim = null;
    pendingV = null;
    if (state === "aim") state = "ready";
    stopHum();
    return;
  }
  commitAim();
}
cv.addEventListener("pointerup", e => endPointer(e, false));
cv.addEventListener("pointercancel", e => endPointer(e, true));
cv.addEventListener("contextmenu", e => e.preventDefault());

const kbHeld = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
let kbFine = false;
function kbAim() {
  if (state === "ready" || state === "flight") {
    aim = { mode: "k" };
    pendingV = null;
    if (state === "ready") state = "aim";
    beginAim();
    sfx("aim");
    startHum();
  }
}
/* hold-to-sweep: continuous rates from the loop clock, not OS key-repeat; Shift = quarter rate */
function kbSweep(dt) {
  if (!aim || aim.mode !== "k" || pendingV || (state !== "aim" && state !== "flight")) {
    for (const k in kbHeld) kbHeld[k] = false;
    return;
  }
  const f = kbFine ? KB_FINE_FACTOR : 1;
  if (kbHeld.ArrowLeft) kb.angle = Math.min(KB_ANGLE_MAX, kb.angle + KB_ANGLE_RATE * dt * f);
  if (kbHeld.ArrowRight) kb.angle = Math.max(KB_ANGLE_MIN, kb.angle - KB_ANGLE_RATE * dt * f);
  if (kbHeld.ArrowUp) kb.power = Math.min(KB_POWER_MAX, kb.power + KB_POWER_RATE * dt * f);
  if (kbHeld.ArrowDown) kb.power = Math.max(KB_POWER_MIN, kb.power - KB_POWER_RATE * dt * f);
}
addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (overlayOpen === "pause") closeOv();
    else if (overlayOpen && overlayOpen !== "win" && overlayOpen !== "menu") closeOv();
    else if (!overlayOpen && state !== "win") openOv("pause");
    return;
  }
  if (e.key === "p" || e.key === "P") {
    if (overlayOpen === "pause") closeOv();
    else if (!overlayOpen && state !== "win") openOv("pause");
    return;
  }
  if (e.key === "m" || e.key === "M") {
    audio();
    setSound(!SND.on);
    return;
  }
  if (overlayOpen) return;
  audio();
  if (e.key === "h" || e.key === "H") { openOv("help"); return; }
  if (e.key === "r" || e.key === "R") { openOv("confirm"); return; }
  if (state === "win") return;
  let used = true;
  switch (e.key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      kbHeld[e.key] = true;
      break;
    case " ":
    case "Enter":
      if (aim && aim.mode === "k" && (state === "aim" || state === "flight")) commitAim();
      else kbAim();
      e.preventDefault();
      return;
    default:
      used = false;
  }
  if (used) {
    e.preventDefault();
    kbFine = e.shiftKey;
    if (state === "ready" || (state === "flight" && !aim)) kbAim();
    idleT = 0;
  }
});
addEventListener("keyup", e => {
  if (e.key in kbHeld) kbHeld[e.key] = false;
  kbFine = e.shiftKey;
});
addEventListener("blur", () => {
  for (const k in kbHeld) kbHeld[k] = false;
});

/* ---------- buttons ---------- */
$("bHelp").onclick = () => { sfx("ui"); openOv("help"); };
$("towerTag").onclick = () => { sfx("ui"); openOv("help"); };
$("bStart").onclick = () => { sfx("ui"); if (ovPrev === "menu") openOv("menu"); else closeOv(); };
$("bPause").onclick = () => { sfx("ui"); if (!overlayOpen && state !== "win") openOv("pause"); };
$("bContinue").onclick = () => { sfx("ui"); if (runInProgress()) closeOv(); else { resetRun(); closeOv(); } };
$("bSelect").onclick = () => { sfx("ui"); openOv("select"); };
$("bHow").onclick = () => { sfx("ui"); openOv("help"); };
$("bResume").onclick = () => { sfx("ui"); closeOv(); };
$("bPauseReset").onclick = () => { sfx("ui"); openOv("confirm"); };
$("bPauseSelect").onclick = () => { sfx("ui"); openOv("select"); };
$("bPauseMenu").onclick = () => { sfx("ui"); openOv("menu"); };
$("bWinSelect").onclick = () => { sfx("ui"); openOv("select"); };
$("bWinMenu").onclick = () => { sfx("ui"); resetRun(); openOv("menu"); };
$("bReset").onclick = () => { sfx("ui"); openOv("confirm"); };
$("bNo").onclick = () => { sfx("ui"); if (ovPrev === "pause") openOv("pause"); else closeOv(); };
$("bYes").onclick = () => { closeOv(); resetRun(); sfx("erase"); toast("RUN ERASED · 0m"); };
$("bAgain").onclick = () => { sfx("ui"); closeOv(); resetRun(); };
$("bNext").onclick = () => { sfx("ui"); closeOv(); setLevel(level + 1); toast(LVL.name + " · " + LVL.tag); };
$("bSound").onclick = () => { audio(); setSound(!SND.on); };
$("bCopy").onclick = async () => {
  const ta = $("share");
  try {
    await navigator.clipboard.writeText(ta.value);
    sfx("copy");
    toast("COPIED");
  } catch (_) {
    ta.focus();
    ta.select();
    sfx("ui");
    toast("PRESS CTRL+C / ⌘C");
  }
};
addEventListener("resize", resize);
addEventListener("orientationchange", resize);

/* ---------- loop ---------- */
function frameLoop(now) {
  if (!manual) rafId = requestAnimationFrame(frameLoop);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > FRAME_DT_MAX) dt = FRAME_DT_MAX;
  const paused = overlayOpen !== null || document.hidden;
  if (!paused) {
    if (run.started && state !== "win") run.time += dt;
    /* fuse decides before the clock advances so the flight starts on the exact previewed phase */
    if (aim && !pendingV && (state === "aim" || state === "flight")) {
      aimT -= dt;
      const sec = Math.ceil(aimT);
      if (sec !== lastTickSec) {
        lastTickSec = sec;
        if (sec > 0 && sec <= AIM_FUSE_TIME) sfx("tick", { urgent: aimT < FUSE_URGENT_AT });
      }
      if (aimT <= 0) {
        const v = aimV();
        if (v && v.m >= MIN_LAUNCH_SPEED && state === "aim") sfx("forced");
        commitAim();
      }
    }
    acc += dt;
    while (acc >= FIXED_DT) {
      worldT += FIXED_DT;
      if (state === "flight") simStep();
      else groundStep();
      updateClocks();
      acc -= FIXED_DT;
    }
    kbSweep(dt);
    updateCrumble(dt);
    updateRespawn(dt);
    updateIce(dt);
    const target = clampCam(body.y - VIEW_H * CAM_ANCHOR);
    camY += (target - camY) * Math.min(1, dt * (state === "flight" ? CAM_LERP_FLIGHT : CAM_LERP_GROUND));
    landT = Math.max(0, landT - dt);
    launchT = Math.max(0, launchT - dt);
    for (const plat of PLATS) if (plat.bounceT > 0) plat.bounceT = Math.max(0, plat.bounceT - dt);
    blinkT = Math.max(0, blinkT - dt);
    blinkTimer -= dt;
    if (blinkTimer < 0) {
      blinkT = BLINK_TIME;
      blinkTimer = BLINK_GAP_MIN + Math.random() * BLINK_GAP_VAR;
    }
    if (state === "ready") idleT += dt;
  }

  /* altitude wind bed: uniform across towers, louder/brighter with height, silent at the top */
  if (SND.ctx && SND.wind) {
    const tt = clamp01(body.y / SUMMIT);
    const base = (SND.on && state !== "win") ? WIND_BASE_GAIN + tt * WIND_ALT_GAIN : 0;
    SND.wind.wg.gain.setTargetAtTime(base, SND.ctx.currentTime, WIND_GLIDE);
    SND.wind.bp.frequency.setTargetAtTime(WIND_BASE_FREQ + tt * WIND_ALT_FREQ, SND.ctx.currentTime, WIND_GLIDE);
  }
  /* aim hum pitch follows power + fuse drain */
  if (state === "aim" && aim && SND.hum && SND.ctx) {
    const v = aimV();
    if (v) {
      SND.hum.o.frequency.setTargetAtTime(
        HUM_BASE_FREQ + v.m / MAX_LAUNCH_SPEED * HUM_POWER_SPAN + (1 - clamp01(aimT / AIM_FUSE_TIME)) * HUM_FUSE_SPAN,
        SND.ctx.currentTime, HUM_GLIDE);
    }
  } else if (SND.hum) stopHum();

  shake *= Math.exp(-SHAKE_DECAY * dt);
  flash *= Math.exp(-FLASH_DECAY * dt);
  warpGlow *= Math.exp(-FLASH_DECAY * dt);
  updParts(dt);
  render(now);
  hud();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    if (SND.ctx) SND.ctx.suspend().catch(() => {});
  } else {
    lastT = performance.now();
    if (SND.on && SND.ctx) SND.ctx.resume().catch(() => {});
  }
});
addEventListener("beforeunload", save);

/* ---------- boot ---------- */
load();
resize();
applySoundBtn();
updateTowerTag();
openOv("menu");
lastT = performance.now();
rafId = requestAnimationFrame(frameLoop);

/* ---------- test hook (manual clock for test.html; inert in normal play) ---------- */
window.__COMMIT__ = {
  takeControl() { manual = true; cancelAnimationFrame(rafId); },
  tick(now) { frameLoop(now); },
  launch, preview, step, resetRun, openOv, closeOv, save, load, spawnDust, resize, setSound, beginAim, setLevel,
  setBody(x, y) {
    body.x = x;
    body.y = y;
    body.vx = 0;
    body.vy = 0;
    body.grounded = true;
    body.slide = 0;
    body.slideT = 0;
    state = "ready";
    aim = null;
    pendingV = null;
    body.on = findGround(x, y);
    crumbleT = 0;
    crumbleStage = 0;
    aimT = AIM_FUSE_TIME;
    safePos.x = x;
    safePos.y = y;
  },
  get state() { return state; },
  get body() { return body; },
  get run() { return run; },
  get life() { return life; },
  get aim() { return aim; },
  get kb() { return kb; },
  get pendingV() { return pendingV; },
  get camY() { return camY; },
  get flash() { return flash; },
  get shake() { return shake; },
  get warpGlow() { return warpGlow; },
  get idleT() { return idleT; },
  get aimT() { return aimT; },
  get crumbleT() { return crumbleT; },
  get bounceChain() { return bounceChain; },
  get level() { return level; },
  get trail() { return trail; },
  get parts() { return parts; },
  get shards() { return shards; },
  get confetti() { return confetti; },
  get floats() { return floats; },
  get overlayOpen() { return overlayOpen; },
  get flightContacts() { return flightContacts; },
  get flightContact() { return flightContacts[0] || null; },
  get safePos() { return safePos; },
  get SOLIDS() { return SOLIDS; },
  get PLATS() { return PLATS; },
  get GOAL() { return GOAL; },
  get RAW_PLATS() { return RAW_PLATS; },
  get CEIL() { return CEIL; },
  RM, LEVELS, snd: SND, skyAt, moverXY, moverV, solidAt,
  get ZONES() { return ZONES; },
  get worldT() { return worldT; },
  setWorldT(t) { worldT = Math.max(0, +t || 0); },
  /* tuning values the harness asserts against (names match js/constants.js) */
  get C() {
    return {
      VIEW_W, VIEW_H, FIXED_DT, GRAVITY, MAX_LAUNCH_SPEED, MIN_LAUNCH_SPEED, DRAG_SPEED_PER_PX,
      CHAR_SIZE, SUMMIT, FALL_COUNT_MIN_PX, TERMINAL_FALL_SPEED, AIM_FUSE_TIME, CRUMBLE_DWELL_TIME,
      BOUNCE_SPEED, CRUMBLE_REFORM_TIME, ICE_SLIDE_SPEED, ICE_SLIDE_RAMP_TIME, PLATFORM_HEIGHT, PX_PER_METER,
      MOVER_DEFAULT_AMP, MOVER_DEFAULT_PERIOD, CLOCK_DEFAULT_DUTY, DIR_DEFAULT_VY,
      PLAT_SOLID, PLAT_CRUMBLE, PLAT_BOUNCE, PLAT_ICE, PLAT_MOVE_H, PLAT_MOVE_V, PLAT_CLOCK, PLAT_ORBIT, PLAT_DIR, PLAT_WARP,
      WARP_FLASH, WARP_SHAKE, WARP_PARTS, WARP_PARTS_RM,
      SOLVER_MAX_POWER, SOLVER_MIN_POWER, SOLVER_POWER_STEP, SOLVER_ANGLE_MIN, SOLVER_ANGLE_MAX, SOLVER_ANGLE_UP, SOLVER_ANGLE_STEP, SOLVER_PHASE_TOL,
      DESIGN_MAX_DY, DESIGN_MIN_PLAT_W, DESIGN_MAX_PERIOD, DESIGN_MIN_ON_WINDOW, DESIGN_MAX_ORBIT_SPEED, ZONE_MAX_ACCEL,
      IDLE_HINT_DELAY, CONFETTI_COUNT, PARTS_MAX, KB_ANGLE_RATE, KB_POWER_RATE, KB_FINE_FACTOR
    };
  }
};
