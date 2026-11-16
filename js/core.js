/* COMMIT — core constants, palette, math, storage. Shared by all modules (classic scripts). */
"use strict";
const VW=480,VH=800,DT=1/120,G=2200,MAXV=950,MINV=90,KDRAG=3.2,
CH=18,FALL_MIN=250,VFALL=-1600,
AIM_TIME=3.0,CRUMBLE_TIME=1.6,BOUNCE_V=800,RESPAWN_TIME=3.0,
ICE_V=42,ICE_RAMP=0.5;
const COL={plat:"#1c2436",edge:"#43547c",ink:"#e9edf4",dim:"#8b93a7",line:"#26304a",
blue:"#5aa7ff",green:"#57e389",amber:"#ffb454",red:"#ff5d5d",spring:"#3fe0c5",ice:"#bfe3ff"};
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
function fmt(s){const t=Math.floor(s*10),m=Math.floor(t/600),sec=Math.floor(t/10)%60,d=t%10;
return m+":"+(sec<10?"0":"")+sec+"."+d;}
const LS={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},
set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};