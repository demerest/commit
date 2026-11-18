/* COMMIT — web level editor. Loads the real integrator (js/sim.js) so VALIDATE uses the
   same step()/preview() as the game. Exports/imports COMMIT_LEVEL(<json>) descriptors.
   Published alongside the game; the game UI never links to it (the README does). */
"use strict";
(function () {
  const cv = $("cv"), ctx = cv.getContext("2d");
  const TY = ["solid", "crumble", "bounce", "ice", "move·h", "move·v", "clock", "orbit", "dir", "warp"];
  const TCOL = [COL.edge, COL.crumble, COL.spring, COL.ice, COL.mover, COL.mover, COL.phase, COL.orbit, COL.dir, COL.warp];
  let ed = null, sel = null, camY = -100, scale = 1, drag = null;
  const clone = o => JSON.parse(JSON.stringify(o));

  /* mirror of buildLevel() without the star field: the editor edits raw descriptors */
  function rebuild() {
    LVL = ed;
    SUMMIT = ed.summit;
    RAW_PLATS = ed.plats;
    CEIL = ed.ceil;
    SECTIONS = ed.sections;
    NOTES = ed.notes;
    SOLIDS.length = 0;
    PLATS.length = 0;
    ZONES.length = 0;
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
        dead: false
      };
      PLATS.push(plat);
      SOLIDS.push(plat);
    });
    for (const z of (ed.zones || [])) ZONES.push({ x: z[0], y: z[1], w: z[2], h: z[3], ax: z[4], ay: z[5] });
    for (const [x, top, w] of CEIL) SOLIDS.push({ x, y: top - PLATFORM_HEIGHT, w, h: PLATFORM_HEIGHT, ceil: true });
    GOAL = { x: ed.goal[0], y: SUMMIT - PLATFORM_HEIGHT, w: ed.goal[1], h: PLATFORM_HEIGHT, goal: true };
    SOLIDS.push(GOAL);
  }

  const SY = wy => cv.height - (wy - camY) * scale;
  const WX = sx => sx / scale;
  const WY = sy => camY + (cv.height - sy) / scale;
  function resize() {
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    scale = cv.width / VIEW_W;
    draw();
  }
  addEventListener("resize", resize);

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COL.deep;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    ctx.fillStyle = COL.dim;
    ctx.font = "10px ui-monospace,monospace";
    const y0 = Math.floor(camY / ALT_LINE_STEP) * ALT_LINE_STEP;
    for (let wy = y0; wy < camY + cv.height / scale + ALT_LINE_STEP; wy += ALT_LINE_STEP) {
      const sy = SY(wy);
      ctx.globalAlpha = wy % ALT_LABEL_STEP === 0 ? 0.4 : 0.12;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(cv.width, sy);
      ctx.stroke();
      if (wy % ALT_LABEL_STEP === 0 && wy > 0) {
        ctx.globalAlpha = 0.6;
        ctx.fillText(wy / PX_PER_METER + "m", 4, sy - 3);
      }
    }
    ctx.globalAlpha = 1;
    const gy = SY(0);
    if (gy < cv.height) {
      ctx.fillStyle = COL.plat;
      ctx.fillRect(0, gy, cv.width, cv.height - gy);
      ctx.fillStyle = COL.edge;
      ctx.fillRect(0, gy, cv.width, 2);
    }
    ctx.fillStyle = COL.plat;
    ctx.fillRect(0, 0, 4 * scale, cv.height);
    ctx.fillRect(cv.width - 4 * scale, 0, 4 * scale, cv.height);

    for (const [x, top, w] of ed.ceil) {
      const sy = SY(top);
      ctx.fillStyle = COL.plat;
      ctx.fillRect(x * scale, sy, w * scale, PLATFORM_HEIGHT * scale);
      ctx.fillStyle = COL.amber;
      ctx.fillRect(x * scale, sy, w * scale, 2);
    }

    for (const z of (ed.zones || [])) {
      const zy = SY(z[1] + z[3]);
      ctx.save();
      ctx.fillStyle = COL.zone;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(z[0] * scale, zy, z[2] * scale, z[3] * scale);
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = COL.zone;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.strokeRect(z[0] * scale + 0.5, zy + 0.5, z[2] * scale - 1, z[3] * scale - 1);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = COL.zone;
      ctx.font = "9px ui-monospace,monospace";
      ctx.fillText((z[4] ? "gust " + z[4] : "updraft " + z[5]), z[0] * scale + 4, zy + 12);
      ctx.restore();
    }

    ed.plats.forEach(([x, top, w, ty, amp, per], i) => {
      const sy = SY(top);
      /* travel tracks */
      if (ty === PLAT_MOVE_H || ty === PLAT_MOVE_V || ty === PLAT_ORBIT) {
        const a = amp || MOVER_DEFAULT_AMP;
        ctx.save();
        ctx.strokeStyle = ty === PLAT_ORBIT ? COL.orbit : COL.mover;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        if (ty === PLAT_MOVE_H) {
          const ty2 = sy + 8 * scale;
          ctx.beginPath();
          ctx.moveTo((x - a) * scale, ty2);
          ctx.lineTo((x + a + w) * scale, ty2);
          ctx.stroke();
        } else if (ty === PLAT_MOVE_V) {
          const tx = (x + w / 2) * scale;
          ctx.beginPath();
          ctx.moveTo(tx, SY(top + a));
          ctx.lineTo(tx, SY(top - a));
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc((x + w / 2) * scale, SY(top - PLATFORM_HEIGHT / 2), a * scale, 0, 6.283);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      }
      /* slab body + type edge */
      ctx.fillStyle = ty === PLAT_ICE ? COL.iceBody
        : ty === PLAT_MOVE_H || ty === PLAT_MOVE_V ? COL.moverBody
        : ty === PLAT_ORBIT ? COL.orbitBody
        : ty === PLAT_CLOCK ? COL.clockBody
        : ty === PLAT_DIR ? COL.dirBody
        : ty === PLAT_WARP ? COL.warpBody
        : COL.plat;
      ctx.fillRect(x * scale, sy, w * scale, PLATFORM_HEIGHT * scale);
      ctx.fillStyle = TCOL[ty];
      ctx.fillRect(x * scale, sy, w * scale, 2);
      if (ty === PLAT_CLOCK) {
        ctx.save();
        ctx.strokeStyle = COL.phase;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x * scale + 0.5, sy + 0.5, w * scale - 1, PLATFORM_HEIGHT * scale - 1);
        ctx.setLineDash([]);
        ctx.restore();
      }
      /* mover direction chevrons */
      if (ty === PLAT_MOVE_H || ty === PLAT_MOVE_V || ty === PLAT_ORBIT) {
        ctx.fillStyle = ty === PLAT_ORBIT ? COL.orbit : COL.mover;
        const cx = (x + w / 2) * scale, cy = sy + 9 * scale;
        ctx.beginPath();
        if (ty === PLAT_MOVE_H) {
          ctx.moveTo(cx - 6, cy - 3);
          ctx.lineTo(cx - 2, cy);
          ctx.lineTo(cx - 6, cy + 3);
          ctx.moveTo(cx + 6, cy - 3);
          ctx.lineTo(cx + 2, cy);
          ctx.lineTo(cx + 6, cy + 3);
        } else {
          ctx.moveTo(cx - 3, cy + 2);
          ctx.lineTo(cx, cy - 2);
          ctx.lineTo(cx + 3, cy + 2);
          ctx.moveTo(cx - 3, cy + 6);
          ctx.lineTo(cx, cy + 2);
          ctx.lineTo(cx + 3, cy + 6);
        }
        ctx.closePath();
        ctx.fill();
      }
      /* dir-spring arrow */
      if (ty === PLAT_DIR) {
        const vx = amp || 0, vy = per || DIR_DEFAULT_VY;
        const m = Math.hypot(vx, vy) || 1, ux = vx / m, uy = -vy / m;
        const cx = (x + w / 2) * scale, cy = sy + 8 * scale;
        ctx.strokeStyle = COL.dir;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - ux * 6, cy - uy * 6);
        ctx.lineTo(cx + ux * 6, cy + uy * 6);
        ctx.lineTo(cx + ux * 2 - uy * 3, cy + uy * 2 + ux * 3);
        ctx.moveTo(cx + ux * 6, cy + uy * 6);
        ctx.lineTo(cx + ux * 2 + uy * 3, cy + uy * 2 - ux * 3);
        ctx.stroke();
      }
      /* warp door: portal arcs + dashed fold-link to the target rest */
      if (ty === PLAT_WARP) {
        const cx = (x + w / 2) * scale, cy = sy + 8 * scale;
        ctx.strokeStyle = COL.warp;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 5 * scale, 0.6, 2.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 5 * scale, 3.74, 5.94);
        ctx.stroke();
        const tgt = ed.plats[amp || 0];
        if (tgt) {
          ctx.save();
          ctx.strokeStyle = COL.warp;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 6]);
          ctx.beginPath();
          ctx.moveTo(cx, sy);
          ctx.lineTo((tgt[0] + tgt[2] / 2) * scale, SY(tgt[1]));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
      /* selection highlight + resize handle */
      if (sel && sel.kind === "p" && sel.idx === i) {
        ctx.strokeStyle = COL.blue;
        ctx.lineWidth = 2;
        ctx.strokeRect(x * scale - 1, sy - 1, w * scale + 2, PLATFORM_HEIGHT * scale + 2);
        ctx.fillStyle = COL.blue;
        ctx.fillRect(x * scale + w * scale - 3, sy, 6, PLATFORM_HEIGHT * scale);
      }
    });
    if (sel && sel.kind === "c") {
      const [x, top, w] = ed.ceil[sel.idx];
      const sy = SY(top);
      ctx.strokeStyle = COL.blue;
      ctx.lineWidth = 2;
      ctx.strokeRect(x * scale - 1, sy - 1, w * scale + 2, PLATFORM_HEIGHT * scale + 2);
    }

    /* goal flag */
    {
      const fx = (ed.goal[0] + ed.goal[1] / 2) * scale, fy = SY(ed.summit);
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy - 30);
      ctx.stroke();
      ctx.fillStyle = COL.green;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 30);
      ctx.lineTo(fx + 18, fy - 24);
      ctx.lineTo(fx, fy - 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COL.green;
      ctx.fillRect(ed.goal[0] * scale, fy, ed.goal[1] * scale, 2);
    }
    ctx.fillStyle = COL.dim;
    ctx.font = "10px ui-monospace,monospace";
    ctx.textAlign = "center";
    for (const [nx, ny, txt] of ed.notes) {
      const sy = SY(ny);
      if (sy > -10 && sy < cv.height + 10) ctx.fillText(txt, nx * scale, sy);
    }
    ctx.textAlign = "left";
    ctx.font = "700 12px ui-monospace,monospace";
    for (const [wy, name] of ed.sections) {
      const sy = SY(wy);
      if (sy > -10 && sy < cv.height + 10) ctx.fillText(name, 8, sy);
    }
  }

  /* ---------- validation with the real integrator (phase-aware for movers) ---------- */
  function rectAtEd(p, t) {
    if (p[3] === PLAT_MOVE_H || p[3] === PLAT_MOVE_V || p[3] === PLAT_ORBIT) {
      const plat = PLATS[ed.plats.indexOf(p)];
      const pos = moverXY(plat, t);
      return [pos.x, pos.y + PLATFORM_HEIGHT, p[2]];
    }
    return p;
  }
  /* warpDest: search a launch onto pad `ti` whose fold opens on rest `warpDest`
     (the mark rings the destination, so acceptance + range use that rect) */
  function findLaunchEd(fi, ti, warpDest) {
    const fp = fi < 0 ? [0, 0, VIEW_W, 0] : ed.plats[fi];
    const tp = ti < 0 ? [ed.goal[0], ed.summit, ed.goal[1], 0, true] : ed.plats[ti];
    const accept = warpDest == null ? ti : warpDest;
    const rp = warpDest == null ? tp : ed.plats[warpDest];
    const fm = fp[3] === PLAT_MOVE_H || fp[3] === PLAT_MOVE_V || fp[3] === PLAT_CLOCK || fp[3] === PLAT_ORBIT;
    const tm = tp[3] === PLAT_MOVE_H || tp[3] === PLAT_MOVE_V || tp[3] === PLAT_CLOCK || tp[3] === PLAT_ORBIT;
    const per = fm ? (fp[5] || MOVER_DEFAULT_PERIOD) : tm ? (tp[5] || MOVER_DEFAULT_PERIOD) : 0;
    const phases = per ? [0, per * 0.25, per * 0.5, per * 0.75, per * 0.125, per * 0.375, per * 0.625, per * 0.875] : [0];
    const spring = ed.plats.some(p => (p[3] === PLAT_BOUNCE || (p[3] === PLAT_DIR && p[5] > 0)) && p[1] > fp[1] && p[1] < tp[1]);
    const zone = (ed.zones || []).some(z => z[1] < tp[1] + 40 && z[1] + z[3] > fp[1] - 40 && z[0] + z[2] > Math.min(fp[0], tp[0]) && z[0] < Math.max(fp[0] + fp[2], tp[0] + tp[2]));
    for (const ph of phases) {
      worldT = ph;
      const fr = rectAtEd(fp, ph), tr = rectAtEd(tp, ph), rr = rectAtEd(rp, ph);
      const dyLo = ((tp[3] === PLAT_MOVE_V || tp[3] === PLAT_ORBIT) ? tp[1] - (tp[4] || MOVER_DEFAULT_AMP) : tr[1])
        - ((fp[3] === PLAT_MOVE_V || fp[3] === PLAT_ORBIT) ? fp[1] + (fp[4] || MOVER_DEFAULT_AMP) : fr[1]);
      const vyNeed = (spring || zone) ? 0 : Math.sqrt(2 * GRAVITY * Math.max(0, dyLo));
      const xs = [fr[0] + fr[2] / 2 - CHAR_SIZE / 2, fr[0] + 1, fr[0] + fr[2] - CHAR_SIZE - 1];
      for (const bx of xs) {
        body.x = bx;
        body.y = fr[1];
        const tc = tr[0] + tr[2] / 2, bc = bx + CHAR_SIZE / 2;
        const lo = tc >= bc ? SOLVER_ANGLE_MIN : SOLVER_ANGLE_UP;
        const hi = tc >= bc ? SOLVER_ANGLE_UP : SOLVER_ANGLE_MAX;
        for (let a = lo; a <= hi; a += SOLVER_ANGLE_STEP) {
          const rad = a * Math.PI / 180, sin = Math.sin(rad);
          if (sin * SOLVER_MAX_POWER * MAX_LAUNCH_SPEED < vyNeed) continue;
          const pw0 = Math.max(SOLVER_MIN_POWER, Math.ceil(vyNeed / (sin * MAX_LAUNCH_SPEED) / SOLVER_POWER_STEP) * SOLVER_POWER_STEP);
          for (let pw = pw0; pw <= SOLVER_MAX_POWER + 0.001; pw += SOLVER_POWER_STEP) {
            const vx = Math.cos(rad) * pw * MAX_LAUNCH_SPEED, vy = sin * pw * MAX_LAUNCH_SPEED;
            const pr = preview({ x: vx, y: vy });
            if (pr.mark && pr.mark.ok && (ti < 0 ? pr.mark.goal : pr.mark.idx === accept) && pr.mark.x > rr[0] - CHAR_SIZE / 2 && pr.mark.x < rr[0] + rr[2] + CHAR_SIZE / 2) {
              if (per) {
                let tol = true;
                for (const d of [-SOLVER_PHASE_TOL, SOLVER_PHASE_TOL]) {
                  worldT = ph + d;
                  const tr2 = rectAtEd(rp, ph + d);
                  const p2 = preview({ x: vx, y: vy });
                  if (!(p2.mark && p2.mark.ok && (ti < 0 ? p2.mark.goal : p2.mark.idx === accept) && p2.mark.x > tr2[0] - CHAR_SIZE / 2 && p2.mark.x < tr2[0] + tr2[2] + CHAR_SIZE / 2)) tol = false;
                }
                worldT = ph;
                if (!tol) continue;
              }
              return { vx, vy };
            }
          }
        }
      }
    }
    return null;
  }
  function dyMin(a, b) {
    let at = a[1], bt = b[1];
    if (a[3] === PLAT_MOVE_V || a[3] === PLAT_ORBIT) at += (a[4] || MOVER_DEFAULT_AMP);
    if (b[3] === PLAT_MOVE_V || b[3] === PLAT_ORBIT) bt -= (b[4] || MOVER_DEFAULT_AMP);
    return bt - at;
  }
  function validate() {
    rebuild();
    const out = [];
    let bad = 0;
    const restIdx = [];
    /* warp pads are doors, not rests: you never stand on one */
    ed.plats.forEach((p, i) => { if (p[3] !== PLAT_BOUNCE && p[3] !== PLAT_DIR && p[3] !== PLAT_WARP) restIdx.push(i); });
    const n = restIdx.length + 1;
    const uns = [];
    for (let i = 0; i < n; i++) {
      const fi = i === 0 ? -1 : restIdx[i - 1];
      const ti = i < restIdx.length ? restIdx[i] : -1;
      const a = fi < 0 ? [0, 0, VIEW_W, 0] : ed.plats[fi];
      const b = ti < 0 ? [ed.goal[0], ed.summit, ed.goal[1], 0] : ed.plats[ti];
      /* a rest whose incoming edge is a fold: the rise is done by the door,
         so the invariant applies to the launch onto the pad (often a jump DOWN) */
      const via = ed.plats.findIndex(p => p[3] === PLAT_WARP && p[4] === ti);
      const dy = via >= 0 ? Math.min(dyMin(a, b), dyMin(a, ed.plats[via])) : dyMin(a, b);
      const springBetween = ed.plats.some(p => (p[3] === PLAT_BOUNCE || (p[3] === PLAT_DIR && p[5] > 0)) && p[1] > a[1] && p[1] < b[1]);
      const zoneBetween = (ed.zones || []).some(z => z[1] < b[1] + 40 && z[1] + z[3] > a[1] - 40 && z[5] > 0);
      if (dy > DESIGN_MAX_DY && !springBetween && !zoneBetween) {
        out.push("jump" + (i + 1) + ": dy " + dy + " > " + DESIGN_MAX_DY + " (no spring/updraft between)");
        bad++;
      }
      if (!findLaunchEd(fi, ti) && !(via >= 0 && findLaunchEd(fi, via, ti))) uns.push(i + 1);
    }
    if (uns.length) {
      out.push("UNSOLVED ≤" + Math.round(SOLVER_MAX_POWER * 100) + "%: jump " + uns.join(", "));
      bad += uns.length;
    }
    ed.plats.forEach(([x, top, w, ty, amp, per], i) => {
      if (w < DESIGN_MIN_PLAT_W) {
        out.push("plat" + (i + 1) + ": width " + w + " < " + DESIGN_MIN_PLAT_W);
        bad++;
      }
      if (ty === PLAT_MOVE_H || ty === PLAT_MOVE_V) {
        const a = amp || MOVER_DEFAULT_AMP, p = per || MOVER_DEFAULT_PERIOD;
        if (p > DESIGN_MAX_PERIOD) { out.push("plat" + (i + 1) + ": period " + p + "s > " + DESIGN_MAX_PERIOD + "s fuse window"); bad++; }
        if (ty === PLAT_MOVE_H && (x - a < 0 || x + a + w > VIEW_W)) { out.push("plat" + (i + 1) + ": horizontal sweep leaves the walls"); bad++; }
        if (ty === PLAT_MOVE_V && top - a < 0) { out.push("plat" + (i + 1) + ": vertical sweep below the floor"); bad++; }
      }
      if (ty === PLAT_CLOCK) {
        const duty = amp || CLOCK_DEFAULT_DUTY, p = per || MOVER_DEFAULT_PERIOD;
        if (p > DESIGN_MAX_PERIOD) { out.push("plat" + (i + 1) + ": period " + p + "s > " + DESIGN_MAX_PERIOD + "s fuse window"); bad++; }
        if (duty * p < DESIGN_MIN_ON_WINDOW) { out.push("plat" + (i + 1) + ": on-window " + (duty * p).toFixed(2) + "s < " + DESIGN_MIN_ON_WINDOW + "s (unfair timing)"); bad++; }
        if (duty <= 0 || duty >= 1) { out.push("plat" + (i + 1) + ": duty must be in (0,1)"); bad++; }
      }
      if (ty === PLAT_ORBIT) {
        const a = amp || MOVER_DEFAULT_AMP, p = per || MOVER_DEFAULT_PERIOD;
        const sp = 2 * Math.PI * a / p;
        if (p > DESIGN_MAX_PERIOD) { out.push("plat" + (i + 1) + ": period " + p + "s > " + DESIGN_MAX_PERIOD + "s fuse window"); bad++; }
        if (sp > DESIGN_MAX_ORBIT_SPEED) { out.push("plat" + (i + 1) + ": orbit speed " + Math.round(sp) + " px/s > " + DESIGN_MAX_ORBIT_SPEED + " (unfair)"); bad++; }
        if (x - a < 0 || x + a + w > VIEW_W) { out.push("plat" + (i + 1) + ": orbit leaves the walls"); bad++; }
        if (top - a < 0) { out.push("plat" + (i + 1) + ": orbit below the floor"); bad++; }
      }
      if (ty === PLAT_DIR) {
        const vx = amp || 0, vy = per || DIR_DEFAULT_VY;
        if (Math.hypot(vx, vy) > MAX_LAUNCH_SPEED) { out.push("plat" + (i + 1) + ": launch vector > MAX_LAUNCH_SPEED"); bad++; }
        if (vy <= 0) { out.push("plat" + (i + 1) + ": dir spring vy must be > 0"); bad++; }
      }
      if (ty === PLAT_WARP) {
        if (!Number.isInteger(amp) || amp < 0 || amp >= ed.plats.length || amp === i) {
          out.push("plat" + (i + 1) + ": warp target index invalid");
          bad++;
        } else if (ed.plats[amp][3] === PLAT_WARP || ed.plats[amp][3] === PLAT_BOUNCE || ed.plats[amp][3] === PLAT_DIR) {
          out.push("plat" + (i + 1) + ": warp target must be a stable rest (non-warp, non-bounce, non-dir)");
          bad++;
        }
      }
    });
    (ed.zones || []).forEach((z, i) => {
      if (Math.abs(z[4]) > ZONE_MAX_ACCEL || Math.abs(z[5]) > ZONE_MAX_ACCEL) { out.push("zone" + (i + 1) + ": accel > " + ZONE_MAX_ACCEL + " px/s^2"); bad++; }
      if (z[0] < 0 || z[0] + z[2] > VIEW_W) { out.push("zone" + (i + 1) + ": leaves the walls"); bad++; }
    });
    /* bounce chains must not reverse direction */
    for (let i = 0; i < ed.plats.length; i++) {
      if (ed.plats[i][3] !== PLAT_BOUNCE) continue;
      const prev = ed.plats.filter(r => r[3] !== PLAT_BOUNCE && r[1] < ed.plats[i][1]).pop();
      const next = ed.plats.find(r => r[3] !== PLAT_BOUNCE && r[1] > ed.plats[i][1]);
      if (prev && next) {
        const d1 = Math.sign(ed.plats[i][0] - prev[0]), d2 = Math.sign(next[0] - ed.plats[i][0]);
        if (d1 !== 0 && d2 !== 0 && d1 !== d2) { out.push("bounce plat" + (i + 1) + ": chain reverses direction"); bad++; }
      }
    }
    const el = $("issues");
    el.innerHTML = (bad === 0
      ? '<span class="good">VALID · all ' + n + ' jumps solvable ≤' + Math.round(SOLVER_MAX_POWER * 100) + '%, invariants ok.</span>'
      : '<span class="bad">' + bad + ' issue(s):</span>\n') + out.map(s => '<span class="bad">· ' + s + "</span>").join("\n");
    draw();
  }

  /* ---------- ui ---------- */
  function syncFields() {
    $("fName").value = ed.name;
    $("fTag").value = ed.tag;
    $("fSummit").value = ed.summit;
    $("fGoalX").value = ed.goal[0];
    $("fGoalW").value = ed.goal[1];
    $("fSec").value = JSON.stringify(ed.sections);
    $("fNotes").value = JSON.stringify(ed.notes);
    if (sel && sel.kind === "p") {
      const p = ed.plats[sel.idx];
      $("pX").value = p[0];
      $("pT").value = p[1];
      $("pW").value = p[2];
      $("pTy").value = p[3];
      const mv = p[3] === PLAT_MOVE_H || p[3] === PLAT_MOVE_V || p[3] === PLAT_CLOCK || p[3] === PLAT_ORBIT || p[3] === PLAT_DIR;
      $("moverRow").hidden = !mv;
      $("pAmpLab").textContent = p[3] === PLAT_CLOCK ? "duty (0-1)" : p[3] === PLAT_DIR ? "launch vx · vy" : "amp px · period s · phase";
      if (mv) {
        $("pAmp").value = p[3] === PLAT_CLOCK ? (p[4] || CLOCK_DEFAULT_DUTY) : p[3] === PLAT_DIR ? (p[4] || 0) : (p[4] || MOVER_DEFAULT_AMP);
        $("pPer").value = p[3] === PLAT_DIR ? (p[5] || DIR_DEFAULT_VY) : (p[5] || MOVER_DEFAULT_PERIOD);
        $("pPh").value = p[6] || 0;
      }
      const wp = p[3] === PLAT_WARP;
      $("warpRow").hidden = !wp;
      $("pTargetLab").hidden = !wp;
      if (wp) $("pTarget").value = p[4] || 0;
    }
    $("fZones").value = JSON.stringify(ed.zones || []);
  }
  function loadEd(d) {
    ed = clone(d);
    sel = null;
    camY = -100;
    $("lvl").value = ed.id;
    rebuild();
    syncFields();
    draw();
    $("issues").innerHTML = "";
  }
  function fillSelect() {
    const s = $("lvl");
    s.innerHTML = "";
    for (const L of LEVELS) {
      const o = document.createElement("option");
      o.value = L.id;
      o.textContent = L.id + " · " + L.name;
      s.appendChild(o);
    }
  }
  $("lvl").onchange = e => {
    const L = LEVELS.find(x => x.id === +e.target.value);
    if (L) loadEd(L);
  };
  $("bNew").onclick = () => {
    const id = LEVELS.length + 1;
    loadEd({
      id, name: "TOWER " + id, tag: "NEW", summit: 2000, goal: [180, 120],
      plats: [[60, 120, 150, 0], [280, 260, 120, 0]],
      ceil: [], zones: [], sections: [[60, "I · START"]], notes: []
    });
  };
  $("fName").oninput = e => { ed.name = e.target.value; };
  $("fTag").oninput = e => { ed.tag = e.target.value; };
  $("fSummit").oninput = e => { ed.summit = Math.max(ED_MIN_SUMMIT, +e.target.value || ED_MIN_SUMMIT); rebuild(); draw(); };
  $("fGoalX").oninput = e => { ed.goal[0] = +e.target.value || 0; rebuild(); draw(); };
  $("fGoalW").oninput = e => { ed.goal[1] = Math.max(DESIGN_MIN_PLAT_W, +e.target.value || DESIGN_MIN_PLAT_W); rebuild(); draw(); };
  $("fSec").onchange = e => { try { ed.sections = JSON.parse(e.target.value); draw(); } catch (_) {} };
  $("fNotes").onchange = e => { try { ed.notes = JSON.parse(e.target.value); draw(); } catch (_) {} };
  $("fZones").onchange = e => { try { ed.zones = JSON.parse(e.target.value); rebuild(); draw(); } catch (_) {} };
  function selPlat() { return sel && sel.kind === "p" ? ed.plats[sel.idx] : null; }
  $("pX").oninput = e => { const p = selPlat(); if (p) { p[0] = +e.target.value || 0; rebuild(); draw(); } };
  $("pT").oninput = e => { const p = selPlat(); if (p) { p[1] = +e.target.value || 0; rebuild(); draw(); } };
  $("pW").oninput = e => { const p = selPlat(); if (p) { p[2] = Math.max(DESIGN_MIN_PLAT_W, +e.target.value || DESIGN_MIN_PLAT_W); rebuild(); draw(); } };
  $("pTy").onchange = e => {
    const p = selPlat();
    if (p) {
      p[3] = +e.target.value;
      if (p[3] === PLAT_MOVE_H || p[3] === PLAT_MOVE_V || p[3] === PLAT_ORBIT) {
        p[4] = p[4] || MOVER_DEFAULT_AMP;
        p[5] = p[5] || MOVER_DEFAULT_PERIOD;
        p[6] = p[6] || 0;
      } else if (p[3] === PLAT_CLOCK) {
        p[4] = (p[4] > 0 && p[4] < 1) ? p[4] : CLOCK_DEFAULT_DUTY;
        p[5] = p[5] || MOVER_DEFAULT_PERIOD;
        p[6] = p[6] || 0;
      } else if (p[3] === PLAT_DIR) {
        p[4] = p[4] || 0;
        p[5] = p[5] || DIR_DEFAULT_VY;
        p.length = 6;
      } else if (p[3] === PLAT_WARP) {
        p[4] = (Number.isInteger(p[4]) && p[4] >= 0 && p[4] < ed.plats.length && p[4] !== sel.idx) ? p[4] : 0;
        p.length = 5;
      } else p.length = 4;
      rebuild();
      syncFields();
      draw();
    }
  };
  $("pAmp").oninput = e => {
    const p = selPlat();
    if (p) {
      p[4] = p[3] === PLAT_CLOCK ? Math.min(ED_DUTY_MAX, Math.max(ED_DUTY_MIN, +e.target.value || CLOCK_DEFAULT_DUTY))
        : p[3] === PLAT_DIR ? Math.min(MAX_LAUNCH_SPEED, Math.max(-MAX_LAUNCH_SPEED, +e.target.value || 0))
        : Math.max(ED_AMP_MIN, +e.target.value || ED_AMP_MIN);
      rebuild();
      draw();
    }
  };
  $("pPer").oninput = e => {
    const p = selPlat();
    if (p) {
      p[5] = p[3] === PLAT_DIR ? Math.min(MAX_LAUNCH_SPEED, Math.max(ED_DIR_VY_MIN, +e.target.value || DIR_DEFAULT_VY))
        : Math.max(ED_PERIOD_MIN, +e.target.value || ED_PERIOD_MIN);
      rebuild();
      draw();
    }
  };
  $("pPh").oninput = e => { const p = selPlat(); if (p) { p[6] = Math.min(1, Math.max(0, +e.target.value || 0)); rebuild(); draw(); } };
  $("pTarget").oninput = e => {
    const p = selPlat();
    if (p) {
      p[4] = Math.min(ed.plats.length - 1, Math.max(0, Math.round(+e.target.value || 0)));
      rebuild();
      draw();
    }
  };
  $("bAddP").onclick = () => {
    ed.plats.push([120, Math.round(camY + cv.height / scale / 2), ED_NEW_PLAT_W, 0]);
    sel = { kind: "p", idx: ed.plats.length - 1 };
    rebuild();
    syncFields();
    draw();
  };
  $("bAddC").onclick = () => {
    ed.ceil.push([0, Math.round(camY + cv.height / scale / 2), ED_NEW_CEIL_W]);
    sel = { kind: "c", idx: ed.ceil.length - 1 };
    rebuild();
    draw();
  };
  $("bDel").onclick = del;
  function del() {
    if (!sel) return;
    if (sel.kind === "p") ed.plats.splice(sel.idx, 1);
    else ed.ceil.splice(sel.idx, 1);
    sel = null;
    rebuild();
    syncFields();
    draw();
  }
  $("bValidate").onclick = validate;
  $("bExport").onclick = () => {
    const text = "/* COMMIT level descriptor · " + ed.name + " · format: COMMIT_LEVEL(<json>) — see COMMIT_LEVELS.md §1. */\nCOMMIT_LEVEL(" + JSON.stringify(ed) + ");\n";
    const b = new Blob([text], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "tower-" + ed.id + ".js";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };
  $("bImport").onclick = () => $("file").click();
  $("file").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    const t = await f.text();
    const s = t.indexOf("COMMIT_LEVEL(");
    try {
      const json = t.slice(s >= 0 ? s + 13 : 0, t.lastIndexOf(")"));
      loadEd(JSON.parse(json));
    } catch (err) {
      $("issues").innerHTML = '<span class="bad">import failed: ' + err + "</span>";
    }
    e.target.value = "";
  };

  /* ---------- pointer ---------- */
  function hit(wx, wy) {
    for (let i = ed.plats.length - 1; i >= 0; i--) {
      const [x, top, w] = ed.plats[i];
      if (wx >= x && wx <= x + w && wy >= top - PLATFORM_HEIGHT && wy <= top) return { kind: "p", idx: i };
    }
    for (let i = ed.ceil.length - 1; i >= 0; i--) {
      const [x, top, w] = ed.ceil[i];
      if (wx >= x && wx <= x + w && wy >= top - PLATFORM_HEIGHT && wy <= top) return { kind: "c", idx: i };
    }
    return null;
  }
  cv.addEventListener("pointerdown", e => {
    cv.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const wx = WX(sx), wy = WY(sy);
    const h = hit(wx, wy);
    if (h) {
      sel = h;
      const rect = h.kind === "p" ? ed.plats[h.idx] : ed.ceil[h.idx];
      const nearRight = h.kind === "p" && wx > rect[0] + rect[2] - ED_HANDLE_PX / scale;
      drag = { mode: nearRight ? "resize" : "move", offx: wx - rect[0], offy: wy - rect[1] };
    } else {
      sel = null;
      drag = { mode: "pan", sy, cam: camY };
    }
    syncFields();
    draw();
  });
  cv.addEventListener("pointermove", e => {
    if (!drag) return;
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    const wx = WX(sx), wy = WY(sy);
    if (drag.mode === "pan") {
      camY = drag.cam + (sy - drag.sy) / scale;
      draw();
      return;
    }
    if (!sel) return;
    if (sel.kind === "p") {
      const p = ed.plats[sel.idx];
      if (drag.mode === "resize") p[2] = Math.max(DESIGN_MIN_PLAT_W, Math.round(wx - p[0]));
      else {
        p[0] = Math.min(Math.max(0, Math.round(wx - drag.offx)), VIEW_W - p[2]);
        p[1] = Math.round(wy - drag.offy);
      }
    } else {
      const c = ed.ceil[sel.idx];
      c[0] = Math.min(Math.max(0, Math.round(wx - drag.offx)), VIEW_W - c[2]);
      c[1] = Math.round(wy - drag.offy);
    }
    rebuild();
    syncFields();
    draw();
  });
  cv.addEventListener("pointerup", () => { drag = null; });
  cv.addEventListener("dblclick", e => {
    const r = cv.getBoundingClientRect(), wx = WX(e.clientX - r.left), wy = WY(e.clientY - r.top);
    if (hit(wx, wy)) return;
    ed.plats.push([Math.round(wx - ED_NEW_PLAT_W / 2), Math.round(wy), ED_NEW_PLAT_W, 0]);
    sel = { kind: "p", idx: ed.plats.length - 1 };
    rebuild();
    syncFields();
    draw();
  });
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    camY += e.deltaY / scale;
    draw();
  }, { passive: false });
  addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.key === "Delete" || e.key === "Backspace") { del(); return; }
    if (sel && sel.kind === "p" && ["0", "1", "2", "3", "4", "5"].includes(e.key)) {
      const p = ed.plats[sel.idx];
      p[3] = +e.key;
      if (p[3] === PLAT_MOVE_H || p[3] === PLAT_MOVE_V) {
        p[4] = p[4] || MOVER_DEFAULT_AMP;
        p[5] = p[5] || MOVER_DEFAULT_PERIOD;
        p[6] = p[6] || 0;
      } else p.length = 4;
      rebuild();
      syncFields();
      draw();
    }
  });

  /* ---------- boot ---------- */
  fillSelect();
  loadEd(LEVELS[0]);
  resize();
  const vm = location.hash.match(/^#validate(\d*)$/);
  if (vm) {
    if (vm[1]) loadEd(LEVELS[+vm[1] - 1]);
    validate();
  }
})();
