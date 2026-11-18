/* COMMIT — Canvas 2D rendering. Every visual is a primitive; no image files.
   Tuning numbers live in js/constants.js; small draw offsets stay inline. */
"use strict";

const cv = $("cv"), ctx = cv.getContext("2d"), frame = $("frame");
let scale = 1, dpr = 1, camY = CAM_MIN, blinkT = 0, blinkTimer = 3;

const clampCam = t => mode === "endless"
  ? Math.max(CAM_MIN, t)
  : Math.max(CAM_MIN, Math.min(t, SUMMIT + CAM_HEADROOM - VIEW_H));

function resize() {
  scale = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
  cv.width = Math.round(VIEW_W * scale * dpr);
  cv.height = Math.round(VIEW_H * scale * dpr);
  cv.style.width = VIEW_W * scale + "px";
  cv.style.height = VIEW_H * scale + "px";
  frame.style.width = VIEW_W * scale + "px";
  frame.style.height = VIEW_H * scale + "px";
  frame.style.fontSize = Math.max(HUD_FONT_MIN, HUD_FONT_BASE * scale) + "px";
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

/* world y (up-positive) -> screen y */
const SY = wy => VIEW_H - (wy - camY);

function rr(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function drawPlatform(plat, now) {
  const sy = SY(plat.y + plat.h);
  if (sy > VIEW_H + DRAW_CULL_MARGIN || sy + plat.h < -DRAW_CULL_MARGIN) return;

  /* shattered crumble: dashed ghost + reform progress bar */
  if (plat.dead) {
    if (plat.crumble && plat.respawnT > 0) {
      const f = 1 - clamp01(plat.respawnT / CRUMBLE_REFORM_TIME);
      ctx.save();
      ctx.globalAlpha = 0.26 + 0.12 * Math.sin(now * 0.006);
      ctx.strokeStyle = COL.edge;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(plat.x + 0.5, sy + 0.5, plat.w - 1, plat.h - 1);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = COL.spring;
      ctx.fillRect(plat.x, sy, plat.w * f, 2);
      ctx.restore();
    }
    return;
  }

  /* ice: glossy slab + travelling sheen + drift chevrons */
  if (plat.ice) {
    const x = plat.x, y = sy;
    ctx.fillStyle = COL.iceBody;
    ctx.fillRect(x, y, plat.w, plat.h);
    ctx.fillStyle = COL.ice;
    ctx.fillRect(x, y, plat.w, 2);
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const cx = x + plat.w * (i + 0.5) / 3;
      ctx.beginPath();
      ctx.moveTo(cx - 3, y + 4);
      ctx.lineTo(cx + 3, y + plat.h - 3);
      ctx.stroke();
    }
    const sh = ((now * 0.02) % (plat.w + 40)) - 20;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, plat.w, plat.h);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + sh, y + plat.h);
    ctx.lineTo(x + sh + 10, y);
    ctx.stroke();
    ctx.restore();
    if (body.on === plat && body.slide !== 0) {
      const d = body.slide, n = Math.max(2, Math.floor(plat.w / 18));
      ctx.fillStyle = COL.ice;
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < n; i++) {
        const cx = x + plat.w * (i + 0.5) / n, cy = y + 9;
        ctx.beginPath();
        ctx.moveTo(cx - 3 * d, cy - 3);
        ctx.lineTo(cx + 3 * d, cy);
        ctx.lineTo(cx - 3 * d, cy + 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    return;
  }

  /* movers: dashed travel track + end stops + direction chevrons */
  if (plat.move) {
    const x = plat.x, y = sy;
    const mc = plat.move === PLAT_ORBIT ? COL.orbit : COL.mover;
    ctx.save();
    ctx.strokeStyle = mc;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    if (plat.move === PLAT_MOVE_H) {
      const ty = y + plat.h / 2;
      ctx.beginPath();
      ctx.moveTo(plat.bx - plat.amp, ty);
      ctx.lineTo(plat.bx + plat.amp + plat.w, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = mc;
      ctx.fillRect(plat.bx - plat.amp - 2, ty - 4, 2, 8);
      ctx.fillRect(plat.bx + plat.amp + plat.w, ty - 4, 2, 8);
    } else if (plat.move === PLAT_MOVE_V) {
      const tx = x + plat.w / 2;
      ctx.beginPath();
      ctx.moveTo(tx, SY(plat.by + plat.amp + plat.h));
      ctx.lineTo(tx, SY(plat.by - plat.amp + plat.h));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = mc;
      ctx.fillRect(tx - 4, SY(plat.by + plat.amp + plat.h), 8, 2);
      ctx.fillRect(tx - 4, SY(plat.by - plat.amp + plat.h) - 2, 8, 2);
    } else {
      const cxp = plat.bx + plat.w / 2, cyp = SY(plat.by + plat.h / 2);
      ctx.beginPath();
      ctx.arc(cxp, cyp, plat.amp, 0, 6.283);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = mc;
      ctx.fillRect(cxp - 2, cyp - 2, 4, 4);
    }
    ctx.restore();
    ctx.fillStyle = plat.move === PLAT_ORBIT ? COL.orbitBody : COL.moverBody;
    ctx.fillRect(x, y, plat.w, plat.h);
    ctx.fillStyle = mc;
    ctx.fillRect(x, y, plat.w, 2);
    ctx.strokeStyle = plat.move === PLAT_ORBIT ? "rgba(126,224,163,.35)" : "rgba(209,123,255,.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, plat.w - 1, plat.h - 1);
    const v = moverV(plat, worldT);
    const n = Math.max(2, Math.floor(plat.w / 18));
    ctx.fillStyle = mc;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < n; i++) {
      const cx = x + plat.w * (i + 0.5) / n, cy = y + 9;
      ctx.beginPath();
      if (plat.move === PLAT_MOVE_H) {
        const d = Math.sign(v.x);
        ctx.moveTo(cx - 3 * d, cy - 3);
        ctx.lineTo(cx + 3 * d, cy);
        ctx.lineTo(cx - 3 * d, cy + 3);
      } else if (plat.move === PLAT_MOVE_V) {
        const d = Math.sign(v.y);
        ctx.moveTo(cx - 3, cy + 3 * d);
        ctx.lineTo(cx, cy - 3 * d);
        ctx.lineTo(cx + 3, cy + 3 * d);
      } else {
        const m = Math.hypot(v.x, v.y) || 1, ux = v.x / m, uy = -v.y / m;
        ctx.moveTo(cx - ux * 3 - uy * 3, cy - uy * 3 + ux * 3);
        ctx.lineTo(cx + ux * 3, cy + uy * 3);
        ctx.lineTo(cx - ux * 3 + uy * 3, cy - uy * 3 - ux * 3);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }

  /* direction spring: authored-vector arrow stencil */
  if (plat.dir) {
    const x = plat.x, y = sy;
    ctx.fillStyle = COL.dirBody;
    ctx.fillRect(x, y, plat.w, plat.h);
    ctx.fillStyle = COL.dir;
    ctx.fillRect(x, y, plat.w, 2);
    ctx.strokeStyle = "rgba(255,159,67,.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, plat.w - 1, plat.h - 1);
    const m = Math.hypot(plat.dvx, plat.dvy) || 1, ux = plat.dvx / m, uy = -plat.dvy / m;
    const cx = x + plat.w / 2, cy = y + plat.h / 2;
    ctx.strokeStyle = COL.dir;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx - ux * 6, cy - uy * 6);
    ctx.lineTo(cx + ux * 6, cy + uy * 6);
    ctx.lineTo(cx + ux * 2 - uy * 3, cy + uy * 2 + ux * 3);
    ctx.moveTo(cx + ux * 6, cy + uy * 6);
    ctx.lineTo(cx + ux * 2 + uy * 3, cy + uy * 2 - ux * 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  /* phase platform: solid slab + draining clock-bar, or dashed ghost + refilling bar */
  if (plat.clock) {
    const x = plat.x, y = sy;
    const on = solidAt(plat, worldT);
    const u = ((worldT / plat.period + plat.phase) % 1 + 1) % 1;
    const frac = on ? (plat.duty - u) / plat.duty : (u - plat.duty) / (1 - plat.duty);
    if (on) {
      ctx.fillStyle = COL.clockBody;
      ctx.fillRect(x, y, plat.w, plat.h);
      ctx.fillStyle = COL.phase;
      ctx.fillRect(x, y, plat.w, 2);
      ctx.strokeStyle = "rgba(255,209,102,.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, plat.w - 1, plat.h - 1);
      ctx.fillStyle = COL.phase;
      ctx.globalAlpha = 0.6;
      for (let i = 1; i < 4; i++) ctx.fillRect(x + plat.w * i / 4 - 1, y + 4, 2, 4);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y + plat.h - 3, plat.w * clamp01(frac), 3);
      ctx.globalAlpha = 1;
    } else {
      ctx.save();
      ctx.strokeStyle = COL.phase;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 0.5, y + 0.5, plat.w - 1, plat.h - 1);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = COL.phase;
      ctx.fillRect(x, y + plat.h - 3, plat.w * clamp01(frac), 3);
      ctx.restore();
    }
    return;
  }

  /* commit pad (NO SUMMIT): a summit-like flag that banks your height on landing */
  if (plat.claim) {
    const x = plat.x, y = sy;
    ctx.fillStyle = COL.plat;
    ctx.fillRect(x, y, plat.w, plat.h);
    ctx.fillStyle = COL.amber;
    ctx.fillRect(x, y, plat.w, 2);
    const fx = x + plat.w / 2, fy = y;
    ctx.strokeStyle = COL.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - 40);
    ctx.stroke();
    if (plat.claimed) {
      ctx.fillStyle = COL.green;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 40);
      ctx.lineTo(fx + 24, fy - 33);
      ctx.lineTo(fx, fy - 26);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = COL.amber;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 0.005);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 40);
      ctx.lineTo(fx + 24, fy - 33);
      ctx.lineTo(fx, fy - 26);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = plat.claimed ? COL.green : COL.dim;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText((plat.claimed ? "COMMITTED · " : "COMMIT · ") + ((plat.y + plat.h) / PX_PER_METER).toFixed(0) + "m", x - 4, fy - 48);
    return;
  }

  /* warp pad: pink slab + counter-rotating portal arcs (a door, not a ledge) */
  if (plat.warp) {
    const x = plat.x, y = sy;
    ctx.fillStyle = COL.warpBody;
    ctx.fillRect(x, y, plat.w, plat.h);
    ctx.fillStyle = COL.warp;
    ctx.fillRect(x, y, plat.w, 2);
    ctx.strokeStyle = "rgba(255,110,199,.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, plat.w - 1, plat.h - 1);
    const cx = x + plat.w / 2, cy = y + plat.h / 2, a = worldT * 2.4;
    ctx.strokeStyle = COL.warp;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, a, a + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, a + Math.PI, a + Math.PI + 2.2);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, -a * 1.6, -a * 1.6 + 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  /* solid / crumble / bounce */
  let jx = 0, jy = 0, prog = 0;
  if (plat.crumble && body.on === plat && crumbleT > 0) {
    prog = clamp01(crumbleT / CRUMBLE_DWELL_TIME);
    if (!RM) {
      jx = (Math.random() - 0.5) * prog * 3;
      jy = (Math.random() - 0.5) * prog * 2;
    }
  }
  const x = plat.x + jx, y = sy + jy;
  ctx.fillStyle = COL.plat;
  ctx.fillRect(x, y, plat.w, plat.h);

  if (plat.bounce) {
    const pulse = 0.6 + 0.4 * Math.sin(now * 0.004);
    ctx.fillStyle = COL.spring;
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.fillRect(x, y, plat.w, 2);
    ctx.globalAlpha = 1;
    const comp = plat.bounceT > 0 ? plat.bounceT / SPRING_COMP_TIME : 0;
    ctx.fillStyle = COL.spring;
    ctx.globalAlpha = 0.8;
    const n = Math.max(2, Math.floor(plat.w / 16));
    for (let i = 0; i < n; i++) {
      const cx = x + plat.w * (i + 0.5) / n, cy = y + 5 + comp * 3;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 4);
      ctx.lineTo(cx, cy - 2);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (plat.crumble) {
    const edge = prog > CRUMBLE_RED_AT ? COL.red : prog > CRUMBLE_AMBER_AT ? COL.amber : COL.crumble;
    ctx.fillStyle = edge;
    ctx.fillRect(x, y, plat.w, 2);
    ctx.strokeStyle = COL.crack;
    ctx.lineWidth = 1;
    const cracks = 2 + Math.floor(prog * 5);
    for (let i = 0; i < cracks; i++) {
      const cx = x + plat.w * (i + 0.5) / cracks;
      ctx.beginPath();
      ctx.moveTo(cx, y + 2);
      ctx.lineTo(cx + (i % 2 ? 3 : -3), y + 6 + prog * 6);
      ctx.lineTo(cx + (i % 2 ? -2 : 2), y + plat.h - 1);
      ctx.stroke();
    }
    return;
  }

  ctx.fillStyle = COL.edge;
  ctx.fillRect(x, y, plat.w, 2);
}

function render(now) {
  /* altitude sky (endless ping-pongs through it every 1000m) */
  const t = altFrac(camY);
  const [top, mid, bot] = skyAt(t);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, rgb(top));
  g.addColorStop(0.55, rgb(mid));
  g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  let ox = 0, oy = 0;
  if (shake > 0.1 && !RM) {
    ox = (Math.random() - 0.5) * shake;
    oy = (Math.random() - 0.5) * shake;
  }
  ctx.save();
  ctx.translate(ox, oy);

  /* stars (parallax; endless wraps the band so the shaft never runs out of sky) */
  for (const s of STARS) {
    const sy = mode === "endless"
      ? VIEW_H - (((s.y - camY * STAR_PARALLAX) % ENDLESS_STAR_SPAN) + ENDLESS_STAR_SPAN) % ENDLESS_STAR_SPAN
      : VIEW_H - (s.y - camY * STAR_PARALLAX);
    if (sy < -4 || sy > VIEW_H + 4) continue;
    ctx.globalAlpha = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.001 + s.p))) * (1 - t * 0.5);
    ctx.fillStyle = COL.dim;
    ctx.fillRect(s.x, sy, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  /* altitude grid + labels */
  ctx.strokeStyle = COL.line;
  ctx.lineWidth = 1;
  ctx.fillStyle = COL.dim;
  ctx.font = "10px ui-monospace,monospace";
  const y0 = Math.floor(camY / ALT_LINE_STEP) * ALT_LINE_STEP;
  for (let wy = y0; wy < camY + VIEW_H + ALT_LINE_STEP; wy += ALT_LINE_STEP) {
    const sy = SY(wy);
    ctx.globalAlpha = wy % ALT_LABEL_STEP === 0 ? 0.35 : 0.12;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(VIEW_W, sy);
    ctx.stroke();
    if (wy % ALT_LABEL_STEP === 0 && wy > 0) {
      ctx.globalAlpha = 0.55;
      ctx.fillText(wy / PX_PER_METER + "m", 8, sy - 4);
    }
  }

  /* section titles + author notes */
  ctx.globalAlpha = 0.5;
  ctx.font = "700 13px ui-monospace,monospace";
  for (const [wy, name] of SECTIONS) {
    const sy = SY(wy);
    if (sy > -20 && sy < VIEW_H + 20) ctx.fillText(name, 12, sy);
  }
  ctx.textAlign = "center";
  ctx.font = "11px ui-monospace,monospace";
  for (const [nx, ny, txt] of NOTES) {
    const sy = SY(ny);
    if (sy > -10 && sy < VIEW_H + 10) {
      ctx.globalAlpha = 0.45;
      ctx.fillText(txt, nx, sy);
    }
  }
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;

  /* side walls + ground */
  ctx.fillStyle = COL.plat;
  ctx.fillRect(0, 0, 4, VIEW_H);
  ctx.fillRect(VIEW_W - 4, 0, 4, VIEW_H);
  ctx.fillStyle = COL.edge;
  ctx.fillRect(3, 0, 1, VIEW_H);
  ctx.fillRect(VIEW_W - 4, 0, 1, VIEW_H);
  const gy = SY(0);
  if (mode !== "endless" && gy < VIEW_H + 2) {
    ctx.fillStyle = COL.plat;
    ctx.fillRect(0, gy, VIEW_W, VIEW_H - gy + 2);
    ctx.fillStyle = COL.edge;
    ctx.fillRect(0, gy, VIEW_W, 2);
  }

  /* the void (NO SUMMIT): a rising death line 50m below your peak, hazard dashes crawling */
  if (mode === "endless") {
    const vy = SY(END.floor);
    if (vy < VIEW_H + 2) {
      const vg2 = ctx.createLinearGradient(0, vy - 46, 0, vy);
      vg2.addColorStop(0, "rgba(255,93,93,0)");
      vg2.addColorStop(1, "rgba(255,93,93,.14)");
      ctx.fillStyle = vg2;
      ctx.fillRect(0, vy - 46, VIEW_W, 46);
      ctx.fillStyle = "#04050a";
      ctx.fillRect(0, vy, VIEW_W, VIEW_H - vy + 2);
      ctx.fillStyle = COL.red;
      ctx.fillRect(0, vy, VIEW_W, 2);
      ctx.strokeStyle = "rgba(255,93,93,.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = RM ? 0 : -now * 0.02;
      ctx.beginPath();
      ctx.moveTo(0, vy + 7);
      ctx.lineTo(VIEW_W, vy + 7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      if (vy < VIEW_H - 16) {
        ctx.fillStyle = COL.red;
        ctx.globalAlpha = 0.6;
        ctx.font = "10px ui-monospace,monospace";
        ctx.textAlign = "center";
        ctx.fillText("THE VOID · 50m BELOW YOUR PEAK", VIEW_W / 2, vy + 22);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }
    }
  }

  /* gust zones: tinted column + drifting streaks */
  for (const z of ZONES) {
    const zy = SY(z.y + z.h);
    if (zy > VIEW_H + DRAW_CULL_MARGIN || zy + z.h < -DRAW_CULL_MARGIN) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(z.x, zy, z.w, z.h);
    ctx.clip();
    ctx.fillStyle = COL.zone;
    ctx.globalAlpha = 0.06;
    ctx.fillRect(z.x, zy, z.w, z.h);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = COL.zone;
    ctx.lineWidth = 1;
    const horiz = z.ax !== 0, n = RM ? ZONE_STREAKS_RM : ZONE_STREAKS;
    for (let i = 0; i < n; i++) {
      if (horiz) {
        const dir = Math.sign(z.ax);
        const off = ((now * 0.06 * dir) + (i * 37)) % (z.w + 40) - 20;
        const ly = zy + z.h * (i + 0.5) / n;
        ctx.beginPath();
        ctx.moveTo(z.x + off, ly);
        ctx.lineTo(z.x + off + 14 * dir, ly);
        ctx.stroke();
      } else {
        const px = z.x + ((i * 53) % z.w);
        const off = ((now * 0.05) + (i * 41)) % (z.h + 40) - 20;
        ctx.beginPath();
        ctx.moveTo(px, zy + z.h - off);
        ctx.lineTo(px, zy + z.h - off - 14);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = COL.zone;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.strokeRect(z.x + 0.5, zy + 0.5, z.w - 1, z.h - 1);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /* ceilings + platforms (movers synced to the world clock first; null = despawned) */
  for (const plat of SOLIDS) {
    if (!plat || plat.wall || plat.ground || plat.goal) continue;
    if (plat.ceil) {
      const sy = SY(plat.y + plat.h);
      if (sy > VIEW_H + DRAW_CULL_MARGIN || sy + plat.h < -DRAW_CULL_MARGIN) continue;
      ctx.fillStyle = COL.plat;
      ctx.fillRect(plat.x, sy, plat.w, plat.h);
      ctx.fillStyle = COL.amber;
      ctx.fillRect(plat.x, sy, plat.w, 2);
      ctx.globalAlpha = 0.35;
      for (let x = plat.x + 4; x < plat.x + plat.w - 4; x += 12) ctx.fillRect(x, sy + plat.h - 3, 6, 3);
      ctx.globalAlpha = 1;
    } else {
      if (plat.move) {
        const r = rectOf(plat, worldT);
        plat.x = r.x;
        plat.y = r.y;
      }
      drawPlatform(plat, now);
    }
  }

  /* summit flag (towers only; the endless shaft has no summit) */
  if (GOAL) {
    const fx = GOAL.x + GOAL.w / 2, fy = SY(GOAL.y + GOAL.h);
    ctx.strokeStyle = COL.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - 46);
    ctx.stroke();
    ctx.fillStyle = COL.green;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 46);
    ctx.lineTo(fx + 26, fy - 38);
    ctx.lineTo(fx, fy - 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COL.dim;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText("SUMMIT · " + (SUMMIT / PX_PER_METER) + "m", GOAL.x - 6, fy - 56);
    ctx.fillStyle = COL.green;
    ctx.fillRect(GOAL.x, fy, GOAL.w, 2);
  }

  /* last-flight trail */
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    ctx.globalAlpha = (i + 1) / trail.length * 0.5;
    ctx.fillStyle = COL.blue;
    const r = 1.5 + 2 * (i / trail.length);
    ctx.fillRect(p.x - r / 2, SY(p.y) - r / 2, r, r);
  }
  ctx.globalAlpha = 1;

  /* the dotted arc + contact marks (the Commit Contract made visible) */
  if (aim && (state === "aim" || state === "flight")) {
    const v = pendingV || aimV();
    if (v) {
      const pr = preview(v), weak = v.m < MIN_LAUNCH_SPEED;
      /* ghost the target mover at contact time so the ring visibly sits on its future position
         (never for a fold: where a door opens is a secret) */
      if (pr.mark && pr.mark.move && pr.mark.warp < 0) {
        const gs = PLATS[pr.mark.idx], gr = rectOf(gs, pr.markT), gsy = SY(gr.y + gr.h);
        ctx.save();
        ctx.strokeStyle = COL.mover;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(gr.x + 0.5, gsy + 0.5, gr.w - 1, gr.h - 1);
        ctx.setLineDash([]);
        ctx.restore();
      }
      for (let i = 0; i < pr.pts.length; i++) {
        const p = pr.pts[i];
        ctx.globalAlpha = weak ? 0.35 : 0.85;
        ctx.fillStyle = weak ? COL.dim : COL.ink;
        ctx.fillRect(p.x - 1.5, SY(p.y) - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
      for (const m of pr.contacts) {
        /* a fold's destination stays a secret until you commit: ring the DOOR itself,
           never where it opens (the contract data still carries the true destination) */
        const src = m.warp >= 0 ? PLATS[m.warp] : null;
        const mx = src ? src.x + src.w / 2 : m.x;
        const sy = SY(src ? src.y + src.h : m.y);
        if (m.t === "bounce") {
          ctx.strokeStyle = COL.spring;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mx, sy, 7, 0, 6.29);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(mx - 4, sy + 2);
          ctx.lineTo(mx, sy - 4);
          ctx.lineTo(mx + 4, sy + 2);
          ctx.stroke();
        } else if (m.ok) {
          const pulse = 3 + Math.sin(now * 0.012) * 1.5;
          const rc = m.warp >= 0 ? COL.warp : m.move ? COL.mover : m.clock ? COL.phase : m.ice ? COL.ice : COL.green;
          ctx.strokeStyle = rc;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mx, sy, 6 + pulse, 0, 6.29);
          ctx.stroke();
          ctx.fillStyle = rc;
          ctx.beginPath();
          ctx.arc(mx, sy, 2, 0, 6.29);
          ctx.fill();
        } else {
          ctx.strokeStyle = COL.red;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mx - 6, sy - 6);
          ctx.lineTo(mx + 6, sy + 6);
          ctx.moveTo(mx + 6, sy - 6);
          ctx.lineTo(mx - 6, sy + 6);
          ctx.stroke();
        }
      }
      ctx.fillStyle = weak ? COL.dim : COL.blue;
      ctx.font = "700 12px ui-monospace,monospace";
      const pct = Math.round(v.m / MAX_LAUNCH_SPEED * 100) + "%";
      const lbl = pendingV ? "QUEUED · " + pct
        : aim.mode === "k" ? Math.round(kb.angle) + "° · " + pct
        : pct;
      ctx.fillText(lbl, Math.min(body.x + CHAR_SIZE + 8, VIEW_W - (pendingV ? 118 : aim.mode === "k" ? 86 : 42)), SY(body.y + CHAR_SIZE) - 6);
      if (aim.mode === "p" && !pendingV) {
        ctx.strokeStyle = COL.blue;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(aim.ox, aim.oy, 10, 0, 6.29);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(aim.ox, aim.oy);
        ctx.lineTo(aim.cx, aim.cy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  /* the square: fuse ring, squash & stretch, lean, eyes */
  {
    let sx = 1, sy = 1;
    if (landT > 0) {
      const k = landT / LAND_SQUASH_TIME;
      sy = 1 - LAND_SQUASH * k;
      sx = 1 + LAND_SQUASH * k;
    } else if (launchT > 0) {
      const k = launchT / LAUNCH_SQUASH_TIME;
      sy = 1 + LAUNCH_STRETCH_Y * k;
      sx = 1 - LAUNCH_STRETCH_X * k;
    }
    const cx = body.x + CHAR_SIZE / 2, by = SY(body.y);
    if (aim && (state === "aim" || state === "flight")) {
      const f = pendingV ? 1 : clamp01(aimT / AIM_FUSE_TIME);
      const rad = AIM_RING_RADIUS, ccx = cx, ccy = by - CHAR_SIZE / 2;
      const col = pendingV ? COL.amber : f > FUSE_AMBER_AT ? COL.blue : f > FUSE_RED_AT ? COL.amber : COL.red;
      ctx.strokeStyle = COL.line;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(ccx, ccy, rad, 0, 6.29);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ccx, ccy, rad, -Math.PI / 2, -Math.PI / 2 + f * 6.283);
      ctx.stroke();
      if (!pendingV && f < FUSE_PANIC_AT) {
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now * 0.03);
        ctx.strokeStyle = COL.red;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ccx, ccy, rad + 4, 0, 6.29);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(sx, sy);
    if (body.on && body.on.ice && body.slide !== 0) ctx.rotate(body.slide * ICE_TILT);
    else if (body.on && body.on.move === PLAT_MOVE_H) ctx.rotate(moverV(body.on, worldT).x > 0 ? MOVER_TILT : -MOVER_TILT);
    ctx.fillStyle = COL.ink;
    rr(-CHAR_SIZE / 2, -CHAR_SIZE, CHAR_SIZE, CHAR_SIZE, 4);
    ctx.fill();
    let lx = 0, ly = 0;
    if (aim && (state === "aim" || state === "flight")) {
      const v = pendingV || aimV();
      if (v) {
        const m = Math.hypot(v.x, v.y) || 1;
        lx = v.x / m * 2.4;
        ly = -v.y / m * 2.4;
      }
    } else if (state === "flight") {
      const m = Math.hypot(body.vx, body.vy) || 1;
      lx = body.vx / m * 2.4;
      ly = -body.vy / m * 2.4;
    } else if (body.slide !== 0) {
      lx = body.slide * 1.6;
    }
    const blink = blinkT > 0 ? 0.15 : 1;
    ctx.fillStyle = COL.deep;
    ctx.fillRect(-5 + lx, -12 + ly, 3, 4 * blink);
    ctx.fillRect(2 + lx, -12 + ly, 3, 4 * blink);
    ctx.restore();
  }

  /* particles, shards, confetti, popups */
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - 1.5, SY(p.y) - 1.5, 3, 3);
  }
  for (const s of shards) {
    ctx.save();
    ctx.translate(s.x, SY(s.y));
    ctx.rotate(s.r);
    ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
    ctx.fillStyle = s.c;
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, SY(c.y));
    ctx.rotate(c.r);
    ctx.globalAlpha = Math.max(0, 1 - c.t / CONFETTI_LIFE);
    ctx.fillStyle = c.c;
    ctx.fillRect(-3, -2, 6, 4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.font = "700 13px ui-monospace,monospace";
  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / FLOAT_LIFE);
    ctx.fillStyle = f.c;
    ctx.fillText(f.txt, f.x - 16, SY(f.y));
  }
  ctx.globalAlpha = 1;

  /* first-run idle hint */
  if (state === "ready" && run.launches === 0 && idleT > IDLE_HINT_DELAY) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 0.004);
    ctx.fillStyle = COL.ink;
    ctx.font = "12px ui-monospace,monospace";
    ctx.fillText("drag anywhere · release to commit", Math.max(10, Math.min(body.x - 60, VIEW_W - 230)), SY(body.y) - 34);
    ctx.globalAlpha = 1;
  }

  /* progress rail: towers map 0..summit; endless maps the live window, with commit ticks */
  {
    const x = VIEW_W - RAIL_X_MARGIN, yTop = RAIL_TOP, yBot = VIEW_H - RAIL_BOTTOM;
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, yBot);
    ctx.lineTo(x, yTop);
    ctx.stroke();
    if (mode === "endless") {
      const lo = END.floor, hi = END.genTop + 60, span = Math.max(1, hi - lo);
      const fr = v => clamp01((v - lo) / span);
      ctx.strokeStyle = COL.blue;
      ctx.beginPath();
      ctx.moveTo(x, yBot);
      ctx.lineTo(x, yBot - (yBot - yTop) * fr(body.y));
      ctx.stroke();
      const bf = fr(life.endlessBest || 0);
      if ((life.endlessBest || 0) >= lo && (life.endlessBest || 0) <= hi) {
        ctx.fillStyle = COL.amber;
        ctx.fillRect(x - 5, yBot - (yBot - yTop) * bf - 1, 10, 2);
      }
      ctx.fillStyle = COL.green;
      for (const p of PLATS) {
        if (p && p.claim && p.y + p.h >= lo && p.y + p.h <= hi) {
          ctx.fillRect(x - 4, yBot - (yBot - yTop) * fr(p.y + p.h) - 1, 8, 2);
        }
      }
      ctx.fillStyle = COL.red;
      ctx.fillRect(x - 4, yBot - 1, 8, 2);
    } else {
      ctx.strokeStyle = COL.blue;
      ctx.beginPath();
      ctx.moveTo(x, yBot);
      ctx.lineTo(x, yBot - (yBot - yTop) * clamp01(body.y / SUMMIT));
      ctx.stroke();
      ctx.fillStyle = COL.amber;
      ctx.fillRect(x - 5, yBot - (yBot - yTop) * clamp01((life.best[level] || 0) / SUMMIT) - 1, 10, 2);
      ctx.fillStyle = COL.green;
      ctx.fillRect(x - 4, yTop - 6, 8, 3);
    }
  }
  ctx.restore();

  /* fall flash + warp glow + vignette */
  if (flash > 0.01) {
    ctx.fillStyle = "rgba(255,93,93," + flash + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (warpGlow > 0.01) {
    ctx.fillStyle = "rgba(255,110,199," + warpGlow + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
