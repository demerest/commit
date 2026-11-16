# COMMIT — Game Design Document
**Version 2.1 · HTML + CSS + modular JS (`js/`) · No images · Procedural audio only · No dependencies**

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
| Win condition | Land on a tower's summit (T1 508 m, T2 560 m); clearing unlocks the next tower |
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
- The preview shows the first contact truthfully, including wall hits and ceiling bonks.
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
  - **red ✕** — you will strike a wall or ceiling here and drop.
- A live **power %** readout sits beside the character.
- This contract is the product. Any tuning change must keep preview ≡ simulation.

## 5. Controls

| Action | Pointer | Keyboard |
|---|---|---|
| Aim | Press anywhere, drag (relative vector) | `←/→` angle, `↑/↓` power |
| Fine aim | — | hold `Shift` (¼ rate) |
| Commit | Release | `Space`/`Enter` (first press raises the arc, second commits) |
| Cancel aim | Drag < 90 px/s equivalent, or `pointercancel` | `Esc` |
| Reset run | ↺ button (confirm) | `R` (confirm) |
| Help | ? button | `H` |
| Sound on/off | ♪ button | `M` |

Rules:
- Aiming is only possible while **grounded**. Airborne input is ignored entirely.
- Drag is relative (press anywhere — thumb ergonomics on mobile), direction = drag
  direction, magnitude × 3.2 = launch speed, clamped to 950 px/s.
- Releases below 90 px/s cancel silently with a small puff — twitchy micro-drags are
  forgiven; anything above the threshold is a launch and counts.

## 6. Physics & Rules

World units are pixels at logical resolution; **y is up**; 10 px = 1 m.

| Constant | Value | Meaning |
|---|---|---|
| `DT` | 1/120 s | Fixed simulation timestep |
| `G` | 2200 px/s² | Gravity |
| `MAXV` | 950 px/s | Launch speed clamp (apex 205 px, 45° range 410 px) |
| `MINV` | 90 px/s | Cancel threshold |
| `KDRAG` | 3.2 | Drag px → launch px/s |
| `CH` | 18 px | Character size (AABB) |
| `VMAX_FALL` | −1600 px/s | Terminal velocity (also guarantees no tunneling) |
| `FALL_MIN` | 250 px | A landing this far below launch counts as a **fall** |
| `SUMMIT` | per tower | Goal altitude (T1 5080, T2 5600 px) |
| `AIM_TIME` | 3.0 s | Aim fuse — auto-commits the drawn arc on expiry |
| `CRUMBLE_TIME` | 1.6 s | Standing this long on a cracked platform breaks it |
| `BOUNCE_V` | 800 px/s | Upward relaunch speed on a teal spring (keeps `vx`) |
| `RESPAWN_TIME` | 3.0 s | A crumbled platform reforms after this cooldown (no softlock) |
| `ICE_V` | 42 px/s | Terminal drift speed on ice (slow, deliberate) |
| `ICE_RAMP` | 0.5 s | Ease-in before full drift, so a landing has a moment of grace |

Collision outcomes (axis-separated, X then Y, per substep):

| Contact | Result |
|---|---|
| Top of solid while descending | **Land.** All velocity zeroed, grounded |
| Top of a **spring** while descending | **Bounce.** `vy = +800`, keep `vx`, stay airborne |
| Top of **ice** while descending | **Land + drift.** `vy = 0`; slide dir = sign of entry `vx` (0 if straight down) |
| Side of solid / wall | `vx = 0`, keep falling straight down |
| Underside of solid | **Bonk.** `vy = 0`, keep horizontal drift, fall |

**Ice rule (Tower 2+):** you slowly slide toward the side *opposite* the one you came from —
i.e. in the direction you were travelling at landing. A straight-down landing (`vx = 0`) stands
still. Drift ramps in over `ICE_RAMP` then holds `ICE_V`; reaching the far edge walks you off
into an honest fall (keeping the small drift `vx`). Launching discards the drift, so the Commit
Contract holds: the arc is exactly what you drew from your current (sliding) position.

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

Two towers (more planned). Each has five sections and a summit. Full geometry and
reachability/bounce/ice math: `COMMIT_LEVELS.md`. Levels are pure data in `js/levels.js`.

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

Design invariants for every tower (enforced by the solver): consecutive platforms alternate
sides (a platform directly above another is unreachable — you'd bonk its underside); bounce
chains keep one horizontal direction (bounce preserves `vx`); `dy ≤ 160`, required speed
≤ 98%, ceiling margin ≥ 15 px.

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

### World rendering
- **Sky:** three-stop vertical gradient keyed to altitude — cold navy at the floor, steel
  teal, violet dusk, then a warm rose dawn at the summit. The climb literally changes the light.
- **Aim fuse:** a draining ring around the square (blue → amber → red), pulsing and ticking
  in the last second; on expiry it commits the drawn arc for you.
- **Crumble platforms:** cracked amber→red edges, spreading fissures, jitter and trickling
  dust as they fail, then a shard burst. They reform after a 3 s cooldown — a dashed ghost
  with a filling teal edge counts down — so a broken stepping-stone never blocks the climb.
- **Bounce springs:** teal top edge + upward chevrons, compressing on impact; the preview
  marks each hop with a teal ring + chevron and continues the arc to the landing.
- **Ice:** pale `ice` top edge over a blue-black slab, diagonal sheen + a moving gloss streak;
  while occupied, horizontal chevrons point the drift direction and the square leans into the
  slide, kicking pale spray backwards. The preview's landing ring turns ice-blue on ice.
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
| Aim start | Joystick glyph at press origin + dotted arc + power % |
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
- Share string: `COMMIT · 508m in M:SS.T · N launches · N falls · biggest drop X.Xm.
  No air control. No mercy.` — streamable humiliation, one tap to copy.

## 14. Accessibility

- Full keyboard play including fine aim (`Shift`).
- `prefers-reduced-motion`: shake disabled, particle counts halved, confetti skipped.
- All text ≥ 4.5:1 on its surface; focus-visible outlines; aria-labels on icon buttons.
- No audio dependency whatsoever; no time pressure (the timer never kills you).
- Cancel threshold protects users with motor tremor from accidental micro-launches.

## 15. Tuning Knobs (safe ranges)

| Knob | Default | Safe range | Effect |
|---|---|---|---|
| `MAXV` | 950 | 850–1050 | Global reach; re-verify levels if changed |
| `KDRAG` | 3.2 | 2.6–4.0 | Drag length for full power |
| `MINV` | 90 | 60–140 | Accidental-launch forgiveness |
| `FALL_MIN` | 250 | 150–400 | How often the game calls it a "fall" |
| `AIM_TIME` | 3.0 | 2.0–5.0 | Hesitation pressure; lower = harder |
| `CRUMBLE_TIME` | 1.6 | 1.0–2.5 | How long a cracked ledge holds you |
| `RESPAWN_TIME` | 3.0 | 2.0–6.0 | How fast a crumbled ledge reforms |
| `BOUNCE_V` | 800 | 700–900 | Spring lift; re-verify chains if changed |
| `ICE_V` | 42 | 25–70 | Drift speed; higher = less time to commit on ice |
| `ICE_RAMP` | 0.5 | 0.2–1.0 | Grace period after an ice landing before full drift |
| Platform widths | per level | ≥ 28 | Primary difficulty dial |
| Camera lerp | 6 / 10 | 4–12 | Fall visibility vs. motion comfort |

## 16. Scope Guard

**Shipped:** two towers (T1 36 platforms, T2 40), crumble/bounce/ice, ceilings, stats,
per-tower persistence, tower select + unlock, share. Modular `js/` + data-driven `levels.js`
so new towers/mechanics/modes are additive.
**Candidates (not built):** daily seeded tower, ghost of your best run, launch-count
leaderboard, moving ceilings, alternate game modes. None required for the core experience.

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
10. Ice drifts you the way you came in; a straight-down landing stands still; walking off is an honest fall; launching discards drift (preview ≡ flight from the sliding position).
11. Clearing a tower unlocks the next; locked towers cannot be entered; each tower keeps its own run and lifetime records are shared; switching never loses progress.
12. Every rest-to-rest jump in every tower is solvable at ≤ 98% power (solver), with no same-x vertical stacks and single-direction bounce chains.