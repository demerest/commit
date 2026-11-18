/* COMMIT — cosmetic particles, shake, flash, squash timers.
   Randomness lives here only, never in the sim (the Commit Contract stays deterministic). */
"use strict";

let shake = 0, flash = 0, warpGlow = 0, landT = 0, launchT = 0;
const trail = [], parts = [], shards = [], floats = [], confetti = [];

function spawnDust(x, y, n, c) {
  if (RM) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    parts.push({
      x, y,
      vx: (Math.random() - 0.5) * DUST_SPREAD_X,
      vy: Math.random() * DUST_UP_VAR + DUST_UP_MIN,
      t: 0, life: DUST_LIFE_MIN + Math.random() * DUST_LIFE_VAR,
      c
    });
  }
  if (parts.length > PARTS_MAX) parts.splice(0, parts.length - PARTS_MAX);
}

/* pale spray kicked backwards by the feet while sliding on ice */
function spawnSpray(x, y, dir) {
  const n = RM ? SPRAY_COUNT_RM : SPRAY_COUNT;
  for (let i = 0; i < n; i++) {
    parts.push({
      x, y,
      vx: -dir * (SPRAY_BACK_MIN + Math.random() * SPRAY_BACK_VAR),
      vy: Math.random() * SPRAY_UP_VAR + SPRAY_UP_MIN,
      t: 0, life: SPRAY_LIFE_MIN + Math.random() * SPRAY_LIFE_VAR,
      c: COL.ice
    });
  }
  if (parts.length > PARTS_MAX) parts.splice(0, parts.length - PARTS_MAX);
}

/* pink ring burst at a warp end: radial sparks that hang (low gravity) and fade */
function spawnWarp(x, y) {
  const n = RM ? WARP_PARTS_RM : WARP_PARTS;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + Math.random() * 0.4;
    const sp = WARP_SPREAD * (0.5 + Math.random() * 0.5);
    parts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      t: 0, life: WARP_LIFE_MIN + Math.random() * WARP_LIFE_VAR,
      c: COL.warp, g: WARP_GRAVITY
    });
  }
  if (parts.length > PARTS_MAX) parts.splice(0, parts.length - PARTS_MAX);
}

function spawnShards(plat) {
  const n = RM ? SHARD_COUNT_RM : SHARD_COUNT;
  for (let i = 0; i < n; i++) {
    shards.push({
      x: plat.x + Math.random() * plat.w,
      y: plat.y + Math.random() * plat.h,
      vx: (Math.random() - 0.5) * SHARD_SPREAD_X,
      vy: Math.random() * SHARD_UP_VAR + SHARD_UP_MIN,
      r: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * SHARD_SPIN,
      w: SHARD_W_MIN + Math.random() * SHARD_W_VAR,
      h: SHARD_H_MIN + Math.random() * SHARD_H_VAR,
      c: Math.random() < 0.5 ? COL.plat : COL.edge,
      t: 0, life: SHARD_LIFE_MIN + Math.random() * SHARD_LIFE_VAR
    });
  }
  if (shards.length > SHARDS_MAX) shards.splice(0, shards.length - SHARDS_MAX);
}

function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    p.vy -= GRAVITY * (p.g == null ? DUST_GRAVITY : p.g) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.t > p.life) parts.splice(i, 1);
  }
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.t += dt;
    s.vy -= GRAVITY * SHARD_GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.r += s.vr * dt;
    if (s.t > s.life) shards.splice(i, 1);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.t += dt;
    c.vy -= GRAVITY * CONFETTI_GRAVITY * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.r += c.vr * dt;
    if (c.t > CONFETTI_LIFE) confetti.splice(i, 1);
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    f.y += FLOAT_RISE_SPEED * dt;
    if (f.t > FLOAT_LIFE) floats.splice(i, 1);
  }
}
