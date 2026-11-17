/* COMMIT — persistence (commit.v3, per-tower runs), level switching, input, loop, boot, test hook. */
"use strict";
let level=1,runs={};
let life={best:{},bestTime:{},summits:{},launches:0,falls:0,seen:false,unlocked:1};
let safePos={x:VW/2-CH/2,y:0};
let acc=0,lastT=performance.now(),manual=false,rafId=0;
const totalSummits=()=>Object.values(life.summits).reduce((a,b)=>a+(+b||0),0);
const defaultRun=()=>({launches:0,falls:0,biggest:0,time:0,started:false,dead:[],slide:0,wt:0,x:VW/2-CH/2,y:0});
/* ---------- persistence ---------- */
function save(){runs[level]={...run,x:safePos.x,y:safePos.y,slide:body.slide,wt:worldT};
LS.set("commit.v3",{level,runs,life});}
function sanitize(){run.time=Math.max(0,+run.time||0);run.launches=Math.max(0,+run.launches||0);
run.falls=Math.max(0,+run.falls||0);run.biggest=Math.max(0,+run.biggest||0);
run.slide=(run.slide===1||run.slide===-1)?run.slide:0;
run.wt=Math.max(0,+run.wt||0);
run.dead=Array.isArray(run.dead)?run.dead.filter(i=>Number.isInteger(i)&&i>=0&&i<PLATS.length):[];
for(const L of LEVELS){life.best[L.id]=Math.max(0,+life.best[L.id]||0);
life.summits[L.id]=Math.max(0,Math.round(+life.summits[L.id]||0));
if(life.bestTime[L.id]!=null){life.bestTime[L.id]=+life.bestTime[L.id];
if(!Number.isFinite(life.bestTime[L.id])||life.bestTime[L.id]<0)life.bestTime[L.id]=null;}}
life.launches=Math.max(0,+life.launches||0);life.falls=Math.max(0,+life.falls||0);
life.unlocked=Math.min(Math.max(1,Math.round(+life.unlocked||1)),LEVELS.length);
life.seen=!!life.seen;}
function load(){let d=LS.get("commit.v3");
if(!d){const v2=LS.get("commit.v2");
if(v2){const L=v2.life||{};
d={level:1,runs:{1:{...(v2.run||{}),x:v2.x,y:v2.y,slide:0}},
life:{best:{1:+L.best||0},bestTime:{1:L.bestTime!=null?+L.bestTime:null},summits:{1:+L.summits||0},
launches:+L.launches||0,falls:+L.falls||0,seen:!!L.seen,unlocked:(+L.summits||0)>0?2:1}};}
else{const v1=LS.get("commit.v1");if(v1&&v1.life){const L=v1.life;
life={...life,best:{1:+L.best||0},bestTime:{1:L.bestTime!=null?+L.bestTime:null},summits:{1:+L.summits||0},
launches:+L.launches||0,falls:+L.falls||0,seen:!!L.seen};}
sanitize();buildLevel(1);worldT=0;pendingV=null;return;}}
if(d.life)life={...life,...d.life};
if(d.runs&&typeof d.runs==="object")runs=d.runs;
sanitize();
level=Math.min(Math.max(1,Math.round(+d.level||1)),life.unlocked);
buildLevel(level);
run={...defaultRun(),...(runs[level]||{})};sanitize();
worldT=run.wt;pendingV=null;
for(const i of run.dead){PLATS[i].dead=true;PLATS[i].respawnT=RESPAWN_TIME;}
if(Number.isFinite(run.x)&&Number.isFinite(run.y)&&run.y>=0&&run.y<=SUMMIT){
body.x=Math.min(Math.max(run.x,0),VW-CH);body.y=run.y;}
body.on=findGround(body.x,body.y);
body.slide=(body.on&&body.on.ice)?run.slide:0;body.slideT=body.slide?ICE_RAMP:0;
safePos.x=body.x;safePos.y=body.y;
camY=clampCam(body.y-VH*.38);}
/* ---------- level switching ---------- */
function setLevel(n){if(n===level||n<1||n>LEVELS.length||n>life.unlocked)return;
save();level=n;buildLevel(n);
run={...defaultRun(),...(runs[n]||{})};sanitize();
worldT=run.wt;
for(const i of run.dead){PLATS[i].dead=true;PLATS[i].respawnT=RESPAWN_TIME;}
body.x=Math.min(Math.max(run.x,0),VW-CH);body.y=run.y;body.vx=0;body.vy=0;body.grounded=true;
body.on=findGround(body.x,body.y);body.slide=(body.on&&body.on.ice)?run.slide:0;body.slideT=body.slide?ICE_RAMP:0;
state="ready";aim=null;pendingV=null;stopHum();stopSlide();
safePos.x=body.x;safePos.y=body.y;
trail.length=0;floats.length=0;confetti.length=0;shards.length=0;flightContacts.length=0;flash=0;shake=0;
crumbleT=0;crumbleStage=0;bounceChain=0;aimT=AIM_TIME;idleT=0;
camY=clampCam(body.y-VH*.38);
for(const k in hudCache)delete hudCache[k];
updateTowerTag();save();}
/* ---------- win / reset ---------- */
function win(){state="win";stopHum();stopSlide();
life.summits[level]=(life.summits[level]||0)+1;
if(life.bestTime[level]==null||run.time<life.bestTime[level])life.bestTime[level]=run.time;
let newUnlock=false;
if(level<LEVELS.length&&life.unlocked<level+1){life.unlocked=level+1;newUnlock=true;}
save();
$("wTime").textContent=fmt(run.time);$("wLaunch").textContent=run.launches;
$("wFall").textContent=run.falls;$("wDrop").textContent=(run.biggest/10).toFixed(1)+"m";
$("winSub").textContent=(SUMMIT/10)+" meters of decisions you couldn't take back.";
$("winUnlock").textContent=newUnlock?"TOWER "+(level+1)+" UNLOCKED — "+LEVELS[level].tag.toLowerCase()+" awaits.":"";
$("winUnlock").hidden=!newUnlock;
$("bNext").hidden=level>=LEVELS.length;
$("share").value="COMMIT · "+LVL.name+" · "+(SUMMIT/10)+"m in "+fmt(run.time)+" · "+run.launches+" launches · "+run.falls+" falls · biggest drop "+(run.biggest/10).toFixed(1)+"m. No air control. No mercy.";
if(!RM)for(let i=0;i<90;i++)confetti.push({x:body.x+CH/2,y:body.y+20,vx:(Math.random()-.5)*560,vy:Math.random()*620+120,r:Math.random()*6.28,vr:(Math.random()-.5)*9,c:[COL.blue,COL.green,COL.amber,COL.red,COL.ink][i%5],t:0});
sfx("win");if(newUnlock)sfx("unlock");openOv("win");}
function resetRun(){body.x=VW/2-CH/2;body.y=0;body.vx=0;body.vy=0;body.grounded=true;body.slide=0;body.slideT=0;
state="ready";aim=null;pendingV=null;stopHum();stopSlide();run=defaultRun();worldT=0;
for(const s of PLATS){s.dead=false;s.bounceT=0;s.respawnT=0;}
body.on=findGround(body.x,body.y);crumbleT=0;crumbleStage=0;bounceChain=0;aimT=AIM_TIME;
safePos.x=body.x;safePos.y=body.y;
trail.length=0;floats.length=0;confetti.length=0;shards.length=0;flightContacts.length=0;flash=0;shake=0;
camY=clampCam(body.y-VH*.38);save();}
/* ---------- input ---------- */
function toLogical(e){const r=cv.getBoundingClientRect();
return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale};}
cv.addEventListener("pointerdown",e=>{if(overlayOpen||(state!=="ready"&&state!=="flight"))return;
e.preventDefault();audio();try{cv.setPointerCapture(e.pointerId)}catch(_){}
const p=toLogical(e);aim={mode:"p",id:e.pointerId,ox:p.x,oy:p.y,cx:p.x,cy:p.y};pendingV=null;
if(state==="ready")state="aim";idleT=0;
beginAim();sfx("aim");startHum();});
cv.addEventListener("pointermove",e=>{if(!aim||aim.mode!=="p"||e.pointerId!==aim.id||pendingV)return;
const p=toLogical(e);aim.cx=p.x;aim.cy=p.y;});
function endPointer(e,cancel){if(!aim||aim.mode!=="p"||e.pointerId!==aim.id)return;
if(cancel){aim=null;pendingV=null;if(state==="aim")state="ready";stopHum();return;}
commitAim();}
cv.addEventListener("pointerup",e=>endPointer(e,false));
cv.addEventListener("pointercancel",e=>endPointer(e,true));
cv.addEventListener("contextmenu",e=>e.preventDefault());
const kbHeld={ArrowLeft:false,ArrowRight:false,ArrowUp:false,ArrowDown:false};let kbFine=false;
function kbAim(){if(state==="ready"||state==="flight"){aim={mode:"k"};pendingV=null;
if(state==="ready")state="aim";beginAim();sfx("aim");startHum();}}
/* hold-to-sweep: continuous rates from the loop clock, not OS key-repeat; Shift = quarter rate */
function kbSweep(dt){if(!aim||aim.mode!=="k"||pendingV||(state!=="aim"&&state!=="flight")){for(const k in kbHeld)kbHeld[k]=false;return;}
const f=kbFine?.25:1;
if(kbHeld.ArrowLeft)kb.a=Math.min(172,kb.a+60*dt*f);
if(kbHeld.ArrowRight)kb.a=Math.max(8,kb.a-60*dt*f);
if(kbHeld.ArrowUp)kb.p=Math.min(1,kb.p+.45*dt*f);
if(kbHeld.ArrowDown)kb.p=Math.max(.12,kb.p-.45*dt*f);}
addEventListener("keydown",e=>{
if(e.key==="Escape"){if(overlayOpen){if(overlayOpen!=="win")closeOv();}
else if(aim&&(state==="aim"||state==="flight")){aim=null;pendingV=null;if(state==="aim")state="ready";stopHum();sfx("puff");}return;}
if(e.key==="m"||e.key==="M"){audio();setSound(!SND.on);return;}
if(overlayOpen)return;
audio();
if(e.key==="h"||e.key==="H"){openOv("help");return;}
if(e.key==="r"||e.key==="R"){openOv("confirm");return;}
if(state==="win")return;
let used=true;
switch(e.key){
case"ArrowLeft":case"ArrowRight":case"ArrowUp":case"ArrowDown":kbHeld[e.key]=true;break;
case" ":case"Enter":
if(aim&&aim.mode==="k"&&(state==="aim"||state==="flight"))commitAim();
else kbAim();
e.preventDefault();return;
default:used=false;}
if(used){e.preventDefault();kbFine=e.shiftKey;if(state==="ready"||(state==="flight"&&!aim))kbAim();idleT=0;}});
addEventListener("keyup",e=>{if(e.key in kbHeld)kbHeld[e.key]=false;kbFine=e.shiftKey;});
addEventListener("blur",()=>{for(const k in kbHeld)kbHeld[k]=false;});
$("bHelp").onclick=()=>{sfx("ui");openOv("help");};
$("towerTag").onclick=()=>{sfx("ui");openOv("help");};
$("bStart").onclick=()=>{sfx("ui");closeOv();};
$("bReset").onclick=()=>{sfx("ui");openOv("confirm");};
$("bNo").onclick=()=>{sfx("ui");closeOv();};
$("bYes").onclick=()=>{closeOv();resetRun();sfx("erase");toast("RUN ERASED · 0m");};
$("bAgain").onclick=()=>{sfx("ui");closeOv();resetRun();};
$("bNext").onclick=()=>{sfx("ui");closeOv();setLevel(level+1);toast(LVL.name+" · "+LVL.tag);};
$("bSound").onclick=()=>{audio();setSound(!SND.on);};
$("bCopy").onclick=async()=>{const ta=$("share");
try{await navigator.clipboard.writeText(ta.value);sfx("copy");toast("COPIED");}
catch(_){ta.focus();ta.select();sfx("ui");toast("PRESS CTRL+C / ⌘C");}};
addEventListener("resize",resize);addEventListener("orientationchange",resize);
/* ---------- loop ---------- */
function frameLoop(now){if(!manual)rafId=requestAnimationFrame(frameLoop);
let dt=(now-lastT)/1000;lastT=now;if(dt>.25)dt=.25;
const paused=overlayOpen!==null||document.hidden;
if(!paused){if(run.started&&state!=="win")run.time+=dt;
/* fuse decides before the clock advances so the flight starts on the exact previewed phase */
if(aim&&!pendingV&&(state==="aim"||state==="flight")){aimT-=dt;const sec=Math.ceil(aimT);
if(sec!==lastTickSec){lastTickSec=sec;if(sec>0&&sec<=AIM_TIME)sfx("tick",{urgent:aimT<1});}
if(aimT<=0){const v=aimV();if(v&&v.m>=MINV&&state==="aim")sfx("forced");commitAim();}}
acc+=dt;while(acc>=DT){worldT+=DT;if(state==="flight")simStep();else groundStep();acc-=DT;}
kbSweep(dt);
updateCrumble(dt);
updateRespawn(dt);
updateIce(dt);
const target=clampCam(body.y-VH*.38);
camY+=(target-camY)*Math.min(1,dt*(state==="flight"?10:6));
landT=Math.max(0,landT-dt);launchT=Math.max(0,launchT-dt);
for(const s of PLATS)if(s.bounceT>0)s.bounceT=Math.max(0,s.bounceT-dt);
blinkT=Math.max(0,blinkT-dt);blinkTimer-=dt;
if(blinkTimer<0){blinkT=.12;blinkTimer=2.6+Math.random()*2;}
if(state==="ready")idleT+=dt;}
if(SND.ctx&&SND.wind){const tt=clamp01(body.y/SUMMIT);
const base=(SND.on&&state!=="win")?.006+tt*.03:0;
SND.wind.wg.gain.setTargetAtTime(base,SND.ctx.currentTime,.5);
SND.wind.bp.frequency.setTargetAtTime(260+tt*240,SND.ctx.currentTime,.5);}
if(state==="aim"&&aim&&SND.hum&&SND.ctx){const v=aimV();
if(v)SND.hum.o.frequency.setTargetAtTime(80+v.m/MAXV*180+(1-clamp01(aimT/AIM_TIME))*120,SND.ctx.currentTime,.05);}
else if(SND.hum)stopHum();
shake*=Math.exp(-6*dt);flash*=Math.exp(-3*dt);updParts(dt);
render(now);hud();}
document.addEventListener("visibilitychange",()=>{
if(document.hidden){save();if(SND.ctx)SND.ctx.suspend().catch(()=>{});}
else{lastT=performance.now();if(SND.on&&SND.ctx)SND.ctx.resume().catch(()=>{});}});
addEventListener("beforeunload",save);
/* ---------- boot ---------- */
load();resize();applySoundBtn();updateTowerTag();if(!life.seen)openOv("help");
lastT=performance.now();rafId=requestAnimationFrame(frameLoop);
/* ---------- test hook (manual clock for test.html; inert in normal play) ---------- */
window.__COMMIT__={takeControl(){manual=true;cancelAnimationFrame(rafId);},tick(now){frameLoop(now);},
launch,preview,step,resetRun,openOv,closeOv,save,load,spawnDust,resize,setSound,beginAim,setLevel,
setBody(x,y){body.x=x;body.y=y;body.vx=0;body.vy=0;body.grounded=true;body.slide=0;body.slideT=0;state="ready";aim=null;pendingV=null;
body.on=findGround(x,y);crumbleT=0;crumbleStage=0;aimT=AIM_TIME;safePos.x=x;safePos.y=y;},
get state(){return state},get body(){return body},get run(){return run},get life(){return life},get aim(){return aim},
get kb(){return kb},get pendingV(){return pendingV},get camY(){return camY},get flash(){return flash},get shake(){return shake},get idleT(){return idleT},
get aimT(){return aimT},get crumbleT(){return crumbleT},get bounceChain(){return bounceChain},get level(){return level},
get trail(){return trail},get parts(){return parts},get shards(){return shards},get confetti(){return confetti},get floats(){return floats},
get overlayOpen(){return overlayOpen},get flightContacts(){return flightContacts},get flightContact(){return flightContacts[0]||null},get safePos(){return safePos},
get SOLIDS(){return SOLIDS},get PLATS(){return PLATS},get GOAL(){return GOAL},get P(){return P},get CEIL(){return CEIL},
RM,LEVELS,snd:SND,skyAt,moverXY,moverV,
get worldT(){return worldT},setWorldT(t){worldT=Math.max(0,+t||0);},
get C(){return{VW,VH,DT,G,MAXV,MINV,KDRAG,CH,SUMMIT,FALL_MIN,VFALL,AIM_TIME,CRUMBLE_TIME,BOUNCE_V,RESPAWN_TIME,ICE_V,ICE_RAMP}}};