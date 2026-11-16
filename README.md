# COMMIT

**A tower. A square. No air control.**
Draw an arc, release, and live with exactly what you drew.

▶ **Play: <https://demerest.github.io/commit/>**

A minimalist precision rage-platformer. Climb shrinking platforms, amber ceilings, crumbling
ledges, bounce springs — and, from Tower 2, slick ice that slides you the way you came in.
The dotted preview is simulated by the *same integrator* as the real flight — what you see is,
to the pixel, what you get, including every bounce hop. Release is irreversible. Miss, and you
fall for real: no death, no respawn, no checkpoints. The only punishment is gravity, and it is
always enough.

## Towers

| # | Name | Summit | Introduces |
|---|---|---|---|
| 1 | First Ascent | 508 m | drag/commit, fuse, crumble, bounce, ceilings |
| 2 | The Ice Ascent | 560 m | **ice** — slow drift away from the side you entered from |

Clearing a tower's summit unlocks the next. Switch towers from the help overlay (`?` / `H`) or
the **NEXT TOWER** button on the win screen. Each tower keeps its own run; lifetime records are
shared. The HUD tag (top-left) shows the current tower and opens the picker.

## Controls

| Action | Pointer | Keyboard |
|---|---|---|
| Aim | Press anywhere, drag | `←`/`→` angle · `↑`/`↓` power |
| Fine aim | — | hold `Shift` (¼ rate) |
| Commit | Release | `Space` / `Enter` (press once to raise the arc, again to commit) |
| Cancel aim | Tiny drag (< 90 px/s) | `Esc` |
| Reset run | ↺ button (confirm) | `R` (confirm) |
| Help / towers | ? button / tower tag | `H` |
| Sound on/off | ♪ button | `M` |

## The mechanics

- **The fuse.** A ring around the square drains while you aim (3 s). Hesitate and it commits
  for you. The ring shifts blue → amber → red and ticks.
- **Crumbling platforms.** Cracked ledges give you 1.6 s of standing before they shatter and
  drop you — then reform after ~3 s (a dashed ghost counts down). Never a softlock.
- **Bounce springs.** Teal pads relaunch you automatically (keeping horizontal speed). Some
  climbs are only possible by chaining a bounce — the preview draws the whole path.
- **Ice (Tower 2+).** Pale glossy ledges slide you slowly in the direction you were travelling
  when you landed. Land straight down to stand still; otherwise commit fast or slide off the
  far edge. The preview shows an ice-blue landing ring, and chevrons show your drift.
- **Altitude light.** The sky climbs from cold navy through steel teal and violet dusk to a
  warm rose dawn at each summit.

## What's inside

- **Zero dependencies, zero asset files.** `index.html` (markup), `style.css` (theme), and
  focused classic scripts in `js/` (`core`, `levels`, `audio`, `fx`, `sim`, `render`, `ui`,
  `main`). Every visual is a Canvas 2D primitive; every sound is synthesized at runtime with
  Web Audio. No images, no audio files, no network requests. Works from `file://`.
- **Data-driven levels.** Each tower is a separate descriptor `levels/tower-N.js` — a single
  `COMMIT_LEVEL({…json…})` call (`[x, top, width, type]`, type `0` solid `1` crumble `2` bounce
  `3` ice). `js/levels.js` is just the loader/engine. Adding a tower = drop a descriptor + one
  `<script>` tag. Format spec: `COMMIT_LEVELS.md` §0.
- **Local level editor.** `editor.html` is a dev-only visual editor (drag/resize/type platforms,
  ceilings, goal, notes; live solver validation; export/import descriptors). It is committed for
  development but **excluded from the Pages deploy** (`.github/workflows/pages.yml` publishes a
  game-only whitelist) and origin-gated, so it never ships to the public site.
- **The Commit Contract:** preview ≡ simulation, pixel-exact, including wall hits, ceiling
  bonks and bounce hops (green/ice ring = landing, red ✕ = strike, teal ring = bounce).
- **Honest failure economy:** falls ≥ 25 m flash red and float a `−Xm` popup; your last
  flight's trail hangs in the air until you launch again.
- **Persistence (`commit.v3`):** per-tower runs + shared lifetime records in `localStorage`,
  including platforms mid-reform and your ice drift direction. Refresh resumes where you stood
  (grounded positions only). Erase requires confirmation and keeps lifetime records.
- **Procedural sound design:** aim hum + fuse ticks, launch whoosh, impact thuds, bonk blips,
  pitch-rising bounce boings, crumble creaks + shatter, glassy ice landing + slick slide scrape,
  fall alarm, summit chime, and an altitude wind bed — then silence at the top. On by default;
  ♪ / `M` mutes, persisted.
- **Accessible:** full keyboard play, `prefers-reduced-motion` (no shake, halved particles, no
  confetti), focus outlines, aria labels, no audio dependency.

## Run locally

Open `index.html` directly in any modern browser — no server, no build step, works offline
from `file://` (classic scripts + stylesheet, no modules).

### Level editor (local only)

Open `editor.html` locally (double-click, or serve the folder and visit `/editor.html`). It is
committed but **not deployed** — the Pages workflow publishes only the game, and the editor is
gated to `file://`/localhost. Pick a tower or import a descriptor, edit visually, **VALIDATE**
(real-integrator solver + design invariants), then **EXPORT** a `tower-N.js` to drop into
`levels/` (and add a `<script>` tag in `index.html`).

## Verification

`test.html` is an automated harness (**95 assertions**) that drives the game through a
manual-clock hook: commit contract, fuse, crumble break + reform, bounce-chain preview ≡ flight,
ice slide / stand-still / walk-off / launch-discards-slide / persistence, tower lock + unlock +
switching, input FSM, fall economy, overlays, mute, summit flow, reduced-motion, altitude
palette, zero-network — plus a solver proving **all 36 Tower-1 and 40 Tower-2 rest-to-rest jumps**
are solvable at ≤ 98 % power with the real integrator.

Serve the folder over HTTP (the harness iframes the game same-origin), then open `test.html`:

```
python -m http.server 8123     # or any static server
# → http://localhost:8123/test.html
```

Last full run: **95/95 pass**, standard and `prefers-reduced-motion` modes.

## Design documents

- [`COMMIT_GDD.md`](COMMIT_GDD.md) — game design document (pillars, physics, feedback matrix)
- [`COMMIT_LEVELS.md`](COMMIT_LEVELS.md) — tower geometry + reachability/bounce/ice math
- [`COMMIT_IMPLEMENTATION.md`](COMMIT_IMPLEMENTATION.md) — architecture, tuning, verification

---

*DRAG · RELEASE · LIVE WITH IT*