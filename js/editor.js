/* COMMIT — local-only level editor. Loads the real integrator (js/sim.js) so VALIDATE uses the
   same step()/preview() as the game. Exports/imports COMMIT_LEVEL(<json>) descriptors.
   This file is gitignored (never deployed); the origin gate below is defense-in-depth. */
"use strict";
(function(){
const host=location.hostname;
const local=location.protocol==="file:"||host==="localhost"||host==="127.0.0.1"||host==="[::1]"||host==="";
if(!local){document.getElementById("gate").hidden=false;document.getElementById("wrap").style.display="none";return;}
const cv=$("cv"),ctx=cv.getContext("2d");
const TY=["solid","crumble","bounce","ice"];
const TCOL=[COL.edge,"#8a6a3a",COL.spring,COL.ice];
let ed=null,sel=null,camY=-100,scale=1,drag=null;
const clone=o=>JSON.parse(JSON.stringify(o));
function rebuild(){
LVL=ed;SUMMIT=ed.summit;P=ed.plats;CEIL=ed.ceil;SECTIONS=ed.sections;NOTES=ed.notes;
SOLIDS.length=0;PLATS.length=0;
SOLIDS.push({x:-60,y:-60,w:VW+120,h:60,ground:true},{x:-60,y:0,w:60,h:SUMMIT+900,wall:true},{x:VW,y:0,w:60,h:SUMMIT+900,wall:true});
P.forEach(([x,t,w,ty],i)=>{const s={x,y:t-16,w,h:16,idx:i,crumble:ty===1,bounce:ty===2,ice:ty===3,dead:false};PLATS.push(s);SOLIDS.push(s);});
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
ed.plats.forEach(([x,t,w,ty],i)=>{const sy=SY(t);
ctx.fillStyle=ty===3?"#152232":COL.plat;ctx.fillRect(x*scale,sy,w*scale,16*scale);
ctx.fillStyle=TCOL[ty];ctx.fillRect(x*scale,sy,w*scale,2);
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
/* ---------- validation with the real integrator ---------- */
function findLaunchEd(from,to){
const xs=[from[0]+from[2]/2-CH/2,from[0]+1,from[0]+from[2]-CH-1];
for(const bx of xs){body.x=bx;body.y=from[1];
const tc=to[0]+to[2]/2,bc=bx+CH/2;
const lo=Math.min(tc>=bc?8:92,90),hi=Math.max(tc>=bc?88:172,90);
for(let a=lo;a<=hi;a+=2){const r=a*Math.PI/180;
for(let pw=.30;pw<=.981;pw+=.02){
const vx=Math.cos(r)*pw*MAXV,vy=Math.sin(r)*pw*MAXV;
const pr=preview({x:vx,y:vy});
if(pr.mark&&pr.mark.ok&&pr.mark.y===to[1]&&pr.mark.x>to[0]-CH/2&&pr.mark.x<to[0]+to[2]+CH/2&&(!to[4]||pr.mark.goal))return{vx,vy};}}}
return null;}
function validate(){
rebuild();
const out=[];let bad=0;
const rests=ed.plats.filter(p=>p[3]!==2);
const sources=[[0,0,VW,0]].concat(rests);
const targets=rests.concat([[ed.goal[0],ed.summit,ed.goal[1],0,true]]);
const uns=[];
for(let i=0;i<targets.length;i++){
const dy=targets[i][1]-sources[i][1];
const springBetween=ed.plats.some(p=>p[3]===2&&p[1]>sources[i][1]&&p[1]<targets[i][1]);
if(dy>160&&!springBetween){out.push("jump"+(i+1)+": dy "+dy+" > 160 (no spring between)");bad++;}
if(!findLaunchEd(sources[i],targets[i])){uns.push(i+1);}
}
if(uns.length){out.push("UNSOLVED ≤98%: jump "+uns.join(", "));bad+=uns.length;}
ed.plats.forEach(([x,t,w,ty],i)=>{if(w<28){out.push("plat"+(i+1)+": width "+w+" < 28");bad++;}});
for(let i=0;i<ed.plats.length;i++){if(ed.plats[i][3]!==2)continue;
const prev=rests.filter(r=>r[1]<ed.plats[i][1]).pop();
const next=rests.find(r=>r[1]>ed.plats[i][1]);
if(prev&&next){const d1=Math.sign(ed.plats[i][0]-prev[0]),d2=Math.sign(next[0]-ed.plats[i][0]);
if(d1!==0&&d2!==0&&d1!==d2){out.push("bounce plat"+(i+1)+": chain reverses direction");bad++;}}}
const el=$("issues");
el.innerHTML=(bad===0?'<span class="good">VALID · all '+targets.length+' jumps solvable ≤98%, invariants ok.</span>':'<span class="bad">'+bad+' issue(s):</span>\n')+out.map(s=>'<span class="bad">· '+s+"</span>").join("\n");
draw();}
/* ---------- ui ---------- */
function syncFields(){
$("fName").value=ed.name;$("fTag").value=ed.tag;$("fSummit").value=ed.summit;
$("fGoalX").value=ed.goal[0];$("fGoalW").value=ed.goal[1];
$("fSec").value=JSON.stringify(ed.sections);$("fNotes").value=JSON.stringify(ed.notes);
if(sel&&sel.kind==="p"){const p=ed.plats[sel.idx];$("pX").value=p[0];$("pT").value=p[1];$("pW").value=p[2];$("pTy").value=p[3];}
}
function loadEd(d){ed=clone(d);sel=null;camY=-100;rebuild();syncFields();draw();$("issues").innerHTML="";}
function fillSelect(){const s=$("lvl");s.innerHTML="";for(const L of LEVELS){const o=document.createElement("option");o.value=L.id;o.textContent=L.id+" · "+L.name;s.appendChild(o);}}
$("lvl").onchange=e=>{const L=LEVELS.find(x=>x.id===+e.target.value);if(L)loadEd(L);};
$("bNew").onclick=()=>{const id=LEVELS.length+1;loadEd({id,name:"TOWER "+id,tag:"NEW",summit:2000,goal:[180,120],plats:[[60,120,150,0],[280,260,120,0]],ceil:[],sections:[[60,"I · START"]],notes:[]});};
$("fName").oninput=e=>{ed.name=e.target.value;};
$("fTag").oninput=e=>{ed.tag=e.target.value;};
$("fSummit").oninput=e=>{ed.summit=Math.max(200,+e.target.value||200);rebuild();draw();};
$("fGoalX").oninput=e=>{ed.goal[0]=+e.target.value||0;rebuild();draw();};
$("fGoalW").oninput=e=>{ed.goal[1]=Math.max(28,+e.target.value||28);rebuild();draw();};
$("fSec").onchange=e=>{try{ed.sections=JSON.parse(e.target.value);draw();}catch(_){}};
$("fNotes").onchange=e=>{try{ed.notes=JSON.parse(e.target.value);draw();}catch(_){}};
function selPlat(){return sel&&sel.kind==="p"?ed.plats[sel.idx]:null;}
$("pX").oninput=e=>{const p=selPlat();if(p){p[0]=+e.target.value||0;rebuild();draw();}};
$("pT").oninput=e=>{const p=selPlat();if(p){p[1]=+e.target.value||0;rebuild();draw();}};
$("pW").oninput=e=>{const p=selPlat();if(p){p[2]=Math.max(28,+e.target.value||28);rebuild();draw();}};
$("pTy").onchange=e=>{const p=selPlat();if(p){p[3]=+e.target.value;rebuild();draw();}};
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
if(sel&&sel.kind==="p"&&["0","1","2","3"].includes(e.key)){ed.plats[sel.idx][3]=+e.key;rebuild();syncFields();draw();}});
/* ---------- boot ---------- */
fillSelect();loadEd(LEVELS[0]);resize();
const vm=location.hash.match(/^#validate(\d*)$/);
if(vm){if(vm[1])loadEd(LEVELS[+vm[1]-1]);validate();}
})();