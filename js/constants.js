/* COMMIT — tuning constants.
   Every gameplay, feel and audio-bed number lives here, grouped by system, so balancing
   never requires hunting through logic. Pure drawing offsets and one-off synth timbres
   stay next to their draw/sound code; anything you would want to tweak is named here.
   Shared by all modules (classic scripts, loaded first). */
"use strict";

/* ---------- view & camera ---------- */
const VIEW_W = 480;                // logical canvas width, px
const VIEW_H = 800;                // logical canvas height, px
const PX_PER_METER = 10;           // world px per displayed metre
const DPR_MAX = 2;                 // devicePixelRatio cap (fill-rate)
const HUD_FONT_MIN = 11;           // px, HUD font floor when scaled down
const HUD_FONT_BASE = 16;          // px, HUD font at scale 1
const CAM_MIN = -140;              // camera floor (keeps the ground slab in view)
const CAM_HEADROOM = 260;          // camera ceiling above the summit, px
const CAM_ANCHOR = 0.38;           // body rests this fraction up the view
const CAM_LERP_FLIGHT = 10;        // camera catch-up rate while flying
const CAM_LERP_GROUND = 6;         // camera catch-up rate while grounded
const FRAME_DT_MAX = 0.25;         // s, frame delta clamp (tab switches)
const DRAW_CULL_MARGIN = 20;       // px beyond the view before skipping a draw
const ALT_LINE_STEP = 100;         // px between altitude grid lines
const ALT_LABEL_STEP = 500;        // px between labelled altitude lines
const STAR_PARALLAX = 0.35;        // star field scroll factor vs camera
const RAIL_X_MARGIN = 9;           // progress rail inset from the right wall
const RAIL_TOP = 70;               // progress rail top inset, px
const RAIL_BOTTOM = 90;            // progress rail bottom inset, px

/* ---------- physics (the Commit Contract integrator) ---------- */
const FIXED_DT = 1 / 120;          // s, fixed simulation step
const GRAVITY = 2200;              // px/s^2, downward
const TERMINAL_FALL_SPEED = 1600;  // px/s, cap on downward speed
const MAX_LAUNCH_SPEED = 950;      // px/s, a full-power commit
const MIN_LAUNCH_SPEED = 90;       // px/s, below this a drag is a cancel
const DRAG_SPEED_PER_PX = 4.8;     // launch px/s gained per dragged px
const CHAR_SIZE = 18;              // the square, px
const CONTACT_EPS = 1e-6;          // px tolerance for above/below contact classification
const GROUND_SNAP_TOL = 0.6;       // px tolerance when re-finding footing on load

/* ---------- aim & input ---------- */
const AIM_FUSE_TIME = 3.0;         // s of aim before the fuse commits for you
const FUSE_URGENT_AT = 1.0;        // s left on the fuse when ticks turn urgent
const KB_DEFAULT_ANGLE = 65;       // deg, keyboard aim start
const KB_DEFAULT_POWER = 0.6;      // fraction of MAX_LAUNCH_SPEED, keyboard aim start
const KB_ANGLE_MIN = 8;            // deg, keyboard sweep limits
const KB_ANGLE_MAX = 172;
const KB_POWER_MIN = 0.12;         // fraction, keyboard sweep limits
const KB_POWER_MAX = 1;
const KB_ANGLE_RATE = 60;          // deg/s while an arrow is held
const KB_POWER_RATE = 0.45;        // fraction/s while an arrow is held
const KB_FINE_FACTOR = 0.25;       // Shift = quarter-rate fine aim
const AIM_RING_RADIUS = 15;        // px, fuse ring around the square
const FUSE_AMBER_AT = 0.5;         // fuse fraction where the ring turns amber
const FUSE_RED_AT = 0.25;          // fuse fraction where the ring turns red
const FUSE_PANIC_AT = 0.3;         // fuse fraction where the panic pulse starts
const ICE_TILT = 0.07;             // rad, body lean while sliding on ice
const MOVER_TILT = 0.05;           // rad, body lean while riding a conveyor

/* ---------- platform types (descriptor authoring codes) ---------- */
const PLAT_SOLID = 0;
const PLAT_CRUMBLE = 1;
const PLAT_BOUNCE = 2;
const PLAT_ICE = 3;
const PLAT_MOVE_H = 4;             // horizontal conveyor
const PLAT_MOVE_V = 5;             // vertical lift
const PLAT_CLOCK = 6;              // phase platform (solid/ghost on a duty cycle)
const PLAT_ORBIT = 7;              // circular mover
const PLAT_DIR = 8;                // direction spring (fixed launch vector)
const PLAT_WARP = 9;               // one-way warp pad (Tower 6): landing folds you to its target

/* ---------- platforms & mechanics ---------- */
const PLATFORM_HEIGHT = 16;        // px, every slab (platforms, ceilings, goal)
const CRUMBLE_DWELL_TIME = 1.6;    // s of standing before a cracked ledge shatters
const CRUMBLE_REFORM_TIME = 3.0;   // s before a shattered ledge reforms
const CRUMBLE_DUST_START = 0.25;   // dwell fraction where debris starts falling
const CRUMBLE_DUST_RATE = 26;      // debris probability scale per second
const CRUMBLE_STAGE_AT = [0.28, 0.55, 0.82]; // dwell fractions of crack sfx stages 1/2/3
const CRUMBLE_AMBER_AT = 0.33;     // progress where the crack edge turns amber
const CRUMBLE_RED_AT = 0.66;       // progress where the crack edge turns red
const BOUNCE_SPEED = 800;          // px/s, spring relaunch (vertical)
const BOUNCE_SIDE_NUDGE = 120;     // px/s, sideways escape on a dead-vertical spring landing (no infinite bounce)
const SPRING_COMP_TIME = 0.18;     // s, spring compression visual after a bounce
const ICE_SLIDE_SPEED = 42;        // px/s, full ice drift
const ICE_SLIDE_RAMP_TIME = 0.5;   // s, ice drift ramp-up after landing
const ICE_SPRAY_RATE = 14;         // spray probability scale per second of slide
const MOVER_DEFAULT_AMP = 60;      // px, descriptor default amplitude
const MOVER_DEFAULT_PERIOD = 2.4;  // s, descriptor default mover/clock period
const CLOCK_DEFAULT_DUTY = 0.6;    // descriptor default solid fraction
const CLOCK_VIS_MARGIN = 40;       // px beyond the view for a clock to be "on-screen"
const CLOCK_NEAR_DIST = 300;       // px, a clock ticks only this near the rider
const DIR_DEFAULT_VY = 800;        // px/s, descriptor default dir-spring vy
const WARP_FLASH = 0.3;            // pink screen glow alpha on a warp
const WARP_SHAKE = 5;              // px, warp shake
const WARP_PARTS = 16;             // ring-burst sparks per warp end
const WARP_PARTS_RM = 8;           // ... reduced-motion variant
const WARP_SPREAD = 260;           // px/s, radial spark speed
const WARP_LIFE_MIN = 0.4;         // s, spark lifetime floor
const WARP_LIFE_VAR = 0.3;         // s, spark lifetime variance
const WARP_GRAVITY = 0.15;         // fraction of GRAVITY on warp sparks (floaty shimmer)
const FALL_COUNT_MIN_PX = 250;     // px drop (25 m) that counts as a fall
const FALL_FLASH_MAX = 0.45;       // red flash alpha cap on a counted fall
const FALL_FLASH_DIV = 1600;       // px divisor scaling fall flash with drop
const FALL_POPUP_DY = 30;          // px above the body for the -Xm popup
const HARD_LAND_IMPACT = 650;      // px/s impact that starts screen shake
const HARD_SHAKE_MAX = 11;         // px, shake cap from a hard landing
const HARD_SHAKE_DIV = 80;         // px/s divisor scaling hard-landing shake

/* ---------- level boundaries & decoration ---------- */
const BOUNDARY_MARGIN = 60;        // px, floor/wall slab thickness outside the playfield
const BOUNDARY_HEADROOM = 900;     // px, wall height above the summit
const STAR_COUNT = 80;             // background stars per tower

/* ---------- design invariants & solver (editor VALIDATE + test harness) ---------- */
const DESIGN_MAX_DY = 160;         // px, max direct rest-to-rest rise without help
const DESIGN_MIN_PLAT_W = 28;      // px, narrowest authorable platform
const DESIGN_MAX_PERIOD = 3;       // s, mover/clock period must fit one fuse window
const DESIGN_MIN_ON_WINDOW = 1.2;  // s, shortest fair phase on-window (duty*period)
const DESIGN_MAX_ORBIT_SPEED = 140;// px/s, fastest fair orbiter rim speed
const ZONE_MAX_ACCEL = 1600;       // px/s^2, gust zone acceleration cap
const SOLVER_MAX_POWER = 0.98;     // fraction, jumps must solve at or below this
const SOLVER_MIN_POWER = 0.30;     // fraction, solver power search floor
const SOLVER_POWER_STEP = 0.02;    // fraction, solver power search step
const SOLVER_ANGLE_MIN = 8;        // deg, solver angle search bounds
const SOLVER_ANGLE_MAX = 172;
const SOLVER_ANGLE_UP = 90;        // deg, straight-up boundary of the search quadrant
const SOLVER_ANGLE_STEP = 2;       // deg, solver angle search step
const SOLVER_PHASE_TOL = 0.12;     // s, launch-phase shift a mover jump must survive
const PREVIEW_MAX_STEPS = 900;     // fixed steps simulated for the dotted arc
const PREVIEW_DOT_EVERY = 3;       // draw a dot every Nth simulated step
const PREVIEW_CULL_Y = -80;        // px, stop previewing below the floor

/* ---------- particles & feel ---------- */
const TRAIL_MAX = 22;              // points kept in the last-flight trail
const TRAIL_EVERY = 2;             // record a trail point every Nth sim step
const PARTS_MAX = 300;             // dust/spray particle cap
const SHARDS_MAX = 140;            // crumble shard cap
const PUFF_DUST = 3;               // particles on a cancelled weak drag
const LAUNCH_DUST = 6;             // particles at a commit
const WALL_DUST = 4;               // particles on a wall/bonk strike
const BOUNCE_DUST = 10;            // particles on a spring hop
const BOUNCE_DUST_RM = 5;          // ... reduced-motion variant
const REFORM_DUST = 8;             // particles when a ledge reforms
const REFORM_DUST_RM = 4;          // ... reduced-motion variant
const LAND_DUST_BASE = 4;          // landing particles floor
const LAND_DUST_MAX = 16;          // landing particles cap
const LAND_DUST_IMPACT_DIV = 120;  // px/s impact per extra landing particle
const DUST_SPREAD_X = 220;         // px/s, dust horizontal spread
const DUST_UP_MIN = 20;            // px/s, dust upward speed floor
const DUST_UP_VAR = 160;           // px/s, dust upward speed variance
const DUST_LIFE_MIN = 0.5;         // s, dust lifetime floor
const DUST_LIFE_VAR = 0.3;         // s, dust lifetime variance
const DUST_GRAVITY = 0.35;         // fraction of GRAVITY on dust
const SPRAY_COUNT = 2;             // ice spray particles per kick
const SPRAY_COUNT_RM = 1;          // ... reduced-motion variant
const SPRAY_BACK_MIN = 40;         // px/s, spray backwards speed floor
const SPRAY_BACK_VAR = 90;         // px/s, spray backwards speed variance
const SPRAY_UP_MIN = 10;           // px/s, spray upward speed floor
const SPRAY_UP_VAR = 70;           // px/s, spray upward speed variance
const SPRAY_LIFE_MIN = 0.3;        // s, spray lifetime floor
const SPRAY_LIFE_VAR = 0.25;       // s, spray lifetime variance
const SHARD_COUNT = 14;            // crumble shards
const SHARD_COUNT_RM = 6;          // ... reduced-motion variant
const SHARD_SPREAD_X = 280;        // px/s, shard horizontal spread
const SHARD_UP_MIN = 40;           // px/s, shard upward speed floor
const SHARD_UP_VAR = 200;          // px/s, shard upward speed variance
const SHARD_SPIN = 11;             // rad/s, shard spin variance
const SHARD_W_MIN = 4;             // px, shard width floor
const SHARD_W_VAR = 7;             // px, shard width variance
const SHARD_H_MIN = 3;             // px, shard height floor
const SHARD_H_VAR = 5;             // px, shard height variance
const SHARD_LIFE_MIN = 0.7;        // s, shard lifetime floor
const SHARD_LIFE_VAR = 0.5;        // s, shard lifetime variance
const SHARD_GRAVITY = 0.6;         // fraction of GRAVITY on shards
const CONFETTI_COUNT = 90;         // summit confetti pieces
const CONFETTI_LIFE = 2.4;         // s, confetti lifetime
const CONFETTI_SPREAD_X = 560;     // px/s, confetti horizontal spread
const CONFETTI_UP_MIN = 120;       // px/s, confetti upward speed floor
const CONFETTI_UP_VAR = 620;       // px/s, confetti upward speed variance
const CONFETTI_SPIN = 9;           // rad/s, confetti spin variance
const CONFETTI_GRAVITY = 0.5;      // fraction of GRAVITY on confetti
const FLOAT_LIFE = 1.4;            // s, -Xm popup lifetime
const FLOAT_RISE_SPEED = 40;       // px/s, popup rise
const LAND_SQUASH_TIME = 0.18;     // s, landing squash visual
const LAUNCH_SQUASH_TIME = 0.18;   // s, launch stretch visual
const BOUNCE_SQUASH_TIME = 0.14;   // s, shorter stretch after a spring hop
const LAND_SQUASH = 0.3;           // landing squash amount (fraction)
const LAUNCH_STRETCH_Y = 0.28;     // launch stretch amount (fraction)
const LAUNCH_STRETCH_X = 0.22;     // launch thinning amount (fraction)
const BOUNCE_SHAKE = 3.5;          // px, spring hop shake
const WALL_SHAKE = 2.5;            // px, wall/bonk shake
const SHATTER_SHAKE = 9;           // px, crumble shatter shake
const SHAKE_DECAY = 6;             // /s, exponential shake decay
const FLASH_DECAY = 3;             // /s, exponential flash decay
const BLINK_TIME = 0.12;           // s, eye blink duration
const BLINK_GAP_MIN = 2.6;         // s, minimum gap between blinks
const BLINK_GAP_VAR = 2;           // s, random extra gap between blinks
const IDLE_HINT_DELAY = 2.2;       // s idle before the "drag anywhere" hint
const ZONE_STREAKS = 10;           // wind streaks per zone
const ZONE_STREAKS_RM = 4;         // ... reduced-motion variant

/* ---------- audio bed & masters (one-off synth timbres live in audio.js) ---------- */
const MASTER_GAIN = 0.5;           // master bus level
const MASTER_GLIDE = 0.05;         // s, mute/unmute glide
const NOISE_BUFFER_SECONDS = 2;    // s, shared white-noise buffer length
const WIND_BASE_GAIN = 0.006;      // wind bed level at the floor
const WIND_ALT_GAIN = 0.03;        // extra wind bed level at the summit
const WIND_BASE_FREQ = 260;        // Hz, wind bandpass at the floor
const WIND_ALT_FREQ = 240;         // Hz, extra wind bandpass at the summit
const WIND_FILTER_FREQ = 280;      // Hz, wind bandpass centre
const WIND_FILTER_Q = 0.6;         // wind bandpass resonance
const WIND_LFO_RATE = 0.13;        // Hz, wind gust swell rate
const WIND_LFO_DEPTH = 0.006;      // wind gust swell depth (gain)
const WIND_GLIDE = 0.5;            // s, wind bed altitude glide
const HUM_FREQ = 90;               // Hz, aim hum base
const HUM_GAIN = 0.02;             // aim hum level
const HUM_GLIDE = 0.05;            // s, aim hum glide
const HUM_STOP_MS = 220;           // ms, aim hum release before stop
const HUM_BASE_FREQ = 80;          // Hz, hum pitch floor while aiming
const HUM_POWER_SPAN = 180;        // Hz, hum pitch added by drag power
const HUM_FUSE_SPAN = 120;         // Hz, hum pitch added as the fuse drains
const SLIDE_FILTER_FREQ = 2800;    // Hz, ice scrape highpass
const SLIDE_GAIN = 0.014;          // ice scrape level
const SLIDE_GLIDE = 0.08;          // s, ice scrape fade-in
const SLIDE_STOP_MS = 260;         // ms, ice scrape release before stop
const PHASE_TICK_LOCAL_VOL = 0.03; // phase tick level underfoot
const PHASE_TICK_NEAR_VOL = 0.014; // phase tick level nearby

/* ---------- UI ---------- */
const TOAST_TIME = 1600;           // ms, toast visibility

/* ---------- editor clamps & templates ---------- */
const ED_MIN_SUMMIT = 200;         // px, editor summit floor
const ED_HANDLE_PX = 8;            // screen px, right-edge resize grab zone
const ED_NEW_PLAT_W = 80;          // px, width of editor-added platforms
const ED_NEW_CEIL_W = 200;         // px, width of editor-added ceilings
const ED_AMP_MIN = 10;             // px, mover amplitude floor
const ED_DUTY_MIN = 0.1;           // clock duty clamp
const ED_DUTY_MAX = 0.9;
const ED_PERIOD_MIN = 0.6;         // s, mover/clock period floor
const ED_DIR_VY_MIN = 100;         // px/s, dir-spring vy floor
