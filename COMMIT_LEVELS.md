# COMMIT — Level Design & Geometry
**Companion to `COMMIT_GDD.md` · All coordinates in logical px · y-up · 10 px = 1 m**

## 1. Conventions

- Platforms are authored as `[x, topY, width]`; the solid rect is `{x, y: topY−16, w, h: 16}`.
- Character is an 18×18 AABB; `body.y` is its feet.
- Bounds: floor top at `y=0` (full width), solid walls at `x<0` and `x>480`.
- Ceilings are 16 px-thick solids; their **underside** is the bonk surface.
- Goal: `[180, 5080, 120]`, flagged `goal: true`. Landing on it wins.

## 2. Reachability Math (used to verify every gap)

```
apex(vy)      = vy² / (2·2200)                 max apex = 950²/4400 ≈ 205 px
t_land(vy,dy) = (vy + √(vy² − 4400·dy)) / 2200   (dy = target top − launch top)
dx            = vx · t_land
constraint    = √(vx² + vy²) ≤ 950
```

**Worked example — the first ceiling (II):**
From platform 16 (top 2280, spans 150–220) to platform 17 (top 2350, spans 340–420),
ceiling underside at 2384 spanning x 0–250.
Choose `vy=620, vx=381` (speed 728, 77%): `t_land=(620+√(384400−308000))/2200≈0.407 s`,
`dx≈155` → lands x≈350 ✓. At the ceiling edge x=250 (t≈0.144 s) the character's top is
≈2364 < 2384 → **20 px clearance** ✓. A steeper "panic" arc bonks; a flat deliberate arc
passes. That is the lesson.

## 3. Geometry — Section I · First Steps (0–170 m)

| # | x | top | w | | # | x | top | w |
|---|---|---|---|---|---|---|---|---|
| 1 | 60 | 120 | 150 | | 7 | 140 | 930 | 110 |
| 2 | 270 | 240 | 150 | | 8 | 320 | 1080 | 100 |
| 3 | 90 | 370 | 140 | | 9 | 150 | 1230 | 100 |
| 4 | 280 | 500 | 150 | | 10 | 30 | 1380 | 110 |
| 5 | 110 | 640 | 120 | | 11 | 210 | 1530 | 100 |
| 6 | 300 | 780 | 110 | | 12 | 360 | 1680 | 100 |

Intent: alternating left/right zig-zag, dy 120–150, tolerance 59–84 px. Tutorial notes
float in-world at y 60/180/430/1150. Falls here usually catch within one or two platforms.

## 4. Geometry — Section II · The Needles (170–278 m)

| # | x | top | w | Note |
|---|---|---|---|---|
| 13 | 200 | 1830 | 84 | width step-down announced visually |
| 14 | 60 | 1980 | 76 | |
| 15 | 300 | 2130 | 76 | |
| 16 | 150 | 2280 | 70 | launch pad for the ceiling |
| — | **ceiling** | **2400** | **250 (x=0)** | underside 2384; forces flat arc |
| 17 | 340 | 2350 | 80 | slightly wider — the reward for the lesson |
| 18 | 140 | 2490 | 80 | |
| 19 | 330 | 2630 | 70 | |
| 20 | 180 | 2780 | 64 | gate to III |

## 5. Geometry — Section III · Overhang (278–390 m)

| # | x | top | w | Note |
|---|---|---|---|---|
| — | **ceiling** | **2900** | **220 (x=0)** | jump 20→21 must exit x<220 early (~41 px margin) |
| 21 | 330 | 2900 | 56 | |
| 22 | 170 | 3040 | 56 | |
| 23 | 340 | 3180 | 50 | |
| — | **ceiling** | **3300** | **150 (x=330)** | punishes straight-up jumps from 23 (~26 px margin going left) |
| 24 | 150 | 3310 | 54 | |
| 25 | 300 | 3450 | 48 | |
| 26 | 110 | 3600 | 48 | |
| 27 | 280 | 3750 | 46 | |
| 28 | 120 | 3900 | 46 | gate to IV |

## 6. Geometry — Section IV · The Throat (390–508 m)

| # | x | top | w | | # | x | top | w |
|---|---|---|---|---|---|---|---|---|
| 29 | 320 | 4040 | 36 | | 33 | 340 | 4640 | 30 |
| 30 | 140 | 4190 | 34 | | 34 | 160 | 4790 | 28 |
| 31 | 330 | 4340 | 32 | | 35 | 330 | 4940 | 28 |
| 32 | 150 | 4490 | 30 | | **36** | **180** | **5080** | **120 · GOAL** |

dy 140–150, dx 150–200, required speed 90–98%, tolerance 23–27 px. Seven jumps. No
ceillings here — the width alone is the throat. The summit is 120 px wide on purpose.

## 7. Fall Dynamics

- Platforms alternate sides, so a *pure vertical* drop often catches within 150–300 px.
- Real disasters come from **retained horizontal velocity**: bonks keep `vx`, wall hits
  convert diagonal falls into straight drops down the shaft edge. Deep falls (100–300 m)
  emerge naturally from bad arcs, not from authored cruelty.
- The floor at y=0 is the universal catch. You can always continue. You will not want to.

## 8. Authoring Rules for New Platforms

1. `dy ≤ 160` and required speed ≤ 930 (98%) for the intended solution.
2. Landing tolerance `(w+18)/2 ≥ 23 px` (width floor 28).
3. Ceiling clearance ≥ 15 px at the reference solution; verify with the §2 formulas.
4. Target must be visible from the launch pad (view is 800 px tall; dy ≤ 160 ✓).
5. Never require a blind jump, a frame-perfect input, or RNG.

## 9. Tower Sketch

```
508m  ───────────▄▄▄▄▄▄  SUMMIT (120px, mercy)
      ▂▂                    ▂▂        IV · 28–36px
         ▂▂              ▂▂
      ▂▂▂                  ▂▂▂       III · ceilings ▓▓▓
        ▓▓▓▓▓▓▓              ▂▂▂
      ▂▂▂▂        ▓▓▓▓▓▓▓
              ▂▂▂▂                   II · first ceiling
        ▓▓▓▓▓▓
      ▄▄▄▄        ▄▄▄▄▄              I · 100–150px
  0m  ████████████████████  FLOOR
```