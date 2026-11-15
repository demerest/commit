/* COMMIT — game logic. Vanilla JS + Canvas 2D + Web Audio. No dependencies, no asset files.
   The Commit Contract: preview() and flight share step(), so the dotted arc is pixel-exact. */
(()=>{ "use strict";
/* ---------- constants ---------- */
const VW=480,VH=800,DT=1/120,G=2200,MAXV=950,MINV=90,KDRAG=3.2,
CH=18,SUMMIT=5080,FALL_MIN=250,VFALL=-1600,
AIM_TIME=3.0,CRUMBLE_TIME=1.6,BOUNCE_V=800;
const COL={plat:"#1c2436",edge:"#43547c",ink:"#e9edf4",dim:"#8b93a7",line:"#26304a",
blue:"#5aa7ff",green:"#57e389",amber:"#ffb454",red:"#ff5d5d",spring:"#3fe0c5"};
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01=v=>Math.max(0,Math.min(1,v)), lerp=(a,b,t)=>a+(b-a)*t;
const $=id=>document.getElementById(id);
/* altitude sky: cold navy floor -> steel teal -> violet dusk -> warm rose dawn */
const SKY=[
[0.00,[16,24,46],[10,14,26],[7,9,15]],
[0.34,[18,50,58],[12,27,35],[8,16,24]],
[0.67,[44,29,72],[27,18,49],[16,10,32]],
[1.00,[96,46,66],[60,29,49],[33,16,25]]];
function skyAt(t){let i=0;while(i<SKY.length-2&&t>SKY[i+1][0])i++;
const a=SKY[i],b=SKY[i+1],f=clamp01((t-a[0])/(b[0]-a[0]));
const mix=(u,v)=>[lerp(u[0],v[0],f),lerp(u[1],v[1],f),lerp(u[2],v[2],f)];
return[mix(a[1],b[1]),mix(a[2],b[2]),mix(a[3],b[3])];}
const rgb=c=>"rgb("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+")";
/* ---------- level (type: 0 solid, 1 crumble, 2 bounce) ---------- */
const P=[[60,120,150,0],[270,240,150,0],[90,370,140,0],[280,500,150,0],
[110,640,120,0],[300,780,110,0],[140,930,110,0],[320,1080,100,0],[150,1230,110,1],[30,1380,110,0],[210,1530,100,0],[360,1680,100,0],
[200,1830,84,0],[60,1980,76,0],[300,2130,76,0],[150,2280,70,0],[340,2350,80,0],[140,2490,80,0],[280,2600,72,2],[400,2720,72,0],[180,2820,64,1],
[330,2940,56,0],[170,3080,56,1],[340,3220,50,0],[150,3360,54,0],[300,3500,48,1],[110,3650,48,0],[280,3800,46,0],[120,3950,46,1],
[320,4090,36,0],[140,4240,34,1],[330,4390,32,0],[150,4530,40,0],[290,4640,44,2],[400,4760,40,0],[200,4870,32,1],[330,4980,30,0]];
const CEIL=[[0,2400,250],[0,3200,200],[300,3380,180]];
const SOLIDS=[{x:-60,y:-60,w:VW+120,h:60,ground:true},
{x:-60,y:0,w:60,h:SUMMIT+900,wall:true},{x:VW,y:0,w:60,h:SUMMIT+900,wall:true}];
const PLATS=[];
P.forEach(([x,t,w,ty],i)=>{const s={x,y:t-16,w,h:16,idx:i,crumble:ty===1,bounce:ty===2,dead:false,bounceT:0};PLATS.push(s);SOLIDS.push(s);});
for(const[x,t,w]of CEIL)SOLIDS.push({x,y:t-16,w,h:16,ceil:true});
const GOAL={x:180,y:SUMMIT-16,w:120,h:16,goal:true};SOLIDS.push(GOAL);
const SECTIONS=[[60,"I · FIRST STEPS"],[1760,"II · THE NEEDLES"],[2860,"III · OVERHANG"],[4000,"IV · THE THROAT"],[4980,"V · SUMMIT"]];
const NOTES=[[240,60,"DRAG ANYWHERE TO AIM"],[240,180,"RELEASE = COMMIT"],[240,430,"AIM FAST · THE FUSE COMMITS FOR YOU"],
[240,1150,"CRACKED PLATFORMS CRUMBLE · KEEP MOVING"],[240,2430,"TEAL PADS BOUNCE YOU · READ THE FULL ARC"]];
const STARS=[];{let s=13;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
for(let i=0;i<80;i++)STARS.push({x:rnd()*VW,y:rnd()*(SUMMIT*.4+VH),r:rnd()*1.4+.4,p:rnd()*6.28});}
/* ---------- state ---------- */
const cv=$("cv"),ctx=cv.getContext("2d"),frame=$("frame");
let scale=1,dpr=1;
const body={x:VW/2-CH/2,y:0,vx:0,vy:0,grounded:true,on:null};
let state="ready",aim=null;const kb={a:65,p:.6};
let camY=-140,shake=0,flash=0,landT=0,launchT=0,blinkT=0,blinkTimer=3,idleT=0;
let aimT=AIM_TIME,lastTickSec=99,crumbleT=0,crumbleStage=0,bounceChain=0;
let run={launches:0,falls:0,biggest:0,time:0,started:false,dead:[]};
let life={best:0,bestTime:null,summits:0,launches:0,falls:0,seen:false};
let launchY=0;const flightContacts=[],trail=[],parts=[],shards=[],floats=[],confetti=[];
let safePos={x:VW/2-CH/2,y:0};
let overlayOpen=null,acc=0,lastT=performance.now(),stepN=0,toastT=null,manual=false,rafId=0;const hudCache={};
const clampCam=t=>Math.max(-140,Math.min(t,SUMMIT+260-VH));
function findGround(x,y){for(const s of SOLIDS){if(s.dead||s.wall)continue;
if(Math.abs((s.y+s.h)-y)<.6&&x<s.x+s.w&&x+CH>s.x)return s;}return null;}
/* ---------- persistence ---------- */
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},
set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function save(){LS.set("commit.v2",{x:safePos.x,y:safePos.y,run,life});}
function sanitize(){run.time=Math.max(0,+run.time||0);run.launches=Math.max(0,+run.launches||0);
run.falls=Math.max(0,+run.falls||0);run.biggest=Math.max(0,+run.biggest||0);
run.dead=Array.isArray(run.dead)?run.dead.filter(i=>Number.isInteger(i)&&i>=0&&i<PLATS.length):[];
life.best=Math.max(0,+life.best||0);life.summits=Math.max(0,+life.summits||0);
life.launches=Math.max(0,+life.launches||0);life.falls=Math.max(0,+life.falls||0);
if(life.bestTime!=null){life.bestTime=+life.bestTime;if(!Number.isFinite(life.bestTime)||life.bestTime<0)life.bestTime=null;}
life.seen=!!life.seen;}
function load(){let d=LS.get("commit.v2");
if(!d){const old=LS.get("commit.v1");if(old&&old.life){life={...life,...old.life};sanitize();}return;}
if(d.life)life={...life,...d.life};if(d.run)run={...run,...d.run};sanitize();
for(const i of run.dead)PLATS[i].dead=true;
if(Number.isFinite(d.x)&&Number.isFinite(d.y)&&d.y>=0&&d.y<=SUMMIT){
body.x=Math.min(Math.max(d.x,0),VW-CH);body.y=d.y;}
body.on=findGround(body.x,body.y);safePos.x=body.x;safePos.y=body.y;
camY=clampCam(body.y-VH*.38);}
/* ---------- sound (procedural only — no audio files, no generated assets) ---------- */
const SND={ctx:null,master:null,noiseBuf:null,wind:null,hum:null,on:LS.get("commit.snd")!==false};
function audio(){if(!SND.on)return null;
if(!SND.ctx){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
const c=new AC();SND.ctx=c;
SND.master=c.createGain();SND.master.gain.value=.5;SND.master.connect(c.destination);
const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);
for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noiseBuf=nb;
const src=c.createBufferSource();src.buffer=nb;src.loop=true;
const bp=c.createBiquadFilter();bp.type="bandpass";bp.frequency.value=280;bp.Q.value=.6;
const wg=c.createGain();wg.gain.value=0;
const lfo=c.createOscillator();lfo.frequency.value=.13;const lg=c.createGain();lg.gain.value=.006;
lfo.connect(lg);lg.connect(wg.gain);
src.connect(bp);bp.connect(wg);wg.connect(SND.master);src.start();lfo.start();
SND.wind={src,bp,wg};}catch(e){SND.ctx=null;return null}}
if(SND.ctx.state==="suspended")SND.ctx.resume().catch(()=>{});
return SND.ctx;}
function tone(f,d,type,vol,f2){const c=audio();if(!c)return;const t=c.currentTime;
const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(1,f2),t+d);
g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
o.connect(g);g.connect(SND.master);o.start(t);o.stop(t+d+.02);}
function noiseHit(d,vol,fq,type){const c=audio();if(!c)return;const t=c.currentTime;
const s=c.createBufferSource();s.buffer=SND.noiseBuf;
const f=c.createBiquadFilter();f.type=type||"lowpass";f.frequency.value=fq;
const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
s.connect(f);f.connect(g);g.connect(SND.master);s.start(t);s.stop(t+d+.02);}
function sfx(n,o){if(!SND.on)return;o=o||{};try{switch(n){
case"aim":tone(660,.05,"sine",.04);break;
case"puff":noiseHit(.08,.05,700);break;
case"launch":noiseHit(.22,.1,900,"bandpass");tone(160,.2,"triangle",.07,440);break;
case"forced":noiseHit(.16,.12,1400,"bandpass");tone(720,.16,"sawtooth",.07,180);break;
case"tick":tone(o.urgent?1180:820,.04,"square",o.urgent?.06:.035);break;
case"land":{const i=o.impact||0;tone(80,.13,"sine",Math.min(.22,.07+i/5000),45);noiseHit(.06,Math.min(.12,.04+i/9000),320);}break;
case"wall":noiseHit(.05,.09,500);tone(130,.06,"square",.04);break;
case"bonk":tone(330,.09,"square",.07,170);break;
case"bounce":{const f=300*(1+(o.chain||0)*.16);tone(f,.16,"sine",.1,f*2.4);noiseHit(.07,.05,1200,"bandpass");}break;
case"crack":noiseHit(.09,.05+(o.stage||0)*.02,420+(o.stage||0)*260,"bandpass");tone(150+(o.stage||0)*60,.06,"square",.03);break;
case"shatter":noiseHit(.34,.16,300);tone(90,.34,"sawtooth",.1,38);tone(520,.12,"square",.05,120);break;
case"fall":tone(540,.55,"sawtooth",.08,80);break;
case"win":[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.22,"triangle",.09),i*95));break;
case"ui":tone(880,.03,"sine",.035);break;
case"erase":tone(180,.18,"sine",.07,55);break;
case"copy":tone(1046,.07,"sine",.05);break;
}}catch(e){}}
function startHum(){const c=audio();if(!c||SND.hum)return;try{
const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=90;g.gain.value=0;
o.connect(g);g.connect(SND.master);o.start();g.gain.setTargetAtTime(.02,c.currentTime,.05);
SND.hum={o,g};}catch(e){}}
function stopHum(){if(!SND.hum)return;const h=SND.hum;SND.hum=null;try{
h.g.gain.setTargetAtTime(0,SND.ctx.currentTime,.03);setTimeout(()=>{try{h.o.stop()}catch(e){}},220);}catch(e){}}
function applySoundBtn(){const b=$("bSound");b.classList.toggle("off",!SND.on);
b.setAttribute("aria-pressed",String(SND.on));b.setAttribute("aria-label",SND.on?"Mute sound":"Unmute sound");}
function setSound(on,silent){SND.on=on;LS.set("commit.snd",on);applySoundBtn();
if(SND.ctx){try{if(on){SND.ctx.resume().catch(()=>{});SND.master.gain.setTargetAtTime(.5,SND.ctx.currentTime,.05);}
else SND.master.gain.setTargetAtTime(0,SND.ctx.currentTime,.05);}catch(e){}}
if(on)sfx("ui");if(!silent)toast(on?"SOUND ON":"SOUND OFF");}
/* ---------- physics (shared by flight and preview) ---------- */
function hit(b,s){return b.x<s.x+s.w&&b.x+CH>s.x&&b.y<s.y+s.h&&b.y+CH>s.y}
function step(b){b.vy-=G*DT;if(b.vy<VFALL)b.vy=VFALL;let ev=null;
b.x+=b.vx*DT;
for(const s of SOLIDS){if(s.dead)continue;if(hit(b,s)){
if(b.vx>0)b.x=s.x-CH;else if(b.vx<0)b.x=s.x+s.w;
if(b.vx!==0){b.vx=0;ev={t:"wall",x:b.x+CH/2,y:b.y+CH/2};}}}
b.y+=b.vy*DT;b.grounded=false;
for(const s of SOLIDS){if(s.dead)continue;if(hit(b,s)){
if(b.vy<=0){b.y=s.y+s.h;
if(s.bounce){b.vy=BOUNCE_V;ev={t:"bounce",s,x:b.x+CH/2,y:b.y};}
else{b.vy=0;b.grounded=true;ev={t:"land",s};}}
else{b.y=s.y-CH;b.vy=0;ev={t:"bonk",x:b.x+CH/2,y:b.y+CH};}}}
return ev;}
function contactOf(b,ev){return{x:b.x+CH/2,y:b.y+(ev.t==="land"||ev.t==="bounce"?0:CH/2),t:ev.t,ok:ev.t==="land",goal:!!(ev.s&&ev.s.goal)};}
function preview(v){const b={x:body.x,y:body.y,vx:v.x,vy:v.y,grounded:false};
const pts=[],contacts=[];let mark=null;
for(let i=0;i<900;i++){const ev=step(b);
if(i%3===0)pts.push({x:b.x+CH/2,y:b.y+CH/2});
if(ev){const c=contactOf(b,ev);contacts.push(c);mark=c;if(ev.t!=="bounce")break;}
if(b.y<-80)break;}
return{pts,contacts,mark};}
/* ---------- aiming ---------- */
function aimV(){if(!aim)return null;let vx,vy;
if(aim.mode==="p"){vx=(aim.cx-aim.ox)*KDRAG;vy=(aim.oy-aim.cy)*KDRAG;}
else{const a=kb.a*Math.PI/180;vx=Math.cos(a)*kb.p*MAXV;vy=Math.sin(a)*kb.p*MAXV;}
const m=Math.hypot(vx,vy);if(m>MAXV){vx*=MAXV/m;vy*=MAXV/m;}
return{x:vx,y:vy,m:Math.min(m,MAXV)};}
function beginAim(){aimT=AIM_TIME;lastTickSec=99;}
function launch(v){body.vx=v.x;body.vy=v.y;body.grounded=false;body.on=null;
state="flight";aim=null;launchY=body.y;trail.length=0;launchT=.18;flightContacts.length=0;bounceChain=0;
run.launches++;life.launches++;run.started=true;idleT=0;stopHum();
spawnDust(body.x+CH/2,body.y,6,COL.dim);sfx("launch");}
function simStep(){if(state!=="flight")return;
const pv=body.vy,ev=step(body);stepN++;
if(stepN%2===0){trail.push({x:body.x+CH/2,y:body.y+CH/2});if(trail.length>22)trail.shift();}
if(!ev)return;
flightContacts.push(contactOf(body,ev));
if(ev.t==="bounce"){bounceChain++;ev.s.bounceT=.18;launchT=.14;
spawnDust(ev.x,ev.y,RM?5:10,COL.spring);sfx("bounce",{chain:bounceChain});if(!RM)shake=Math.max(shake,3.5);return;}
if(ev.t==="land"){const impact=Math.abs(pv);
body.vx=0;body.vy=0;state="ready";landT=.18;body.on=ev.s;crumbleT=0;crumbleStage=0;bounceChain=0;
spawnDust(body.x+CH/2,body.y,Math.min(16,4+impact/120),COL.dim);sfx("land",{impact});
if(impact>650&&!RM)shake=Math.min(11,(impact-650)/80);
const drop=launchY-body.y;
if(drop>FALL_MIN){run.falls++;life.falls++;run.biggest=Math.max(run.biggest,drop);
flash=Math.min(.45,drop/1600);sfx("fall");
floats.push({x:body.x+CH/2,y:body.y+30,txt:"−"+(drop/10).toFixed(0)+"m",c:COL.red,t:0});}
life.best=Math.max(life.best,body.y);safePos.x=body.x;safePos.y=body.y;save();
if(ev.s.goal)win();}
else{spawnDust(ev.x,ev.y,4,ev.t==="bonk"?COL.amber:COL.dim);sfx(ev.t==="bonk"?"bonk":"wall");if(!RM)shake=Math.max(shake,2.5);}}
/* ---------- crumble ---------- */
function breakPlatform(s){s.dead=true;if(run.dead.indexOf(s.idx)<0)run.dead.push(s.idx);
spawnShards(s);sfx("shatter");if(!RM)shake=Math.max(shake,9);
if(body.on===s){body.on=null;body.vx=0;body.vy=0;body.grounded=false;
state="flight";aim=null;stopHum();launchY=body.y;flightContacts.length=0;trail.length=0;bounceChain=0;}
crumbleT=0;crumbleStage=0;save();}
function updateCrumble(dt){const s=body.on;
if((state==="ready"||state==="aim")&&s&&s.crumble&&!s.dead){
crumbleT+=dt;const p=crumbleT/CRUMBLE_TIME;
const stage=p>=.82?3:p>=.55?2:p>=.28?1:0;
if(stage>crumbleStage){crumbleStage=stage;sfx("crack",{stage});}
if(p>.25&&Math.random()<dt*p*26)spawnDust(s.x+Math.random()*s.w,s.y+s.h,1,COL.amber);
if(crumbleT>=CRUMBLE_TIME)breakPlatform(s);}}
/* ---------- fx ---------- */
function spawnDust(x,y,n,c){if(RM)n=Math.ceil(n/2);
for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*220,vy:Math.random()*160+20,t:0,life:.5+Math.random()*.3,c});
if(parts.length>300)parts.splice(0,parts.length-300);}
function spawnShards(s){const n=RM?6:14;
for(let i=0;i<n;i++)shards.push({x:s.x+Math.random()*s.w,y:s.y+Math.random()*s.h,
vx:(Math.random()-.5)*280,vy:Math.random()*200+40,r:Math.random()*6.28,vr:(Math.random()-.5)*11,
w:4+Math.random()*7,h:3+Math.random()*5,c:Math.random()<.5?COL.plat:COL.edge,t:0,life:.7+Math.random()*.5});
if(shards.length>140)shards.splice(0,shards.length-140);}
function updParts(dt){
for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.t+=dt;p.vy-=G*.35*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t>p.life)parts.splice(i,1);}
for(let i=shards.length-1;i>=0;i--){const s=shards[i];s.t+=dt;s.vy-=G*.6*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.r+=s.vr*dt;if(s.t>s.life)shards.splice(i,1);}
for(let i=confetti.length-1;i>=0;i--){const c=confetti[i];c.t+=dt;c.vy-=G*.5*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=c.vr*dt;if(c.t>2.4)confetti.splice(i,1);}
for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.t+=dt;f.y+=40*dt;if(f.t>1.4)floats.splice(i,1);}}
/* ---------- win / reset / overlays ---------- */
function fmt(s){const t=Math.floor(s*10),m=Math.floor(t/600),sec=Math.floor(t/10)%60,d=t%10;
return m+":"+(sec<10?"0":"")+sec+"."+d;}
function win(){state="win";stopHum();life.summits++;
if(life.bestTime==null||run.time<life.bestTime)life.bestTime=run.time;save();
$("wTime").textContent=fmt(run.time);$("wLaunch").textContent=run.launches;
$("wFall").textContent=run.falls;$("wDrop").textContent=(run.biggest/10).toFixed(1)+"m";
$("share").value="COMMIT · 508m in "+fmt(run.time)+" · "+run.launches+" launches · "+run.falls+" falls · biggest drop "+(run.biggest/10).toFixed(1)+"m. No air control. No mercy.";
if(!RM)for(let i=0;i<90;i++)confetti.push({x:body.x+CH/2,y:body.y+20,vx:(Math.random()-.5)*560,vy:Math.random()*620+120,r:Math.random()*6.28,vr:(Math.random()-.5)*9,c:[COL.blue,COL.green,COL.amber,COL.red,COL.ink][i%5],t:0});
sfx("win");openOv("win");}
function resetRun(){body.x=VW/2-CH/2;body.y=0;body.vx=0;body.vy=0;body.grounded=true;
state="ready";aim=null;stopHum();run={launches:0,falls:0,biggest:0,time:0,started:false,dead:[]};
for(const s of PLATS){s.dead=false;s.bounceT=0;}
body.on=findGround(body.x,body.y);crumbleT=0;crumbleStage=0;bounceChain=0;aimT=AIM_TIME;
safePos.x=body.x;safePos.y=body.y;
trail.length=0;floats.length=0;confetti.length=0;shards.length=0;flightContacts.length=0;flash=0;shake=0;
camY=clampCam(body.y-VH*.38);save();}
function openOv(id){if(state==="aim"){aim=null;state="ready";stopHum();}
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
e.preventDefault();audio();try{cv.setPointerCapture(e.pointerId)}catch(_){}
const p=toLogical(e);aim={mode:"p",id:e.pointerId,ox:p.x,oy:p.y,cx:p.x,cy:p.y};state="aim";idleT=0;
beginAim();sfx("aim");startHum();});
cv.addEventListener("pointermove",e=>{if(!aim||aim.mode!=="p"||e.pointerId!==aim.id)return;
const p=toLogical(e);aim.cx=p.x;aim.cy=p.y;});
function endPointer(e,cancel){if(!aim||aim.mode!=="p"||e.pointerId!==aim.id)return;
if(cancel){aim=null;state="ready";stopHum();return;}
const v=aimV();
if(!v||v.m<MINV){aim=null;state="ready";stopHum();spawnDust(body.x+CH/2,body.y+CH/2,3,COL.dim);sfx("puff");return;}
launch(v);}
cv.addEventListener("pointerup",e=>endPointer(e,false));
cv.addEventListener("pointercancel",e=>endPointer(e,true));
cv.addEventListener("contextmenu",e=>e.preventDefault());
function kbAim(){if(state==="ready"){aim={mode:"k"};state="aim";beginAim();sfx("aim");startHum();}}
addEventListener("keydown",e=>{
if(e.key==="Escape"){if(overlayOpen){if(overlayOpen!=="win")closeOv();}
else if(state==="aim"){aim=null;state="ready";stopHum();sfx("puff");}return;}
if(e.key==="m"||e.key==="M"){audio();setSound(!SND.on);return;}
if(overlayOpen)return;
audio();
if(e.key==="h"||e.key==="H"){openOv("help");return;}
if(e.key==="r"||e.key==="R"){openOv("confirm");return;}
if(state==="flight"||state==="win")return;
const fine=e.shiftKey?0.25:1;let used=true;
switch(e.key){
case"ArrowLeft":kb.a=Math.min(172,kb.a+2.2*fine);break;
case"ArrowRight":kb.a=Math.max(8,kb.a-2.2*fine);break;
case"ArrowUp":kb.p=Math.min(1,kb.p+.022*fine);break;
case"ArrowDown":kb.p=Math.max(.12,kb.p-.022*fine);break;
case" ":case"Enter":
if(state==="aim"&&aim&&aim.mode==="k"){const v=aimV();
if(v&&v.m>=MINV)launch(v);else{aim=null;state="ready";stopHum();}}
else kbAim();
e.preventDefault();return;
default:used=false;}
if(used){e.preventDefault();kbAim();idleT=0;}});
$("bHelp").onclick=()=>{sfx("ui");openOv("help");};
$("bStart").onclick=()=>{sfx("ui");closeOv();};
$("bReset").onclick=()=>{sfx("ui");openOv("confirm");};
$("bNo").onclick=()=>{sfx("ui");closeOv();};
$("bYes").onclick=()=>{closeOv();resetRun();sfx("erase");toast("RUN ERASED · 0m");};
$("bAgain").onclick=()=>{sfx("ui");closeOv();resetRun();};
$("bSound").onclick=()=>{audio();setSound(!SND.on);};
$("bCopy").onclick=async()=>{const ta=$("share");
try{await navigator.clipboard.writeText(ta.value);sfx("copy");toast("COPIED");}
catch(_){ta.focus();ta.select();sfx("ui");toast("PRESS CTRL+C / ⌘C");}};
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
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function drawPlatform(s,now){
const sy=SY(s.y+s.h);if(sy>VH+20||sy+s.h<-20)return;
if(s.dead)return;
let jx=0,jy=0,prog=0;
if(s.crumble&&body.on===s&&crumbleT>0){prog=clamp01(crumbleT/CRUMBLE_TIME);
if(!RM){jx=(Math.random()-.5)*prog*3;jy=(Math.random()-.5)*prog*2;}}
const x=s.x+jx,y=sy+jy;
ctx.fillStyle=COL.plat;ctx.fillRect(x,y,s.w,s.h);
if(s.bounce){const pulse=.6+.4*Math.sin(now*.004);
ctx.fillStyle=COL.spring;ctx.globalAlpha=.55+.45*pulse;ctx.fillRect(x,y,s.w,2);ctx.globalAlpha=1;
const comp=s.bounceT>0?s.bounceT/.18:0;
ctx.fillStyle=COL.spring;ctx.globalAlpha=.8;
const n=Math.max(2,Math.floor(s.w/16));
for(let i=0;i<n;i++){const cx=x+s.w*(i+.5)/n,cy=y+5+comp*3;
ctx.beginPath();ctx.moveTo(cx-4,cy+4);ctx.lineTo(cx,cy-2);ctx.lineTo(cx+4,cy+4);ctx.closePath();ctx.fill();}
ctx.globalAlpha=1;return;}
if(s.crumble){const edge=prog>.66?COL.red:prog>.33?COL.amber:"#8a6a3a";
ctx.fillStyle=edge;ctx.fillRect(x,y,s.w,2);
ctx.strokeStyle="#07090f";ctx.lineWidth=1;
const cracks=2+Math.floor(prog*5);
for(let i=0;i<cracks;i++){const cx=x+s.w*(i+.5)/cracks;
ctx.beginPath();ctx.moveTo(cx,y+2);ctx.lineTo(cx+(i%2?3:-3),y+6+prog*6);ctx.lineTo(cx+(i%2?-2:2),y+s.h-1);ctx.stroke();}
return;}
ctx.fillStyle=COL.edge;ctx.fillRect(x,y,s.w,2);}
function render(now){
const t=clamp01(camY/SUMMIT);
const[top,mid,bot]=skyAt(t);
const g=ctx.createLinearGradient(0,0,0,VH);
g.addColorStop(0,rgb(top));g.addColorStop(.55,rgb(mid));g.addColorStop(1,rgb(bot));
ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
let ox=0,oy=0;if(shake>.1&&!RM){ox=(Math.random()-.5)*shake;oy=(Math.random()-.5)*shake;}
ctx.save();ctx.translate(ox,oy);
for(const s of STARS){const sy=VH-(s.y-camY*.35);if(sy<-4||sy>VH+4)continue;
ctx.globalAlpha=(.25+.35*(.5+.5*Math.sin(now*.001+s.p)))*(1-t*.5);ctx.fillStyle=COL.dim;ctx.fillRect(s.x,sy,s.r,s.r);}
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
for(const s of SOLIDS){if(s.wall||s.ground||s.goal)continue;
if(s.ceil){const sy=SY(s.y+s.h);if(sy>VH+20||sy+s.h<-20)continue;
ctx.fillStyle=COL.plat;ctx.fillRect(s.x,sy,s.w,s.h);
ctx.fillStyle=COL.amber;ctx.fillRect(s.x,sy,s.w,2);ctx.globalAlpha=.35;
for(let x=s.x+4;x<s.x+s.w-4;x+=12)ctx.fillRect(x,sy+s.h-3,6,3);ctx.globalAlpha=1;}
else drawPlatform(s,now);}
{const fx=GOAL.x+GOAL.w/2,fy=SY(GOAL.y+GOAL.h);
ctx.strokeStyle=COL.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-46);ctx.stroke();
ctx.fillStyle=COL.green;ctx.beginPath();ctx.moveTo(fx,fy-46);ctx.lineTo(fx+26,fy-38);ctx.lineTo(fx,fy-30);ctx.closePath();ctx.fill();
ctx.fillStyle=COL.dim;ctx.font="10px ui-monospace,monospace";ctx.fillText("SUMMIT · 508m",GOAL.x-6,fy-56);
ctx.fillStyle=COL.green;ctx.fillRect(GOAL.x,fy,GOAL.w,2);}
for(let i=0;i<trail.length;i++){const p=trail[i];ctx.globalAlpha=(i+1)/trail.length*.5;
ctx.fillStyle=COL.blue;const r=1.5+2*(i/trail.length);ctx.fillRect(p.x-r/2,SY(p.y)-r/2,r,r);}
ctx.globalAlpha=1;
if(state==="aim"&&aim){const v=aimV();
if(v){const pr=preview(v),weak=v.m<MINV;
for(let i=0;i<pr.pts.length;i++){const p=pr.pts[i];
ctx.globalAlpha=.9-(i/pr.pts.length)*.65;ctx.fillStyle=weak?COL.dim:COL.ink;
ctx.fillRect(p.x-1.5,SY(p.y)-1.5,3,3);}
ctx.globalAlpha=1;
for(const m of pr.contacts){const sy=SY(m.y);
if(m.t==="bounce"){ctx.strokeStyle=COL.spring;ctx.lineWidth=2;
ctx.beginPath();ctx.arc(m.x,sy,7,0,6.29);ctx.stroke();
ctx.beginPath();ctx.moveTo(m.x-4,sy+2);ctx.lineTo(m.x,sy-4);ctx.lineTo(m.x+4,sy+2);ctx.stroke();}
else if(m.ok){const pulse=3+Math.sin(now*.012)*1.5;
ctx.strokeStyle=COL.green;ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.x,sy,6+pulse,0,6.29);ctx.stroke();
ctx.fillStyle=COL.green;ctx.beginPath();ctx.arc(m.x,sy,2,0,6.29);ctx.fill();}
else{ctx.strokeStyle=COL.red;ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(m.x-6,sy-6);ctx.lineTo(m.x+6,sy+6);ctx.moveTo(m.x+6,sy-6);ctx.lineTo(m.x-6,sy+6);ctx.stroke();}}
ctx.fillStyle=weak?COL.dim:COL.blue;ctx.font="700 12px ui-monospace,monospace";
ctx.fillText(Math.round(v.m/MAXV*100)+"%",Math.min(body.x+CH+8,VW-42),SY(body.y+CH)-6);
if(aim.mode==="p"){ctx.strokeStyle=COL.blue;ctx.globalAlpha=.5;ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(aim.ox,aim.oy,10,0,6.29);ctx.stroke();
ctx.beginPath();ctx.moveTo(aim.ox,aim.oy);ctx.lineTo(aim.cx,aim.cy);ctx.stroke();ctx.globalAlpha=1;}}}
{let sx=1,sy=1;
if(landT>0){const k=landT/.18;sy=1-.3*k;sx=1+.3*k;}
else if(launchT>0){const k=launchT/.18;sy=1+.28*k;sx=1-.22*k;}
const cx=body.x+CH/2,by=SY(body.y);
if(state==="aim"){const f=clamp01(aimT/AIM_TIME),rad=15,ccx=cx,ccy=by-CH/2;
const col=f>.5?COL.blue:f>.25?COL.amber:COL.red;
ctx.strokeStyle=COL.line;ctx.lineWidth=3;ctx.globalAlpha=.5;
ctx.beginPath();ctx.arc(ccx,ccy,rad,0,6.29);ctx.stroke();ctx.globalAlpha=1;
ctx.strokeStyle=col;ctx.lineWidth=3;
ctx.beginPath();ctx.arc(ccx,ccy,rad,-Math.PI/2,-Math.PI/2+f*6.283);ctx.stroke();
if(f<.3){ctx.globalAlpha=.4+.4*Math.sin(now*.03);ctx.strokeStyle=COL.red;ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(ccx,ccy,rad+4,0,6.29);ctx.stroke();ctx.globalAlpha=1;}}
ctx.save();ctx.translate(cx,by);ctx.scale(sx,sy);
ctx.fillStyle=COL.ink;rr(-CH/2,-CH,CH,CH,4);ctx.fill();
let lx=0,ly=0;
if(state==="aim"&&aim){const v=aimV();if(v){const m=Math.hypot(v.x,v.y)||1;lx=v.x/m*2.4;ly=-v.y/m*2.4;}}
else if(state==="flight"){const m=Math.hypot(body.vx,body.vy)||1;lx=body.vx/m*2.4;ly=-body.vy/m*2.4;}
const blink=blinkT>0?.15:1;ctx.fillStyle="#0a0e1a";
ctx.fillRect(-5+lx,-12+ly,3,4*blink);ctx.fillRect(2+lx,-12+ly,3,4*blink);ctx.restore();}
for(const p of parts){ctx.globalAlpha=Math.max(0,1-p.t/p.life);ctx.fillStyle=p.c;ctx.fillRect(p.x-1.5,SY(p.y)-1.5,3,3);}
for(const s of shards){ctx.save();ctx.translate(s.x,SY(s.y));ctx.rotate(s.r);
ctx.globalAlpha=Math.max(0,1-s.t/s.life);ctx.fillStyle=s.c;ctx.fillRect(-s.w/2,-s.h/2,s.w,s.h);ctx.restore();}
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
function frameLoop(now){if(!manual)rafId=requestAnimationFrame(frameLoop);
let dt=(now-lastT)/1000;lastT=now;if(dt>.25)dt=.25;
const paused=overlayOpen!==null||document.hidden;
if(!paused){if(run.started&&state!=="win")run.time+=dt;
acc+=dt;while(acc>=DT){simStep();acc-=DT;}
if(state==="aim"){aimT-=dt;const sec=Math.ceil(aimT);
if(sec!==lastTickSec){lastTickSec=sec;if(sec>0&&sec<=AIM_TIME)sfx("tick",{urgent:aimT<1});}
if(aimT<=0){const v=aimV();
if(v&&v.m>=MINV){sfx("forced");launch(v);}
else{aim=null;state="ready";stopHum();spawnDust(body.x+CH/2,body.y+CH/2,3,COL.dim);sfx("puff");}}}
updateCrumble(dt);
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
load();resize();applySoundBtn();if(!life.seen)openOv("help");
lastT=performance.now();rafId=requestAnimationFrame(frameLoop);
/* ---------- test hook (manual clock for test.html; inert in normal play) ---------- */
window.__COMMIT__={takeControl(){manual=true;cancelAnimationFrame(rafId);},tick(now){frameLoop(now);},
launch,preview,step,resetRun,openOv,closeOv,save,load,spawnDust,resize,setSound,beginAim,
setBody(x,y){body.x=x;body.y=y;body.vx=0;body.vy=0;body.grounded=true;state="ready";aim=null;
body.on=findGround(x,y);crumbleT=0;crumbleStage=0;aimT=AIM_TIME;safePos.x=x;safePos.y=y;},
get state(){return state},get body(){return body},get run(){return run},get life(){return life},get aim(){return aim},
get kb(){return kb},get camY(){return camY},get flash(){return flash},get shake(){return shake},get idleT(){return idleT},
get aimT(){return aimT},get crumbleT(){return crumbleT},get bounceChain(){return bounceChain},
get trail(){return trail},get parts(){return parts},get shards(){return shards},get confetti(){return confetti},get floats(){return floats},
get overlayOpen(){return overlayOpen},get flightContacts(){return flightContacts},get flightContact(){return flightContacts[0]||null},get safePos(){return safePos},
SOLIDS,PLATS,GOAL,P,CEIL,RM,snd:SND,skyAt,
C:{VW,VH,DT,G,MAXV,MINV,KDRAG,CH,SUMMIT,FALL_MIN,VFALL,AIM_TIME,CRUMBLE_TIME,BOUNCE_V}};
})();
