# COMMIT — Level Design & Geometry (v2.6 · six towers)
**Companion to `COMMIT_GDD.md` · All coordinates in logical px · y-up · 10 px = 1 m**
**Source of truth: one descriptor file per tower, `levels/tower-N.js`. This doc explains the math and intent.**

## 0. Descriptor format (the "certain format")

Each tower lives in its own file `levels/tower-N.js`, a classic script whose body is a single
call registering a JSON object:

```js
COMMIT_LEVEL({ "id":3, "name":"TOWER 3", "tag":"THE CLOCKWORK SPIRE", "summit":6000,
  "goal":[240,120],
  "plats":[[x,topY,width,type], …],   // 0 solid · 1 crumble · 2 bounce · 3 ice · 4 move·h · 5 move·v · 6 clock · 7 orbit · 8 dir · 9 warp
  // movers append three params: [x,topY,width,4|5|7, amp, period, phase]
  //   x/topY = oscillation CENTRE (orbit: circle centre) · amp px · period s (≤3) · phase 0..1
  // clock (6) appends: [x,topY,width,6, duty, period, phase]
  //   solid for duty fraction of each period, ghost (pass-through) otherwise; on-window ≥1.2 s
  // dir spring (8) appends: [x,topY,width,8, vx, vy] — fixed launch vector (|v|≤950, vy>0)
  // warp (9) appends: [x,topY,width,9, targetIdx] — one-way door (Tower 6 only): a top landing
  //   folds you to that platform's top centre; target must be a stable rest (non-warp/bounce/dir)
  "zones":[[x,y,w,h,ax,ay], …],        // constant extra accel px/s² on the body in flight only
  //   ay>0 updraft (cuts effective gravity) · ax gust (pushes sideways) · |a| ≤ 1600
  "ceil":[[x,topY,width], …],
  "sections":[[y,"I · NAME"], …],
  "notes":[[x,y,"TEXT"], …] });
```

The argument is plain JSON (the editor parses/exports exactly this). `js/levels.js` is only the
*engine* (`COMMIT_LEVEL` registrar + `buildLevel`); it holds no data. `index.html` loads the
engine then each descriptor as classic `<script>` tags, so the game still runs from `file://`
with zero fetch. To add a tower: drop `levels/tower-N.js` and add one `<script>` tag.

**Authoring tool:** `editor.html` (+ `js/editor.js`) is a web level editor, published with the
game at <https://demerest.github.io/commit/editor.html> (also works from `file://`/localhost).
The game UI never links to it; the README does. Open it, pick or
import a tower, drag platforms / resize / set type, edit ceilings/goal/summit/notes, press
**VALIDATE** (runs the real `step()`/`preview()` solver + invariants), then **EXPORT** to download
a `tower-N.js` descriptor.

## 1. Conventions

- Platforms are authored as `[x, topY, width, type]`; the solid rect is `{x, y: topY−16, w, h: 16}`.
- **Type:** `0/N` solid · `1/C` crumble (breaks after `CRUMBLE_DWELL_TIME = 1.6 s`) · `2/B` bounce
  (auto-launch at `BOUNCE_SPEED = 800 px/s`, keeping `vx`) · `3/I` **ice** (drift, see §2) ·
  `4/H` **mover·horizontal** · `5/V` **mover·vertical** (ping-pong, see §2) ·
  `9/W` **warp door** (one-way fold, Tower 6 only, see §2).
- Character is an 18×18 AABB; `body.y` is its feet.
- Bounds: floor top at `y=0` (full width), solid walls at `x<0` and `x>480`.
- Ceilings are 16 px-thick solids; their **underside** is the bonk surface.
- Goal per tower: T1 `[180, 5080, 120]`, T2 `[240, 5600, 120]`, T3 `[240, 6000, 120]`,
  T4/T5 per descriptor, T6 `[150, 4800, 160]`, flagged `goal: true`.
- Crumbled platforms reform after `CRUMBLE_REFORM_TIME = 3.0 s`; reset/erase rebuilds instantly.
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
0→`ICE_SLIDE_SPEED` (42) over `ICE_SLIDE_RAMP_TIME` (0.5 s) then holds. Time-to-edge from a landing ≈
`(edgeDistance − ~10px ramp) / 42 + 0.5`. A centre landing on an 80 px ice gives ~1.2 s to
commit — enough to aim, not enough to dawdle. Straight-down (`vx=0`) landings never drift, the
fair counter. Ice widths in T2 are ≥ 40 (gates) to 110 (teachers) to keep that window honest.

**Mover math.** Position is a triangle wave on the shared world clock:
`offset(t) = amp · tri(t/period + phase)`, `tri` ∈ [−1,1] with constant speed
`4·amp/period` (px/s). Horizontal movers translate `x`; vertical lifts translate `top`.
The rider is carried **exactly** (relative offset frozen — you can overhang an edge and stay
on); launching discards the carry, so the Commit Contract holds from a moving origin.
The preview clones the world clock, therefore the arc meets the platform *where it will be*.
**Contact classification:** a lift can move into the body between substeps, so `step()` checks
the platform's rect at `t−FIXED_DT` first — a body that was above the old top lands on the new top
(even if the lift rose into it, even mid-rise), a body below the old bottom bonks; only bodies
already inside the slab's vertical span side-hit. Without this, arrivals within one substep of
the top were ejected to the platform edge ("teleport") instead of landing.

- **Period ≤ 3.0 s** (= `AIM_FUSE_TIME`): any phase is reachable within one fuse, so waiting for
  the machine is always a legal strategy.
- **Lift speed ≤ ~100 px/s** (`4·amp/period`): faster lifts close the ±0.12 s fairness window
  the solver demands on every mover jump. T3 lifts run 80–93 px/s.
- **Mandatory elevator chain** `A → E(vertical) → C`: `E_low − A ≤ 160` (board at the bottom),
  `C − E_high ≤ 160` (leave at the top), `C − A > 205` (the ride is the only way up).
  Worked chain (II): A 2600 → E 2790±70 (low 2720, high 2860) → C 3020. Board descending near
  the low stop, ride ~1.5 s, launch at the high stop.
- **Horizontal gate** ("the machine comes to you"): max direct `dx` at dy 140 ≈ 212 px
  (vy≈820, vx≈441 at 95%). Place the launch pad and the mover's *far* stop farther apart than
  that, and its *near* stop within reach — the jump exists only in a phase window. Worked gate
  (II): pad 13 centre ≤111 → mover 14 sweep x∈[270,410] (nearest landing centre 261 ⇒ dx 150 ✓,
  farthest 401 ⇒ dx 290 ✗, static-at-base 331 ⇒ dx 220 ✗). ~1 s of the 2.6 s cycle is legal.
- **Sweeps inside the walls:** `x−amp ≥ 0` and `x+amp+w ≤ 480` (horizontal); `top−amp ≥ 0`
  (vertical). The editor rejects violations.

**Gust-zone math (T4+).** A zone adds constant accel `(ax,ay)` while the body centre is inside,
flight only. Effective gravity inside an updraft = `G − ay` (e.g. 2200−1400 = 800), so apex gain
for a given `vy` scales by `G/(G−ay)` — a dy-260 gap becomes reachable (direct apex at 98% is
~205). Gust `ax` adds `½·ax·t²` lateral drift over the time spent in the lane; aim upstream to
compensate. Zones are static → no phase sampling needed; the solver exempts zone-assisted gaps
from the analytic `vyNeed` prune and relies on numeric preview. |ax|,|ay| ≤ 1600.

**Phase-platform math (T4+).** `solidAt(s,t) = frac(t/period + phase) < duty`. On-window =
`duty·period` (≥1.2 s so ±0.12 s launch shift lands); off-window = `(1−duty)·period` (the
pass-through / drop-through window). Period ≤3 s (fuse). Rect is static; only solidity varies,
so the solver samples launch phases exactly as for movers and demands the ±0.12 s tolerance.
Ghost = fully pass-through (no bonk from below, no land from above) → timed one-way gate.

**Orbiter math (T5+).** Type 7: `x=bx+amp·cos(2π(t/period+phase))`, `y=by+amp·sin(…)`. Pure
`rectOf` → Contract holds; carry is 2-D (`body += Δcentre`). Orbit speed = `2π·amp/period`
(constant); keep ≤140 px/s and period ≤3 s for the ±0.12 s fairness window. Sweep must stay
inside the walls (`x±amp`, `y±amp`). Solver samples launch phases exactly as for movers.

**Direction-spring math (T5+).** Type 8: on contact it sets `(vx,vy)` to the authored fixed
vector (not `BOUNCE_SPEED`, not preserved `vx`) and stays airborne → a deterministic redirect.
Preview exact (the bounce branch sets `v`). The downstream rest must lie within the fixed
vector's reach from the spring's contact span: `dy ≤ vy²/(2G)` and `dx ≈ vx·t(dy)`. Chains
"follow the arrows", so the monotonic-x bounce invariant applies to type 2 only.

**Warp-door math (T6 only).** Type 9: a *top landing* on the pad repositions the body to
`rectOf(target,t)` top centre and then runs the ordinary landing branch on the target — all
inside `step()`, so preview ≡ flight through the fold by construction. Side hits and bonks
never fold. The arrival stands still (momentum discarded, ice drift included); crumble dwell /
carry / phase rules apply at the destination. Falls are still honest: an unkind fold that drops
you ≥250 px counts as a fall with the red flash and `−Xm` popup.
**The destination is hidden by design** (user decision, 2026-11-18): the preview rings the door
itself in pink and draws no fold-link; the contract *data* still carries the true destination
(`mark.idx`/`mark.warp`), only the rendering keeps the secret. The editor still draws fold-links
because authors need them.
Authoring constraints: target is a stable rest (non-warp, non-bounce, non-dir); pads are
**not rests** for the solver/VALIDATE chain — a rest whose incoming edge is a fold is reached
by launching onto the pad, so the `dy ≤ 160` invariant applies to the *launch onto the pad*
(often a jump DOWN), not to the fold's rise. Doors must not sit under an overhanging rest in
the same column unless the fall corridor beside that rest is wide enough: the arc has to slip
past the overhang's edge before descending onto the pad (T6 door 8 is 150 px wide for exactly
this reason — a 110 px pad gave a ±1° graze window; 150 px gives ~±8°).

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

1. `dy ≤ 160` and required speed ≤ 931 (98%) for the intended solution (bounce hops use `BOUNCE_SPEED`).
2. Landing tolerance `(w+18)/2 ≥ 23 px` (width floor 28).
3. Ceiling clearance ≥ 15 px at the reference solution; verify with the §2 formulas.
4. A mandatory spring's downstream rest must sit > 205 px above its upstream rest (forces the bounce).
5. **Alternate sides** — never stack a platform directly above its predecessor (§2).
6. **Bounce chains monotonic in x** (§2); an ice rest after a spring must be wide enough to commit (~1 s).
7. Target visible from the launch pad; never a blind jump, frame-perfect input, or RNG.
8. **Movers:** period ≤ 3 s; sweep inside the walls; lift speed ≤ ~100 px/s; elevator chains
   obey the low/high dy bounds (§2); every mover jump must survive ±0.12 s of launch-phase shift.
9. Re-run the `test.html` solver after any edit — it proves all 36 T1 + 40 T2 + 42 T3 + 43 T4
   rest-to-rest jumps solvable (or press VALIDATE in the editor).
10. **Zones (T4+):** |accel| ≤ 1600; inside the walls; a zone-assisted gap must be unsolvable
    without the zone (zone is the verb, not decoration); zones act in flight only.
11. **Phase (T4+):** period ≤ 3 s; duty·period ≥ 1.2 s (fair on-window); duty ∈ (0,1); ghost is
    fully pass-through; ghosting under a rider drops honestly and the platform always returns.
12. **Orbit (T5+):** period ≤ 3 s; orbit speed ≤ 140 px/s; sweep inside walls; 2-D carry exact;
    every orbiter jump survives ±0.12 s of launch-phase shift.
13. **Dir spring (T5+):** |v| ≤ 950, vy > 0; the downstream rest lies within the fixed vector's
    reach from the contact span; springs are hop points (excluded from rest-to-rest rests).

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

Ceilings: `[280,2300,200]` (over ice-adjacent pad 16, exit left), `[320,3140,160]` (pad 22 ice,
exit left), `[300,4910,180]` (pad 35 ice, exit left). Each forces a flat arc off a sliding or
narrow pad — the "commit fast" lesson under a bonk threat. The 3140 ceiling starts at x 320
(not 280): ice drift carries you right while the exit is left, so the span must leave room for
a normal flat arc (~95%, vx≈−380) to clear from anywhere on the 60 px pad; steeper panic arcs
still bonk. (v2.3 fix: at x 280 the legal launch window was a few px wide — unfair.)

Bounce chain: 27 (A, 3720) → 28 (spring, 3830) → 29 (C ice, 3950; 230 px above A). All rightward;
the spring carries `vx` onto wide ice (80 px) so you land drifting and must commit within ~1 s.

The summit is offset to x 240 (right of pad 40) so the final arc is a genuine left-to-right
decision, not a vertical hop.

## 11. Tower 3 · The Clockwork Spire (600 m) — full geometry

Strict zig-zag with **movers** (`H` horizontal, `V` vertical; params = amp/period/phase).
42 platforms + summit, 2 ceilings, 1 mandatory elevator ride (19→20→21), 1 mandatory
horizontal gate (13→14), 1 bounce chain onto a moving catch (33→34→35).

| # | x | top | w | type | | # | x | top | w | type |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 60 | 120 | 150 | N | | 22 | 300 | 3160 | 64 | **C** |
| 2 | 270 | 250 | 140 | N | | 23 | 120 | 3300 | 64 | N |
| 3 | 90 | 380 | 130 | N | | 24 | 300 | 3440 | 64 | **H** 60/2.4/0 |
| 4 | 280 | 510 | 120 | **H** 60/2.4/0 | | 25 | 120 | 3580 | 60 | **I** |
| 5 | 100 | 640 | 120 | N | | 26 | 300 | 3720 | 60 | N |
| 6 | 290 | 780 | 110 | **I** | | 27 | 110 | 3860 | 60 | **H** 70/2.6/.5 |
| 7 | 120 | 920 | 110 | N | | 28 | 300 | 4000 | 56 | **C** |
| 8 | 300 | 1060 | 100 | **H** 70/2.6/.5 | | 29 | 120 | 4140 | 56 | N |
| 9 | 130 | 1200 | 100 | **C** | | 30 | 300 | 4320 | 56 | **V** 60/2.6/0 |
| 10 | 300 | 1340 | 100 | N | | 31 | 120 | 4460 | 52 | **I** |
| 11 | 110 | 1480 | 90 | **I** | | 32 | 300 | 4600 | 48 | N |
| 12 | 300 | 1620 | 90 | N | | 33 | 120 | 4740 | 48 | N (A) |
| 13 | 40 | 1760 | 80 | N | | 34 | 240 | 4850 | 56 | **B** |
| 14 | 340 | 1900 | 70 | **H** 70/2.6/0 | | 35 | 340 | 4970 | 72 | **H** 60/2.4/0 (C) |
| 15 | 110 | 2040 | 76 | N | | 36 | 180 | 5110 | 44 | N |
| 16 | 280 | 2180 | 76 | **V** 70/2.8/0 | | 37 | 320 | 5250 | 40 | **I** |
| 17 | 110 | 2320 | 76 | N | | 38 | 140 | 5390 | 40 | N |
| 18 | 300 | 2460 | 72 | **I** | | 39 | 320 | 5530 | 40 | **V** 60/2.6/.5 |
| 19 | 120 | 2600 | 72 | N (A) | | 40 | 150 | 5670 | 36 | **C** |
| 20 | 280 | 2790 | 72 | **V** 70/3/0 (E) | | 41 | 320 | 5810 | 36 | N |
| 21 | 120 | 3020 | 72 | N (C) | | 42 | 180 | 5940 | 36 | N |
| | | | | | | **GOAL** | 240 | 6000 | 120 | |

Ceilings: `[0,3460,220]` (underside 3444 over pad 23 — exit right before rising 126 px) and
`[280,3880,200]` (underside 3864 over pad 26 — exit left). Both force flat arcs; the second
launches toward a *moving* catch (27) that sweeps x∈[40,180].

Elevator ride: 19 (A, 2600) → 20 (E, 2790±70 ⇒ 2720–2860) → 21 (C, 3020). C−A = 420 > 205,
so the lift is mandatory; board near the low stop, jump at the high stop (dy 160 both ways).

Bounce chain: 33 (A, 4740) → 34 (spring, 4850) → 35 (C mover, 4970; 230 px above A). All
rightward; the spring keeps `vx` and the catch sweeps x∈[280,400] — the preview draws the hop
and the magenta ring where the catch will be.

The summit is offset to x 240 (right of pad 42) so the final arc is a real decision.

## 12. Tower 4 · The Tempest Engine (640 m) — wind + light

43 rests, alternating sides, widths 150→36. Five zones and four phase platforms; ice, crumble,
bounce and both mover types recur. No ceilings (wind and blink are the hazards).

Zones `[x,y,w,h,ax,ay]`:
- Z1 updraft `[140,520,200,260,0,1400]` — pad 3 (90,510) → pad 4 (280,760): dy 250, only via wind.
- Z2 left gust `[120,1330,220,150,-700,0]` — pad 8 (290,1320) → pad 9 (120,1460): aim into the push.
- Z3 updraft `[140,2310,200,270,0,1500]` — pad 15 (120,2300) → pad 16 (290,2560): dy 260.
- Z4 left gust `[120,3410,220,150,-700,0]` — pad 22 (290,3400) → pad 23 (110,3540).
- Z5 updraft `[140,4250,200,270,0,1500]` — pad 28 (290,4240) → pad 29 (110,4500): dy 260.

Phase platforms `[x,top,w,6,duty,period,phase]`: 11 (120,1740,.6,2.4,0), 13 (120,2020,.6,2.4,.5),
21 (120,3260,.6,2.6,0), 35 (320,5340,.6,2.6,.5). On-window 1.44–1.56 s (≥1.2 ✓); offset phases so
consecutive gates are not synchronous.

Bounce chain: 31 (120,4780) → 32 (spring,240,4920) → 33 (340,5060), all rightward.
Summit offset to x 240 (right of pad 42 at 170,6320) so the final arc is a real decision.
Solver: 43/43 ≤98%; editor VALIDATE 43/43.

## 13. Tower 5 · The Orrery (676 m) — orbit + redirect

43 rests, alternating sides, widths 150→32. Four orbiters (7,13,26,37), four direction
springs (9,16,28,43), one bounce chain (32, leftward), plus ice/crumble/movers/phase.
No zones/ceilings (orbit + redirect are the hazards).

Orbiters `[x,top,w,7,amp,period,phase]`: 7 (290,1060,50,3,0), 13 (290,1880,50,3,.5),
26 (110,3680,45,3,0), 37 (150,5220,40,3,0). Speeds 105/105/94/84 px/s (≤140 ✓).
Dir springs `[x,top,w,8,vx,vy]`: 9 (290,1340,-200,800)→10; 16 (110,2300,200,800)→17;
28 (120,3960,260,820)→29; 43 (160,6060,260,860)→44. Each throws across to the opposite side.
Spring-assisted vertical stacks (27→29, 42→44) are legal because the spring is the verb.
Bounce chain 31 (290,4380) → 32 (200,4520) → 33 (140,4660), leftward monotonic.
Summit offset to x 240 (right of pad 47 at 170,6620). Solver 44/44 ≤98%; editor VALIDATE 44/44.

## 14. Tower 6 · The Switchboard (780 m) — one-way doors, a long routing puzzle

46 platforms: 34 rests + 11 warp doors + 1 bounce spring. Widths 110–150 px throughout and
direct rises ≤150 px — deliberately gentler platforming than T1–T5 (minimum solve power caps
at **90%**, typical 84–88%, vs 94% caps / 90–92% typical in T2 and T5). The difficulty is
*routing*: which door, and when to jump down. Nine sections so the puzzle keeps going past
halfway. No zones, no ceilings, no orbiters; two ice shelves, three crumbles, two conveyors,
one phase gate and one bounce chain as recall.

Warp doors `[x,top,w,9,target]`:
- D1 `4 (60,680,110) → 5` — the teacher: a normal jump onto the pad folds 680 px up.
- D2 `7 (60,1680,120) → 1` — **unkind**: sits above-left of the ice shelf like progress;
  folds you back to 26 m. The drop counts as a fall.
- D3 `8 (170,1200,150) → 9` — the way up from the ice shelf is a jump **down** onto this door
  (direct rise 6→9 is 260 px > 205 apex). 150 px wide so the fall corridor past rest 5's right
  edge is ~±8° of angle, not a graze. Also reachable from rest 5 (shortcut).
- D4 `12 (60,1780,130) → 13` — second down-jump door, in the slot between rest 10 (1900) and
  door 7 (1680); makes the conveyor 11 optional (drop from 10 straight onto it).
- D5 `20 (330,3380,120) → 1` — **unkind** twin: same height as D6, opposite side.
- D6 `21 (60,3380,110) → 22` — the kind twin: folds 440 px to the long ladder.
- D7 `32 (60,5220,110) → 34` — the Return Door: folds 520 px into the Machine Room.
- D8 `33 (330,5220,120) → 10` — **unkind** twin of D7: folds 332 m back down to the switchback.
- D9 `40 (250,6580,110) → 42` — gallery fold, 420 px up.
- D10 `41 (60,6720,110) → 43` — third **down-jump** door: from rest 42 (7000) drop 280 px onto
  it; the direct rise 42→43 is 280 px > 205 apex, so the door is the only way.
- D11 `44 (250,7420,110) → 45` — the last fold, 240 px to the summit ledge.

Route (rest chain, folds in brackets): floor → 0 → 1 → 2 → 3 → [D1] 5 → 6 → [D3 down] 9 →
10 → 11 → [D4 down] 13 → 14 → 15 → [bounce 16] 17 → 18 → 19 → [D6] 22 → 23 → 24 → 25 → 26 →
27 → 28 → 29 → 30 → 31 → [D7] 34 → 35 → 36 → 37 → 38 → 39 → [D9] 42 → [D10 down] 43 →
[D11] 45 → goal. Alternate lines exist on purpose (5→D3, 9→D4, 10→D4 skip the ice or the
conveyor); the traps are always optional and always recoverable — you land back on an earlier
ladder, never in a pit.

Bounce chain 15 (60,2680) → 16 (180,2820) → 17 (300,2950), rightward monotonic (hop 130 < 145).
Conveyors 11 `(250,2040,120,4,40,2.4,0)` and 36 `(250,6020,120,4,40,2.4,0)` sweep x∈[210,410]
inside walls; their jumps survive ±0.12 s. Phase gate 38 `(250,6300,110,6,.6,2.4,0)` on-window
1.44 s ≥ 1.2. Summit goal `[150,160]` offset right of pad 45 (60,7660) so the last arc is a
decision. Solver 35/35 ≤98% (min-power ceiling 90%); editor VALIDATE 35/35; harness §36–37
assert the fold contract, one-way rule, traps, down-jumps, queue-through-fold and persistence.
