# COMMIT — Level Design & Geometry (v2.2 · two towers)
**Companion to `COMMIT_GDD.md` · All coordinates in logical px · y-up · 10 px = 1 m**
**Source of truth: one descriptor file per tower, `levels/tower-N.js`. This doc explains the math and intent.**

## 0. Descriptor format (the "certain format")

Each tower lives in its own file `levels/tower-N.js`, a classic script whose body is a single
call registering a JSON object:

```js
COMMIT_LEVEL({ "id":2, "name":"TOWER 2", "tag":"THE ICE ASCENT", "summit":5600,
  "goal":[240,120],
  "plats":[[x,topY,width,type], …],   // type 0 solid · 1 crumble · 2 bounce · 3 ice
  "ceil":[[x,topY,width], …],
  "sections":[[y,"I · NAME"], …],
  "notes":[[x,y,"TEXT"], …] });
```

The argument is plain JSON (the editor parses/exports exactly this). `js/levels.js` is only the
*engine* (`COMMIT_LEVEL` registrar + `buildLevel`); it holds no data. `index.html` loads the
engine then each descriptor as classic `<script>` tags, so the game still runs from `file://`
with zero fetch. To add a tower: drop `levels/tower-N.js` and add one `<script>` tag.

**Authoring tool:** `editor.html` (+ `js/editor.js`) is a **local-only** web level editor. It is
committed for development but excluded from the Pages deploy (`.github/workflows/pages.yml`
publishes a game-only whitelist) and origin-gated to `file://`/localhost. Open it locally, pick or
import a tower, drag platforms / resize / set type, edit ceilings/goal/summit/notes, press
**VALIDATE** (runs the real `step()`/`preview()` solver + invariants), then **EXPORT** to download
a `tower-N.js` descriptor.

## 1. Conventions

- Platforms are authored as `[x, topY, width, type]`; the solid rect is `{x, y: topY−16, w, h: 16}`.
- **Type:** `0/N` solid · `1/C` crumble (breaks after `CRUMBLE_TIME = 1.6 s`) · `2/B` bounce
  (auto-launch at `BOUNCE_V = 800 px/s`, keeping `vx`) · `3/I` **ice** (drift, see §2).
- Character is an 18×18 AABB; `body.y` is its feet.
- Bounds: floor top at `y=0` (full width), solid walls at `x<0` and `x>480`.
- Ceilings are 16 px-thick solids; their **underside** is the bonk surface.
- Goal per tower: T1 `[180, 5080, 120]`, T2 `[240, 5600, 120]`, flagged `goal: true`.
- Crumbled platforms reform after `RESPAWN_TIME = 3.0 s`; reset/erase rebuilds instantly.
- Each tower = one descriptor (§0) registered into `LEVELS` as `{id,name,tag,summit,goal,plats,ceil,sections,notes}`.

## 2. Reachability Math (used to verify every gap)

```
apex(vy)      = vy² / (2·2200)                 max apex = 950²/4400 ≈ 205 px
t_land(vy,dy) = (vy + √(vy² − 4400·dy)) / 2200   (dy = target top − launch top)
dx            = vx · t_land
constraint    = √(vx² + vy²) ≤ 950  (≤ 98% = 931 for every mandatory jump)
bounce apex   = 800²/4400 ≈ 145 px  (a spring lifts you ~145 px above its top)
```

**Bounce chains are mandatory, not optional.** Each spring `B` sits between two rests `A`
and `C` where `C` is **230 px above `A`** — beyond the 205 px direct apex — so the only way
up is to land on `B` and ride the bounce. The preview simulates the bounce with the same
`step()`, drawing a teal ring + chevron at the hop and continuing the arc to the green
landing ring. Worked chain (II): `A` top 2490 → `B` top 2600 (dy 110) → `C` top 2720
(bounce dy 120 < 145 ✓). Launch ≈ `vx 246, vy 778` (86%) lands on `B` descending; the spring
relaunches at `vy 800`, carrying `vx` to `C`.

**Ceiling lesson (III):** from rest 24 (top 3220, x 340–390) to rest 25 (top 3360, x 150–204),
ceiling underside 3364 spanning x 300–480. A flat leftward arc (`vy≈820, vx≈−380`, 95%) exits
x<300 with ~26 px clearance before the top reaches 3364; a steep "panic" arc bonks.

**No vertical stacks.** A platform directly above another (overlapping x) is *unreachable*:
rising into it from below bonks its underside. Consecutive platforms must alternate sides with
enough `dx` (~120–210 px at dy 140) to arc around and descend onto the top. The solver rejects
same-x stacks; this is why T2 is a strict zig-zag.

**Bounce chains keep one horizontal direction.** Bounce preserves `vx`, so `A→B→C` must be
monotonic in x (all leftward or all rightward). A chain that reverses direction is impossible.

**Ice drift math.** On landing with horizontal speed `vx`, drift dir = sign(`vx`); speed ramps
0→`ICE_V` (42) over `ICE_RAMP` (0.5 s) then holds. Time-to-edge from a landing ≈
`(edgeDistance − ~10px ramp) / 42 + 0.5`. A centre landing on an 80 px ice gives ~1.2 s to
commit — enough to aim, not enough to dawdle. Straight-down (`vx=0`) landings never drift, the
fair counter. Ice widths in T2 are ≥ 40 (gates) to 110 (teachers) to keep that window honest.

## 3. Geometry — Section I · First Steps (0–168 m)

| # | x | top | w | type | | # | x | top | w | type |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 60 | 120 | 150 | N | | 7 | 140 | 930 | 110 | N |
| 2 | 270 | 240 | 150 | N | | 8 | 320 | 1080 | 100 | N |
| 3 | 90 | 370 | 140 | N | | 9 | 150 | 1230 | 110 | **C** |
| 4 | 280 | 500 | 150 | N | | 10 | 30 | 1380 | 110 | N |
| 5 | 110 | 640 | 120 | N | | 11 | 210 | 1530 | 100 | N |
| 6 | 300 | 780 | 110 | N | | 12 | 360 | 1680 | 100 | N |

Intent: generous zig-zag, dy 120–150. Platform 9 is the first **crumble** (wide, forgiving) —
it teaches "keep moving" before the precision sections. Notes at y 60/180/430/1150.

## 4. Geometry — Section II · The Needles (168–282 m)

| # | x | top | w | type | Note |
|---|---|---|---|---|---|
| 13 | 200 | 1830 | 84 | N | width step-down |
| 14 | 60 | 1980 | 76 | N | |
| 15 | 300 | 2130 | 76 | N | |
| 16 | 150 | 2280 | 70 | N | ceiling launch pad |
| — | **ceiling** | **2400** | **250 (x=0)** | | underside 2384; forces flat arc |
| 17 | 340 | 2350 | 80 | N | reward for the ceiling lesson |
| 18 | 140 | 2490 | 80 | N | bounce rest **A** |
| 19 | 280 | 2600 | 72 | **B** | first **spring** |
| 20 | 400 | 2720 | 72 | N | bounce rest **C** (230 px above A) |
| 21 | 180 | 2820 | 64 | **C** | crumble gate to III |

## 5. Geometry — Section III · Overhang (282–395 m)

| # | x | top | w | type | Note |
|---|---|---|---|---|---|
| 22 | 330 | 2940 | 56 | N | |
| 23 | 170 | 3080 | 56 | **C** | crumble under the overhang |
| — | **ceiling** | **3200** | **200 (x=0)** | | underside 3184; exit right early |
| 24 | 340 | 3220 | 50 | N | |
| — | **ceiling** | **3380** | **180 (x=300)** | | underside 3364; exit left (~26 px margin) |
| 25 | 150 | 3360 | 54 | N | |
| 26 | 300 | 3500 | 48 | **C** | |
| 27 | 110 | 3650 | 48 | N | |
| 28 | 280 | 3800 | 46 | N | |
| 29 | 120 | 3950 | 46 | **C** | crumble gate to IV |

## 6. Geometry — Section IV · The Throat (395–508 m)

| # | x | top | w | type | | # | x | top | w | type |
|---|---|---|---|---|---|---|---|---|---|---|
| 30 | 320 | 4090 | 36 | N | | 34 | 290 | 4640 | 44 | **B** |
| 31 | 140 | 4240 | 34 | **C** | | 35 | 400 | 4760 | 40 | N |
| 32 | 330 | 4390 | 32 | N | | 36 | 200 | 4870 | 32 | **C** |
| 33 | 150 | 4530 | 40 | N | | 37 | 330 | 4980 | 30 | N |
| | | | | | | **38** | **180** | **5080** | **120 · GOAL** |

Second mandatory bounce chain: 33 (A, 4530) → 34 (spring, 4640) → 35 (C, 4760; 230 px above A).
Narrow rests (30–40 px), crumble gates, required speed 90–98%. The summit is 120 px wide on
purpose — the last emotion should be relief, not a coin flip.

## 7. Fall Dynamics

- Platforms alternate sides, so a *pure vertical* drop often catches within 150–300 px.
- Real disasters come from **retained horizontal velocity**: bonks keep `vx`, wall hits
  convert diagonal falls into straight drops; a missed spring drops you past it. Crumble
  breaks drop you straight down (`vx=0`). Deep falls emerge from bad arcs, not authored cruelty.
- The floor at y=0 is the universal catch. You can always continue. You will not want to.

## 8. Authoring Rules for New Platforms

1. `dy ≤ 160` and required speed ≤ 931 (98%) for the intended solution (bounce hops use `BOUNCE_V`).
2. Landing tolerance `(w+18)/2 ≥ 23 px` (width floor 28).
3. Ceiling clearance ≥ 15 px at the reference solution; verify with the §2 formulas.
4. A mandatory spring's downstream rest must sit > 205 px above its upstream rest (forces the bounce).
5. **Alternate sides** — never stack a platform directly above its predecessor (§2).
6. **Bounce chains monotonic in x** (§2); an ice rest after a spring must be wide enough to commit (~1 s).
7. Target visible from the launch pad; never a blind jump, frame-perfect input, or RNG.
8. Re-run the `test.html` solver after any edit — it proves all 36 T1 + 40 T2 rest-to-rest jumps solvable.

## 9. Tower Sketch

```
508m  ───────────▄▄▄▄▄▄  SUMMIT (120px, mercy)
      ▂▂    ▲▲               ▂▂      IV · 30–40px + spring ▲▲
         ▂▂              ▂▂
      ▂▂▂    ▲▲            ▂▂▂       III · ceilings ▓▓▓ + crumble ░░
        ▓▓▓▓▓▓▓              ▂▂▂
      ▂▂▂▂        ▓▓▓▓▓▓▓
              ▂▂▂▂                   II · ceiling + first spring ▲▲
        ▓▓▓▓▓▓        ░░
      ▄▄▄▄        ▄▄▄▄▄              I · 100–150px + first crumble ░░
  0m  ████████████████████  FLOOR
```

## 10. Tower 2 · The Ice Ascent (560 m) — full geometry

Strict zig-zag; ice `I` introduced at #5 and recurring. 40 platforms + summit, 3 ceilings,
1 mandatory bounce chain (26→27→28) that lands you on ice already sliding.

| # | x | top | w | type | | # | x | top | w | type |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 70 | 120 | 140 | N | | 21 | 120 | 2880 | 60 | N |
| 2 | 280 | 250 | 140 | N | | 22 | 300 | 3020 | 60 | **I** |
| 3 | 100 | 380 | 130 | N | | 23 | 120 | 3160 | 56 | N |
| 4 | 290 | 510 | 120 | N | | 24 | 300 | 3300 | 52 | N |
| 5 | 120 | 640 | 110 | **I** | | 25 | 120 | 3440 | 52 | **I** |
| 6 | 300 | 780 | 110 | N | | 26 | 300 | 3580 | 48 | **C** |
| 7 | 140 | 920 | 100 | **I** | | 27 | 120 | 3720 | 56 | N (A) |
| 8 | 320 | 1060 | 100 | N | | 28 | 240 | 3830 | 56 | **B** |
| 9 | 160 | 1200 | 96 | **C** | | 29 | 360 | 3950 | 80 | **I** (C) |
| 10 | 300 | 1340 | 100 | N | | 30 | 200 | 4090 | 48 | N |
| 11 | 120 | 1480 | 90 | N | | 31 | 320 | 4230 | 44 | **I** |
| 12 | 300 | 1620 | 80 | **I** | | 32 | 140 | 4370 | 40 | N |
| 13 | 120 | 1760 | 76 | N | | 33 | 320 | 4510 | 40 | **C** |
| 14 | 300 | 1900 | 76 | **I** | | 34 | 160 | 4650 | 44 | N |
| 15 | 120 | 2040 | 72 | **I** | | 35 | 300 | 4790 | 44 | **I** |
| 16 | 280 | 2180 | 70 | N | | 36 | 120 | 4930 | 40 | N |
| 17 | 80 | 2320 | 76 | N | | 37 | 320 | 5070 | 36 | N |
| 18 | 260 | 2460 | 72 | **I** | | 38 | 160 | 5210 | 36 | **C** |
| 19 | 120 | 2600 | 64 | N | | 39 | 330 | 5350 | 40 | **I** |
| 20 | 300 | 2740 | 64 | **C** | | 40 | 180 | 5480 | 36 | N |
| | | | | | | **GOAL** | 240 | 5600 | 120 | |

Ceilings: `[280,2300,200]` (over ice-adjacent pad 16, exit left), `[280,3140,200]` (pad 22 ice,
exit left), `[300,4910,180]` (pad 35 ice, exit left). Each forces a flat arc off a sliding or
narrow pad — the "commit fast" lesson under a bonk threat.

Bounce chain: 27 (A, 3720) → 28 (spring, 3830) → 29 (C ice, 3950; 230 px above A). All rightward;
the spring carries `vx` onto wide ice (80 px) so you land drifting and must commit within ~1 s.

The summit is offset to x 240 (right of pad 40) so the final arc is a genuine left-to-right
decision, not a vertical hop.
