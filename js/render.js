/* COMMIT — Canvas 2D rendering. Every visual is a primitive; no image files. */
"use strict";
const cv=$("cv"),ctx=cv.getContext("2d"),frame=$("frame");
let scale=1,dpr=1,camY=-140,blinkT=0,blinkTimer=3;
const clampCam=t=>Math.max(-140,Math.min(t,SUMMIT+260-VH));
function resize(){scale=Math.min(innerWidth/VW,innerHeight/VH);
dpr=Math.min(devicePixelRatio||1,2);
cv.width=Math.round(VW*scale*dpr);cv.height=Math.round(VH*scale*dpr);
cv.style.width=VW*scale+"px";cv.style.height=VH*scale+"px";
frame.style.width=VW*scale+"px";frame.style.height=VH*scale+"px";
frame.style.fontSize=Math.max(11,16*scale)+"px";
ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);}
const SY=wy=>VH-(wy-camY);
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function drawPlatform(s,now){
const sy=SY(s.y+s.h);if(sy>VH+20||sy+s.h<-20)return;
if(s.dead){
if(s.crumble&&s.respawnT>0){const f=1-clamp01(s.respawnT/RESPAWN_TIME);
ctx.save();ctx.globalAlpha=.26+.12*Math.sin(now*.006);
ctx.strokeStyle=COL.edge;ctx.lineWidth=1;ctx.setLineDash([4,4]);
ctx.strokeRect(s.x+.5,sy+.5,s.w-1,s.h-1);ctx.setLineDash([]);
ctx.globalAlpha=.85;ctx.fillStyle=COL.spring;ctx.fillRect(s.x,sy,s.w*f,2);ctx.restore();}
return;}
if(s.ice){const x=s.x,y=sy;
ctx.fillStyle="#152232";ctx.fillRect(x,y,s.w,s.h);
ctx.fillStyle=COL.ice;ctx.fillRect(x,y,s.w,2);
ctx.strokeStyle="rgba(255,255,255,.25)";ctx.lineWidth=1;
for(let i=0;i<3;i++){const cx=x+s.w*(i+.5)/3;
ctx.beginPath();ctx.moveTo(cx-3,y+4);ctx.lineTo(cx+3,y+s.h-3);ctx.stroke();}
const sh=((now*.02)%(s.w+40))-20;
ctx.save();ctx.beginPath();ctx.rect(x,y,s.w,s.h);ctx.clip();
ctx.strokeStyle="rgba(255,255,255,.14)";ctx.lineWidth=5;
ctx.beginPath();ctx.moveTo(x+sh,y+s.h);ctx.lineTo(x+sh+10,y);ctx.stroke();ctx.restore();
if(body.on===s&&body.slide!==0){const d=body.slide,n=Math.max(2,Math.floor(s.w/18));
ctx.fillStyle=COL.ice;ctx.globalAlpha=.9;
for(let i=0;i<n;i++){const cx=x+s.w*(i+.5)/n,cy=y+9;
ctx.beginPath();ctx.moveTo(cx-3*d,cy-3);ctx.lineTo(cx+3*d,cy);ctx.lineTo(cx-3*d,cy+3);ctx.closePath();ctx.fill();}
ctx.globalAlpha=1;}
return;}
if(s.move){const x=s.x,y=sy;
ctx.save();ctx.strokeStyle=COL.mover;ctx.globalAlpha=.3;ctx.lineWidth=1;ctx.setLineDash([3,5]);
if(s.move===4){const ty=y+s.h/2;
ctx.beginPath();ctx.moveTo(s.bx-s.amp,ty);ctx.lineTo(s.bx+s.amp+s.w,ty);ctx.stroke();ctx.setLineDash([]);
ctx.fillStyle=COL.mover;ctx.fillRect(s.bx-s.amp-2,ty-4,2,8);ctx.fillRect(s.bx+s.amp+s.w,ty-4,2,8);}
else{const tx=x+s.w/2;
ctx.beginPath();ctx.moveTo(tx,SY(s.by+s.amp+s.h));ctx.lineTo(tx,SY(s.by-s.amp+s.h));ctx.stroke();ctx.setLineDash([]);
ctx.fillStyle=COL.mover;ctx.fillRect(tx-4,SY(s.by+s.amp+s.h),8,2);ctx.fillRect(tx-4,SY(s.by-s.amp+s.h)-2,8,2);}
ctx.restore();
ctx.fillStyle="#1b1230";ctx.fillRect(x,y,s.w,s.h);
ctx.fillStyle=COL.mover;ctx.fillRect(x,y,s.w,2);
ctx.strokeStyle="rgba(209,123,255,.35)";ctx.lineWidth=1;
ctx.strokeRect(x+.5,y+.5,s.w-1,s.h-1);
const v=moverV(s,worldT),d=s.move===4?Math.sign(v.x):Math.sign(v.y);
const n=Math.max(2,Math.floor(s.w/18));
ctx.fillStyle=COL.mover;ctx.globalAlpha=.85;
for(let i=0;i<n;i++){const cx=x+s.w*(i+.5)/n,cy=y+9;
ctx.beginPath();
if(s.move===4){ctx.moveTo(cx-3*d,cy-3);ctx.lineTo(cx+3*d,cy);ctx.lineTo(cx-3*d,cy+3);}
else{ctx.moveTo(cx-3,cy+3*d);ctx.lineTo(cx,cy-3*d);ctx.lineTo(cx+3,cy+3*d);}
ctx.closePath();ctx.fill();}
ctx.globalAlpha=1;return;}
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
else{if(s.move){const r=rectOf(s,worldT);s.x=r.x;s.y=r.y;}drawPlatform(s,now);}}
{const fx=GOAL.x+GOAL.w/2,fy=SY(GOAL.y+GOAL.h);
ctx.strokeStyle=COL.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-46);ctx.stroke();
ctx.fillStyle=COL.green;ctx.beginPath();ctx.moveTo(fx,fy-46);ctx.lineTo(fx+26,fy-38);ctx.lineTo(fx,fy-30);ctx.closePath();ctx.fill();
ctx.fillStyle=COL.dim;ctx.font="10px ui-monospace,monospace";ctx.fillText("SUMMIT · "+(SUMMIT/10)+"m",GOAL.x-6,fy-56);
ctx.fillStyle=COL.green;ctx.fillRect(GOAL.x,fy,GOAL.w,2);}
for(let i=0;i<trail.length;i++){const p=trail[i];ctx.globalAlpha=(i+1)/trail.length*.5;
ctx.fillStyle=COL.blue;const r=1.5+2*(i/trail.length);ctx.fillRect(p.x-r/2,SY(p.y)-r/2,r,r);}
ctx.globalAlpha=1;
if(aim&&(state==="aim"||state==="flight")){const v=pendingV||aimV();
if(v){const pr=preview(v),weak=v.m<MINV;
/* ghost the target mover at contact time so the ring visibly sits on its future position */
if(pr.mark&&pr.mark.move){const gs=PLATS[pr.mark.idx],gr=rectOf(gs,pr.markT),gy=SY(gr.y+gr.h);
ctx.save();ctx.strokeStyle=COL.mover;ctx.globalAlpha=.45;ctx.lineWidth=1;ctx.setLineDash([4,4]);
ctx.strokeRect(gr.x+.5,gy+.5,gr.w-1,gr.h-1);ctx.setLineDash([]);ctx.restore();}
for(let i=0;i<pr.pts.length;i++){const p=pr.pts[i];
ctx.globalAlpha=weak?.35:.85;ctx.fillStyle=weak?COL.dim:COL.ink;
ctx.fillRect(p.x-1.5,SY(p.y)-1.5,3,3);}
ctx.globalAlpha=1;
for(const m of pr.contacts){const sy=SY(m.y);
if(m.t==="bounce"){ctx.strokeStyle=COL.spring;ctx.lineWidth=2;
ctx.beginPath();ctx.arc(m.x,sy,7,0,6.29);ctx.stroke();
ctx.beginPath();ctx.moveTo(m.x-4,sy+2);ctx.lineTo(m.x,sy-4);ctx.lineTo(m.x+4,sy+2);ctx.stroke();}
else if(m.ok){const pulse=3+Math.sin(now*.012)*1.5;
const rc=m.move?COL.mover:m.ice?COL.ice:COL.green;
ctx.strokeStyle=rc;ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.x,sy,6+pulse,0,6.29);ctx.stroke();
ctx.fillStyle=rc;ctx.beginPath();ctx.arc(m.x,sy,2,0,6.29);ctx.fill();}
else{ctx.strokeStyle=COL.red;ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(m.x-6,sy-6);ctx.lineTo(m.x+6,sy+6);ctx.moveTo(m.x+6,sy-6);ctx.lineTo(m.x-6,sy+6);ctx.stroke();}}
ctx.fillStyle=weak?COL.dim:COL.blue;ctx.font="700 12px ui-monospace,monospace";
const lbl=pendingV?"QUEUED · "+Math.round(v.m/MAXV*100)+"%":aim.mode==="k"?Math.round(kb.a)+"° · "+Math.round(v.m/MAXV*100)+"%":Math.round(v.m/MAXV*100)+"%";
ctx.fillText(lbl,Math.min(body.x+CH+8,VW-(pendingV?118:aim.mode==="k"?86:42)),SY(body.y+CH)-6);
if(aim.mode==="p"&&!pendingV){ctx.strokeStyle=COL.blue;ctx.globalAlpha=.5;ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(aim.ox,aim.oy,10,0,6.29);ctx.stroke();
ctx.beginPath();ctx.moveTo(aim.ox,aim.oy);ctx.lineTo(aim.cx,aim.cy);ctx.stroke();ctx.globalAlpha=1;}}}
{let sx=1,sy=1;
if(landT>0){const k=landT/.18;sy=1-.3*k;sx=1+.3*k;}
else if(launchT>0){const k=launchT/.18;sy=1+.28*k;sx=1-.22*k;}
const cx=body.x+CH/2,by=SY(body.y);
if(aim&&(state==="aim"||state==="flight")){const f=pendingV?1:clamp01(aimT/AIM_TIME),rad=15,ccx=cx,ccy=by-CH/2;
const col=pendingV?COL.amber:f>.5?COL.blue:f>.25?COL.amber:COL.red;
ctx.strokeStyle=COL.line;ctx.lineWidth=3;ctx.globalAlpha=.5;
ctx.beginPath();ctx.arc(ccx,ccy,rad,0,6.29);ctx.stroke();ctx.globalAlpha=1;
ctx.strokeStyle=col;ctx.lineWidth=3;
ctx.beginPath();ctx.arc(ccx,ccy,rad,-Math.PI/2,-Math.PI/2+f*6.283);ctx.stroke();
if(!pendingV&&f<.3){ctx.globalAlpha=.4+.4*Math.sin(now*.03);ctx.strokeStyle=COL.red;ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(ccx,ccy,rad+4,0,6.29);ctx.stroke();ctx.globalAlpha=1;}}
ctx.save();ctx.translate(cx,by);ctx.scale(sx,sy);
if(body.on&&body.on.ice&&body.slide!==0)ctx.rotate(body.slide*.07);
else if(body.on&&body.on.move===4)ctx.rotate(moverV(body.on,worldT).x>0?.05:-.05);
ctx.fillStyle=COL.ink;rr(-CH/2,-CH,CH,CH,4);ctx.fill();
let lx=0,ly=0;
if(aim&&(state==="aim"||state==="flight")){const v=pendingV||aimV();if(v){const m=Math.hypot(v.x,v.y)||1;lx=v.x/m*2.4;ly=-v.y/m*2.4;}}
else if(state==="flight"){const m=Math.hypot(body.vx,body.vy)||1;lx=body.vx/m*2.4;ly=-body.vy/m*2.4;}
else if(body.slide!==0){lx=body.slide*1.6;}
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
ctx.fillStyle=COL.amber;ctx.fillRect(x-5,y1r-(y1r-y0r)*clamp01((life.best[level]||0)/SUMMIT)-1,10,2);
ctx.fillStyle=COL.green;ctx.fillRect(x-4,y0r-6,8,3);}
ctx.restore();
if(flash>.01){ctx.fillStyle="rgba(255,93,93,"+flash+")";ctx.fillRect(0,0,VW,VH);}
const vg=ctx.createRadialGradient(VW/2,VH/2,VH*.35,VW/2,VH/2,VH*.75);
vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.42)");
ctx.fillStyle=vg;ctx.fillRect(0,0,VW,VH);}