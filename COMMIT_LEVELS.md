# COMMIT — Level Design & Geometry (v2)
**Companion to `COMMIT_GDD.md` · All coordinates in logical px · y-up · 10 px = 1 m**

## 1. Conventions

- Platforms are authored as `[x, topY, width, type]`; the solid rect is `{x, y: topY−16, w, h: 16}`.
- **Type:** `N` solid · `C` crumble (breaks after `CRUMBLE_TIME = 1.6 s` of standing) · `B` bounce
  (auto-launches you upward at `BOUNCE_V = 800 px/s`, keeping `vx`).
- Character is an 18×18 AABB; `body.y` is its feet.
- Bounds: floor top at `y=0` (full width), solid walls at `x<0` and `x>480`.
- Ceilings are 16 px-thick solids; their **underside** is the bonk surface.
- Goal: `[180, 5080, 120]`, flagged `goal: true`. Landing on it wins.
- Crumbled platforms reform after `RESPAWN_TIME = 3.0 s` (a dashed ghost + filling teal edge
  counts down), so a broken stepping-stone never softlocks the climb; reset/erase rebuilds instantly.

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
5. Target visible from the launch pad; never a blind jump, frame-perfect input, or RNG.
6. Re-run the `test.html` solver after any edit — it proves all 36 rest-to-rest jumps solvable.

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
