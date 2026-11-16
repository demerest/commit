/* COMMIT — cosmetic particles, shake, flash, squash timers. Randomness lives here only, never in the sim. */
"use strict";
let shake=0,flash=0,landT=0,launchT=0;
const trail=[],parts=[],shards=[],floats=[],confetti=[];
function spawnDust(x,y,n,c){if(RM)n=Math.ceil(n/2);
for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*220,vy:Math.random()*160+20,t:0,life:.5+Math.random()*.3,c});
if(parts.length>300)parts.splice(0,parts.length-300);}
/* pale spray kicked backwards by the feet while sliding on ice */
function spawnSpray(x,y,dir){const n=RM?1:2;
for(let i=0;i<n;i++)parts.push({x,y,vx:-dir*(40+Math.random()*90),vy:Math.random()*70+10,t:0,life:.3+Math.random()*.25,c:COL.ice});
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