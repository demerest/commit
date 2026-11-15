# COMMIT

**A tower. A square. No air control.**
Draw an arc, release, and live with exactly what you drew.

▶ **Play: <https://demerest.github.io/commit/>**

A minimalist precision rage-platformer. Climb 508 meters of shrinking platforms, amber
ceilings, crumbling ledges and bounce springs. The dotted preview is simulated by the *same
integrator* as the real flight — what you see is, to the pixel, what you get, including every
bounce hop. Release is irreversible. Miss, and you fall for real: no death, no respawn, no
checkpoints. The only punishment is gravity, and it is always enough.

## Controls

| Action | Pointer | Keyboard |
|---|---|---|
| Aim | Press anywhere, drag | `←`/`→` angle · `↑`/`↓` power |
| Fine aim | — | hold `Shift` (¼ rate) |
| Commit | Release | `Space` / `Enter` (press once to raise the arc, again to commit) |
| Cancel aim | Tiny drag (< 90 px/s) | `Esc` |
| Reset run | ↺ button (confirm) | `R` (confirm) |
| Help | ? button | `H` |
| Sound on/off | ♪ button | `M` |

## The v2 mechanics

- **The fuse.** A ring around the square drains while you aim (3 s). Hesitate and it commits
  for you — the arc you drew is the arc you get. The ring shifts blue → amber → red and ticks.
- **Crumbling platforms.** Cracked ledges give you 1.6 s of standing before they shatter into
  shards and drop you — then reform after ~3 s (a dashed ghost counts down). Resetting rebuilds
  them instantly, so a broken ledge never softlocks the climb.
- **Bounce springs.** Teal pads relaunch you automatically (keeping your horizontal speed).
  Some climbs are only possible by chaining a bounce — the preview draws the whole path, with
  a teal ring at each hop and a green ring at the final landing.
- **Altitude light.** The sky climbs from cold navy at the floor through steel teal and violet
  dusk to a warm rose dawn at the summit. The light changes as you do.

## What's inside

- **Three files, zero dependencies, zero asset files.** `index.html` (markup), `style.css`
  (theme), `game.js` (logic). Every visual is a Canvas 2D primitive; every sound is synthesized
  at runtime with Web Audio. No images, no audio files, no network requests.
- **The Commit Contract:** preview ≡ simulation, pixel-exact, including wall hits, ceiling
  bonks and bounce hops (green ring = landing, red ✕ = strike, teal ring = bounce).
- **Five sections, 37 platforms + summit, 3 ceilings, 2 mandatory bounce chains.** Every
  mandatory jump is verified solvable at ≤ 98 % power by an automated solver.
- **Honest failure economy:** falls ≥ 25 m flash red and float a `−Xm` popup; your last
  flight's trail hangs in the air until you launch again.
- **Persistence (`commit.v2`):** run + lifetime records in `localStorage`, including platforms
  mid-reform. Refresh resumes exactly where you stood (only grounded positions are saved).
  Erase requires confirmation and keeps lifetime records.
- **Procedural sound design:** aim hum + fuse ticks, launch whoosh, impact thuds, bonk blips,
  pitch-rising bounce boings, crumble creaks + shatter, fall alarm, summit chime, and a wind bed
  that rises with altitude — then silence at the top. On by default; ♪ / `M` mutes, persisted.
- **Accessible:** full keyboard play, `prefers-reduced-motion` (no shake, halved particles, no
  confetti), focus outlines, aria labels, no audio dependency.

## Run locally

Open `index.html` directly in any modern browser — no server, no build step, works offline
from `file://` (classic script + stylesheet, no modules).

## Verification

`test.html` is an automated harness (**72 assertions**) that drives the game through a
manual-clock hook: commit contract, fuse auto-launch, crumble break + reform (no softlock) +
rebuild, bounce-chain preview ≡ flight, input FSM, fall economy, overlays, mute, summit flow,
reduced-motion, altitude palette, zero-network — plus a solver proving all 36 rest-to-rest
jumps are solvable at ≤ 98 % power with the real integrator.

Serve the folder over HTTP (the harness iframes the game same-origin), then open `test.html`:

```
python -m http.server 8123     # or any static server
# → http://localhost:8123/test.html
```

Last full run: **72/72 pass**, standard and `prefers-reduced-motion` modes.

## Design documents

- [`COMMIT_GDD.md`](COMMIT_GDD.md) — game design document (pillars, physics, feedback matrix)
- [`COMMIT_LEVELS.md`](COMMIT_LEVELS.md) — full v2 geometry + reachability/bounce math
- [`COMMIT_IMPLEMENTATION.md`](COMMIT_IMPLEMENTATION.md) — architecture, tuning, verification protocol

---

*DRAG · RELEASE · LIVE WITH IT*
