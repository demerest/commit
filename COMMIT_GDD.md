# COMMIT — Game Design Document
**Version 2.2 · HTML + CSS + modular JS (`js/`) · No images · Procedural audio only · No dependencies**

> A tower. A square. No air control.
> Draw an arc, release, and live with exactly what you drew.

---

## 1. Overview

| Field | Value |
|---|---|
| Genre | Minimalist precision rage-platformer |
| Session length | 30 s (one bad jump) → 20 min (full climb) |
| Viewport | Fixed logical 480×800, uniformly scaled, portrait-first |
| Input | Pointer (mouse/touch/pen) + full keyboard fallback |
| Win condition | Land on a tower's summit (T1 508 m, T2 560 m, T3 600 m); clearing unlocks the next tower |
| Lose condition | None. You fall for real. That is worse. |
| Assets | Zero files. Everything is drawn with Canvas 2D primitives and synthesized with Web Audio at runtime |
| Sound | Procedural only — no audio files, no generated audio assets. On by default, one-tap mute (♪ / M). Silence at the summit (see §12) |

## 2. Fantasy & Pillars

The fantasy is **the moment you can't take it back**. Every other platformer lets you
correct in mid-air. COMMIT removes that lie. You plan, you commit, physics renders the
consequence.

1. **Honesty** — the dotted preview is produced by the *same integrator* as the real
   flight. What you see is, to the pixel, what you get. Every failure is the player's.
2. **Commitment** — release is irreversible. No cancel, no air control, no double jump.
3. **Legibility** — one screen, one character, one rule. Nothing hides information.
4. **Restraint** — no death counter, no spikes, no checkpoints. The only punishment is
   gravity, and it is always enough.

### Why the rage is fair
- No RNG anywhere in the simulation (randomness exists only in cosmetic particles).
- Falls are physical: you lose exactly the height you drop, landing on whatever is below.
- The preview shows every contact truthfully, including wall hits and ceiling bonks, and runs
  to the eventual landing: bonks/scrapes do not end flight, so they do not end the arc either.
- Restart is instant; progress persists across refresh. The game never wastes your time,
  only your pride.

### Player psychology targets
- **0–60 s:** "This is easy." (wide platforms, tutorial notes in the world)
- **2–5 min:** "I just need to be careful." (widths shrink, first ceiling)
- **5–15 min:** "One more run." (near-max-power chains, visible best-height tick)
- **Summit:** relief, not triumph. The stats screen tells you what it cost.

## 3. Core Loop

```
GROUND → AIM (drag / keys) → read the dotted arc → RELEASE
   → FLIGHT (no input, watch your decision) → LAND
      → higher: repeat, slightly harder
      → lower: fall flash, −Xm popup, repeat anyway
   → SUMMIT: stats, share, climb again
```

## 4. The Commit Contract (defining feature)

- While aiming, a dotted parabola is simulated with the **identical** `step()` function,
  timestep, gravity, clamp, and collision rules used by the real flight.
- The preview terminates at the **first contact** and marks it:
  - **green ring** — you will land here (feet on a surface);
  - **ice-blue / magenta ring** — same, but the surface is ice / a moving platform;
  - **red ✕** — you will strike a wall or ceiling here and drop.
- Against movers the arc simulates the platform's *future* motion on the same world clock,
  so the ring sits where the platform **will be** when you arrive. A dashed ghost outline of
  the mover at that future moment is drawn under the ring, so the mark never looks adrift.
- A live **power %** readout sits beside the character.
- This contract is the product. Any tuning change must keep preview ≡ simulation.

## 5. Controls

| Action | Pointer | Keyboard |
|---|---|---|
| Aim | Press anywhere, drag (relative vector) | `←/→` angle, `↑/↓` power — **hold to sweep** |
| Fine aim | — | hold `Shift` (¼ rate) |
| Commit | Release | `Space`/`Enter` (first press raises the arc, second commits) |
| Pre-aim | drag mid-flight; release queues the commit for landing | arrows mid-flight; `Space` queues |
| Cancel aim | Drag < 90 px/s equivalent, or `pointercancel` | — (no cancel key) |
| Pause | `II` button | `Esc` / `P` (freezes clock; preserves a drawn aim) |
| Reset run | ↺ button (confirm) | `R` (confirm) |
| Help | ? button | `H` |
| Sound on/off | ♪ button | `M` |

Rules:
- **Pre-aim:** aiming may start mid-flight (drag or arrows); the fuse runs as usual from the
  moment you start. A launch attempt while airborne — release, `Space`, or fuse expiry —
  **queues** the drawn arc (`QUEUED · n%`, amber ring) and fires it on the instant of true
  landing; bounce hops are not landings. Nothing launches mid-air. There is **no cancel key**:
  once an arc is drawn it commits (release, `Space` or the fuse). `Esc`/`P` pause (clock frozen,
  drawn aim preserved); pause and the summit screen link to the main menu / level select.
- Drag is relative (press anywhere — thumb ergonomics on mobile), direction = drag
  direction, magnitude × 4.8 = launch speed, clamped to 950 px/s.
- Releases below 90 px/s cancel silently with a small puff — twitchy micro-drags are
  forgiven; anything above the threshold is a launch and counts.
- Full power needs only ~198 px of drag (`DRAG_SPEED_PER_PX 4.8`), so a thumb on a phone screen can
  reach any arc without running out of glass.
- Keyboard aim sweeps continuously while an arrow is held (60°/s angle, 0.45/s power,
  ¼ with `Shift`), driven by the game clock — never by OS key-repeat. A live
  `angle° · power%` readout sits beside the square so tuning is never blind.

## 6. Physics & Rules

World units are pixels at logical resolution; **y is up**; 10 px = 1 m.

All named constants live in `js/constants.js` (grouped by system, one comment each).

| Constant | Value | Meaning |
|---|---|---|
| `FIXED_DT` | 1/120 s | Fixed simulation timestep |
| `GRAVITY` | 2200 px/s² | Gravity |
| `MAX_LAUNCH_SPEED` | 950 px/s | Launch speed clamp (apex 205 px, 45° range 410 px) |
| `MIN_LAUNCH_SPEED` | 90 px/s | Cancel threshold |
| `DRAG_SPEED_PER_PX` | 4.8 | Drag px → launch px/s (full power ≈ 198 px of pull) |
| `CHAR_SIZE` | 18 px | Character size (AABB) |
| `TERMINAL_FALL_SPEED` | 1600 px/s | Downward speed cap, `vy ≥ −1600` (also guarantees no tunneling) |
| `FALL_COUNT_MIN_PX` | 250 px | A landing this far below launch counts as a **fall** |
| `SUMMIT` | per tower | Goal altitude (T1 5080, T2 5600, T3 6000, T4 6400, T5 6760, T6 7800 px) |
| `AIM_FUSE_TIME` | 3.0 s | Aim fuse — auto-commits the drawn arc on expiry |
| `CRUMBLE_DWELL_TIME` | 1.6 s | Standing this long on a cracked platform breaks it |
| `BOUNCE_SPEED` | 800 px/s | Upward relaunch speed on a teal spring (keeps `vx`) |
| `CRUMBLE_REFORM_TIME` | 3.0 s | A crumbled platform reforms after this cooldown (no softlock) |
| `ICE_SLIDE_SPEED` | 42 px/s | Terminal drift speed on ice (slow, deliberate) |
| `ICE_SLIDE_RAMP_TIME` | 0.5 s | Ease-in before full drift, so a landing has a moment of grace |

Collision outcomes (axis-separated, X then Y, per substep):

| Contact | Result |
|---|---|
| Top of solid while descending | **Land.** All velocity zeroed, grounded |
| Top of a **spring** while descending | **Bounce.** `vy = +800`, keep `vx`, stay airborne; a dead-vertical contact (`vx = 0`) gets a deterministic sideways nudge (`BOUNCE_SIDE_NUDGE`, nearer side) so it can never bounce forever |
| Top of **ice** while descending | **Land + drift.** `vy = 0`; slide dir = sign of entry `vx` (0 if straight down) |
| Top of a **mover** while descending | **Land + carry.** Velocity zeroed; the platform then carries you exactly (no relative slide) |
| Top of a **warp pad** while descending | **Fold.** Teleport to the target's top centre, then resolve as an ordinary landing there (momentum discarded) |
| Side of solid / wall | `vx = 0`, keep falling straight down |
| Underside of solid | **Bonk.** `vy = 0`, keep horizontal drift, fall |

**Ice rule (Tower 2+):** you slowly slide toward the side *opposite* the one you came from —
i.e. in the direction you were travelling at landing. A straight-down landing (`vx = 0`) stands
still. Drift ramps in over `ICE_SLIDE_RAMP_TIME` then holds `ICE_SLIDE_SPEED`; reaching the far edge walks you off
into an honest fall (keeping the small drift `vx`). A side wall blocks the drift: the square
stops and stands at the wall (no slide/walk-off/eject/re-land loop). The drift sign uses the
entry velocity *after* the step, so a wall scrape that zeroed `vx` counts as a straight-down
landing. Launching discards the drift, so the Commit
Contract holds: the arc is exactly what you drew from your current (sliding) position.

**Mover rule (Tower 3+):** magenta platforms ping-pong at constant speed (`4·amp/period`,
period ≤ 3 s so every phase is reachable inside one aim fuse). Standing on one, you are
carried exactly — even over the edge; you leave only by launching, and the launch **discards
the carry**, so the arc is exactly what you drew. Horizontal movers slide you sideways;
vertical lifts raise and lower you (ride up, jump at the top). A lift that presses you into
a ceiling drops you honestly. A lift that rises into a descending body **lands it in place** —
contacts are classified against the platform's previous-step position, so a moving surface
never side-ejects you to its edge or bonks you through it. The preview knows all of this: it
runs the same world clock.

**Gust-zone rule (Tower 4+):** blue rectangular columns apply a constant extra acceleration to
the body *in flight only* (updraft `ay>0` cuts effective gravity; gust `ax` pushes sideways).
Static in time → no timing-fairness cost; the arc visibly bends and the preview bends with it
(same integrator). Grounded bodies are unaffected. |accel| ≤ 1600 px/s² so speed clamps bound.
A zone must be the *enabling* verb for its gap (the jump is unsolvable without it).

**Phase-platform rule (Tower 4+):** gold platforms are solid for a `duty` fraction of each
`period` (≤3 s) on the world clock, and **ghost / pass-through** otherwise — you can fall
straight through a ghost, making them timed one-way gates as well as timed rests. Standing on
one when it ghosts drops you honestly; it always returns (no softlock). On-window ≥1.2 s so a
±0.12 s launch shift still lands. The solidity is a pure `solidAt(s,t)` predicate read inside
`step` (never shared-state mutation), keeping preview ≡ flight.

**Orbiter rule (Tower 5+):** green platforms ride a circle (`x=bx+amp·cos`, `y=by+amp·sin`) on
the world clock; pure `rectOf` keeps preview ≡ flight; the rider is carried in 2-D. Orbit speed
`2π·amp/period` ≤140 px/s, period ≤3 s, sweep inside the walls. A clockwork escalation of T3.

**Direction-spring rule (Tower 5+):** orange pads throw you on a *fixed authored vector*
(`[vx,vy]`) instead of preserving your momentum — a deterministic redirect. Preview exact (the
bounce branch sets `v`). Chains "follow the arrows"; the monotonic-x invariant applies to
plain springs only. Audio pitched by launch direction.

**Warp-pad rule (Tower 6 only):** pink pads are one-way doors. A *top landing* folds the body
to the target platform's top centre (`rectOf(target,t)`, so mover targets stay exact) and then
resolves as an ordinary landing there — crumble dwell, ice, carry all apply at the destination,
but the arrival stands still (the fold discards momentum). Side hits and bonks are not
landings, so they never fold. The fold happens *inside* `step()`, therefore preview ≡ flight
through the teleport. **The destination is a secret:** the preview rings the *door* in pink and
stops there — no destination ring, no fold-link (user decision, 2026-11-18). The contract data
still carries the true destination; only the rendering hides it, so the mystery never costs
pixel-truth. The editor still draws fold-links for authoring. Targets must be stable rests
(non-warp, non-bounce, non-dir). Doors enable non-linear routing: some open downward (jump down
to go up), some are unkind (they fold you back down the tower, and the drop counts as a fall
like any other).

Geometry, gravity, the fuse and the slide are the antagonists; the springs are the only mercy.
There is no instant-death hazard.

## 7. Failure Economy

- **No death, no respawn, no checkpoints.** A missed jump is a real fall through the tower;
  you land on whatever catches you — sometimes 15 m down, sometimes 200.
- A landing ≥ 25 m below the launch point increments the **fall counter**, fires a red
  screen flash, and floats a `−Xm` popup at the impact point.
- The last flight's trail lingers until your next launch — your mistake hangs in the air.
- **Persistence:** position + run stats + lifetime records save to `localStorage` on every
  landing. Refresh resumes exactly where you stood. "Erase run" requires confirmation and
  keeps lifetime records.

## 8. Tower Structure

Six towers (more planned). Each has sections and a summit. Full geometry and
reachability/bounce/ice/mover math: `COMMIT_LEVELS.md`. Levels are pure data in
`levels/tower-N.js` descriptors; `js/levels.js` is only the engine.

**Tower 1 · First Ascent (508 m)** — the original climb.

| # | Name | Altitude | Platform width | Teaches / tests |
|---|---|---|---|---|
| I | First Steps | 0–168 m | 100–150 px | Drag, power, angle; first crumble teaches "keep moving" |
| II | The Needles | 168–282 m | 64–84 px | Precision; first ceiling; first mandatory bounce chain |
| III | Overhang | 282–395 m | 46–60 px | Two ceilings; crumble ledges; planning under constraints |
| IV | The Throat | 395–508 m | 30–40 px | Near-max-power chains; second bounce chain; crumble gates |
| V | Summit | 508 m | 120 px | Mercy at the top. Flag. Silence. |

**Tower 2 · The Ice Ascent (560 m)** — rearranged, harder-but-fair, introduces ice.

| # | Name | Altitude | Platform width | Teaches / tests |
|---|---|---|---|---|
| I | Cold Start | 0–148 m | 90–140 px | First wide ice: drift, and the straight-down counter |
| II | Glass Works | 148–282 m | 64–80 px | Ice + crumble mix; ceiling over an ice launch pad |
| III | The Slide | 282–409 m | 48–60 px | Bounce chain that lands you on ice *already sliding* |
| IV | Whiteout | 409–560 m | 36–48 px | Narrow ice gates; ice under a ceiling; crumble gates |
| V | Summit | 560 m | 120 px | Mercy at the top, offset so the last arc is a real decision |

**Tower 3 · The Clockwork Spire (600 m)** — the machine tower: moving platforms plus every
prior mechanic.

| # | Name | Altitude | Platform width | Teaches / tests |
|---|---|---|---|---|
| I | Conveyor | 0–162 m | 90–150 px | First horizontal movers (wide, forgiving); ice + crumble recall |
| II | Elevators | 162–302 m | 72–80 px | A mover that only comes to you at the right phase; first vertical lift; mandatory elevator ride (230 px+ gain) |
| III | Clockwork Overhang | 302–446 m | 56–64 px | Ceilings over moving launch pads; flat arcs off a sliding origin |
| IV | Escapement | 446–600 m | 36–52 px | Spring chain onto a *moving* catch; narrow ice; timed lift gates; crumble gates |
| V | Summit | 600 m | 120 px | Mercy at the top, offset right of the last pad |

**Tower 4 · The Tempest Engine (640 m)** — the storm tower: wind columns and blinking gold
platforms plus every prior mechanic.

| # | Name | Altitude | Platform width | Teaches / tests |
|---|---|---|---|---|
| I | The Bellows | 0–160 m | 90–150 px | First updraft (a >205 px gap only reachable through wind); a gust lane; ice + crumble recall |
| II | Escapement Lights | 160–326 m | 72–90 px | First phase platforms; land on the beat; ghost = fall through; second updraft |
| III | Storm Clock | 326–450 m | 62–72 px | Wind + light together; a left gust; mover + crumble + ice under time pressure |
| IV | The Eye | 450–632 m | 36–60 px | Calm but narrow: third updraft, bounce chain, narrow ice/crumble, timed lift + phase gate |
| V | Summit | 640 m | 36 px | Mercy at the top, offset so the last arc is a real decision |

**Tower 5 · The Orrery (676 m)** — the clockwork-orbit tower: orbiting platforms and
fixed-vector redirect pads plus every prior mechanic.

| # | Name | Altitude | Platform width | Teaches / tests |
|---|---|---|---|---|
| I | Orbital Dock | 0–160 m | 90–150 px | First orbiter (ride the circle); ice + crumble recall |
| II | The Redirect | 160–326 m | 72–90 px | First direction springs (follow the arrow, not momentum); orbiter + phase |
| III | Clockwork Ring | 326–450 m | 60–70 px | Orbit + blink together; movers + ice under time pressure |
| IV | Spring Chain | 450–662 m | 32–60 px | Leftward bounce chain; narrow ice/crumble; orbiter + timed lift + redirect |
| V | Summit | 676 m | 32 px | Mercy at the top, offset so the last arc is a real decision |

**Tower 6 · The Switchboard (780 m)** — the puzzle tower: one-way warp doors plus a light
recall of ice, crumble, conveyors, a phase gate and one bounce chain. Gentler platforming than
the precision towers on purpose — the antagonist here is *routing*, not pixel tolerance — but
long: nine sections and eleven doors, so the switchboard keeps surprising you past halfway.

| # | Name | Altitude | Platform width | Teaches / tests |
|---|---|---|---|---|
| I | The First Door | 0–136 m | 110–140 px | First warp pad: the arc rings the door, not where it opens; crumble recall |
| II | Down to Go Up | 136–240 m | 110–150 px | Ice shelf; an unkind door above it; the way up is a jump DOWN onto a door; conveyor optional via a second door |
| III | The Switchback | 240–310 m | 110–130 px | Crumble recall; rightward bounce chain; wide zig-zag |
| IV | Two Doors, One Height | 310–382 m | 110–130 px | Two doors at the same altitude, one kind one unkind — choose; commit to learn |
| V | The Long Fold | 382–466 m | 120–140 px | Calm wide ladder; a door folds 440 px |
| VI | The Return Door | 466–574 m | 110–130 px | Twin doors again, one unkind (folds 38 m back down); the kind one folds 520 px |
| VII | The Machine Room | 574–658 m | 110–130 px | Ice + conveyor + crumble + the tower's only phase gate; a door skips ahead |
| VIII | The Gallery of Doors | 658–766 m | 110–130 px | Third down-jump door; staggered long folds |
| IX | Summit | 780 m | 140 px | Mercy at the top |

Design invariants for every tower (enforced by the solver): consecutive platforms alternate
sides (a platform directly above another is unreachable — you'd bonk its underside); bounce
chains keep one horizontal direction (bounce preserves `vx`); `dy ≤ 160`, required speed
≤ 98%, ceiling margin ≥ 15 px. Mover additions: sweeps stay inside the walls; period ≤ 3 s
(the fuse window); elevator chains satisfy `low−A ≤ 160`, `C−high ≤ 160`, `C−A > 205`; every
mover jump must survive a ±0.12 s launch-phase shift (fair timing, never frame-perfect).

**NO SUMMIT (endless mode)** — a separate mode from the main menu, not a tower. An infinite
seeded shaft using every platform type; the world is a live 100 m window (generate 50 m above
the peak, despawn 50 m below, never regenerate). The despawn line is **the void**: touching it
ends the run. Rest-to-rest rises stay 90–150 px, consecutive rests may not heavily overlap
below a 110 px rise (near-stacks have no honest arc), and every chain jump is probe-verified
through the real integrator at ≤ 98 % power with a two-rest lookahead so a newly generated
ledge can never bonk the apex of the previous two jumps' arcs. Bounce/dir/warp pads are inserted *beside* the
chain as optional bonuses (verified, removed if they would break the chain); endless warp doors
only fold forward. Every 100–200 m a flagged **commit pad** banks your height: on death the
score is the last committed height, never the raw peak — uncommitted height is lost. The sky
and wind ping-pong through the tower palette every 1000 m so altitude keeps meaning something.

## 9. Difficulty Curve

Difficulty is expressed as **landing tolerance**, not speed: tolerance = (platform width
+ 18) / 2 px around the ideal center.

| Section | Tolerance | Required launch speed (typical) |
|---|---|---|
| I | 59–84 px | 70–80% of max |
| II | 41–51 px | 75–85% |
| III | 32–39 px | 85–95% |
| IV | 23–27 px | 90–98% |

Vertical gaps are 120–150 px throughout (apex budget 205 px), so the curve is purely
about horizontal precision and ceiling clearance. The final platform is deliberately
wide: the last emotion should be relief, not a coin flip.

## 10. Art Direction

Everything is code-drawn: rectangles, lines, dots, gradients. No image files exist.

### Palette (8 tokens, committed)
| Token | Hex | Role |
|---|---|---|
| `bg` | `#07090f` | Void / page |
| `panel` | `#0e1320` | Surfaces, overlays |
| `ink` | `#e9edf4` | Character, primary text, preview dots |
| `dim` | `#8b93a7` | Secondary text, stars, tutorial notes |
| `line` | `#26304a` | Grid, borders, rail track |
| `blue` | `#5aa7ff` | Commit accent: power %, trail, rail fill, focus |
| `green` | `#57e389` | Success: landing ring, summit, win stats |
| `amber` | `#ffb454` | Warning: ceiling edges, best-height tick |
| `red` | `#ff5d5d` | Consequence: fall flash, drop popup, erase button |
| `spring` | `#3fe0c5` | Bounce pads, bounce-hop markers in the preview |
| `ice` | `#bfe3ff` | Ice top edge, sheen, drift chevrons, ice landing ring, spray |
| `mover` | `#d17bff` | Moving platforms: top edge, travel track, direction chevrons, mover landing ring, carry dust |
| `phase` | `#ffd166` | Phase platforms: gold top edge, clock ticks, draining/refilling clock-bar, ghost outline, phase landing ring |
| `zone` | `#6fc3ff` | Gust zones: tinted column, dashed boundary, streaming wind streaks (vertical updraft / horizontal gust) |
| `orbit` | `#7ee0a3` | Orbiters: green top edge, dashed orbit ring + centre dot, tangent direction chevrons |
| `dir` | `#ff9f43` | Direction springs: orange top edge + launch-arrow stencil; direction-pitched throw boing |
| `warp` | `#ff6ec7` | Warp doors: pink top edge, counter-rotating portal arcs, pink door ring in the preview (destination hidden), ring-burst sparks + pink screen glow on arrival |

### World rendering
- **Sky:** three-stop vertical gradient keyed to altitude — cold navy at the floor, steel
  teal, violet dusk, then a warm rose dawn at the summit. The climb literally changes the light.
- **Aim fuse:** a draining ring around the square (blue → amber → red), pulsing and ticking
  in the last second; on expiry it commits the drawn arc for you. Mid-air, expiry (or an early
  release) instead latches a full amber ring + `QUEUED · n%` and commits on touchdown.
- **Crumble platforms:** cracked amber→red edges, spreading fissures, jitter and trickling
  dust as they fail, then a shard burst. They reform after a 3 s cooldown — a dashed ghost
  with a filling teal edge counts down — so a broken stepping-stone never blocks the climb.
- **Bounce springs:** teal top edge + upward chevrons, compressing on impact; the preview
  marks each hop with a teal ring + chevron and continues the arc to the landing.
- **Ice:** pale `ice` top edge over a blue-black slab, diagonal sheen + a moving gloss streak;
  while occupied, horizontal chevrons point the drift direction and the square leans into the
  slide, kicking pale spray backwards. The preview's landing ring turns ice-blue on ice.
- **Movers:** magenta top edge over a violet-black slab with a thin outline; a dashed travel
  track with end stops shows the whole sweep; chevrons point the current direction of travel;
  the square leans into the carry. The preview's landing ring turns magenta on a mover and
  sits on a dashed ghost of the slab at contact time, so the mark reads as "here, then".
- **Parallax:** 80 deterministic twinkling specks at 0.35× camera depth.
- **Grid:** faint 10 m lines, labeled every 50 m; section titles stenciled in the world.
- **Character:** 18 px rounded white square, two dark eyes that look toward the aim
  vector or velocity, idle blink every ~3 s, squash on land, stretch on launch.
- **Ceilings:** amber top edge + hatch marks so "bonk surfaces" read instantly.
- **Progress rail:** right edge; blue fill = current height, amber tick = lifetime best,
  green notch = summit.

### FX catalog (all procedural)
| Effect | Trigger | Budget |
|---|---|---|
| Dust burst | Launch / land / wall / bonk | ≤ 16 particles, 0.5–0.8 s |
| Ice spray | Sliding on ice (backwards from feet) | ≤ 2 / tick, 0.3–0.55 s, `ice` |
| Mover dust | Landing on a mover | ≤ 16 particles, `mover` |
| Flight trail | Every 2nd substep airborne | 22 fading squares |
| Screen shake | Land impact > 650 px/s | ≤ 11 px, exp decay 6/s |
| Red flash | Counted fall | α ≤ 0.45, exp decay 3/s |
| Drop popup | Counted fall | `−Xm`, rises 1.4 s |
| Confetti | Summit | 90 rects, 2.4 s, palette colors |
| Vignette | Always | One radial gradient |

## 11. UI/UX

- **HUD (DOM, over canvas):** tower tag + altitude `0.0m` + per-tower best (top-left);
  launches / falls / timer (top-right); ?, ♪ (mute) and ↺ buttons; footer mantra.
  The tower tag opens the tower picker.
- **First-run help overlay:** rules (incl. ice), both control schemes, lifetime stats,
  tower picker (locked towers disabled), one CTA. Never shown again unless requested.
- **Reset confirm:** "Erase run? Lifetime records stay." — destructive action is red.
- **Win overlay:** "COMMITTED." + per-tower subtitle + unlock line + time / launches / falls /
  biggest drop + pre-filled share text + Copy + Next Tower (when unlocked) + Climb Again.
- **Toast:** transient confirmations ("COPIED", "RUN ERASED · 0m").
- Letterboxed stage on wide screens; HUD scales with the canvas so nothing clips.

## 12. Feedback Matrix (visual + procedural sound design)

Every event must be *seen*; synthesized sound reinforces it. No audio files exist —
oscillators and filtered noise only, created at runtime, mutable at all times:

| Event | Feedback |
|---|---|
| Aim start | Joystick glyph at press origin + dotted arc + power % (keyboard: `angle° · power%`) |
| Weak release | Gray dots + cancel puff (no launch counted) |
| Commit | Stretch, dust, trail begins, launch counter ticks |
| Flight | Eyes track velocity; trail; camera follows at 10/s |
| Soft land | Squash + small dust |
| Hard land | Squash + shake scaled to impact |
| Counted fall | Red flash + `−Xm` popup + fall counter ticks |
| Wall / bonk | Gray / amber sparks + micro-shake |
| Aim fuse | Draining ring blue→amber→red, ticks, urgent pulse; auto-launch on expiry |
| Crumble warning | Cracks spread, edge amber→red, jitter, dust trickle, creaks |
| Crumble break | Shard burst + shatter sound + shake; you drop straight down |
| Crumble reform | Dashed ghost + filling teal edge, then a teal spark burst + rising shimmer |
| Bounce | Pad compresses, teal spark burst, pitch-rising boing; arc shows the hop |
| Ice land | Glassy impact-pitched chime + high-pass shimmer; spray burst; chevrons appear |
| Ice slide | Quiet high-pass scrape loop while drifting; square leans; spray trails |
| Ice walk-off | Soft descending slip blip, then honest fall (fall alarm if ≥ 25 m) |
| Mover land | Impact thud + mechanical clank (pitch varies with impact) + magenta dust |
| Mover reversal | Direction-pitched tick-tock blip under your feet (520 Hz one way, 390 Hz the other) |
| Commit queued | Rising square latch (520→760 Hz) + bright click — the arc is armed for touchdown |
| Lift crush | A vertical lift pressing you into a solid drops you with a bonk blip |
| Phase toggle | Soft local sine woodblock (660→520 on / 440→330 off), only for on-screen platforms near the rider (underfoot slightly louder + tiny click); off-screen toggles silent |
| Phase-out drop | Descending sine sigh + air puff as the platform ghosts under you |
| Gust zone | Silent by design (tint + streaming streaks only); no continuous zone audio, so wind columns never drone |
| Orbiter carry | Continuous mechanical hum-free ride; tangent chevrons show travel; no reversal tick (circular) |
| Dir spring throw | Boing pitched by launch angle + |vx| (direction-varied, not one identical cue) |
| Warp fold | Pink ring-burst sparks at BOTH ends + pink screen glow + shake + "WARP" popup; layered shimmer glide pitched by fold direction (rising climb vs unkind drop); preview rings only the door — the destination is revealed on arrival |
| Dead-vertical spring | Deterministic sideways nudge (nearer side) so a 90° landing escapes the pad instead of bouncing forever |
| Reset from pause | RESET RUN button → confirm overlay; KEEP CLIMBING returns to pause, ERASE zeroes the run |
| Commit pad (endless) | Amber outline flag pulses until landed, then fills green; "COMMITTED · Xm" popup + green dust + bank chime; HUD CLAIMED updates |
| The void (endless) | Rising red line with crawling hazard dashes + red glow above + dark fill below + "THE VOID · 50m BELOW YOUR PEAK"; rail bottom tick marks it |
| Void death (endless) | Red flash + shake + red dust at the line + sinking rumble; THE VOID overlay shows committed / peak / launches / time + endless best + share text |
| Ambient wind | Constant altitude wind bed, uniform across all towers (gain rises with height fraction); endless rides the 1000 m sky cycle |
| Tower unlock | Rising triad + ice-blue "TOWER N UNLOCKED" line on the win screen |
| Idle > 2.2 s, 0 launches | Pulsing "drag anywhere · release to commit" |
| Summit | Confetti + overlay + lifetime records updated |

Procedural sound map (all synthesized, master mute ♪ / M, persisted):
aim blip + quiet charge hum tracking power · launch whoosh · land thud scaled to
impact · wall knock · amber bonk blip · descending fall alarm · summit chime
arpeggio · UI ticks. A filtered-noise wind bed rises with altitude and fades to
**silence at the summit** — the reward is quiet. Audio never blocks play: the
context is created on first gesture, suspended on tab-hide, and every call is
guarded so a sound failure can never break the simulation.

## 13. Progression & Mastery Depth

- **Run stats:** time, launches, falls, biggest drop. **Lifetime:** best height, best time,
  summits, total launches, total falls.
- Natural speedrun categories emerge for free: **Any%**, **Fewest Launches**, **No Falls**.
- Share string: `COMMIT · TOWER N · 508m in M:SS.T · N launches · N falls · biggest drop X.Xm.
  No air control. No mercy. Play: <page URL>` — streamable humiliation, one tap to copy.
  The URL is dynamic (`location.href` minus query/hash): the frame's own address, so it stays
  a playable link when the game is embedded elsewhere (e.g. an itch.io iframe).
- Endless share string: `COMMIT · NO SUMMIT · committed Xm (peak Ym) in M:SS.T · N launches.
  The void keeps uncommitted height. Play: <page URL>` — same dynamic link rule.
- Endless lifetime record: best committed height (`life.endlessBest`), shown in the menu,
  help and death screen. Endless runs themselves are session-only.

## 14. Accessibility

- Full keyboard play including fine aim (`Shift`).
- `prefers-reduced-motion`: shake disabled, particle counts halved, confetti skipped.
- All text ≥ 4.5:1 on its surface; focus-visible outlines; aria-labels on icon buttons.
- No audio dependency whatsoever; no time pressure (the timer never kills you).
- Cancel threshold protects users with motor tremor from accidental micro-launches.

## 15. Tuning Knobs (safe ranges)

| Knob | Default | Safe range | Effect |
|---|---|---|---|
| `MAX_LAUNCH_SPEED` | 950 | 850–1050 | Global reach; re-verify levels if changed |
| `DRAG_SPEED_PER_PX` | 4.8 | 3.5–5.5 | Drag length for full power (higher = shorter pull) |
| `MIN_LAUNCH_SPEED` | 90 | 60–140 | Accidental-launch forgiveness |
| `FALL_COUNT_MIN_PX` | 250 | 150–400 | How often the game calls it a "fall" |
| `AIM_FUSE_TIME` | 3.0 | 2.0–5.0 | Hesitation pressure; lower = harder |
| `CRUMBLE_DWELL_TIME` | 1.6 | 1.0–2.5 | How long a cracked ledge holds you |
| `CRUMBLE_REFORM_TIME` | 3.0 | 2.0–6.0 | How fast a crumbled ledge reforms |
| `BOUNCE_SPEED` | 800 | 700–900 | Spring lift; re-verify chains if changed |
| `BOUNCE_SIDE_NUDGE` | 120 | 60–200 | Sideways escape on a dead-vertical spring landing (0 would allow infinite bounce) |
| `ICE_SLIDE_SPEED` | 42 | 25–70 | Drift speed; higher = less time to commit on ice |
| `ICE_SLIDE_RAMP_TIME` | 0.5 | 0.2–1.0 | Grace period after an ice landing before full drift |
| Mover `amp` | per platform | 10–90 | Sweep half-width; bigger = more travel, more timing pressure |
| Mover `period` | per platform | 0.6–3.0 | Full cycle; must stay ≤ the 3 s fuse so every phase is aimable |
| Zone `ax/ay` | per zone | −1600…1600 | Extra accel px/s² in flight; ay>0 updraft, ax gust; bigger = more bend |
| Clock `duty` | per platform | 0.1–0.9 | Solid fraction of each cycle; duty·period ≥ 1.2 s for fair timing |
| Clock `period` | per platform | 0.6–3.0 | Blink cycle; ≤ the 3 s fuse so every phase is aimable |
| Warp `target` | per pad | any stable rest idx | Where the door opens; routing puzzle dial (T6 only; endless doors fold forward only) |
| `ENDLESS_WINDOW` | 500 | 300–800 | Live window half-height: generation headroom above the peak and void trail below |
| `ENDLESS_CLAIM_MIN/MAX` | 1000/2000 | 800–3000 | Commit-pad spacing; smaller = more banking, less loss tension |
| `ENDLESS_DY_MIN/MAX` | 90/150 | 60–160 | Generated rest rise; must stay ≤ `DESIGN_MAX_DY` |
| `ENDLESS_STACK_DY` | 110 | 90–140 | Below this rise, consecutive rests must not overlap > half the narrower width |
| `ENDLESS_SPECIAL_CHANCE` | 0.35 | 0–0.6 | How often a bonus spring/door is inserted beside the chain |
| Platform widths | per level | ≥ 28 | Primary difficulty dial (endless rests 70–140, commit pads 140) |
| Camera lerp | 6 / 10 | 4–12 | Fall visibility vs. motion comfort |

## 16. Scope Guard

**Shipped:** six towers (T1 36 platforms, T2 40, T3 42, T4 43, T5 43, T6 46), crumble/bounce/ice/
movers/ceilings, gust zones + phase platforms (T4), orbiters + direction springs (T5),
one-way warp doors (T6, exclusive to that tower among towers), stats,
per-tower persistence (incl. mover phase), main menu / pause / level select, tower unlock, share,
web level editor with real-integrator validation, and **NO SUMMIT** — the endless randomized
mode with the void window and commit-pad scoring. Modular `js/` + data-driven
`levels/tower-N.js` so new towers/mechanics/modes are additive.
**Candidates (not built):** daily seeded tower, ghost of your best run, launch-count
leaderboard, moving ceilings, further game modes. None required for the core experience.

## 17. Design Acceptance Criteria

1. Preview contact points match real flight contacts exactly, including bounce hops (same code path).
2. A release above threshold can never be cancelled, including off-canvas release.
3. A fall never teleports; height lost equals height physically dropped.
4. Every mandatory jump (and bounce chain) is solvable at ≤ 98% of max speed with ≥ 15 px ceiling margin.
5. First-time player understands drag/release within 10 seconds without reading docs.
6. Refresh resumes the run; erase requires confirmation; lifetime records survive erase.
7. Zero network requests, zero image/audio assets, zero runtime errors.
8. The aim fuse auto-commits a valid drawn arc on expiry; a sub-threshold aim cancels instead.
9. Crumbled platforms drop the player honestly and reform after a cooldown (never a softlock); reset rebuilds them instantly.
10. Ice drifts you the way you came in; a straight-down landing stands still; walking off is an honest fall; launching discards drift (preview ≡ flight from the sliding position); a wall blocks the drift into a stand (no slide loop), and a wall-scraped arrival stands still.
11. Clearing a tower unlocks the next; locked towers cannot be entered; each tower keeps its own run and lifetime records are shared; switching never loses progress.
12. Every rest-to-rest jump in every tower is solvable at ≤ 98% power (solver), with no same-x vertical stacks and single-direction bounce chains.
13. Movers carry the rider exactly (through reversals and edge overhang); launching discards carry; preview ≡ flight against moving platforms, pixel-exact; the world clock persists so refresh restores phase + footing.
14. Every mover-involved jump survives a ±0.12 s launch-phase shift (fair timing); mover periods ≤ 3 s; sweeps stay inside the walls; mandatory elevator rides satisfy the low/high dy bounds.
15. Any launch angle/power is reachable by keyboard within ~3 s of holding arrows (continuous sweep, Shift fine), with a visible angle/power readout; full pointer power needs ≤ 210 px of drag.
16. Arriving onto a rising lift (straight down or drifting) lands in place — no edge teleport, no pass-through; the aim ring sits on a dashed ghost of the mover at contact time; fuse launches commit the exact previewed phase.
17. Pre-aim: aiming starts mid-flight with the fuse running; release/Space/fuse expiry while airborne queues the arc and fires it on true landing (never on bounce hops); no cancel key (Esc/P pause instead); grounded aiming is unchanged.
18. Gust zones bend the arc identically in preview and flight (pure position-based accel, flight-only); a zone-assisted gap is unsolvable without the zone. Phase platforms keep preview ≡ flight via a pure solidAt(s,t); on-window ≥1.2 s and ±0.12 s launch tolerance; ghosting under a rider drops honestly and always returns.
19. Boot lands on a main-menu start page (Continue/Start Game, Level Select of unlocked towers only, How to Play). Esc/P/II pause with the clock frozen and a drawn aim preserved; pause and the summit between-levels screen both reach the main menu and level select; Help/Select BACK returns to its caller.
20. Orbiters carry in 2-D with preview ≡ flight (pure circular rectOf); orbit speed ≤140 px/s, period ≤3 s, ±0.12 s launch tolerance. Direction springs set a fixed launch vector (preview exact), |v|≤950, vy>0, and the downstream rest lies within the vector's reach. Phase-platform clock ticks are diegetic (on-screen + near/underfoot only, soft sine), never a global metronome; the ambient wind bed is uniform across towers.
21. Warp pads fold only on top landings (side hits/bonks never fold); the fold resolves inside step() so preview ≡ flight through the teleport; the preview rings the door and hides the destination (contract data still exact); arrivals stand still; targets are stable rests; unkind folds count as falls; among towers the warp mechanic appears only in Tower 6 (NO SUMMIT may insert forward-folding doors as bonuses).
22. A dead-vertical spring landing escapes via a deterministic sideways nudge (preview ≡ flight); no action is keyboard-only — reset is reachable from the pause menu as well as ↺ / R.
23. NO SUMMIT: every generated chain jump is solvable at ≤98% power by an independent fine solver (preview semantics, incl. the two-rest lookahead and the near-stack ban), on several seeds with the full world present; the live window stays ≤100 m (generate above / despawn below, never regenerate); commit pads land 100–200 m apart and bank the score; void contact ends the run and the death score equals the last committed height; endless best persists; endless preview ≡ flight; switching back to a tower restores its world and run intact.
24. The dotted arc continues through bonks and wall scrapes to the eventual landing (✕ at each strike, ring at the touchdown), pixel-exact with flight; ice drift stops and stands at a side wall instead of looping.