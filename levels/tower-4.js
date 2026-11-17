/* COMMIT level descriptor · Tower 4 · format: COMMIT_LEVEL(<json>) — see COMMIT_LEVELS.md §1.
   Edit with the level editor (editor.html), not by hand.
   Movers: type 4 horizontal / 5 vertical, trailing [amp, period, phase]; x/top = oscillation centre.
   Phase: type 6, trailing [duty, period, phase]; solid duty fraction of each cycle, ghost otherwise.
   Zones: [x, y, w, h, ax, ay] constant extra accel (px/s^2) on the body in flight only. */
COMMIT_LEVEL({
"id":4,"name":"TOWER 4","tag":"THE TEMPEST ENGINE","summit":6400,"goal":[240,120],
"plats":[[270,120,150,0],[70,250,140,0],[280,380,130,0],[90,510,120,0],
[280,760,110,0],[110,900,110,3],[290,1040,100,0],[110,1180,100,1],[290,1320,96,0],
[120,1460,96,0],[290,1600,90,0],[120,1740,90,6,.6,2.4,0],[290,1880,86,0],
[120,2020,86,6,.6,2.4,.5],[290,2160,82,3],[120,2300,82,0],[290,2560,80,0],
[120,2700,78,1],[290,2840,76,0],[120,2980,76,4,60,2.4,0],[290,3120,72,0],
[120,3260,72,6,.6,2.6,0],[290,3400,70,0],[110,3540,70,0],[290,3680,68,3],
[120,3820,66,0],[290,3960,66,5,60,2.6,0],[120,4100,64,1],[290,4240,62,0],
[110,4500,60,0],[290,4640,58,3],[120,4780,56,0],[240,4920,56,2],[340,5060,60,0],
[150,5200,52,0],[320,5340,50,6,.6,2.6,.5],[140,5480,48,3],[320,5620,46,0],
[150,5760,44,1],[320,5900,42,0],[160,6040,40,0],[300,6180,38,5,50,2.6,0],[170,6320,36,0]],
"zones":[[140,520,200,260,0,1400],[120,1330,220,150,-700,0],[140,2310,200,270,0,1500],
[120,3410,220,150,-700,0],[140,4250,200,270,0,1500]],
"ceil":[],
"sections":[[60,"I · THE BELLOWS"],[1600,"II · ESCAPEMENT LIGHTS"],[3260,"III · STORM CLOCK"],[4500,"IV · THE EYE"],[6320,"V · SUMMIT"]],
"notes":[[240,60,"TOWER 4 · THE TEMPEST ENGINE"],[240,430,"BLUE COLUMNS ARE WIND · THE ARC BENDS"],
[240,700,"UPDRAFTS LIFT YOU HIGHER THAN ANY SPRING"],[240,1400,"GUSTS PUSH · AIM UPSTREAM"],
[240,1700,"GOLD PLATFORMS BLINK · LAND ON THE BEAT"],[240,2000,"GHOST = FALL THROUGH"],
[240,3400,"THE STORM CLOCK · WIND AND LIGHT TOGETHER"],[240,4900,"THE EYE · CALM BUT NARROW"],
[240,6200,"SUMMIT · 640m"]]
});
