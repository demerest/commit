/* COMMIT — web level editor. Loads the real integrator (js/sim.js) so VALIDATE uses the
   same step()/preview() as the game. Exports/imports COMMIT_LEVEL(<json>) descriptors.
   Published alongside the game; the game UI never links to it (the README does). */
"use strict";
(function(){
const cv=$("cv"),ctx=cv.getContext("2d");
const TY=["solid","crumble","bounce","ice","move·h","move·v","clock"];
const TCOL=[COL.edge,"#8a6a3a",COL.spring,COL.ice,COL.mover,COL.mover,COL.phase];
let ed=null,sel=null,camY=-100,scale=1,drag=null;
const clone=o=>JSON.parse(JSON.stringify(o));
function rebuild(){
LVL=ed;SUMMIT=ed.summit;P=ed.plats;CEIL=ed.ceil;SECTIONS=ed.sections;NOTES=ed.notes;
SOLIDS.length=0;PLATS.length=0;ZONES.length=0;
SOLIDS.push({x:-60,y:-60,w:VW+120,h:60,ground:true},{x:-60,y:0,w:60,h:SUMMIT+900,wall:true},{x:VW,y:0,w:60,h:SUMMIT+900,wall:true});
P.forEach(([x,t,w,ty,amp,per,ph],i)=>{const s={x,y:t-16,w,h:16,idx:i,crumble:ty===1,bounce:ty===2,ice:ty===3,
move:ty===4?4:ty===5?5:0,clock:ty===6?1:0,duty:ty===6?(amp||.6):0,bx:x,by:t-16,amp:amp||60,period:per||2.4,phase:ph||0,dead:false};PLATS.push(s);SOLIDS.push(s);});
for(const z of(ed.zones||[]))ZONES.push({x:z[0],y:z[1],w:z[2],h:z[3],ax:z[4],ay:z[5]});
for(const[x,t,w]of CEIL)SOLIDS.push({x,y:t-16,w,h:16,ceil:true});
GOAL={x:ed.goal[0],y:SUMMIT-16,w:ed.goal[1],h:16,goal:true};SOLIDS.push(GOAL);}
const SY=wy=>cv.height-(wy-camY)*scale;
const WX=sx=>sx/scale, WY=sy=>camY+(cv.height-sy)/scale;
function resize(){cv.width=cv.clientWidth;cv.height=cv.clientHeight;scale=cv.width/VW;draw();}
addEventListener("resize",resize);
function draw(){
ctx.setTransform(1,0,0,1,0,0);
ctx.fillStyle="#0a0e1a";ctx.fillRect(0,0,cv.width,cv.height);
ctx.strokeStyle=COL.line;ctx.lineWidth=1;ctx.fillStyle=COL.dim;ctx.font="10px ui-monospace,monospace";
const y0=Math.floor(camY/100)*100;
for(let wy=y0;wy<camY+cv.height/scale+100;wy+=100){const sy=SY(wy);
ctx.globalAlpha=wy%500===0?.4:.12;ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(cv.width,sy);ctx.stroke();
if(wy%500===0&&wy>0){ctx.globalAlpha=.6;ctx.fillText(wy/10+"m",4,sy-3);}}
ctx.globalAlpha=1;
const gy=SY(0);if(gy<cv.height){ctx.fillStyle=COL.plat;ctx.fillRect(0,gy,cv.width,cv.height-gy);ctx.fillStyle=COL.edge;ctx.fillRect(0,gy,cv.width,2);}
ctx.fillStyle=COL.plat;ctx.fillRect(0,0,4*scale,cv.height);ctx.fillRect(cv.width-4*scale,0,4*scale,cv.height);
for(const[x,t,w]of ed.ceil){const sy=SY(t);ctx.fillStyle=COL.plat;ctx.fillRect(x*scale,sy,w*scale,16*scale);ctx.fillStyle=COL.amber;ctx.fillRect(x*scale,sy,w*scale,2);}
for(const z of(ed.zones||[])){const zy=SY(z[1]+z[3]);ctx.save();ctx.fillStyle=COL.zone;ctx.globalAlpha=.08;
ctx.fillRect(z[0]*scale,zy,z[2]*scale,z[3]*scale);ctx.globalAlpha=.4;ctx.strokeStyle=COL.zone;ctx.lineWidth=1;
ctx.setLineDash([2,6]);ctx.strokeRect(z[0]*scale+.5,zy+.5,z[2]*scale-1,z[3]*scale-1);ctx.setLineDash([]);
ctx.globalAlpha=.7;ctx.fillStyle=COL.zone;ctx.font="9px ui-monospace,monospace";
ctx.fillText((z[4]?"gust "+z[4]:"updraft "+z[5]),z[0]*scale+4,zy+12);ctx.restore();}
ed.plats.forEach(([x,t,w,ty,amp],i)=>{const sy=SY(t);
if(ty===4||ty===5){const a=amp||60;
ctx.save();ctx.strokeStyle=COL.mover;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.setLineDash([3,5]);
if(ty===4){const ty2=sy+8*scale;ctx.beginPath();ctx.moveTo((x-a)*scale,ty2);ctx.lineTo((x+a+w)*scale,ty2);ctx.stroke();}
else{const tx=(x+w/2)*scale;ctx.beginPath();ctx.moveTo(tx,SY(t+a));ctx.lineTo(tx,SY(t-a));ctx.stroke();}
ctx.setLineDash([]);ctx.restore();}
ctx.fillStyle=ty===3?"#152232":ty===4||ty===5?"#1b1230":ty===6?"#241d0e":COL.plat;ctx.fillRect(x*scale,sy,w*scale,16*scale);
ctx.fillStyle=TCOL[ty];ctx.fillRect(x*scale,sy,w*scale,2);
if(ty===6){ctx.save();ctx.strokeStyle=COL.phase;ctx.globalAlpha=.5;ctx.lineWidth=1;ctx.setLineDash([4,4]);
ctx.strokeRect(x*scale+.5,sy+.5,w*scale-1,16*scale-1);ctx.setLineDash([]);ctx.restore();}
if(ty===4||ty===5){ctx.fillStyle=COL.mover;const cx=(x+w/2)*scale,cy=sy+9*scale;
ctx.beginPath();
if(ty===4){ctx.moveTo(cx-6,cy-3);ctx.lineTo(cx-2,cy);ctx.lineTo(cx-6,cy+3);ctx.moveTo(cx+6,cy-3);ctx.lineTo(cx+2,cy);ctx.lineTo(cx+6,cy+3);}
else{ctx.moveTo(cx-3,cy+2);ctx.lineTo(cx,cy-2);ctx.lineTo(cx+3,cy+2);ctx.moveTo(cx-3,cy+6);ctx.lineTo(cx,cy+2);ctx.lineTo(cx+3,cy+6);}
ctx.closePath();ctx.fill();}
if(sel&&sel.kind==="p"&&sel.idx===i){ctx.strokeStyle=COL.blue;ctx.lineWidth=2;ctx.strokeRect(x*scale-1,sy-1,w*scale+2,16*scale+2);
ctx.fillStyle=COL.blue;ctx.fillRect(x*scale+w*scale-3,sy,6,16*scale);}});
if(sel&&sel.kind==="c"){const[x,t,w]=ed.ceil[sel.idx];const sy=SY(t);ctx.strokeStyle=COL.blue;ctx.lineWidth=2;ctx.strokeRect(x*scale-1,sy-1,w*scale+2,16*scale+2);}
{const fx=(ed.goal[0]+ed.goal[1]/2)*scale,fy=SY(ed.summit);
ctx.strokeStyle=COL.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-30);ctx.stroke();
ctx.fillStyle=COL.green;ctx.beginPath();ctx.moveTo(fx,fy-30);ctx.lineTo(fx+18,fy-24);ctx.lineTo(fx,fy-18);ctx.closePath();ctx.fill();
ctx.fillStyle=COL.green;ctx.fillRect(ed.goal[0]*scale,fy,ed.goal[1]*scale,2);}
ctx.fillStyle=COL.dim;ctx.font="10px ui-monospace,monospace";ctx.textAlign="center";
for(const[nx,ny,txt]of ed.notes){const sy=SY(ny);if(sy>-10&&sy<cv.height+10)ctx.fillText(txt,nx*scale,sy);}
ctx.textAlign="left";ctx.font="700 12px ui-monospace,monospace";
for(const[wy,name]of ed.sections){const sy=SY(wy);if(sy>-10&&sy<cv.height+10)ctx.fillText(name,8,sy);}
}
/* ---------- validation with the real integrator (phase-aware for movers) ---------- */
function rectAtEd(p,t){if(p[3]===4||p[3]===5){const s=PLATS[ed.plats.indexOf(p)];const o=moverXY(s,t);return[o.x,o.y+16,p[2]];}return p;}
function findLaunchEd(fi,ti){
const fp=fi<0?[0,0,VW,0]:ed.plats[fi];
const tp=ti<0?[ed.goal[0],ed.summit,ed.goal[1],0,true]:ed.plats[ti];
const fm=fp[3]===4||fp[3]===5||fp[3]===6,tm=tp[3]===4||tp[3]===5||tp[3]===6;
const per=fm?(fp[5]||2.4):tm?(tp[5]||2.4):0;
const phases=per?[0,per*.25,per*.5,per*.75,per*.125,per*.375,per*.625,per*.875]:[0];
const spring=ed.plats.some(p=>p[3]===2&&p[1]>fp[1]&&p[1]<tp[1]);
const zone=(ed.zones||[]).some(z=>z[1]<tp[1]+40&&z[1]+z[3]>fp[1]-40&&z[0]+z[2]>Math.min(fp[0],tp[0])&&z[0]<Math.max(fp[0]+fp[2],tp[0]+tp[2]));
for(const ph of phases){
worldT=ph;
const fr=rectAtEd(fp,ph),tr=rectAtEd(tp,ph);
const dyLo=(tp[3]===5?tp[1]-(tp[4]||60):tr[1])-(fp[3]===5?fp[1]+(fp[4]||60):fr[1]);
const vyNeed=(spring||zone)?0:Math.sqrt(2*G*Math.max(0,dyLo));
const xs=[fr[0]+fr[2]/2-CH/2,fr[0]+1,fr[0]+fr[2]-CH-1];
for(const bx of xs){body.x=bx;body.y=fr[1];
const tc=tr[0]+tr[2]/2,bc=bx+CH/2;
const lo=Math.min(tc>=bc?8:92,90),hi=Math.max(tc>=bc?88:172,90);
for(let a=lo;a<=hi;a+=2){const r=a*Math.PI/180,sin=Math.sin(r);
if(sin*.98*MAXV<vyNeed)continue;
const pw0=Math.max(.30,Math.ceil(vyNeed/(sin*MAXV)/.02)*.02);
for(let pw=pw0;pw<=.981;pw+=.02){
const vx=Math.cos(r)*pw*MAXV,vy=sin*pw*MAXV;
const pr=preview({x:vx,y:vy});
if(pr.mark&&pr.mark.ok&&(ti<0?pr.mark.goal:pr.mark.idx===ti)&&pr.mark.x>tr[0]-CH/2&&pr.mark.x<tr[0]+tr[2]+CH/2){
if(per){let tol=true;
for(const d of[-.12,.12]){worldT=ph+d;
const tr2=rectAtEd(tp,ph+d);
const p2=preview({x:vx,y:vy});
if(!(p2.mark&&p2.mark.ok&&(ti<0?p2.mark.goal:p2.mark.idx===ti)&&p2.mark.x>tr2[0]-CH/2&&p2.mark.x<tr2[0]+tr2[2]+CH/2))tol=false;}
worldT=ph;
if(!tol)continue;}
return{vx,vy};}}}
}}
return null;}
function dyMin(a,b){let at=a[1],bt=b[1];
if(a[3]===5)at+=(a[4]||60);
if(b[3]===5)bt-=(b[4]||60);
return bt-at;}
function validate(){
rebuild();
const out=[];let bad=0;
const restIdx=[];ed.plats.forEach((p,i)=>{if(p[3]!==2)restIdx.push(i);});
const n=restIdx.length+1;
const uns=[];
for(let i=0;i<n;i++){
const fi=i===0?-1:restIdx[i-1],ti=i<restIdx.length?restIdx[i]:-1;
const a=fi<0?[0,0,VW,0]:ed.plats[fi],b=ti<0?[ed.goal[0],ed.summit,ed.goal[1],0]:ed.plats[ti];
const dy=dyMin(a,b);
const springBetween=ed.plats.some(p=>p[3]===2&&p[1]>a[1]&&p[1]<b[1]);
const zoneBetween=(ed.zones||[]).some(z=>z[1]<b[1]+40&&z[1]+z[3]>a[1]-40&&z[5]>0);
if(dy>160&&!springBetween&&!zoneBetween){out.push("jump"+(i+1)+": dy "+dy+" > 160 (no spring/updraft between)");bad++;}
if(!findLaunchEd(fi,ti)){uns.push(i+1);}
}
if(uns.length){out.push("UNSOLVED ≤98%: jump "+uns.join(", "));bad+=uns.length;}
ed.plats.forEach(([x,t,w,ty,amp,per],i)=>{
if(w<28){out.push("plat"+(i+1)+": width "+w+" < 28");bad++;}
if(ty===4||ty===5){const a=amp||60,p=per||2.4;
if(p>3){out.push("plat"+(i+1)+": period "+p+"s > 3s fuse window");bad++;}
if(ty===4&&(x-a<0||x+a+w>VW)){out.push("plat"+(i+1)+": horizontal sweep leaves the walls");bad++;}
if(ty===5&&t-a<0){out.push("plat"+(i+1)+": vertical sweep below the floor");bad++;}}
if(ty===6){const duty=amp||.6,p=per||2.4;
if(p>3){out.push("plat"+(i+1)+": period "+p+"s > 3s fuse window");bad++;}
if(duty*p<1.2){out.push("plat"+(i+1)+": on-window "+(duty*p).toFixed(2)+"s < 1.2s (unfair timing)");bad++;}
if(duty<=0||duty>=1){out.push("plat"+(i+1)+": duty must be in (0,1)");bad++;}}});
(ed.zones||[]).forEach((z,i)=>{if(Math.abs(z[4])>1600||Math.abs(z[5])>1600){out.push("zone"+(i+1)+": accel > 1600 px/s^2");bad++;}
if(z[0]<0||z[0]+z[2]>VW){out.push("zone"+(i+1)+": leaves the walls");bad++;}});
for(let i=0;i<ed.plats.length;i++){if(ed.plats[i][3]!==2)continue;
const prev=ed.plats.filter(r=>r[3]!==2&&r[1]<ed.plats[i][1]).pop();
const next=ed.plats.find(r=>r[3]!==2&&r[1]>ed.plats[i][1]);
if(prev&&next){const d1=Math.sign(ed.plats[i][0]-prev[0]),d2=Math.sign(next[0]-ed.plats[i][0]);
if(d1!==0&&d2!==0&&d1!==d2){out.push("bounce plat"+(i+1)+": chain reverses direction");bad++;}}}
const el=$("issues");
el.innerHTML=(bad===0?'<span class="good">VALID · all '+n+' jumps solvable ≤98%, invariants ok.</span>':'<span class="bad">'+bad+' issue(s):</span>\n')+out.map(s=>'<span class="bad">· '+s+"</span>").join("\n");
draw();}
/* ---------- ui ---------- */
function syncFields(){
$("fName").value=ed.name;$("fTag").value=ed.tag;$("fSummit").value=ed.summit;
$("fGoalX").value=ed.goal[0];$("fGoalW").value=ed.goal[1];
$("fSec").value=JSON.stringify(ed.sections);$("fNotes").value=JSON.stringify(ed.notes);
if(sel&&sel.kind==="p"){const p=ed.plats[sel.idx];$("pX").value=p[0];$("pT").value=p[1];$("pW").value=p[2];$("pTy").value=p[3];
const mv=p[3]===4||p[3]===5||p[3]===6;$("moverRow").hidden=!mv;
$("pAmpLab").textContent=p[3]===6?"duty (0-1)":"amp px";
if(mv){$("pAmp").value=p[3]===6?(p[4]||.6):(p[4]||60);$("pPer").value=p[5]||2.4;$("pPh").value=p[6]||0;}}
$("fZones").value=JSON.stringify(ed.zones||[]);
}
function loadEd(d){ed=clone(d);sel=null;camY=-100;$("lvl").value=ed.id;rebuild();syncFields();draw();$("issues").innerHTML="";}
function fillSelect(){const s=$("lvl");s.innerHTML="";for(const L of LEVELS){const o=document.createElement("option");o.value=L.id;o.textContent=L.id+" · "+L.name;s.appendChild(o);}}
$("lvl").onchange=e=>{const L=LEVELS.find(x=>x.id===+e.target.value);if(L)loadEd(L);};
$("bNew").onclick=()=>{const id=LEVELS.length+1;loadEd({id,name:"TOWER "+id,tag:"NEW",summit:2000,goal:[180,120],plats:[[60,120,150,0],[280,260,120,0]],ceil:[],zones:[],sections:[[60,"I · START"]],notes:[]});};
$("fName").oninput=e=>{ed.name=e.target.value;};
$("fTag").oninput=e=>{ed.tag=e.target.value;};
$("fSummit").oninput=e=>{ed.summit=Math.max(200,+e.target.value||200);rebuild();draw();};
$("fGoalX").oninput=e=>{ed.goal[0]=+e.target.value||0;rebuild();draw();};
$("fGoalW").oninput=e=>{ed.goal[1]=Math.max(28,+e.target.value||28);rebuild();draw();};
$("fSec").onchange=e=>{try{ed.sections=JSON.parse(e.target.value);draw();}catch(_){}};
$("fNotes").onchange=e=>{try{ed.notes=JSON.parse(e.target.value);draw();}catch(_){}};
$("fZones").onchange=e=>{try{ed.zones=JSON.parse(e.target.value);rebuild();draw();}catch(_){}};
function selPlat(){return sel&&sel.kind==="p"?ed.plats[sel.idx]:null;}
$("pX").oninput=e=>{const p=selPlat();if(p){p[0]=+e.target.value||0;rebuild();draw();}};
$("pT").oninput=e=>{const p=selPlat();if(p){p[1]=+e.target.value||0;rebuild();draw();}};
$("pW").oninput=e=>{const p=selPlat();if(p){p[2]=Math.max(28,+e.target.value||28);rebuild();draw();}};
$("pTy").onchange=e=>{const p=selPlat();if(p){p[3]=+e.target.value;
if(p[3]===4||p[3]===5){p[4]=p[4]||60;p[5]=p[5]||2.4;p[6]=p[6]||0;}
else if(p[3]===6){p[4]=(p[4]>0&&p[4]<1)?p[4]:.6;p[5]=p[5]||2.4;p[6]=p[6]||0;}
else p.length=4;
rebuild();syncFields();draw();}};
$("pAmp").oninput=e=>{const p=selPlat();if(p){p[4]=p[3]===6?Math.min(.9,Math.max(.1,+e.target.value||.6)):Math.max(10,+e.target.value||10);rebuild();draw();}};
$("pPer").oninput=e=>{const p=selPlat();if(p){p[5]=Math.max(.6,+e.target.value||.6);rebuild();draw();}};
$("pPh").oninput=e=>{const p=selPlat();if(p){p[6]=Math.min(1,Math.max(0,+e.target.value||0));rebuild();draw();}};
$("bAddP").onclick=()=>{ed.plats.push([120,Math.round(camY+cv.height/scale/2),80,0]);sel={kind:"p",idx:ed.plats.length-1};rebuild();syncFields();draw();};
$("bAddC").onclick=()=>{ed.ceil.push([0,Math.round(camY+cv.height/scale/2),200]);sel={kind:"c",idx:ed.ceil.length-1};rebuild();draw();};
$("bDel").onclick=del;
function del(){if(!sel)return;if(sel.kind==="p")ed.plats.splice(sel.idx,1);else ed.ceil.splice(sel.idx,1);sel=null;rebuild();syncFields();draw();}
$("bValidate").onclick=validate;
$("bExport").onclick=()=>{
const text="/* COMMIT level descriptor · "+ed.name+" · format: COMMIT_LEVEL(<json>) — see COMMIT_LEVELS.md §1. */\nCOMMIT_LEVEL("+JSON.stringify(ed)+");\n";
const b=new Blob([text],{type:"text/javascript"});const a=document.createElement("a");
a.href=URL.createObjectURL(b);a.download="tower-"+ed.id+".js";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
$("bImport").onclick=()=>$("file").click();
$("file").onchange=async e=>{const f=e.target.files[0];if(!f)return;
const t=await f.text();const s=t.indexOf("COMMIT_LEVEL(");
try{const json=t.slice(s>=0?s+13:0,t.lastIndexOf(")"));loadEd(JSON.parse(json));}catch(err){$("issues").innerHTML='<span class="bad">import failed: '+err+"</span>";}
e.target.value="";};
/* ---------- pointer ---------- */
function hit(wx,wy){
for(let i=ed.plats.length-1;i>=0;i--){const[x,t,w]=ed.plats[i];if(wx>=x&&wx<=x+w&&wy>=t-16&&wy<=t)return{kind:"p",idx:i};}
for(let i=ed.ceil.length-1;i>=0;i--){const[x,t,w]=ed.ceil[i];if(wx>=x&&wx<=x+w&&wy>=t-16&&wy<=t)return{kind:"c",idx:i};}
return null;}
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);
const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,wx=WX(sx),wy=WY(sy);
const h=hit(wx,wy);
if(h){sel=h;const rect=h.kind==="p"?ed.plats[h.idx]:ed.ceil[h.idx];
const nearRight=h.kind==="p"&&wx>rect[0]+rect[2]-8/scale;
drag={mode:nearRight?"resize":"move",offx:wx-rect[0],offy:wy-rect[1]};}
else{sel=null;drag={mode:"pan",sy,cam:camY};}
syncFields();draw();});
cv.addEventListener("pointermove",e=>{if(!drag)return;
const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,wx=WX(sx),wy=WY(sy);
if(drag.mode==="pan"){camY=drag.cam+(sy-drag.sy)/scale;draw();return;}
if(!sel)return;
if(sel.kind==="p"){const p=ed.plats[sel.idx];
if(drag.mode==="resize")p[2]=Math.max(28,Math.round(wx-p[0]));
else{p[0]=Math.min(Math.max(0,Math.round(wx-drag.offx)),VW-p[2]);p[1]=Math.round(wy-drag.offy);}}
else{const c=ed.ceil[sel.idx];c[0]=Math.min(Math.max(0,Math.round(wx-drag.offx)),VW-c[2]);c[1]=Math.round(wy-drag.offy);}
rebuild();syncFields();draw();});
cv.addEventListener("pointerup",()=>{drag=null;});
cv.addEventListener("dblclick",e=>{const r=cv.getBoundingClientRect(),wx=WX(e.clientX-r.left),wy=WY(e.clientY-r.top);
if(hit(wx,wy))return;ed.plats.push([Math.round(wx-40),Math.round(wy),80,0]);sel={kind:"p",idx:ed.plats.length-1};rebuild();syncFields();draw();});
cv.addEventListener("wheel",e=>{e.preventDefault();camY+=e.deltaY/scale;draw();},{passive:false});
addEventListener("keydown",e=>{
if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT")return;
if(e.key==="Delete"||e.key==="Backspace"){del();return;}
if(sel&&sel.kind==="p"&&["0","1","2","3","4","5"].includes(e.key)){const p=ed.plats[sel.idx];p[3]=+e.key;
if(p[3]===4||p[3]===5){p[4]=p[4]||60;p[5]=p[5]||2.4;p[6]=p[6]||0;}else p.length=4;
rebuild();syncFields();draw();}});
/* ---------- boot ---------- */
fillSelect();loadEd(LEVELS[0]);resize();
const vm=location.hash.match(/^#validate(\d*)$/);
if(vm){if(vm[1])loadEd(LEVELS[+vm[1]-1]);validate();}
})();