# COMMIT — Next-Level Mechanics Proposals (v0.3 · design history)

Status: §1 gust zones + §2 phase platforms **shipped in Tower 4**; §3 orbiters + direction
springs **shipped in Tower 5**; the one-way **warp door** (type 9, user-specified, exclusive
to Tower 6 among towers) **shipped in Tower 6** — geometry and routing in
`COMMIT_LEVELS.md` §14; **NO SUMMIT** endless mode (user-specified: randomized shaft, void
window, commit-pad scoring) **shipped** — generation geometry in `COMMIT_LEVELS.md` §15.
What remains below is backlog. The two T4 mechanics were prototyped in a local scratch
playground (`.qwen/tmp/playground.html`, gitignored) that wraps the *real* integrator; all 8
probes pass (see §5). Read `COMMIT_GDD.md` (pillars/Contract) and `COMMIT_LEVELS.md`
(invariants) first — every proposal below is constrained by them.

Non-negotiables every mechanic must respect:
- **Commit Contract:** `preview()` and flight share one `step(b,t)`; any new force/solid rule
  must be a *pure function of (body, t)* read inside `step`, never mutated shared state.
- **No air control:** the environment may act on the body; the player never steers mid-flight.
- **Determinism / no RNG / no instant death in towers;** falls are honest. (NO SUMMIT is the
  user-specified exception: seeded RNG at generation time only — never inside `step` — and a
  rising void that ends the run, with committed-height scoring.)
- **Solvability:** every rest-to-rest jump ≤98% power; timed mechanics must survive a
  ±0.12 s launch-phase shift (fair, never frame-perfect); periods ≤3 s (one fuse).
- **Readability:** the preview must show the truth; a new force needs a visible, themed cue.

---

## 1. GUST ZONES ("the bellows") — recommended for Tower 4

**What:** rectangular regions of constant extra acceleration acting on the body *in flight
only*. An updraft column reduces effective gravity (or adds lift); a horizontal gust lane
pushes sideways. Static in time → zero timing-fairness cost.

**Descriptor:** new top-level array, not a platform type:
`"zones": [[x, y, w, h, ax, ay], …]` (px, px/s²). Example updraft: `[60,140,300,760,0,1400]`
(net gravity inside = 2200−1400 = 800). Example gust: `[200,900,240,120,900,0]`.

**Integrator change (one block at the top of `step`):**
```js
for(const z of ZONES){const cx=b.x+CH/2, cy=b.y+CH/2;
  if(cx>z[0]&&cx<z[0]+z[2]&&cy>z[1]&&cy<z[1]+z[3]){b.vx+=z[4]*DT; b.vy+=z[5]*DT;}}
```
Pure function of position → preview clones the body and calls the same `step` → **pixel-exact
by construction**. No new contact type; landing/bonk/bounce unchanged. Grounded bodies are
unaffected (`step` is flight-only; `groundStep` separate) → zones never slide you at rest.

**New verb / puzzle:** arcs *bend* inside a column. Updrafts unlock dy>205 gaps without a
spring or lift (a second vertical verb); gust lanes force you to aim upstream to compensate,
or ride the push to a ledge you could not reach directly. "Throw through the wind."

**Design invariants to add:**
- |ax|,|ay| ≤ ~1600 so `MAX_LAUNCH_SPEED`/`TERMINAL_FALL_SPEED` clamps still bound speed; solver stays numeric (preview).
- A zone must be the *enabling* verb for its gap (playground asserts the same jump is
  unsolvable with the zone removed) — otherwise it is decoration, not a mechanic.
- Zones act only in flight; never overlap a rest pad in a way that matters at rest (they don't).
- Analytic reachability prune (`vyNeed`) must become zone-aware or defer to numeric preview.

**Readability / feedback:** tinted column + streaming streak particles along the accel vector,
edge shimmer; localized filtered-noise wind bed (gain by inside-ness, pitch by strength).
Reduced-motion: fewer streaks, no shimmer. The dotted arc visibly curves = the truth.

**Level sketch (T4 "the bellows"):** a 300 px-wide updraft column spanning a 260 px vertical
gap (unreachable directly); a horizontal gust lane crossing a chasm with the pad upwind and
the target downwind-offset; combine with crumble/ice so you must commit *into* the wind.

**Risks:** trajectory kink at zone boundaries (physically fine, readable with tint); larger
solver search space (already numeric); players may misread curved arcs until the cue lands.

---

## 2. PHASE PLATFORMS ("escapement lights") — recommended for Tower 4

**What:** platforms that are solid for a duty fraction of each clock cycle and *ghost
(pass-through)* otherwise, on the shared `worldT`. A timed traffic-light / escapement.
Ghost = fully pass-through, so they double as **timed one-way gates downward** (drop through
when off) — a routing verb, not just a waiting verb.

**Descriptor:** platform type `6`: `[x, top, w, 6, duty, period, phase]`
(e.g. `[60,640,120,6,.6,2.4,0]` = solid 60% of each 2.4 s). `solidAt(s,t) = frac(t/period+phase) < duty`.

**Integrator change (pure predicate inside both collision loops):**
```js
for(const s of SOLIDS){ if(s.dead || !solidAt(s,t)) continue; … }
```
**Critical:** consult `solidAt(s,t)` *inside* `step` from the passed `t`. Do **NOT** toggle
`s.dead` from outside (shared-state mutation) — the playground demonstrated that naive
approach *breaks* preview≡flight, while the pure predicate keeps it exact. This is the same
lesson as movers' `rectOf(s,t)`.

**Grounded change (one branch in `groundStep`):** if `body.on` is a phase platform and
`!solidAt(s,worldT)` → `dropRider(0,0,"phase")` (honest fall, small dissipate puff). It always
returns next cycle → no softlock (same guarantee as crumble reform).

**Fairness invariants to add:**
- period ≤3 s (fuse); on-window `duty*period ≥ 1.2 s` so a ±0.12 s launch shift still lands
  (playground asserts a tolerant solution exists).
- Solver stays phase-aware (8 phase samples + ±0.12 tolerance) — reuse mover machinery.
- Never make a phase platform the only rest between two >160 dy gaps with no spring/lift and
  no upstream pad to wait on (waiting must always be possible on solid ground).

**Readability / feedback:** ON = normal slab with a draining clock-bar to the next toggle;
OFF = dashed ghost + filling bar to next ON (reuse crumble-reform ghost language but periodic);
toggle tick (pitched on/off), dissipate puff on drop. The preview already simulates `worldT`,
so the arc shows whether you arrive on-beat.

**Level sketch (T4 "escapement"):** a vertical shaft with two phase platforms offset half a
period → climb on-beat; a floor gate that opens (ghost) periodically to drop into a lower
shortcut; pair with gust zones so you must time both the wind and the light.

**Risks:** reads as "crumble on a clock" — mitigate by leaning into the *pass-through* routing
verb (drop through when off), which crumble cannot do; ensure off-window never traps a fall.

---

## 3. Backlog — Tower 5+

**ORBITERS (type 7) — shipped in T5:** movers on a circular path (`x=bx+amp·cos`, `y=by+amp·sin`), pure
`rectOf` → Contract holds; carry becomes 2-D. Clockwork escalation of T3. Fairness: period ≤3 s,
orbit speed bounded. Visual: orbit ring track. Cost: 2-D carry math + solver phase sampling.

**DIRECTION SPRINGS (type 8) — shipped in T5:** a spring that sets a *fixed* launch vector
instead of preserving `vx` → deterministic redirect / routing chains. Preview exact (bounce
branch sets `v`). Visual: arrow stencil; audio pitched by direction. Cost: bounce-chain
invariant becomes "follow the arrows", not "monotonic x".

**ONE-WAY WARP DOORS (type 9) — shipped in T6 (exclusive among towers; NO SUMMIT inserts
forward-folding doors as bonuses):** `[x,top,w,9,targetIdx]`.
A top landing folds the body to the target's top centre and resolves as an ordinary landing
there; the fold lives inside `step()` so preview ≡ flight through the teleport. The preview
rings only the DOOR — the destination is a secret until you commit (user decision); contract
data still carries it, and the editor still draws fold-links for authoring. Side hits/bonks
never fold; arrivals stand still; targets must be stable rests. The routing verb: doors open
downward (jump down to go up) and some are unkind (fold you back down; the drop counts as a
fall). Solver/VALIDATE treat pads as non-rests and accept a hop whose fold opens on the next
rest; the dy invariant applies to the launch onto the pad, not the fold's rise.

**NO SUMMIT (endless randomized mode) — shipped:** a main-menu mode, not a tower. Seeded
generator over every platform type; live 100 m window (generate 50 m above the peak, despawn
50 m below, never regenerate) whose lower edge is a rising void = death. Commit pads every
100–200 m bank the height; death scores the last commit, so uncommitted height is lost —
the COMMIT verb becomes the score mechanic. Reachability is probe-verified through the real
`previewArc` at ≤98 % with a one-rest lookahead; bonuses sit beside the chain, never
load-bearing. Geometry rules: `COMMIT_LEVELS.md` §15; harness §40–45 (275 assertions total).

## 4. Considered and rejected (for now)

- **Conveyor belts:** too close to ice drift (forced-direction slide); low novelty per cost.
- **One-way / drop-through ledges (always):** erodes ceiling tension and the no-vertical-stack
  invariant; phase platforms give the timed version with more puzzle value.
- **Gravity-flip zones:** readability cost high (arc shape inverts); gust zones give the
  spatial novelty with a clearer cue.
- **Sticky / grip walls:** new grounded-on-wall FSM state; large surface area for little verb.

---

## 5. Playground evidence (scratch, not shipped)

`.qwen/tmp/playground.html` iframes the real game, appends a tiny playground tower (slot 7 now
that six towers ship), and wraps `step` with (a) zone accel and (b) a pure `solidAt` predicate,
plus a `groundStep` phase-out drop.
Run: serve folder over HTTP, open `/.qwen/tmp/playground.html` (or `.qwen/tmp/run-play.ps1`).
Result **8 passed, 0 failed**:
- gust: dy-260 solvable through updraft ≤98%; same jump UNSOLVABLE without zone; flight
  contacts === preview contacts; landed on the high ledge.
- phase: on-phase jump solvable ≤98% AND ±0.12 s tolerant; flight contacts === preview
  contacts; landed on it; phases out from under you → honest drop at the off-toggle.

Takeaway for implementation: both mechanics fit the engine with ~one pure block in `step`
(+ one `groundStep` branch for phase). The Contract survives *only* if the new rule is a pure
function of `(body,t)` / `(s,t)` read inside `step` — never shared-state mutation.
