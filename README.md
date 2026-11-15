# COMMIT

**A tower. A square. No air control.**
Draw an arc, release, and live with exactly what you drew.

▶ **Play: <https://demerest.github.io/commit/>**

A minimalist precision rage-platformer in a single `index.html`. Climb 508 meters of
shrinking platforms and amber ceilings. The dotted preview is simulated by the *same
integrator* as the real flight — what you see is, to the pixel, what you get. Release is
irreversible. Miss, and you fall for real: no death, no respawn, no checkpoints. The only
punishment is gravity, and it is always enough.

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

## What's inside

- **One file, zero dependencies, zero asset files.** Every visual is a Canvas 2D
  primitive; every sound is synthesized at runtime with Web Audio (oscillators +
  filtered noise). No images, no audio files, no network requests.
- **The Commit Contract:** preview ≡ simulation, pixel-exact, including wall hits and
  ceiling bonks (green ring = landing, red ✕ = strike and drop).
- **Five sections, 36 platforms, 3 ceilings.** Widths shrink from 150 px to 28 px;
  every mandatory jump is verified solvable at ≤ 98 % power.
- **Honest failure economy:** falls ≥ 25 m flash red and float a `−Xm` popup; your last
  flight's trail hangs in the air until you launch again.
- **Persistence:** run + lifetime records in `localStorage`; refresh resumes exactly
  where you stood (only grounded positions are ever saved). Erase requires confirmation
  and keeps lifetime records.
- **Procedural sound design:** aim hum, launch whoosh, impact thuds, bonk blips, fall
  alarm, summit chime, and a wind bed that rises with altitude — then silence at the
  top. On by default; ♪ / `M` mutes everything, persisted.
- **Accessible:** full keyboard play, `prefers-reduced-motion` support (no shake,
  halved particles, no confetti), focus outlines, aria labels, no audio dependency.

## Run locally

Open `index.html` directly in any modern browser — no server, no build step, works
offline from `file://`.

## Verification

`test.html` is an automated harness (58 assertions) that drives the game through a
manual-clock hook: commit contract, input FSM, fall economy, persistence, overlays,
mute, summit flow, reduced-motion, zero-network — plus a solver proving all 36 jumps
are solvable at ≤ 98 % power with the real integrator.

Serve the folder over HTTP (iframe same-origin access), then open `test.html`:

```
python -m http.server 8123     # or any static server
# → http://localhost:8123/test.html
```

Last full run: **58/58 pass**, standard and `prefers-reduced-motion` modes.

## Design documents

- [`COMMIT_GDD.md`](COMMIT_GDD.md) — game design document (pillars, physics, feedback matrix)
- [`COMMIT_LEVELS.md`](COMMIT_LEVELS.md) — full geometry + reachability math
- [`COMMIT_IMPLEMENTATION.md`](COMMIT_IMPLEMENTATION.md) — architecture, tuning, verification protocol

---

*DRAG · RELEASE · LIVE WITH IT*
