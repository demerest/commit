/* COMMIT — level data. Platform authoring [x, topY, width, type]: 0 solid, 1 crumble, 2 bounce, 3 ice.
   Adding a tower = appending one entry; mechanics are type flags, geometry is data. */
"use strict";
const LEVELS=[
{id:1,name:"TOWER 1",tag:"FIRST ASCENT",summit:5080,goal:[180,120],
plats:[[60,120,150,0],[270,240,150,0],[90,370,140,0],[280,500,150,0],
[110,640,120,0],[300,780,110,0],[140,930,110,0],[320,1080,100,0],[150,1230,110,1],[30,1380,110,0],[210,1530,100,0],[360,1680,100,0],
[200,1830,84,0],[60,1980,76,0],[300,2130,76,0],[150,2280,70,0],[340,2350,80,0],[140,2490,80,0],[280,2600,72,2],[400,2720,72,0],[180,2820,64,1],
[330,2940,56,0],[170,3080,56,1],[340,3220,50,0],[150,3360,54,0],[300,3500,48,1],[110,3650,48,0],[280,3800,46,0],[120,3950,46,1],
[320,4090,36,0],[140,4240,34,1],[330,4390,32,0],[150,4530,40,0],[290,4640,44,2],[400,4760,40,0],[200,4870,32,1],[330,4980,30,0]],
ceil:[[0,2400,250],[0,3200,200],[300,3380,180]],
sections:[[60,"I · FIRST STEPS"],[1760,"II · THE NEEDLES"],[2860,"III · OVERHANG"],[4000,"IV · THE THROAT"],[4980,"V · SUMMIT"]],
notes:[[240,60,"DRAG ANYWHERE TO AIM"],[240,180,"RELEASE = COMMIT"],[240,430,"AIM FAST · THE FUSE COMMITS FOR YOU"],
[240,1150,"CRACKED PLATFORMS CRUMBLE THEN REFORM · KEEP MOVING"],[240,2430,"TEAL PADS BOUNCE YOU · READ THE FULL ARC"]]},
{id:2,name:"TOWER 2",tag:"THE ICE ASCENT",summit:5600,goal:[240,120],
plats:[[70,120,140,0],[280,250,140,0],[100,380,130,0],[290,510,120,0],
[120,640,110,3],[300,780,110,0],[140,920,100,3],[320,1060,100,0],[160,1200,96,1],[300,1340,100,0],[120,1480,90,0],
[300,1620,80,3],[120,1760,76,0],[300,1900,76,3],[120,2040,72,3],[280,2180,70,0],[80,2320,76,0],[260,2460,72,3],[120,2600,64,0],[300,2740,64,1],
[120,2880,60,0],[300,3020,60,3],[120,3160,56,0],[300,3300,52,0],[120,3440,52,3],[300,3580,48,1],[120,3720,56,0],[240,3830,56,2],[360,3950,80,3],[200,4090,48,0],
[320,4230,44,3],[140,4370,40,0],[320,4510,40,1],[160,4650,44,0],[300,4790,44,3],[120,4930,40,0],[320,5070,36,0],[160,5210,36,1],[330,5350,40,3],[180,5480,36,0]],
ceil:[[280,2300,200],[280,3140,200],[300,4910,180]],
sections:[[60,"I · COLD START"],[1560,"II · GLASS WORKS"],[2820,"III · THE SLIDE"],[4160,"IV · WHITEOUT"],[5480,"V · SUMMIT"]],
notes:[[240,60,"TOWER 2 · THE ICE ASCENT"],[240,430,"ICE: YOU DRIFT THE WAY YOU CAME IN"],[240,560,"LAND STRAIGHT DOWN TO STAND STILL"],
[240,1700,"COMMIT FAST ON ICE · THE SLIDE WON'T WAIT"],[240,3660,"TEAL PADS BOUNCE YOU · ICE CATCHES YOU SLIDING"],[240,4720,"WHITEOUT · NARROW ICE UNDER THE CEILING"]]}
];
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