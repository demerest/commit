/* COMMIT — DOM overlays, HUD, toast, tower picker. */
"use strict";
let overlayOpen=null,toastT=null;const hudCache={};
function openOv(id){if(state==="aim"){aim=null;state="ready";stopHum();stopSlide();}
overlayOpen=id;$(id).hidden=false;
if(id==="help"){$("bStart").textContent=life.seen?"BACK TO THE WALL":"BEGIN THE CLIMB";
$("helpSummit").textContent=(SUMMIT/10)+"m";
$("lifeStats").innerHTML="LIFETIME · summits <b>"+totalSummits()+"</b> · launches <b>"+life.launches+"</b> · falls <b>"+life.falls+"</b>";
buildTowers();}}
function closeOv(){if(!overlayOpen)return;
if(overlayOpen==="help"){life.seen=true;save();}
$(overlayOpen).hidden=true;overlayOpen=null;}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");
clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),1600);}
function buildTowers(){const box=$("towers");box.innerHTML="";
for(const L of LEVELS){const b=document.createElement("button");
const locked=L.id>life.unlocked;
b.className="cta"+(L.id===level?"":" ghost");b.disabled=locked;
b.textContent=L.name+(locked?" · LOCKED":L.id===level?" · HERE":"");
b.setAttribute("aria-label",L.name+(locked?" (locked — clear the previous tower)":""));
b.onclick=()=>{if(locked)return;sfx("ui");closeOv();setLevel(L.id);toast(LVL.name+" · "+LVL.tag);};
box.appendChild(b);}}
function updateTowerTag(){$("towerTag").textContent=LVL.name+" · "+(SUMMIT/10)+"m";}
function setT(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function hud(){setT("altV",(Math.max(0,body.y)/10).toFixed(1)+"m");
setT("best",((life.best[level]||0)/10).toFixed(1)+"m");setT("mLaunch",String(run.launches));
setT("mFall",String(run.falls));setT("mTime",fmt(run.time));}