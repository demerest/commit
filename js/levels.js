/* COMMIT — level engine. Tower DATA lives in separate descriptor files (levels/tower-N.js),
   each a single COMMIT_LEVEL({...}) call whose argument is a JSON object (see COMMIT_LEVELS.md).
   Descriptors are classic scripts so the game still runs from file:// with zero fetch.
   Platform authoring [x, topY, width, type]: 0 solid, 1 crumble, 2 bounce, 3 ice. */
"use strict";
const LEVELS=[];
function COMMIT_LEVEL(d){LEVELS.push(d);}
let LVL=null,SUMMIT=5080,P=[],CEIL=[],PLATS=[],SOLIDS=[],GOAL=null,SECTIONS=[],NOTES=[],STARS=[];
function buildLevel(n){
LVL=LEVELS[n-1];SUMMIT=LVL.summit;P=LVL.plats;CEIL=LVL.ceil;
SOLIDS.length=0;PLATS.length=0;
SOLIDS.push({x:-60,y:-60,w:VW+120,h:60,ground:true},
{x:-60,y:0,w:60,h:SUMMIT+900,wall:true},{x:VW,y:0,w:60,h:SUMMIT+900,wall:true});
P.forEach(([x,t,w,ty],i)=>{const s={x,y:t-16,w,h:16,idx:i,crumble:ty===1,bounce:ty===2,ice:ty===3,dead:false,bounceT:0,respawnT:0};PLATS.push(s);SOLIDS.push(s);});
for(const[x,t,w]of CEIL)SOLIDS.push({x,y:t-16,w,h:16,ceil:true});
GOAL={x:LVL.goal[0],y:SUMMIT-16,w:LVL.goal[1],h:16,goal:true};SOLIDS.push(GOAL);
SECTIONS=LVL.sections;NOTES=LVL.notes;
STARS.length=0;let s=13+n*7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
for(let i=0;i<80;i++)STARS.push({x:rnd()*VW,y:rnd()*(SUMMIT*.4+VH),r:rnd()*1.4+.4,p:rnd()*6.28});}