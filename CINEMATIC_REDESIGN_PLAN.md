# Beast-Invoice — Cinematic Redesign Plan

**Companion to:** `index.html` (working mockup), `INVOICE_SYSTEM_PLAN.md` (system design), `BEAST_BUILD_PLAN.md` (real build)
**Scope:** Visual + motion + 3D redesign. **No changes to the totals engine, data model, or print pipeline.**
**Status:** Design → ready to implement
**Last updated:** September 2026

---

## 1. Current State Analysis (what we're redesigning)

The existing mockup is a single-file, zero-dependency app (~1,000 lines in `index.html`).

### Structure
| Area | Implementation |
|---|---|
| Shell | Sticky dark topbar (`#14161a`, 56px) with 6 nav buttons; `.view` sections toggled via `display:none/block` (`showView()`) |
| Views | Dashboard (hero + 4 stat cards + recent list), Builder (5 numbered cards in `.bgrid`), Clients, Invoices + inline preview, Settings |
| Builder | Client/vehicle unified search → service chips → parts search w/ steppers → notes/discount → finish bar; sticky live-totals sidebar (`.summary`, `top:72px`) |
| Print | Hidden `#printArea` + `@media print` swap to it; `window.print()` → Save-as-PDF |
| State | `localStorage` under `hpg_mock_v1`; seeded demo data; `calcTotals()` is the single math source |
| Identity cues | Red accent `#e03131`, light gray `#f4f5f7` body, white cards, 12px radius, system font stack, emoji icons (🔧🚗🧾), garage slogans ("Precision. Power. Passion.") |

### What works (must survive the redesign — these are acceptance criteria)
- **The 60-second flow.** Pick-don't-type, live totals, no "calculate" button. Motion may never block or delay input.
- **Print/PDF output.** The branded sheet is pixel-stable; the 3D layer must be 100% invisible to `@media print`.
- **Zero build step.** Opens from `python3 -m http.server` or GitHub Pages. The redesign keeps this (ES modules + one vendored lib).
- **Touch-first targets** (44px+ chips/steppers) for greasy-glove counter use.

### What holds it back visually
- Flat, static, "SaaS admin" feel — no depth, no atmosphere, no reward moments at flow completion.
- Instant view swaps (`display` toggling) — no spatial continuity between screens.
- Light theme undercuts the "High Performance Garage" brand, which wants dark showroom energy.
- Numbers (the product's hero content) use proportional figures and never animate — total changes just appear.

---

## 2. Design Vision — "The Showroom at Night"

The shop after hours: lights low, one car on the lift, neon strip glow, tools arranged like a stage set. The UI is glass and machined metal floating in that space. **The invoice is the star** — everything else recedes.

### 2.1 Color palette

```css
:root{
  /* Base — carbon & graphite (replaces #f4f5f7 light theme) */
  --bg-0:#07080a;          /* page floor, deepest layer */
  --bg-1:#0c0e12;          /* main backdrop */
  --bg-2:#14171d;          /* panels / cards */
  --bg-3:#1b1f26;          /* raised elements, inputs */

  /* Brand — racing red, refined from the mockup's #e03131 */
  --red-500:#ff2d3f;       /* primary action, focus rings */
  --red-600:#e03131;       /* legacy-compatible accent (kept for settings-sourced branding) */
  --ember:#ff8a3d;         /* secondary accent — sparks, warnings */

  /* Neon status (garage signage colors) */
  --green:#3ddc84;         /* Paid / success */
  --amber:#ffb020;         /* Sent / pending */
  --red-alert:#ff5c5c;     /* Overdue */

  /* Text */
  --ink:#f2f4f7;           /* primary */
  --muted:#9aa3af;         /* secondary (verify ≥4.5:1 on --bg-2) */
  --line:rgba(255,255,255,.08);

  /* Glass */
  --glass:rgba(20,23,29,.72);
  --glass-blur:blur(14px) saturate(1.2);

  /* Elevation — light comes from above-front, like neon strips */
  --shadow-1:0 1px 2px rgba(0,0,0,.5);
  --shadow-2:0 8px 24px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.04) inset;
  --shadow-glow:0 0 24px color-mix(in srgb, var(--red-500) 35%, transparent);
}
```

Rules:
- **Light-theme survives in exactly one place:** the printed invoice. Print CSS stays light/paper-white, untouched by the dark tokens.
- The settings "Accent color" picker keeps working — user brand color flows into `--red-500`/`--red-600` via `document.documentElement.style.setProperty`, so the 3D neon strips and UI re-tint together (this preserves the mockup's live-restyle feature).
- Color is never the only signal (carried over from `INVOICE_SYSTEM_PLAN.md` §6): status = color + label + icon.

### 2.2 Typography

| Role | Font | Notes |
|---|---|---|
| Display / headers | **Space Grotesk** (600–700) | Automotive, technical, slightly condensed. Used for view titles, invoice number, TOTAL. |
| UI / body | **Inter** (400–700) | Same feel as the current system stack; 15px base retained. |
| Numbers / money | **JetBrains Mono** (500–700) + `font-variant-numeric: tabular-nums` | Money and totals align in columns and tween without layout shift. This is the single highest-impact typography change. |

- Self-host WOFF2 subsets (`latin` only), `font-display: swap`, preloaded. No Google Fonts runtime dependency.
- Display sizes get `letter-spacing: -0.01em`; uppercase micro-labels keep the mockup's `.4px` tracking.

### 2.3 Spatial depth (the z-layer model)

Think of every screen as 5 layers stacked in z-space:

```
z0  WebGL canvas        — fixed, full-viewport, pointer-events:none. Garage scene / particles.
z1  Ambient gradients   — CSS radial "neon pools" behind content, parallax on scroll.
z2  Content panels      — glass cards (--glass + --glass-blur), 1px light top edge.
z3  Interactive chrome  — topbar, sticky totals, toasts, modals. Stronger shadow + border.
z4  Cinematic overlay   — the Finale sequence, confetti sparks, scrim.
```

- Depth cues: layered shadows, inset 1px top highlight on cards (machined edge), subtle `translateZ` on hover, background parallax (max ±12px — nothing that fights input).
- **Forms sit on solid panels** (`--bg-2`, no visible canvas behind inputs). Typing areas stay calm and high-contrast; the 3D shows around them, not through them.

---

## 3. Three.js / WebGL Features

One dependency total: **`three` (vendored as `vendor/three.module.js`, ~170KB gzip, lazily loaded)**. No postprocessing composer, no OrbitControls, no loaders — the scenes below use only core primitives. This keeps the "avoid unnecessary dependencies" rule: Three.js is the *only* added runtime cost, and it's deferred until after first paint.

### 3.1 Scene architecture

A single `SceneManager` owns one renderer and swaps scene content per view. One WebGL context for the whole app (contexts are expensive; never create per-view).

```js
// js/three/scene-manager.js (outline)
export class SceneManager {
  constructor(canvas){
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:false, powerPreference:'high-performance' });
    this.renderer.setClearColor(0x000000, 0);          // transparent — CSS bg shows through
    this.clock = new THREE.Clock();
    this.active = null;
    this._raf = null; this._visible = true;
  }
  set(scene){                                          // scenes: DashboardScene, FinaleScene, IdleScene…
    this.active?.exit(this.renderer);
    this.active = scene; scene.enter(this);
  }
  start(){ if(!this._raf) this._loop(); }
  _loop = () => {
    this._raf = requestAnimationFrame(this._loop);
    if (document.hidden || !this._visible) return;     // pause, don't spin
    this.active?.update(this.clock.getDelta());
    this.renderer.render(this.active.scene, this.active.camera);
  };
  resize(){ /* match devicePixelRatio clamped to 1.75, false on 'prefers-reduced-data' */ }
}
```

- **DPR clamp: `Math.min(devicePixelRatio, 1.75)`** — protects tablets (the counter device) from 3× DPR fill-rate cost.
- `alpha:true` so the CSS gradient backdrop and neon pools render behind the 3D (cheaper than rendering fog/sky in WebGL).
- Frames pause when `document.hidden`, when the canvas region is offscreen, or after 5s of no view change on non-hero views (an `IdleScene` = static frame).

### 3.2 Feature list (prioritized)

**F1 — Dashboard hero: the garage bay (P0, signature moment)**
- Low-poly scene built from primitives: floor plane with grid shader (fades with distance), one **car silhouette** (extruded 2D profile shape → `ExtrudeGeometry`, or a simple box-and-wheels abstraction), two neon strip lights (`BoxGeometry` + emissive material + a glow sprite), light fog.
- Slow camera drift (lissajous path, ±2°) so it's alive without stealing attention. Red brand light pulses subtly with `Math.sin` — nothing faster than breathing.
- Scroll response: dashboard scroll drives camera dolly-back + fade to black (scroll-linked, see §4.2).

**F2 — Ember particles (P0, global)**
- One `THREE.Points` with a custom `ShaderMaterial`: ~400 particles, soft round sprites, drifting upward like workshop sparks, wind-shifted by pointer position (throttled).
- Instanced-free, one draw call, zero per-frame allocation (positions updated in the vertex shader from `uTime`).

**F3 — The Finale: envelope seal & launch (P0 — detailed spec in §6)**
- Invoice paper folds, slides into a 3D envelope, wax seal stamps (spark burst), envelope launches off-screen on "Send". Reversed for "Open invoice".

**F4 — View transitions with 3D flavor (P1)**
- Between views, the outgoing card stack recedes in z (`translateZ(-80px)`, opacity 0) while the incoming rises toward camera — DOM via View Transitions API (§4.1), with the WebGL scene subtly matching (camera pushes 5% forward). Reads as one continuous space.

**F5 — Totals "rev counter" (P2, optional delight)**
- In the sticky summary, a tiny inline canvas gauge (2D canvas, not WebGL): needle sweeps to a value proportional to invoice total (log scale), red zone past shop-average. Adds garage character without touching the money figures themselves. Ship last; cut first.

**F6 — Paid stamp in 3D (P2)**
- On "record payment", the DOM `PAID` stamp gets a one-shot 3D entrance: `rotateX(60deg)→0` + scale 1.4→1 + ink-spread via `filter: contrast()` trick. Pure CSS, no WebGL needed.

### 3.3 What we deliberately do NOT build
- ❌ Full 3D invoice preview (readability, print parity, and effort cost) — invoices stay DOM.
- ❌ Postprocessing/bloom — fake glow with sprite textures; saves ~40% GPU.
- ❌ Per-view WebGL contexts, GLTF model loading, physics engines.

---

## 4. HTML5 Motion Techniques (no motion library — CSS + WAAPI only)

### 4.1 View transitions
- Use the **View Transitions API** (`document.startViewTransition`) inside `showView()`; `::view-transition-old/new` CSS does the z-recede/rise from F4. Fallback (Firefox today): keep the current instant swap — the app must not depend on the API.
- Tag the totals sidebar with `view-transition-name: totals` so it morphs position across views instead of jumping.

### 4.2 Scroll-driven animation (CSS, zero JS)
```css
/* Hero garage recedes as you scroll the dashboard */
@supports (animation-timeline: scroll()) {
  .hero { animation: hero-recede linear forwards; animation-timeline: scroll(); }
  @keyframes hero-recede { to { transform: translateY(40px); opacity:.35; } }
}
```
Used for: hero fade, section reveal (with `view-timeline` per card), sticky-totals shadow growth.

### 4.3 Micro-interactions (the feel layer)
| Element | Behavior |
|---|---|
| Service chips | press: `scale(.96)` 80ms; on: red fill + spring overshoot (`cubic-bezier(.34,1.56,.64,1)`); tiny spark particle pop at chip origin (3 DOM dots, 300ms) |
| Steppers | `+/-` bump the value with a 120ms digit roll (`transform: translateY` on old/new number pair); optional `navigator.vibrate(5)` on touch devices |
| Line items | add: FLIP-in from the chip/search position (`getBoundingClientRect` → invert transform); remove: collapse height + fade, totals tween simultaneously |
| Totals | number tween 400ms `ease-out` + tabular-nums (no layout shift); the TOTAL line flashes once (`background` pulse) when value changes |
| Buttons | primary CTA has a slow shine sweep (`::after` gradient, 6s loop) — the only looping DOM animation besides the canvas |
| Toasts | enter from bottom with spring, `aria-live="polite"` (mockup already has `.toast` — restyle only) |
| View entrance | staggered card reveal: `@starting-style` + `transition-delay: calc(var(--i) * 40ms)` |

### 4.4 Motion tokens
```css
:root{
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --ease-out:    cubic-bezier(.22,1,.36,1);
  --dur-fast:120ms; --dur-med:400ms; --dur-slow:700ms;
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.01ms !important; transition-duration:.01ms !important; }
  /* JS reads the same query: SceneManager never starts, finale = crossfade only */
}
```

---

## 5. Information Architecture & Component Hierarchy

### 5.1 Navigation model
Topbar → **left icon rail (desktop ≥1024px) / bottom tab bar (mobile)** — both persistent, 5 items + settings. The builder gets its own focused mode (rail collapses to a 60s-flow progress strip).

```
App shell
├── NavRail / TabBar
├── WebGL background layer (z0) — SceneManager
├── Routes (hash-based, keeps zero-build: #/ #/new #/invoices #/clients #/catalog #/settings)
│   ├── Dashboard        — hero scene (F1), stats, recent invoices, shortcuts
│   ├── Builder          — 5 stations, focused mode, sticky totals (z3)
│   ├── Invoices         — list + detail preview (envelope-open on preview)
│   ├── Clients          — clients & vehicles, history
│   ├── Catalog          — services & parts editor
│   └── Settings         — branding, tax/rate, export (accent drives neon too)
└── Cinematic overlay (z4) — FinaleScene, scrim, success card
```

### 5.2 Builder: same 5 steps, staged as "service bays"
The mockup's numbered cards (1–5) become a horizontal **bay rail**: five stations with icons; completed stations lock (✓), the active one is lit red. Cards remain vertically stacked on mobile. Nothing about the input flow changes — only presentation and one scroll-spy highlighting the active station.

### 5.3 Component modules (file layout after refactor)
```
Beast-Invoice/
├── index.html                 # shell + view markup (unchanged roles)
├── css/
│   ├── tokens.css  app.css  motion.css  print.css   # print.css extracted & frozen
├── js/
│   ├── app.js                 # router, shell, boot
│   ├── state.js               # DB, localStorage, seed (from current inline JS)
│   ├── lib/totals.js          # calcTotals() extracted verbatim + tests
│   ├── views/  dashboard.js  builder.js  invoices.js  clients.js  catalog.js  settings.js
│   └── motion/ tween.js  flip.js        # ~150 lines total, hand-rolled
├── three/
│   ├── scene-manager.js  scenes/dashboard.js  scenes/finale.js  particles.js
├── vendor/three.module.js     # vendored: workshop Wi-Fi can't be trusted on CDNs
└── assets/fonts/              # woff2 subsets
```
> Note: ES modules require http(s) — the README's `python3 -m http.server` note becomes required, and GitHub Pages works as-is.

### 5.4 Data flow (unchanged in spirit)
`state.js` remains the single store; views re-render on mutation exactly as today. Motion components subscribe to the same events (`invoice:finalized`, `line:added`) — the cinematic layer is a **decorator on state, never a state owner**.

---

## 6. Sample Implementation — "The Finale" (finalize → envelope seal → launch)

The one interaction worth building perfectly. Trigger: **Finish & Send** (and its mirror: opening an existing invoice).

### 6.1 Concept
The on-screen invoice sheet folds itself into a document, slides into a 3D envelope, a wax seal stamps down with a spark burst, and the envelope launches off-screen toward the "client". On open/preview, the reverse plays. The paper is a **stylized** `CanvasTexture` (drawn programmatically — header bar, line rows, big total), *not* a pixel copy of the DOM. This reads as intentional art direction, avoids an html2canvas dependency, and sidesteps texture blurriness.

### 6.2 Scene graph (FinaleScene)
```
FinaleScene
├── camera  (z=6, fov 40; dollies to z=4 during the beat)
├── paper      PlaneGeometry(1.6, 2.2) — CanvasTexture invoice art
│   └── fold creases: 2 child planes? No —
│       paper is THREE groups: [top third, middle, bottom third] sharing the texture
│       (each third is a plane with UV offset; rotating the groups on X = folding)
├── envelope   Group
│   ├── body      BoxGeometry(2, 1.4, .04) — matte carbon material
│   ├── flap      PlaneGeometry(2, .7) — pivot Group at top edge, rotates on X 0→~250°
│   └── seal      CylinderGeometry(.22, .22, .05) — red wax material, emissive pulse
├── sparkSystem  Points (shader, ~120 particles, one-shot burst emitter)
└── lights       ambient(.4) + 2 rect-ish point lights (red rim, white key)
```

### 6.3 Timeline (2.4s, every phase skippable; hand-rolled tween — `js/motion/tween.js` is ~40 lines: `{from,to,dur,ease,onUpdate,onComplete}` driven by one rAF)

| t (s) | Beat | Implementation |
|---|---|---|
| 0.00–0.35 | **Commit** | Scrim fades in (z4). DOM invoice preview measures its rect (FLIP), then animates to the canvas region's center + scale; at the handoff frame the DOM copy hides and the 3D paper plane fades in at the matched screen-space size (projection-matched: compute scale so plane height ≈ DOM rect height at camera distance). |
| 0.35–0.95 | **Fold & insert** | Top/bottom thirds rotate `X: 0→-150°/+150°` (paper narrows to a strip); envelope flap open (`X:-160°`); strip translates down into the envelope mouth; body does a 4px "receive" dip. |
| 0.95–1.35 | **Seal** | Flap rotates closed with slight overshoot (`ease-spring`); seal drops from y+.8 with squash-stretch (`scaleY 1→.6→1`); **impact frame**: emissive flash, spark burst emits 120 particles radially downward-out, `navigator.vibrate([10,30,10])`, deep thud via one-shot WebAudio oscillator+noise (no audio files; muted if `volume==0`). |
| 1.35–2.05 | **Launch** | Camera pulls back; envelope tilts up-right, accelerates along a quadratic bezier off-screen with 3 motion-streak sprites trailing; ember particles get a temporary upward wind impulse. |
| 2.05–2.40 | **Resolve** | DOM success card rises (z3): "INV-2026-0142 sealed & sent ✓", status pill flips to `Sent`, totals tween, dashboard stats update. Scrim releases. |

### 6.4 Orchestration sketch

```js
// js/views/builder.js (finish flow)
async function finishInvoice(mode){
  const inv = finalizeInvoice(mode);            // existing logic: number, snapshot, save()
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !sceneOK()) { showSuccessCard(inv); return; }   // graceful path, always
  const scene = sm.set(new FinaleScene(inv));   // builds graph, matches DOM rect
  await playFinale(scene, inv);                 // the 6.3 timeline; ESC/skip link resolves early
  showSuccessCard(inv);                         // status pill, stats, toast — existing renderers
  sm.set(new IdleScene());                      // cheap static frame after 3s idle
}
```

Non-negotiables:
- **Failure path:** if the mock send errors, the envelope flies back in, seal cracks (two wax halves rotate apart), toast explains. The cinematic layer reflects state; it never lies.
- **Skip affordance:** a "Skip" link appears at t=0.2s; ESC and clicking the scrim both resolve immediately to the success card.
- **State safety:** `finalizeInvoice()` runs *before* the animation and the success card renders *after* it — a tab crash mid-animation loses nothing but the show, not the invoice.
- **Open (reverse) variant:** envelope drops in, seal pops, paper unfolds and crossfades into the DOM preview at matched scale. Same scene, timeline reversed, ~1.8s.

---

## 7. Step-by-Step Build Guide (developer-facing)

**Phase 0 — Prep (½ session)**
1. Split `index.html` into the §5.3 module layout. No visual changes yet. Extract `print.css` and freeze it (snapshot-test with one print of a seeded invoice).
2. Extract `calcTotals()` into `js/lib/totals.js` + a tiny test page (`tests/totals.html`, assert expected values from the seed invoice: labor 129, parts 72.50, discount 10.08, tax 16.08, total 197.42).
3. Add font files + `tokens.css`. Ship the dark theme behind a `?theme=dark` flag for internal review.

**Phase 1 — Shell & theme (1 session)**
4. Dark tokens live; glass cards; nav rail/tab bar; `view-transition-name` on totals.
5. Number tweening on totals + tabular-nums everywhere money renders (builder summary, invoice sheet, dashboard stats).
6. Micro-interaction pass: chips, steppers, toasts, card staggers (§4.3). Verify with keyboard-only + touch.

**Phase 2 — 3D foundation (1 session)**
7. Vendor `three.module.js`; implement `SceneManager` with DPR clamp, visibility pause, resize.
8. Ember particles (F2) running globally. Capability check: `WebGLRenderingContext` exists + not `prefers-reduced-motion` → else render static gradient only.
9. Lazy boot: `requestIdleCallback(() => import('./three/scene-manager.js'))` after first paint.

**Phase 3 — Dashboard hero (1 session)**
10. Garage bay scene (F1): floor grid shader, car silhouette, neon strips, camera drift; accent color from Settings drives emissive colors.
11. Scroll-linked recede; IntersectionObserver to pause when dashboard not active.

**Phase 4 — Motion & views (1 session)**
12. View Transitions API in `showView()` with instant-swap fallback; totals morph.
13. FLIP for line-item add/remove; success/error toasts restyled.

**Phase 5 — The Finale (1–2 sessions)**
14. Build FinaleScene graph; projection-matched DOM→3D handoff.
15. Timeline per §6.3; sparks, haptics, WebAudio thud; skip/reduced-motion/failure paths.
16. Reverse variant for invoice open.

**Phase 6 — Hardening (½ session)**
17. Performance pass per §8 checklist; print regression (3D must not appear in print); battery/low-power check.
18. A11y pass: canvas `aria-hidden`, `aria-live` success announce, focus never moves into overlay, contrast audit of `--muted` on all panel tones.

---

## 8. Performance Considerations (production invoice tool)

### Budgets
| Metric | Target |
|---|---|
| First paint (static, no 3D) | unchanged from today (< 1s local) |
| 3D layer payload | ≤ 180KB gzip, lazy, after first paint |
| Sustained FPS | 60 desktop; ≥ 45 on a 2019-era counter tablet @ DPR 1.75 |
| GPU memory | one context, ≤ ~40MB textures/geometries |
| Main thread | zero per-frame allocations in rAF loops; no layout thrash (batch reads/writes in FLIP) |

### Techniques
- **One renderer, forever.** All scenes share it; scenes dispose geometries/materials on `exit()`; no context churn (context loss is the #1 WebGL production bug).
- **Render less:** DPR clamp; `antialias:false` (pixel-ratio hides aliasing at 1.5+); pause on `document.hidden`, offscreen, and idle; `powerPreference:'high-performance'` desktop-only.
- **Draw less:** particles = one `Points` draw call with shader-animated positions; static garage merged into few meshes; no postprocessing — glow via pre-rendered sprite textures.
- **Zero-allocation loops:** reuse `Vector3`/`Color` temps; delta-time based tweens; no `new` inside `update()`.
- **Respect the user:** `prefers-reduced-motion` → no canvas, no tweens; `prefers-reduced-data`/2G detection → static hero poster image instead of scene; Battery API (where available) → drop to IdleScene below 20%.
- **Never block money:** all invoice math and rendering stay synchronous DOM like today. The 3D layer is decorative, event-driven, and can always be skipped — an invoice must be completable with 3D disabled entirely (it's also the CI test mode).
- **Fonts:** WOFF2 subsets, preload the two weights above the fold, `font-display:swap`.
- **Network resilience:** Three.js vendored locally (garage Wi-Fi); no CDN in the critical path; the app renders fully before any 3D import resolves.
- **Print integrity:** `@media print` hides z0–z4 entirely; verify `window.print()` output byte-similar to the current mockup (this is an explicit acceptance test).
- **Regression guard:** a "reduced mode" URL flag (`?motion=off`) used in automated smoke tests so CI never depends on WebGL.

---

## 9. Acceptance Checklist

- [ ] Repeat-client invoice still completable in ≤ 60s, keyboard-only, with `?motion=off`
- [ ] Print/PDF output identical to current mockup (side-by-side diff)
- [ ] All current features present: search autofill, watchlist banner, chips, steppers, live totals, drafts, settings-driven branding (accent now re-tints neon too), mock send, reset demo
- [ ] Finale skippable at any point; invoice data correct even if animation interrupted
- [ ] `prefers-reduced-motion` / no-WebGL / 2G paths render the complete app
- [ ] 60fps sustained on the counter tablet during the Finale
- [ ] Dark-theme text contrast ≥ 4.5:1 on every panel tone
