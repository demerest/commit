/* COMMIT — DOM overlays, HUD, toast, tower picker. */
"use strict";

let overlayOpen = null, toastT = null, ovPrev = null;
const hudCache = {};

/* Open an overlay. Pause and the main menu preserve a drawn aim; anything else drops it.
   ovPrev remembers the caller so BACK returns to the right screen. */
function openOv(id) {
  if (state === "aim" && id !== "pause" && id !== "menu") {
    aim = null;
    state = "ready";
    stopHum();
    stopSlide();
  }
  if (overlayOpen) $(overlayOpen).hidden = true;
  ovPrev = overlayOpen;
  overlayOpen = id;
  $(id).hidden = false;
  if (id === "help") {
    $("bStart").textContent = life.seen ? "BACK TO THE WALL" : "BEGIN THE CLIMB";
    $("helpSummit").textContent = (SUMMIT / PX_PER_METER) + "m";
    $("lifeStats").innerHTML = "LIFETIME · summits <b>" + totalSummits() + "</b> · launches <b>" + life.launches + "</b> · falls <b>" + life.falls + "</b>";
    buildTowers();
  }
  if (id === "menu") refreshMenu();
  if (id === "select") buildSelect();
  if (id === "pause") {
    $("pauseInfo").textContent = LVL.name + " · " + (Math.max(0, body.y) / PX_PER_METER).toFixed(1) + "m · " + fmt(run.time);
  }
}
function closeOv() {
  if (!overlayOpen) return;
  if (overlayOpen === "help") {
    life.seen = true;
    save();
  }
  $(overlayOpen).hidden = true;
  overlayOpen = null;
  ovPrev = null;
}

function runInProgress() { return run.started && state !== "win"; }

function refreshMenu() {
  $("bContinue").textContent = runInProgress()
    ? "CONTINUE · " + LVL.name + " · " + (Math.max(0, body.y) / PX_PER_METER).toFixed(0) + "m"
    : "START GAME";
  $("menuSub").textContent = runInProgress() ? "Pick up where you left off." : "A tower. A square. No air control.";
  $("menuStats").innerHTML = "LIFETIME · summits <b>" + totalSummits() + "</b> · launches <b>" + life.launches + "</b> · falls <b>" + life.falls + "</b>";
}

/* level select lists ONLY unlocked towers */
function buildSelect() {
  const box = $("selectList");
  box.innerHTML = "";
  for (const L of LEVELS) {
    if (L.id > life.unlocked) continue;
    const b = document.createElement("button");
    b.className = "cta block" + (L.id === level ? "" : " ghost");
    const best = (life.best[L.id] || 0) / PX_PER_METER;
    b.textContent = L.name + " · " + (L.summit / PX_PER_METER) + "m" + (best > 0 ? " · best " + best.toFixed(0) + "m" : "");
    b.setAttribute("aria-label", L.name);
    b.onclick = () => {
      sfx("ui");
      closeOv();
      setLevel(L.id);
      toast(LVL.name + " · " + LVL.tag);
    };
    box.appendChild(b);
  }
  $("selectBack").onclick = () => {
    sfx("ui");
    openOv(ovPrev || "menu");
  };
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), TOAST_TIME);
}

function buildTowers() {
  const box = $("towers");
  box.innerHTML = "";
  for (const L of LEVELS) {
    const b = document.createElement("button");
    const locked = L.id > life.unlocked;
    b.className = "cta" + (L.id === level ? "" : " ghost");
    b.disabled = locked;
    b.textContent = L.name + (locked ? " · LOCKED" : L.id === level ? " · HERE" : "");
    b.setAttribute("aria-label", L.name + (locked ? " (locked — clear the previous tower)" : ""));
    b.onclick = () => {
      if (locked) return;
      sfx("ui");
      closeOv();
      setLevel(L.id);
      toast(LVL.name + " · " + LVL.tag);
    };
    box.appendChild(b);
  }
}

function updateTowerTag() {
  $("towerTag").textContent = LVL.name + " · " + (SUMMIT / PX_PER_METER) + "m";
}

/* HUD writes only when a value changes */
function setT(id, v) {
  if (hudCache[id] !== v) {
    hudCache[id] = v;
    $(id).textContent = v;
  }
}
function hud() {
  setT("altV", (Math.max(0, body.y) / PX_PER_METER).toFixed(1) + "m");
  setT("best", ((life.best[level] || 0) / PX_PER_METER).toFixed(1) + "m");
  setT("mLaunch", String(run.launches));
  setT("mFall", String(run.falls));
  setT("mTime", fmt(run.time));
}
