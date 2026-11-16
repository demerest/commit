# COMMIT — Implementation Guide (v2.1)
**Stack: `index.html` + `style.css` + modular classic scripts in `js/`. Vanilla JS + Canvas 2D +
CSS + Web Audio. Zero dependencies, zero network requests, zero image assets, zero audio files
(every sound is synthesized at runtime; master mute ♪ / M).**

## 1. Constraint Compliance

| Constraint | How it is satisfied |
|---|---|
| HTML/JS/CSS only | Plain files, no imports, no ES modules, no build step (classic `<script>` tags share global scope so `file://` works) |
| No generated images | Every visual is a runtime Canvas/CSS primitive; system font stack |
| No generated audio | No audio files or generated assets; every sound is synthesized at runtime (oscillators + filtered noise). Master mute (♪ / M) persisted; context created on first gesture, suspended on tab-hide; silence at summit |
| Runnable anywhere | Open `index.html` directly (`file://`); scripts + stylesheet load locally; `localStorage` wrapped in try/catch |

## 2. Architecture (modular `js/`, load order matters)

| File | Responsibility |
|---|---|
| `js/core.js` | Tuning constants (incl. `ICE_V`, `ICE_RAMP`), palette (`ice` token), math, sky keyframes, `LS` storage helper |
| `js/levels.js` | Level **engine**: `COMMIT_LEVEL()` registrar + `LEVELS` + `buildLevel(n)`; holds no data |
| `levels/tower-N.js` | **Descriptors** (one per tower): a single `COMMIT_LEVEL({…json…})` call; classic scripts so `file://` works with zero fetch |
| `js/audio.js` | Lazy `AudioContext`; synthesized SFX (incl. ice chime/scrape/slip, unlock triad), aim hum, wind bed; master mute |
| `js/fx.js` | Pooled dust/spray/shards/confetti/floats, shake, flash, squash timers |
| `js/sim.js` | `step()` single integrator; preview; aim/launch; land/bounce; crumble + reform; **ice drift** (`updateIce`); run stats |
| `js/render.js` | Canvas sizing + one render pass (sky→parallax→grid→solids incl. ice→trail→preview→body+fuse→FX→rail) |
| `js/ui.js` | DOM overlays, HUD cache, toast, **tower picker**, tower tag |
| `js/main.js` | Persistence v3, **level switching/unlock**, win/reset, input, loop, boot, `__COMMIT__` hook |
| `editor.html` + `js/editor.js` | **Local-only** visual level editor (gitignored, origin-gated). Loads the real `sim.js` so VALIDATE uses the same `step()`/`preview()`; exports/imports descriptors |

Adding a tower = drop `levels/tower-N.js` + one `<script>` tag (or author it in the local editor);
adding a mechanic = a new type flag + a branch in `sim`/`render`. Game modes can wrap the same sim later.

| Concern | Responsibility |
|---|---|
| Physics | `step(body)` — the **single** integrator used by flight AND preview; handles land/bounce/wall/bonk |
| Preview | Clones the body, runs `step()` ≤ 900 times, returns dots + **all** contacts (bounce hops + final) |
| Fuse | Aim countdown; auto-commits the drawn arc on expiry, cancels if sub-threshold |
| Crumble | Per-visit dwell timer; shatters + drops; auto-reforms after `RESPAWN_TIME` (no softlock); transient `run.dead` |
| Ice | On land, `slide = sign(entry vx)`; `updateIce` ramps drift, walks off the edge into an honest fall; launch discards drift |
| Input | Pointer Events (capture, relative drag) + keyboard aim FSM |
| Loop | Single rAF, fixed-timestep accumulator (dt clamp 0.25 s) |

### Determinism & the Commit Contract
`preview()` and the flight loop call the same `step()` with the same `DT`. The preview is
therefore pixel-exact by construction — there is no second physics code path to drift.

### No-tunneling proof
Max displacement per substep: horizontal `950/120 = 7.92 px`, vertical `1600/120 = 13.33 px`.
Both are below the minimum solid thickness (16 px) and character size (18 px), so discrete
axis-separated AABB resolution cannot tunnel. No swept tests needed.

### Coordinates & scaling
World y-up; screen `sy = 800 − (wy − camY)`. Canvas is letterboxed to `min(w/480, h/800)`,
backing store scaled by `min(devicePixelRatio, 2)`; all drawing stays in logical units via
`setTransform`. Pointer coords are inverse-mapped through `getBoundingClientRect`.

### Input state machine
`ready → aim(pointer|keyboard) → flight → ready` · `flight → win` · overlays pause the
simulation and cancel any active aim; `document.hidden` pauses the same way.

### Persistence schema (`commit.v3`)
```json
{ "level": 1,
  "runs": { "1": { "x": 231, "y": 0, "slide": 0, "launches": 0, "falls": 0, "biggest": 0,
                   "time": 0, "started": false, "dead": [] } },
  "life": { "best": {"1":0}, "bestTime": {"1":null}, "summits": {"1":0},
            "launches": 0, "falls": 0, "seen": false, "unlocked": 1 } }
```
Per-tower `runs` (each with its own grounded `x/y`, `dead` reform list and ice `slide` dir);
shared `life` with per-tower `best/bestTime/summits` dicts plus global counters and `unlocked`.
`run.dead` auto-rebuilds after `RESPAWN_TIME` (instantly on reset) — never a softlock. Saved on
every landing, win, reset, crumble, reform, walk-off, tab-hide, and unload. `save()` writes
`safePos` — the last **grounded** position — never an airborne one. `sanitize()` clamps/validates
every field and the unlocked/level bounds. Migrates `commit.v2` (single run → `runs[1]`, scalar
life → dicts, `unlocked=2` if a summit existed) and `commit.v1` lifetime.

### Performance budget
≤ 2 substeps/frame typical; preview ≤ 900 steps × ~42 solids only while aiming; ~130 draw
calls/frame; particle caps (300 dust, 140 shards, 90 confetti). Comfortable on low-end mobile.

## 3. Reference build (historical v1.0)

> **Note (v2.0):** the canonical build is split across `index.html`, `style.css`, and
> `game.js` in this repository. The single-file block below is the **historical v1.0
> reference** (no fuse/crumble/bounce, old tower). It is kept for provenance only — do not
> copy it over the current files. v2 adds the Fuse, Crumble and Bounce modules, the altitude
> sky keyframes, `commit.v2` persistence, and the `window.__COMMIT__` manual-clock test hook.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>COMMIT — no air control. no mercy.</title>
<style>
:root{--bg:#07090f;--panel:#0e1320;--ink:#e9edf4;--dim:#8b93a7;--line:#26304a;
--blue:#5aa7ff;--green:#57e389;--amber:#ffb454;--red:#ff5d5d}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--ink);
font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
-webkit-user-select:none;user-select:none}
#stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
background:radial-gradient(120% 90% at 50% 10%,#0b1020 0%,#07090f 60%)}
#frame{position:relative;box-shadow:0 0 0 1px var(--line),0 30px 80px #000c}
canvas{display:block;touch-action:none;cursor:crosshair;background:#0a0e1a}
#hud{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between}
#top{display:flex;justify-content:space-between;align-items:flex-start;padding:.7em .8em}
#alt{font-size:1.6em;font-weight:700;line-height:1}
#alt small{display:block;font-size:.42em;color:var(--dim);font-weight:400;margin-top:.35em;letter-spacing:.12em}
#meters{text-align:right;font-size:.72em;color:var(--dim);letter-spacing:.08em;line-height:1.7}
#meters b{color:var(--ink)}
#btns{position:absolute;top:4.8em;right:.8em;display:flex;flex-direction:column;gap:.5em}
button{pointer-events:auto;font:inherit;color:var(--ink);background:#0e1320e6;border:1px solid var(--line);
width:2.2em;height:2.2em;border-radius:.45em;cursor:pointer;transition:border-color .15s,transform .1s}
button:hover{border-color:var(--blue)}
button:active{transform:scale(.94)}
button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
#foot{padding:.6em .8em;font-size:.62em;color:var(--dim);letter-spacing:.14em;text-align:center;opacity:.85}
.overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
background:#05070cd9;backdrop-filter:blur(4px);pointer-events:auto;z-index:5}
[hidden]{display:none!important}
.panel{width:min(24em,92%);background:var(--panel);border:1px solid var(--line);border-radius:.7em;
padding:1.5em 1.6em;box-shadow:0 24px 60px #000a}
.panel h1{font-size:1.5em;letter-spacing:.06em;margin-bottom:.5em}
.panel h1 span{color:var(--green)}
.panel p{font-size:.8em;line-height:1.65;color:var(--dim);margin-bottom:.8em}
.panel p b{color:var(--ink)}
.rules{list-style:none;font-size:.78em;line-height:2;margin:.4em 0 1em}
.rules li::before{content:"▸ ";color:var(--blue)}
.keys{font-size:.68em;color:var(--dim);line-height:1.9;border-top:1px solid var(--line);padding-top:.8em;margin-bottom:1.1em}
.keys b{color:var(--ink)}
kbd{border:1px solid var(--line);border-bottom-width:2px;border-radius:.3em;padding:.05em .4em;font:inherit;color:var(--ink);background:#0a0f1c}
.row{display:flex;gap:.6em}
.cta{flex:1;width:auto;height:auto;padding:.7em 1em;font-weight:700;letter-spacing:.1em;font-size:.8em;
background:var(--blue);color:#06101f;border-color:var(--blue)}
.cta:hover{filter:brightness(1.1)}
.cta.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.cta.danger{background:var(--red);border-color:var(--red);color:#20060a}
#winStats{display:grid;grid-template-columns:1fr 1fr;gap:.55em .9em;font-size:.75em;margin:.6em 0 1em}
#winStats div{border:1px solid var(--line);border-radius:.45em;padding:.55em .7em}
#winStats b{display:block;font-size:1.35em;color:var(--green);margin-top:.15em}
#winStats span{color:var(--dim);letter-spacing:.1em;font-size:.85em}
#share{width:100%;font:inherit;font-size:.68em;color:var(--dim);background:#0a0f1c;border:1px solid var(--line);
border-radius:.45em;padding:.6em;resize:none;height:4.6em;margin-bottom:.8em;-webkit-user-select:text;user-select:text}
#toast{position:absolute;left:50%;bottom:4.5em;transform:translateX(-50%);font-size:.68em;letter-spacing:.12em;
color:var(--ink);background:#0e1320e6;border:1px solid var(--line);border-radius:.5em;padding:.5em .9em;
opacity:0;transition:opacity .25s;pointer-events:none;z-index:6;white-space:nowrap}
#toast.show{opacity:1}
@media (prefers-reduced-motion:reduce){button{transition:none}}
</style>
</head>
<body>
<div id="stage"><div id="frame">
<canvas id="cv" aria-label="COMMIT — drag to aim, release to jump"></canvas>
<div id="hud">
 <div id="top">
  <div id="alt"><span id="altV">0.0m</span><small>BEST <span id="best">0.0m</span></small></div>
  <div id="meters">LAUNCH <b id="mLaunch">0</b><br>FALL <b id="mFall">0</b><br>TIME <b id="mTime">0:00.0</b></div>
 </div>
 <div id="btns"><button id="bHelp" aria-label="Help">?</button><button id="bReset" aria-label="Reset run">↺</button></div>
 <div id="foot">DRAG · RELEASE · LIVE WITH IT</div>
</div>
<div id="toast" role="status"></div>
<div id="help" class="overlay" hidden><div class="panel">
 <h1>COMMIT<span>.</span></h1>
 <p>A tower. A square. <b>No air control.</b> Draw an arc, release, and live with exactly what you drew.</p>
 <ul class="rules">
  <li><b>Drag anywhere</b> to aim — the dotted arc is the truth.</li>
  <li><b>Release</b> to commit. There is no cancel in flight.</li>
  <li>Miss, and you fall for real. The floor remembers.</li>
  <li>Reach the summit at <b>508m</b>.</li>
 </ul>
 <div class="keys">⌨ <kbd>←</kbd><kbd>→</kbd> angle · <kbd>↑</kbd><kbd>↓</kbd> power · <kbd>space</kbd> aim, again to commit<br>
 <kbd>shift</kbd> fine aim · <kbd>esc</kbd> cancel · <kbd>R</kbd> reset · <kbd>H</kbd> help</div>
 <div class="keys" id="lifeStats"></div>
 <div class="row"><button id="bStart" class="cta">BEGIN THE CLIMB</button></div>
</div></div>
<div id="confirm" class="overlay" hidden><div class="panel">
 <h1>ERASE RUN<span>?</span></h1>
 <p>Back to 0m. Launches, falls and the clock reset. <b>Lifetime records stay.</b></p>
 <div class="row"><button id="bNo" class="cta ghost">KEEP CLIMBING</button><button id="bYes" class="cta danger">ERASE</button></div>
</div></div>
<div id="win" class="overlay" hidden><div class="panel">
 <h1>COMMITTED<span>.</span></h1>
 <p>508 meters of decisions you couldn't take back.</p>
 <div id="winStats">
  <div><span>TIME</span><b id="wTime">—</b></div><div><span>LAUNCHES</span><b id="wLaunch">—</b></div>
  <div><span>FALLS</span><b id="wFall">—</b></div><div><span>BIGGEST DROP</span><b id="wDrop">—</b></div>
 </div>
 <textarea id="share" readonly aria-label="Share text"></textarea>
 <div class="row"><button id="bCopy" class="cta ghost">COPY RESULT</button><button id="bAgain" class="cta">CLIMB AGAIN</button></div>
</div></div>
</div></div>
<script>
(()=>{ "use strict";
/* ---------- constants ---------- */
const VW=480,VH=800,DT=1/120,G=2200,MAXV=950,MINV=90,KDRAG=3.2,
CH=18,SUMMIT=5080,FALL_MIN=250,VFALL=-1600;
const COL={bg0:"#0a0e1a",bg1:"#07090f",top0:"#141a2e",top1:"#33203a",plat:"#1c2436",
edge:"#43547c",ink:"#e9edf4",dim:"#8b93a7",line:"#26304a",blue:"#5aa7ff",
green:"#57e389",amber:"#ffb454",red:"#ff5d5d"};
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01=v=>Math.max(0,Math.min(1,v)), lerp=(a,b,t)=>a+(b-a)*t;
const $=id=>document.getElementById(id);
/* ---------- level ---------- */
const P=[[60,120,150],[270,240,150],[90,370,140],[280,500,150],
[110,640,120],[300,780,110],[140,930,110],[320,1080,100],[150,1230,100],[30,1380,110],[210,1530,100],[360,1680,100],
[200,1830,84],[60,1980,76],[300,2130,76],[150,2280,70],[340,2350,80],[140,2490,80],[330,2630,70],[180,2780,64],
[330,2900,56],[170,3040,56],[340,3180,50],[150,3310,54],[300,3450,48],[110,3600,48],[280,3750,46],[120,3900,46],
[320,4040,36],[140,4190,34],[330,4340,32],[150,4490,30],[340,4640,30],[160,4790,28],[330,4940,28]];
const CEIL=[[0,2400,250],[0,2900,220],[330,3300,150]];
const SOLIDS=[{x:-60,y:-60,w:VW+120,h:60,ground:true},
{x:-60,y:0,w:60,h:SUMMIT+900,wall:true},{x:VW,y:0,w:60,h:SUMMIT+900,wall:true}];
for(const[x,t,w]of P)SOLIDS.push({x,y:t-16,w,h:16});
for(const[x,t,w]of CEIL)SOLIDS.push({x,y:t-16,w,h:16,ceil:true});
const GOAL={x:180,y:SUMMIT-16,w:120,h:16,goal:true};SOLIDS.push(GOAL);
const SECTIONS=[[60,"I · FIRST STEPS"],[1760,"II · THE NEEDLES"],[2840,"III · OVERHANG"],[3960,"IV · THE THROAT"],[4980,"V · SUMMIT"]];
const NOTES=[[240,60,"DRAG ANYWHERE TO AIM"],[240,180,"RELEASE = COMMIT"],[240,430,"NO AIR CONTROL"],[240,1150,"THE FLOOR REMEMBERS"]];
const STARS=[];{let s=13;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
for(let i=0;i<80;i++)STARS.push({x:rnd()*VW,y:rnd()*(SUMMIT*.4+VH),r:rnd()*1.4+.4,p:rnd()*6.28});}
/* ---------- state ---------- */
const cv=$("cv"),ctx=cv.getContext("2d"),frame=$("frame");
let scale=1,dpr=1;
const body={x:VW/2-CH/2,y:0,vx:0,vy:0,grounded:true};
let state="ready",aim=null;const kb={a:65,p:.6};
let camY=-140,shake=0,flash=0,landT=0,launchT=0,blinkT=0,blinkTimer=3,idleT=0;
let run={launches:0,falls:0,biggest:0,time:0,started:false};
let life={best:0,bestTime:null,summits:0,launches:0,falls:0,seen:false};
let launchY=0;const trail=[],parts=[],floats=[],confetti=[];
let overlayOpen=null,acc=0,lastT=performance.now(),stepN=0,toastT=null;const hudCache={};
const clampCam=t=>Math.max(-140,Math.min(t,SUMMIT+260-VH));
/* ---------- persistence ---------- */
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},
set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function save(){LS.set("commit.v1",{x:body.x,y:body.y,run,life});}
function load(){const d=LS.get("commit.v1");if(!d)return;
if(d.life)life={...life,...d.life};if(d.run)run={...run,...d.run};
run.time=Math.max(0,+run.time||0);run.launches=Math.max(0,+run.launches||0);
run.falls=Math.max(0,+run.falls||0);run.biggest=Math.max(0,+run.biggest||0);
if(Number.isFinite(d.x)&&Number.isFinite(d.y)&&d.y>=0&&d.y<=SUMMIT){
body.x=Math.min(Math.max(d.x,0),VW-CH);body.y=d.y;}
camY=clampCam(body.y-VH*.38);}
/* ---------- physics (shared by flight and preview) ---------- */
function hit(b,s){return b.x<s.x+s.w&&b.x+CH>s.x&&b.y<s.y+s.h&&b.y+CH>s.y}
function step(b){b.vy-=G*DT;if(b.vy<VFALL)b.vy=VFALL;let ev=null;
b.x+=b.vx*DT;
for(const s of SOLIDS){if(hit(b,s)){
if(b.vx>0)b.x=s.x-CH;else if(b.vx<0)b.x=s.x+s.w;
if(b.vx!==0){b.vx=0;ev={t:"wall",x:b.x+CH/2,y:b.y+CH/2};}}}
b.y+=b.vy*DT;b.grounded=false;
for(const s of SOLIDS){if(hit(b,s)){
if(b.vy<=0){b.y=s.y+s.h;b.vy=0;b.grounded=true;ev={t:"land",s};}
else{b.y=s.y-CH;b.vy=0;ev={t:"bonk",x:b.x+CH/2,y:b.y+CH};}}}
return ev;}
function preview(v){const b={x:body.x,y:body.y,vx:v.x,vy:v.y,grounded:false};
const pts=[];let mark=null;
for(let i=0;i<480;i++){const ev=step(b);
if(i%3===0)pts.push({x:b.x+CH/2,y:b.y+CH/2});
if(ev){mark={x:b.x+CH/2,y:b.y+(ev.t==="land"?0:CH/2),ok:ev.t==="land",goal:!!(ev.s&&ev.s.goal)};break;}
if(b.y<-80)break;}
return{pts,mark};}
/* ---------- aiming ---------- */
function aimV(){if(!aim)return null;let vx,vy;
if(aim.mode==="p"){vx=(aim.cx-aim.ox)*KDRAG;vy=(aim.oy-aim.cy)*KDRAG;}
else{const a=kb.a*Math.PI/180;vx=Math.cos(a)*kb.p*MAXV;vy=Math.sin(a)*kb.p*MAXV;}
const m=Math.hypot(vx,vy);if(m>MAXV){vx*=MAXV/m;vy*=MAXV/m;}
return{x:vx,y:vy,m:Math.min(m,MAXV)};}
function launch(v){body.vx=v.x;body.vy=v.y;body.grounded=false;
state="flight";aim=null;launchY=body.y;trail.length=0;launchT=.18;
run.launches++;life.launches++;run.started=true;idleT=0;
spawnDust(body.x+CH/2,body.y,6,COL.dim);}
function simStep(){if(state!=="flight")return;
const pv=body.vy,ev=step(body);stepN++;
if(stepN%2===0){trail.push({x:body.x+CH/2,y:body.y+CH/2});if(trail.length>22)trail.shift();}
if(!ev)return;
if(ev.t==="land"){const impact=Math.abs(pv);
body.vx=0;body.vy=0;state="ready";landT=.18;
spawnDust(body.x+CH/2,body.y,Math.min(16,4+impact/120),COL.dim);
if(impact>650&&!RM)shake=Math.min(11,(impact-650)/80);
const drop=launchY-body.y;
if(drop>FALL_MIN){run.falls++;life.falls++;run.biggest=Math.max(run.biggest,drop);
flash=Math.min(.45,drop/1600);
floats.push({x:body.x+CH/2,y:body.y+30,txt:"−"+(drop/10).toFixed(0)+"m",c:COL.red,t:0});}
life.best=Math.max(life.best,body.y);save();
if(ev.s.goal)win();}
else{spawnDust(ev.x,ev.y,4,ev.t==="bonk"?COL.amber:COL.dim);if(!RM)shake=Math.max(shake,2.5);}}
/* ---------- fx ---------- */
function spawnDust(x,y,n,c){if(RM)n=Math.ceil(n/2);
for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*220,vy:Math.random()*160+20,t:0,life:.5+Math.random()*.3,c});
if(parts.length>300)parts.splice(0,parts.length-300);}
function updParts(dt){
for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.t+=dt;p.vy-=G*.35*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t>p.life)parts.splice(i,1);}
for(let i=confetti.length-1;i>=0;i--){const c=confetti[i];c.t+=dt;c.vy-=G*.5*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=c.vr*dt;if(c.t>2.4)confetti.splice(i,1);}
for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.t+=dt;f.y+=40*dt;if(f.t>1.4)floats.splice(i,1);}}
/* ---------- win / reset / overlays ---------- */
function fmt(s){const t=Math.floor(s*10),m=Math.floor(t/600),sec=Math.floor(t/10)%60,d=t%10;
return m+":"+(sec<10?"0":"")+sec+"."+d;}
function win(){state="win";life.summits++;
if(life.bestTime==null||run.time<life.bestTime)life.bestTime=run.time;save();
$("wTime").textContent=fmt(run.time);$("wLaunch").textContent=run.launches;
$("wFall").textContent=run.falls;$("wDrop").textContent=(run.biggest/10).toFixed(1)+"m";
$("share").value="COMMIT · 508m in "+fmt(run.time)+" · "+run.launches+" launches · "+run.falls+" falls · biggest drop "+(run.biggest/10).toFixed(1)+"m. No air control. No mercy.";
if(!RM)for(let i=0;i<90;i++)confetti.push({x:body.x+CH/2,y:body.y+20,vx:(Math.random()-.5)*560,vy:Math.random()*620+120,r:Math.random()*6.28,vr:(Math.random()-.5)*9,c:[COL.blue,COL.green,COL.amber,COL.red,COL.ink][i%5],t:0});
openOv("win");}
function resetRun(){body.x=VW/2-CH/2;body.y=0;body.vx=0;body.vy=0;body.grounded=true;
state="ready";aim=null;run={launches:0,falls:0,biggest:0,time:0,started:false};
trail.length=0;floats.length=0;confetti.length=0;flash=0;shake=0;
camY=clampCam(body.y-VH*.38);save();}
function openOv(id){if(state==="aim"){aim=null;state="ready";}
overlayOpen=id;$(id).hidden=false;
if(id==="help"){$("bStart").textContent=life.seen?"BACK TO THE WALL":"BEGIN THE CLIMB";
$("lifeStats").innerHTML="LIFETIME · summits <b>"+life.summits+"</b> · launches <b>"+life.launches+"</b> · falls <b>"+life.falls+"</b>"+(life.bestTime!=null?" · best time <b>"+fmt(life.bestTime)+"</b>":"");}}
function closeOv(){if(!overlayOpen)return;
if(overlayOpen==="help"){life.seen=true;save();}
$(overlayOpen).hidden=true;overlayOpen=null;}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");
clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),1600);}
/* ---------- input ---------- */
function toLogical(e){const r=cv.getBoundingClientRect();
return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale};}
cv.addEventListener("pointerdown",e=>{if(overlayOpen||state!=="ready")return;
e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(_){}
const p=toLogical(e);aim={mode:"p",id:e.pointerId,ox:p.x,oy:p.y,cx:p.x,cy:p.y};state="aim";idleT=0;});
cv.addEventListener("pointermove",e=>{if(!aim||aim.mode!=="p"||e.pointerId!==aim.id)return;
const p=toLogical(e);aim.cx=p.x;aim.cy=p.y;});
function endPointer(e,cancel){if(!aim||aim.mode!=="p"||e.pointerId!==aim.id)return;
if(cancel){aim=null;state="ready";return;}
const v=aimV();
if(!v||v.m<MINV){aim=null;state="ready";spawnDust(body.x+CH/2,body.y+CH/2,3,COL.dim);return;}
launch(v);}
cv.addEventListener("pointerup",e=>endPointer(e,false));
cv.addEventListener("pointercancel",e=>endPointer(e,true));
cv.addEventListener("contextmenu",e=>e.preventDefault());
addEventListener("keydown",e=>{
if(e.key==="Escape"){if(overlayOpen){if(overlayOpen!=="win")closeOv();}
else if(state==="aim"){aim=null;state="ready";}return;}
if(overlayOpen)return;
if(e.key==="h"||e.key==="H"){openOv("help");return;}
if(e.key==="r"||e.key==="R"){openOv("confirm");return;}
if(state==="flight"||state==="win")return;
const fine=e.shiftKey?.25:1;let used=true;
switch(e.key){
case"ArrowLeft":kb.a=Math.min(172,kb.a+2.2*fine);break;
case"ArrowRight":kb.a=Math.max(8,kb.a-2.2*fine);break;
case"ArrowUp":kb.p=Math.min(1,kb.p+.022*fine);break;
case"ArrowDown":kb.p=Math.max(.12,kb.p-.022*fine);break;
case" ":case"Enter":
if(state==="aim"&&aim&&aim.mode==="k"){const v=aimV();
if(v&&v.m>=MINV)launch(v);else{aim=null;state="ready";}}
else{aim={mode:"k"};state="aim";}
e.preventDefault();return;
default:used=false;}
if(used){e.preventDefault();if(state==="ready"){aim={mode:"k"};state="aim";}idleT=0;}});
$("bHelp").onclick=()=>openOv("help");
$("bStart").onclick=closeOv;
$("bReset").onclick=()=>openOv("confirm");
$("bNo").onclick=closeOv;
$("bYes").onclick=()=>{closeOv();resetRun();toast("RUN ERASED · 0m");};
$("bAgain").onclick=()=>{closeOv();resetRun();};
$("bCopy").onclick=async()=>{const ta=$("share");
try{await navigator.clipboard.writeText(ta.value);toast("COPIED");}
catch(_){ta.focus();ta.select();toast("PRESS CTRL+C / ⌘C");}};
/* ---------- sizing ---------- */
function resize(){scale=Math.min(innerWidth/VW,innerHeight/VH);
dpr=Math.min(devicePixelRatio||1,2);
cv.width=Math.round(VW*scale*dpr);cv.height=Math.round(VH*scale*dpr);
cv.style.width=VW*scale+"px";cv.style.height=VH*scale+"px";
frame.style.width=VW*scale+"px";frame.style.height=VH*scale+"px";
frame.style.fontSize=Math.max(11,16*scale)+"px";
ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);}
addEventListener("resize",resize);addEventListener("orientationchange",resize);
/* ---------- render ---------- */
const SY=wy=>VH-(wy-camY);
function hexLerp(c1,c2,t){const a=parseInt(c1.slice(1),16),b=parseInt(c2.slice(1),16);
return"rgb("+Math.round(lerp(a>>16,b>>16,t))+","+Math.round(lerp(a>>8&255,b>>8&255,t))+","+Math.round(lerp(a&255,b&255,t))+")";}
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function render(now){
const t=clamp01(camY/SUMMIT);
const g=ctx.createLinearGradient(0,0,0,VH);
g.addColorStop(0,hexLerp(COL.top0,COL.top1,t));g.addColorStop(1,hexLerp(COL.bg0,COL.bg1,t));
ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
let ox=0,oy=0;if(shake>.1){ox=(Math.random()-.5)*shake;oy=(Math.random()-.5)*shake;}
ctx.save();ctx.translate(ox,oy);
for(const s of STARS){const sy=VH-(s.y-camY*.35);if(sy<-4||sy>VH+4)continue;
ctx.globalAlpha=.25+.35*(.5+.5*Math.sin(now*.001+s.p));ctx.fillStyle=COL.dim;ctx.fillRect(s.x,sy,s.r,s.r);}
ctx.globalAlpha=1;
ctx.strokeStyle=COL.line;ctx.lineWidth=1;ctx.fillStyle=COL.dim;ctx.font="10px ui-monospace,monospace";
const y0=Math.floor(camY/100)*100;
for(let wy=y0;wy<camY+VH+100;wy+=100){const sy=SY(wy);
ctx.globalAlpha=wy%500===0?.35:.12;ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(VW,sy);ctx.stroke();
if(wy%500===0&&wy>0){ctx.globalAlpha=.55;ctx.fillText(wy/10+"m",8,sy-4);}}
ctx.globalAlpha=.5;ctx.font="700 13px ui-monospace,monospace";
for(const[wy,name]of SECTIONS){const sy=SY(wy);if(sy>-20&&sy<VH+20)ctx.fillText(name,12,sy);}
ctx.textAlign="center";ctx.font="11px ui-monospace,monospace";
for(const[nx,ny,txt]of NOTES){const sy=SY(ny);if(sy>-10&&sy<VH+10){ctx.globalAlpha=.45;ctx.fillText(txt,nx,sy);}}
ctx.textAlign="left";ctx.globalAlpha=1;
ctx.fillStyle=COL.plat;ctx.fillRect(0,0,4,VH);ctx.fillRect(VW-4,0,4,VH);
ctx.fillStyle=COL.edge;ctx.fillRect(3,0,1,VH);ctx.fillRect(VW-4,0,1,VH);
const gy=SY(0);if(gy<VH+2){ctx.fillStyle=COL.plat;ctx.fillRect(0,gy,VW,VH-gy+2);ctx.fillStyle=COL.edge;ctx.fillRect(0,gy,VW,2);}
for(const s of SOLIDS){if(s.wall||s.ground)continue;
const sy=SY(s.y+s.h);if(sy>VH+20||sy+s.h<-20)continue;
ctx.fillStyle=COL.plat;ctx.fillRect(s.x,sy,s.w,s.h);
ctx.fillStyle=s.goal?COL.green:s.ceil?COL.amber:COL.edge;ctx.fillRect(s.x,sy,s.w,2);
if(s.ceil){ctx.fillStyle=COL.amber;ctx.globalAlpha=.35;
for(let x=s.x+4;x<s.x+s.w-4;x+=12)ctx.fillRect(x,sy+s.h-3,6,3);ctx.globalAlpha=1;}}
{const fx=GOAL.x+GOAL.w/2,fy=SY(GOAL.y+GOAL.h);
ctx.strokeStyle=COL.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-46);ctx.stroke();
ctx.fillStyle=COL.green;ctx.beginPath();ctx.moveTo(fx,fy-46);ctx.lineTo(fx+26,fy-38);ctx.lineTo(fx,fy-30);ctx.closePath();ctx.fill();
ctx.fillStyle=COL.dim;ctx.font="10px ui-monospace,monospace";ctx.fillText("SUMMIT · 508m",GOAL.x-6,fy-56);}
for(let i=0;i<trail.length;i++){const p=trail[i];ctx.globalAlpha=(i+1)/trail.length*.5;
ctx.fillStyle=COL.blue;const r=1.5+2*(i/trail.length);ctx.fillRect(p.x-r/2,SY(p.y)-r/2,r,r);}
ctx.globalAlpha=1;
if(state==="aim"&&aim){const v=aimV();
if(v){const pr=preview(v),weak=v.m<MINV;
for(let i=0;i<pr.pts.length;i++){const p=pr.pts[i];
ctx.globalAlpha=.9-(i/pr.pts.length)*.65;ctx.fillStyle=weak?COL.dim:COL.ink;
ctx.fillRect(p.x-1.5,SY(p.y)-1.5,3,3);}
ctx.globalAlpha=1;
if(pr.mark){const m=pr.mark,sy=SY(m.y),pulse=3+Math.sin(now*.012)*1.5;
ctx.strokeStyle=m.ok?COL.green:COL.red;ctx.lineWidth=2;
if(m.ok){ctx.beginPath();ctx.arc(m.x,sy,6+pulse,0,6.29);ctx.stroke();
ctx.fillStyle=COL.green;ctx.beginPath();ctx.arc(m.x,sy,2,0,6.29);ctx.fill();}
else{ctx.beginPath();ctx.moveTo(m.x-6,sy-6);ctx.lineTo(m.x+6,sy+6);
ctx.moveTo(m.x+6,sy-6);ctx.lineTo(m.x-6,sy+6);ctx.stroke();}}
ctx.fillStyle=weak?COL.dim:COL.blue;ctx.font="700 12px ui-monospace,monospace";
ctx.fillText(Math.round(v.m/MAXV*100)+"%",body.x+CH+8,SY(body.y+CH)-6);
if(aim.mode==="p"){ctx.strokeStyle=COL.blue;ctx.globalAlpha=.5;ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(aim.ox,aim.oy,10,0,6.29);ctx.stroke();
ctx.beginPath();ctx.moveTo(aim.ox,aim.oy);ctx.lineTo(aim.cx,aim.cy);ctx.stroke();ctx.globalAlpha=1;}}}
{let sx=1,sy=1;
if(landT>0){const k=landT/.18;sy=1-.3*k;sx=1+.3*k;}
else if(launchT>0){const k=launchT/.18;sy=1+.28*k;sx=1-.22*k;}
const cx=body.x+CH/2,by=SY(body.y);
ctx.save();ctx.translate(cx,by);ctx.scale(sx,sy);
ctx.fillStyle=COL.ink;rr(-CH/2,-CH,CH,CH,4);ctx.fill();
let lx=0,ly=0;
if(state==="aim"&&aim){const v=aimV();if(v){const m=Math.hypot(v.x,v.y)||1;lx=v.x/m*2.4;ly=-v.y/m*2.4;}}
else if(state==="flight"){const m=Math.hypot(body.vx,body.vy)||1;lx=body.vx/m*2.4;ly=-body.vy/m*2.4;}
const blink=blinkT>0?.15:1;ctx.fillStyle="#0a0e1a";
ctx.fillRect(-5+lx,-12+ly,3,4*blink);ctx.fillRect(2+lx,-12+ly,3,4*blink);ctx.restore();}
for(const p of parts){ctx.globalAlpha=Math.max(0,1-p.t/p.life);ctx.fillStyle=p.c;ctx.fillRect(p.x-1.5,SY(p.y)-1.5,3,3);}
ctx.globalAlpha=1;
for(const c of confetti){ctx.save();ctx.translate(c.x,SY(c.y));ctx.rotate(c.r);
ctx.globalAlpha=Math.max(0,1-c.t/2.4);ctx.fillStyle=c.c;ctx.fillRect(-3,-2,6,4);ctx.restore();}
ctx.globalAlpha=1;ctx.font="700 13px ui-monospace,monospace";
for(const f of floats){ctx.globalAlpha=Math.max(0,1-f.t/1.4);ctx.fillStyle=f.c;ctx.fillText(f.txt,f.x-16,SY(f.y));}
ctx.globalAlpha=1;
if(state==="ready"&&run.launches===0&&idleT>2.2){
ctx.globalAlpha=.5+.3*Math.sin(now*.004);ctx.fillStyle=COL.ink;ctx.font="12px ui-monospace,monospace";
ctx.fillText("drag anywhere · release to commit",Math.max(10,Math.min(body.x-60,VW-230)),SY(body.y)-34);ctx.globalAlpha=1;}
{const x=VW-9,y0r=70,y1r=VH-90;
ctx.strokeStyle=COL.line;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y1r);ctx.lineTo(x,y0r);ctx.stroke();
ctx.strokeStyle=COL.blue;ctx.beginPath();ctx.moveTo(x,y1r);ctx.lineTo(x,y1r-(y1r-y0r)*clamp01(body.y/SUMMIT));ctx.stroke();
ctx.fillStyle=COL.amber;ctx.fillRect(x-5,y1r-(y1r-y0r)*clamp01(life.best/SUMMIT)-1,10,2);
ctx.fillStyle=COL.green;ctx.fillRect(x-4,y0r-6,8,3);}
ctx.restore();
if(flash>.01){ctx.fillStyle="rgba(255,93,93,"+flash+")";ctx.fillRect(0,0,VW,VH);}
const vg=ctx.createRadialGradient(VW/2,VH/2,VH*.35,VW/2,VH/2,VH*.75);
vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.42)");
ctx.fillStyle=vg;ctx.fillRect(0,0,VW,VH);}
/* ---------- hud ---------- */
function setT(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function hud(){setT("altV",(Math.max(0,body.y)/10).toFixed(1)+"m");
setT("best",(life.best/10).toFixed(1)+"m");setT("mLaunch",String(run.launches));
setT("mFall",String(run.falls));setT("mTime",fmt(run.time));}
/* ---------- loop ---------- */
function frameLoop(now){requestAnimationFrame(frameLoop);
let dt=(now-lastT)/1000;lastT=now;if(dt>.25)dt=.25;
const paused=overlayOpen!==null||document.hidden;
if(!paused){if(run.started&&state!=="win")run.time+=dt;
acc+=dt;while(acc>=DT){simStep();acc-=DT;}
const target=clampCam(body.y-VH*.38);
camY+=(target-camY)*Math.min(1,dt*(state==="flight"?10:6));
landT=Math.max(0,landT-dt);launchT=Math.max(0,launchT-dt);
blinkT=Math.max(0,blinkT-dt);blinkTimer-=dt;
if(blinkTimer<0){blinkT=.12;blinkTimer=2.6+Math.random()*2;}
if(state==="ready")idleT+=dt;}
shake*=Math.exp(-6*dt);flash*=Math.exp(-3*dt);updParts(dt);
render(now);hud();}
document.addEventListener("visibilitychange",()=>{if(document.hidden)save();else lastT=performance.now();});
addEventListener("beforeunload",save);
/* ---------- boot ---------- */
load();resize();if(!life.seen)openOv("help");
lastT=performance.now();requestAnimationFrame(frameLoop);
})();
</script>
</body>
</html>
```

## 4. Run Instructions

1. Save the block above as `index.html`.
2. Open it in any modern browser (double-click works; no server, no build, offline).
3. Optional local server: `npx serve .` — not required.

## 5. Verification Protocol (execute before shipping)

Automated: serve the folder over HTTP and open `test.html` — it drives the game through
the `window.__COMMIT__` manual-clock hook and asserts the matrix below, including a
solver that proves **all 36 rest-to-rest jumps (bounce chains included) are solvable at
≤ 98 % power** using the real integrator. Last full run: **72/72 pass** in both standard and
`prefers-reduced-motion` modes (headless Chrome).

| # | Test | Expected |
|---|---|---|
| 1 | Fresh load, no storage | Help overlay; Begin closes it; idle hint pulses after ~2 s |
| 2 | Drag up-right, release | Dotted arc matches flight exactly; green ring = actual landing |
| 3 | Tiny drag (< ~28 px), release | Cancels, no launch counted, puff only |
| 4 | Release outside canvas | Pointer capture delivers release; launch still commits |
| 5 | Aim into a ceiling | Red ✕ at bonk point; real flight bonks at the same pixel |
| 6 | Fall > 25 m | Red flash, `−Xm` popup, fall counter increments once |
| 7 | Keyboard: arrows, Shift, Space ×2, Esc | Fine aim works; second Space commits; Esc cancels |
| 8 | `H`, `?`, `R`, ↺, Esc | Overlays open/close; sim and timer pause while open |
| 9 | Refresh mid-run | Resumes at last grounded position with run + lifetime stats |
| 10 | Erase run | Confirm required; run zeroes; lifetime best/summits survive |
| 11 | Reach summit (test build: temporarily set `body.y=4940` on platform 35) | Win overlay, correct stats, confetti, Copy works or falls back to select |
| 12 | Climb Again | Full reset to 0 m, state `ready`, no duplicated loops/listeners |
| 13 | Resize / rotate / DPR 1–3 | Letterbox correct, HUD aligned, pointer mapping accurate |
| 14 | Tab hide 10 s, return | No time jump, no physics catch-up burst, save written |
| 15 | Storage disabled (private mode) | Game runs; saves silently no-op; no console errors |
| 16 | Rapid input spam / multi-touch | Only first pointer aims; no state corruption; particle caps hold |
| 17 | Reduced-motion OS setting | No shake/confetti; particles halved; game fully playable |
| 18 | Network panel | Zero requests after document load |
| 19 | ♪ / M mute | Master mute persists (`commit.snd`); `aria-pressed` + strikethrough show state; SFX and wind silent |
| 20 | Level solver (`test.html`) | All 36 jumps solvable at ≤ 98 % power; preview ≡ flight contact pixel-exact |

## 6. Tuning Pointers

- All gameplay constants are the first `const` line — change them only with the
  reachability formulas in `COMMIT_LEVELS.md` open.
- Difficulty dial: platform widths in `P` (never below 28). Ceiling positions in `CEIL`.
- Feel dials: camera lerp (6/10), shake threshold (650) and cap (11), flash decay (3).
- The preview must never get its own physics. If you touch `step()`, both flight and
  preview change together — that is the Commit Contract, and it is the game.