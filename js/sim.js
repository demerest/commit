/* COMMIT — simulation. The Commit Contract: preview() and flight share step(), pixel-exact.
   Ice rule: landing drifts you the way you came in (sign of vx); a straight-down landing stands still.
   Movers ride a shared fixed-step world clock (worldT); step(b,t) reads their rects purely, so the
   preview simulates the same future platform motion the flight will meet. Launch discards carry. */
"use strict";
const body={x:VW/2-CH/2,y:0,vx:0,vy:0,grounded:true,on:null,slide:0,slideT:0};
let state="ready",aim=null,pendingV=null;const kb={a:65,p:.6};
let run={launches:0,falls:0,biggest:0,time:0,started:false,dead:[],slide:0};
let launchY=0,bounceChain=0,crumbleT=0,crumbleStage=0,aimT=AIM_TIME,lastTickSec=99,idleT=0,stepN=0,worldT=0;
const flightContacts=[];
/* ---------- movers: constant-speed ping-pong, pure functions of the world clock ---------- */
function tri(u){u=((u%1)+1)%1;return u<.5?4*u-1:3-4*u;}
function moverXY(s,t){if(s.move===7){const a=2*Math.PI*(t/s.period+s.phase);
return{x:s.bx+Math.cos(a)*s.amp,y:s.by+Math.sin(a)*s.amp};}
const o=tri(t/s.period+s.phase)*s.amp;
return s.move===4?{x:s.bx+o,y:s.by}:{x:s.bx,y:s.by+o};}
function moverV(s,t){if(s.move===7){const a=2*Math.PI*(t/s.period+s.phase),sp=s.amp*2*Math.PI/s.period;
return{x:-Math.sin(a)*sp,y:Math.cos(a)*sp};}
const u=((t/s.period+s.phase)%1+1)%1;const sp=4*s.amp/s.period*(u<.5?1:-1);
return s.move===4?{x:sp,y:0}:{x:0,y:sp};}
function rectOf(s,t){if(!s.move)return s;const o=moverXY(s,t);return{x:o.x,y:o.y,w:s.w,h:s.h};}
/* phase platforms: solid for duty fraction of each cycle, ghost (pass-through) otherwise.
   Pure predicate of (s,t) read inside step — never mutate s.dead (keeps preview===flight). */
function solidAt(s,t){if(!s.clock)return true;const u=((t/s.period+s.phase)%1+1)%1;return u<s.duty;}
/* phase ticks are diegetic: only on-screen platforms near the rider (or the one underfoot)
   make a sound, so a tower full of clocks isn't a global metronome */
function updateClocks(){for(const s of PLATS){if(!s.clock||s.dead)continue;
const a=solidAt(s,worldT-DT),b=solidAt(s,worldT);if(a===b)continue;
const vis=s.y+s.h>camY-40&&s.y<camY+VH+40;
const near=Math.abs((s.y+s.h)-body.y)<300;
if(vis&&(body.on===s||near))sfx("phase",{on:b,local:body.on===s});}}
function findGround(x,y){for(const s of SOLIDS){if(s.dead||s.wall||!solidAt(s,worldT))continue;const r=rectOf(s,worldT);
if(Math.abs((r.y+r.h)-y)<.6&&x<r.x+r.w&&x+CH>r.x)return s;}return null;}
/* ---------- physics (shared by flight and preview) ---------- */
function hitR(b,r){return b.x<r.x+r.w&&b.x+CH>r.x&&b.y<r.y+r.h&&b.y+CH>r.y}
function step(b,t){
/* gust zones: constant extra accel while the body centre is inside, flight only (pure fn of pos) */
for(const z of ZONES){const cx=b.x+CH/2,cy=b.y+CH/2;
if(cx>z.x&&cx<z.x+z.w&&cy>z.y&&cy<z.y+z.h){b.vx+=z.ax*DT;b.vy+=z.ay*DT;}}
b.vy-=G*DT;if(b.vy<VFALL)b.vy=VFALL;let ev=null;
const y0=b.y;
b.x+=b.vx*DT;
for(const s of SOLIDS){if(s.dead||!solidAt(s,t))continue;const r=rectOf(s,t);if(hitR(b,r)){
/* overlap created by the platform's own motion is a top/bottom approach, not a side wall */
if(s.move){const pr=rectOf(s,t-DT);
if(y0>=pr.y+pr.h-1e-6||y0+CH<=pr.y+1e-6)continue;}
if(b.vx>0)b.x=r.x-CH;else if(b.vx<0)b.x=r.x+r.w;
if(b.vx!==0){b.vx=0;ev={t:"wall",x:b.x+CH/2,y:b.y+CH/2};}}}
b.y+=b.vy*DT;b.grounded=false;
for(const s of SOLIDS){if(s.dead||!solidAt(s,t))continue;const r=rectOf(s,t);if(hitR(b,r)){
const pr=s.move?rectOf(s,t-DT):r;
const above=y0>=pr.y+pr.h-1e-6,below=y0+CH<=pr.y+1e-6;
if(above||(!below&&b.vy<=0)){b.y=r.y+r.h;
if(s.dir){b.vx=s.dvx;b.vy=s.dvy;ev={t:"bounce",s,x:b.x+CH/2,y:b.y};}
else if(s.bounce){b.vy=BOUNCE_V;ev={t:"bounce",s,x:b.x+CH/2,y:b.y};}
else{b.vy=0;b.grounded=true;ev={t:"land",s};}}
else{b.y=r.y-CH;b.vy=0;ev={t:"bonk",x:b.x+CH/2,y:b.y+CH};}}}
return ev;}
function contactOf(b,ev){return{x:b.x+CH/2,y:b.y+(ev.t==="land"||ev.t==="bounce"?0:CH/2),t:ev.t,ok:ev.t==="land",
goal:!!(ev.s&&ev.s.goal),ice:!!(ev.s&&ev.s.ice),move:(ev.s&&ev.s.move)||0,clock:!!(ev.s&&ev.s.clock),dir:!!(ev.s&&ev.s.dir),idx:ev.s&&ev.s.idx!=null?ev.s.idx:-1};}
function preview(v){const b={x:body.x,y:body.y,vx:v.x,vy:v.y,grounded:false};
const pts=[],contacts=[];let mark=null,markT=0,t=worldT;
for(let i=0;i<900;i++){t+=DT;const ev=step(b,t);
if(i%3===0)pts.push({x:b.x+CH/2,y:b.y+CH/2});
if(ev){const c=contactOf(b,ev);contacts.push(c);mark=c;markT=t;if(ev.t!=="bounce")break;}
if(b.y<-80)break;}
return{pts,contacts,mark,markT};}
/* ---------- aiming ---------- */
function aimV(){if(!aim)return null;let vx,vy;
if(aim.mode==="p"){vx=(aim.cx-aim.ox)*KDRAG;vy=(aim.oy-aim.cy)*KDRAG;}
else{const a=kb.a*Math.PI/180;vx=Math.cos(a)*kb.p*MAXV;vy=Math.sin(a)*kb.p*MAXV;}
const m=Math.hypot(vx,vy);if(m>MAXV){vx*=MAXV/m;vy*=MAXV/m;}
return{x:vx,y:vy,m:Math.min(m,MAXV)};}
function beginAim(){aimT=AIM_TIME;lastTickSec=99;}
/* Pre-aim: aiming may start mid-flight; a launch attempt while airborne buffers the arc
   (pendingV) and fires it on the instant of true landing. Nothing launches mid-air. */
function commitAim(){const v=aimV();
if(!v||v.m<MINV){aim=null;pendingV=null;if(state==="aim")state="ready";stopHum();
spawnDust(body.x+CH/2,body.y+CH/2,3,COL.dim);sfx("puff");return;}
if(state==="flight"){pendingV=v;stopHum();sfx("queue");return;}
launch(v);}
function launch(v){body.vx=v.x;body.vy=v.y;body.grounded=false;body.on=null;body.slide=0;body.slideT=0;
state="flight";aim=null;pendingV=null;launchY=body.y;trail.length=0;launchT=.18;flightContacts.length=0;bounceChain=0;
run.launches++;life.launches++;run.started=true;idleT=0;stopHum();stopSlide();
spawnDust(body.x+CH/2,body.y,6,COL.dim);sfx("launch");}
function simStep(){if(state!=="flight")return;
const pv=body.vy,pvx=body.vx,ev=step(body,worldT);stepN++;
if(stepN%2===0){trail.push({x:body.x+CH/2,y:body.y+CH/2});if(trail.length>22)trail.shift();}
if(!ev)return;
flightContacts.push(contactOf(body,ev));
if(ev.t==="bounce"){bounceChain++;ev.s.bounceT=.18;launchT=.14;
spawnDust(ev.x,ev.y,RM?5:10,ev.s.dir?COL.dir:COL.spring);
if(ev.s.dir)sfx("dirspring",{vx:ev.s.dvx,vy:ev.s.dvy});else sfx("bounce",{chain:bounceChain});
if(!RM)shake=Math.max(shake,3.5);return;}
if(ev.t==="land"){const impact=Math.abs(pv);
body.vx=0;body.vy=0;state="ready";landT=.18;body.on=ev.s;crumbleT=0;crumbleStage=0;bounceChain=0;
body.slide=ev.s.ice?(pvx>0?1:pvx<0?-1:0):0;body.slideT=0;run.slide=body.slide;
if(ev.s.ice){sfx("ice",{impact});spawnSpray(body.x+CH/2,body.y,body.slide||1);if(body.slide)startSlide();}
else if(ev.s.move){spawnDust(body.x+CH/2,body.y,Math.min(16,4+impact/120),COL.mover);sfx("land",{impact});sfx("move",{impact});}
else{spawnDust(body.x+CH/2,body.y,Math.min(16,4+impact/120),COL.dim);sfx("land",{impact});}
if(impact>650&&!RM)shake=Math.min(11,(impact-650)/80);
const drop=launchY-body.y;
if(drop>FALL_MIN){run.falls++;life.falls++;run.biggest=Math.max(run.biggest,drop);
flash=Math.min(.45,drop/1600);sfx("fall");
floats.push({x:body.x+CH/2,y:body.y+30,txt:"−"+(drop/10).toFixed(0)+"m",c:COL.red,t:0});}
life.best[level]=Math.max(life.best[level]||0,body.y);safePos.x=body.x;safePos.y=body.y;save();
if(ev.s.goal)win();
if(pendingV&&state==="ready"){const v=pendingV;pendingV=null;launch(v);}}
else{spawnDust(ev.x,ev.y,4,ev.t==="bonk"?COL.amber:COL.dim);sfx(ev.t==="bonk"?"bonk":"wall");if(!RM)shake=Math.max(shake,2.5);}}
/* ---------- crumble ---------- */
function breakPlatform(s){s.dead=true;s.respawnT=RESPAWN_TIME;if(run.dead.indexOf(s.idx)<0)run.dead.push(s.idx);
spawnShards(s);sfx("shatter");if(!RM)shake=Math.max(shake,9);
if(body.on===s){body.on=null;body.vx=0;body.vy=0;body.grounded=false;body.slide=0;body.slideT=0;
state="flight";aim=null;stopHum();stopSlide();launchY=body.y;flightContacts.length=0;trail.length=0;bounceChain=0;}
crumbleT=0;crumbleStage=0;save();}
function updateCrumble(dt){const s=body.on;
if((state==="ready"||state==="aim")&&s&&s.crumble&&!s.dead){
crumbleT+=dt;const p=crumbleT/CRUMBLE_TIME;
const stage=p>=.82?3:p>=.55?2:p>=.28?1:0;
if(stage>crumbleStage){crumbleStage=stage;sfx("crack",{stage});}
if(p>.25&&Math.random()<dt*p*26)spawnDust(s.x+Math.random()*s.w,s.y+s.h,1,COL.amber);
if(crumbleT>=CRUMBLE_TIME)breakPlatform(s);}}
/* cracked platforms reform after a cooldown so the climb is never permanently blocked */
function updateRespawn(dt){let changed=false;
for(const s of PLATS){if(s.dead&&s.crumble&&s.respawnT>0){
s.respawnT-=dt;
if(s.respawnT<=0){s.respawnT=0;s.dead=false;
const k=run.dead.indexOf(s.idx);if(k>=0)run.dead.splice(k,1);
spawnDust(s.x+s.w/2,s.y+s.h,RM?4:8,COL.spring);sfx("reform");changed=true;}}}
if(changed)save();}
/* ---------- ice: slow drift away from the side you entered from ---------- */
function updateIce(dt){const s=body.on;
if((state==="ready"||state==="aim")&&s&&s.ice&&!s.dead&&body.slide!==0){
body.slideT=Math.min(ICE_RAMP,body.slideT+dt);
const v=ICE_V*clamp01(body.slideT/ICE_RAMP);
body.x+=body.slide*v*dt;
if(Math.random()<dt*14)spawnSpray(body.x+CH/2-body.slide*CH/2,body.y,body.slide);
if(body.x+CH<=s.x||body.x>=s.x+s.w){
body.on=null;body.grounded=false;body.vx=body.slide*v;body.vy=0;body.slide=0;body.slideT=0;
state="flight";aim=null;stopHum();stopSlide();launchY=body.y;flightContacts.length=0;trail.length=0;bounceChain=0;
sfx("slip");save();}}}
/* ---------- movers: carry the rider each fixed step (exact carry — no relative slide).
   A vertical lift that presses you into a solid drops you honestly. ---------- */
function dropRider(vx,vy,sound){body.on=null;body.grounded=false;body.vx=vx;body.vy=vy;body.slide=0;body.slideT=0;
state="flight";aim=null;stopHum();stopSlide();launchY=body.y;flightContacts.length=0;trail.length=0;bounceChain=0;
sfx(sound);save();}
function groundStep(){const s=body.on;
if((state==="ready"||state==="aim")&&s&&s.clock&&!s.dead&&!solidAt(s,worldT)){dropRider(0,0,"phaseout");return;}
if((state==="ready"||state==="aim")&&s&&s.move&&!s.dead){
const a=moverXY(s,worldT-DT),b=moverXY(s,worldT);
const va=moverV(s,worldT-DT),vb=moverV(s,worldT);
if(s.move!==7&&(va.x!==vb.x||va.y!==vb.y))sfx("reverse",{dir:vb.x||vb.y});
if(s.move===4)body.x+=b.x-a.x;
else if(s.move===7){body.x+=b.x-a.x;body.y+=b.y-a.y;}
else body.y=b.y+s.h;
if(s.move===5||s.move===7){for(const o of SOLIDS){if(o===s||o.dead||o.wall||o.ground)continue;
if(hitR(body,rectOf(o,worldT))){dropRider(0,0,"bonk");return;}}}}}