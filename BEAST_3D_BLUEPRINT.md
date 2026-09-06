# Beast Invoice: "Showroom OS" 3D Redesign Blueprint

**Companion to:** `BEAST_BUILD_PLAN.md` (data, auth, deployment: source of truth) · `INVOICE_SYSTEM_PLAN.md` (domain rules) · `CINEMATIC_REDESIGN_PLAN.md` (Phase 0, superseded by this document for architecture)
**Scope:** Full production redesign of the Beast Invoice webapp as a 3D spatial workspace. React + React Three Fiber + Three.js + GSAP + Tailwind v4 + Next.js App Router.
**Status:** Blueprint → ready to scaffold
**Last updated:** September 2026

---

## 0. Design Read

Reading this as: **redesign-overhaul of a working product app** (garage invoice builder) for counter staff and a single owner, with a **dark showroom / dark-tech language** (racing red accent `#ff2d3f`, carbon surfaces, neon signage), built as a **hybrid spatial-DOM + WebGL workspace** on Next.js. Business-grade inputs stay business-grade; the showroom wraps them, never replaces them.

Dials (overrides the skill baseline because this is a product, not a landing page):

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | 7 | Depth-layered, asymmetric zone composition; but forms and money math stay disciplined and aligned. |
| `MOTION_INTENSITY` | 7 desktop / 5 mobile | Cinematic camera pans and the Finale are the product's reward moments; input flow is never delayed. Collapses to 1 under `prefers-reduced-motion`, `?motion=off`, or Low tier. |
| `VISUAL_DENSITY` | 5 (product surfaces) / 2 (showroom moments) | Editor and lists keep daily-app density; dashboard hero and Finale breathe. |

Mode: **Redesign - Overhaul.** Visual language is greenfield; information architecture, the 5-step builder flow, totals rules, print pipeline, and data model are preserved verbatim (acceptance criteria, Section 1).

Honesty notes (per design-system discipline): "holographic UI" here is an **aesthetic, not a system**. There is no official holographic package. It is implemented as (a) custom GLSL ShaderMaterials on WebGL props and (b) a labeled CSS approximation ("holo glass": `backdrop-filter` + accent border light + scanline overlay) with a solid-fill fallback under `prefers-reduced-transparency`. No design-system package is imported and overridden; Tailwind v4 + owned components is the foundation.

---

## 1. Audit Summary: What Survives (acceptance criteria)

From the working mockup and Phase 0, these are **non-negotiable survivals**. Every architecture decision below is checked against them.

| # | Contract | Source |
|---|---|---|
| A1 | Repeat-client invoice completable in ≤ 60 s, keyboard-only, with `?motion=off` | CINEMATIC §9 |
| A2 | Print/PDF sheet is pixel-stable and the 3D layer is 100% invisible to `@media print` | `css/print.css` frozen |
| A3 | Pick-don't-type inputs (search, chips, steppers, 44px+ touch targets); live totals with no "calculate" button | README, INVOICE_SYSTEM_PLAN |
| A4 | `calcTotals()` is the single math source; invoices snapshot their totals; catalog changes never mutate history | BEAST_BUILD_PLAN §3 |
| A5 | One WebGL context for the whole app; DPR clamped; loop pauses on hidden tab and during print; scenes dispose GPU resources | `three/scene-manager.js` |
| A6 | `prefers-reduced-motion`, no-WebGL, `prefers-reduced-data`, 2G, and `?motion=off` all render the complete app | CINEMATIC §9 |
| A7 | Settings accent color re-tints UI focus rings, neon glow, and 3D materials together | Phase 0 feature |
| A8 | Money renders in JetBrains Mono with `tabular-nums`; total changes tween, never jump | CINEMATIC §4.3 |
| A9 | The cinematic layer is a decorator on state, never a state owner; animation failure loses nothing but the show | CINEMATIC §5.4, §6 |

What the redesign **retires**: the single-file `index.html` monolith (already split in Phase 0), the hand-rolled tween engine (`js/motion/tween.js`, replaced by GSAP), emoji iconography (replaced by Phosphor icons), View Transitions API approach (replaced by GSAP route choreography that also drives the camera).

---

## 2. Concept: The Showroom Floor

The app is **one continuous 3D space**: a performance garage after hours. Routes are not pages; they are **zones** of the same room. Navigation dollies the camera between zones while DOM panels rise and recede in z-space. The invoice panel is the star object on the floor; everything else is set dressing.

### 2.1 Spatial map (top view)

```
                    N (z-)
        ┌───────────────────────────────┐
        │  OFFICE (settings)             │
        │   low light, one desk lamp     │
        │                                │
 BAYS ──┤   RECEPTION (dashboard)  ── ARCHIVE
(clients│    car on lift, stat holo-     │  (invoices:
& veh.) │    podium, recent-invoice      │   wall grid of
        │    rail)                       │   glass slots)
        │                                │
        │   WORKBENCH (invoice builder)  │
        │   the invoice slab, service    │
        │   rack, parts wall, Σ console  │
        └───────────────────────────────┘
                    S (z+ camera side)
```

Zone anchors (camera positions in world units; y ≈ eye height of a standing visitor):

```ts
// three/zones.ts
export const ZONE_ANCHORS = {
  reception: { pos: [0, 1.6, 7.2],  look: [0, 1.2, 0]   },
  workbench: { pos: [0.4, 1.7, 5.6], look: [0, 1.3, 0]  },
  archive:   { pos: [-2.8, 1.8, 6.0], look: [-2.4, 1.4, 0] },
  bays:      { pos: [2.8, 1.8, 6.2], look: [2.4, 1.4, 0]  },
  office:    { pos: [0, 2.0, 8.2],  look: [0, 1.6, -1]  },
  finale:    { pos: [0, 1.7, 4.2],  look: [0, 1.3, 0]   }, // camera pushes in
} as const
```

Routes map 1:1 to zones: `/` → reception, `/invoice/new` → workbench, `/invoices` → archive, `/clients` → bays, `/catalog` → parts wall (workbench-adjacent camera variant), `/settings` → office.

### 2.2 Material and light language

| Material | Where | Implementation |
|---|---|---|
| **Carbon** | page floor, envelope body, workbench slab | near-black `#0c0e12`, roughness ~0.85, faint clearcoat |
| **Glass** | DOM panels (z2/z3) | existing `--glass` + `--glass-blur`, 1px inset top edge |
| **Holo** | 3D props, Σ console, zone landmarks, seal glow | custom `holoPanelMaterial` (Section 6.1), accent-driven |
| **Neon** | ceiling light strips, status signage | emissive meshes + bloom (High tier) or glow sprites (Mid) |
| **Paper** | printed invoice, Finale paper prop | stays light-theme; frozen in print CSS / CanvasTexture |

Light: dark everywhere, one white key from above-front, red rim from the neon strips. Text contrast target ≥ 4.5:1 on every panel tone (A7 inherited audit from CINEMATIC §9). One accent (`--accent`, runtime-overridable), one secondary (`--ember`), status neon (green/amber/red) used only for semantics. No purple, no gradients-of-the-day.

### 2.3 The z-layer model (extends CINEMATIC §2.3)

```
z0  WebGL canvas (R3F)   fixed, pointer-events:none. Environment, holo props, camera, Finale.
z1  Ambient CSS          radial "neon pool" gradients, parallax ≤ 12px, scroll-linked.
z2  Content panels       glass cards with real CSS 3D depth (perspective + translateZ).
z3  Interactive chrome   nav rail / tab bar, sticky totals, toasts, modals, drop targets.
z4  Cinematic overlay    Finale scene sync, scrim, skip control, success card.
```

DOM panels get depth from a shared perspective container (`perspective: 1200px` on the shell) plus per-layer `translateZ` (panels 24-48px, chrome 64px). The WebGL camera and the DOM z-lift are choreographed by the same GSAP timelines so one hand moves both.

---

## 3. UI/UX Specification

### 3.1 Global shell

- **Nav:** desktop = 64px left icon rail (Phosphor glyphs + tooltip labels; collapses to a progress strip inside the builder's focused mode). Mobile = bottom tab bar, 5 items + settings, 48px targets. Single line, height ≤ 80px, everywhere.
- **Status signage:** Paid/Sent/Overdue stay color + label + icon (never color alone).
- **Command affordance:** persistent primary action per zone (Dashboard: "New Invoice"; Builder: "Finish"; Archive: contextual). One label per intent across the app.
- **Brand strip:** workshop name + slogan in the rail footer; the settings accent swatch is echoed here.

### 3.2 Zone-by-zone screens

**Reception (Dashboard, `/`)**
Hero is the garage bay itself: low-poly car on the lift (extruded silhouette), two neon strips, stat podium. Stats (Drafts, Sent, Overdue, Outstanding) render as DOM on a glass rail left-aligned; the Σ podium prop behind them pulses when a number tweens. Recent invoices = horizontal rail of glass cards. Shortcuts (JSON export, barcode input, templates) move below the rail as quiet rows, not a card grid. Camera: slow lissajous drift (±2°); scroll dollies back and fades to the next zone (ScrollTrigger scrub).

**Workbench (Builder, `/invoice/new`)**
The 5 mockup steps become **5 stations along the bench** (desktop, Stage mode): 1 Client & vehicle, 2 Services, 3 Parts, 4 Notes & discount, 5 Finish. The invoice panel is the floating slab: DOM glass panel, live totals in a sticky right rail with the Σ holo console behind it. The service rack (right side) holds draggable catalog cards; the parts wall is a searchable shelf. Completed stations lock with a check; the active one is lit red.

**Archive (Invoices, `/invoices`)**
A wall of glass slots (grid with rhythm: featured recent invoices larger, older ones compact; no uniform card grid). Opening an invoice triggers the **receive** variant of the Finale (envelope flies in, seal pops, paper unfolds, crossfades into the DOM preview at matched scale). Filters (status chips) restyle the wall in place.

**Invoice detail (`/invoices/[id]`)**
Full-bleed DOM preview over the dimmed showroom. Actions: Print/PDF (frozen pipeline), Record payment, Re-send (stubbed until Resend). `PAID` stamp keeps its one-shot CSS entrance (CINEMATIC F6).

**Client Bays (Clients, `/clients`)**
Each client is a bay: vehicle silhouette card + tier badge + last visit; watchlist notes surface as one-tap suggestions when composing. Unified search (name/phone/plate/VIN) sits top of the zone, identical behavior to today.

**Parts Wall (Catalog, `/catalog`)**
Services and parts editors. Services = mode (flat/hours), price, taxable, active (retire, never delete), sort (powers chip order). Parts = pn/brand/cost/price/stock/fits. CSV import endpoint preserved from BEAST_BUILD_PLAN. Unlimited custom services are first-class: "Add custom service" creates an ad-hoc-capable row (`ref_id` nullable at invoice time).

**Office (Settings, `/settings`)**
Branding (name, slogan, accent color), tax rate, default labor rate, footer terms. Accent change tweens: CSS vars first, then the WebGL uniforms (`uAccent`) crossfade over 400ms, so the whole room re-tints in one motion (A7).

### 3.3 Desktop interaction model

| Input | Behavior | Implementation |
|---|---|---|
| Scroll (Reception) | Camera dollies back, hero recedes, next-zone teaser | ScrollTrigger scrub on `stageProgress` |
| Scroll (Builder, Stage mode) | Camera pans the bench across the 5 stations; panels pin and hand off; sticky totals follow | Section 5.3 canonical skeleton: `start: "top top"`, `pin: true`, `scrub: 1` |
| Hover (any card/chip/panel) | Glow pulse + z-lift (+8px translateZ, border light brightens) | GSAP `quickTo` on transform + CSS var for glow; no React state |
| Drag service card | Pull from rack, ghost follows, invoice line-list gap opens on proximity, drop inserts with FLIP | GSAP Draggable + rect hit-test + FLIP; totals tween on insert |
| Drag line item | Vertical reorder with inertia; neighbors yield; totals unchanged | Draggable (lockAxis y) + InertiaPlugin + layout FLIP |
| Drag parts qty stepper | Native buttons remain (A3); steppers also respond to drag on desktop trackpads via wheel | wheel handler, debounced |
| Route change | Camera dolly along zone path (600-800ms, `power2.inOut`); outgoing panels recede z −80px, incoming rise | Section 5.7 |
| Keyboard | Full 60-second flow: `/` focuses search, chips are real buttons, `Enter` adds, `Esc` skips cinematic | native focus + roving tabindex in lists |

Stage mode vs Flow mode (Builder): Stage = scroll-scrubbed camera pan, default on desktop High/Mid tiers. Flow = plain document scroll with entrance animations only; default on mobile, Low tier, reduced-motion, and `?motion=off`. A "Stage view" toggle lives in the builder chrome; preference persists (A1: Flow must carry the whole flow).

### 3.4 Mobile interaction model

| Input | Behavior |
|---|---|
| Tap section header | Expands that builder station into a **full-screen 2D overlay** (bottom-sheet to full-bleed, 320ms spring). The canvas dims to 35% (`sceneDim` tween) so inputs own the screen. |
| Swipe (horizontal, from tab bar or anywhere with `touch-action` allowed) | Switch zones in order: Dashboard ↔ Builder ↔ Invoices ↔ Clients. 25% width or 500ms velocity threshold; edge peek shows the neighbor zone's tint. Route changes on commit. |
| Swipe down on overlay | Dismisses back to the bench. |
| Tap service chip / part row | Adds instantly (primary add path on mobile; drag is a desktop/tablet bonus). |
| 3D budget | No postprocessing, particles ≤ 220, no real-time shadows, floor = gradient shader at half complexity, DPR cap 1.5, `frameloop="demand"` only (Section 8). |
| Reduced 3D (Low tier) | Canvas never mounts; z1 CSS neon pools + a pre-rendered poster of the bay (one optimized WebP, `aspect-ratio` reserved, zero CLS) carry the atmosphere. |

Mobile never gets scroll-hijack; the Builder is a vertical stack with tap-expand overlays.

### 3.5 UI states (all screens)

- **Loading:** skeletons matching final layout shape (glass blocks, shimmering scanline sweep at 6s period max, pausable). No circular spinners.
- **Empty:** composed, on-brand, instructive. Archive empty: "No invoices yet. The bench is ready." + New Invoice CTA. Clients empty: seeded demo hint (Kai Osei) preserved.
- **Error:** inline under inputs (contrast-checked); toasts only for transient events (`aria-live="polite"`). Finale failure path: envelope flies back, seal cracks, toast explains (A9: the cinematic layer never lies).
- **Tactile:** `:active` scale 0.98; primary CTA shine sweep is the only looping DOM animation besides the canvas.

### 3.6 Accessibility

- Canvas is `aria-hidden="true"` and `pointer-events:none`; focus never enters z0/z4 except the Finale's Skip control.
- All money inputs: `inputmode="decimal"`, labeled above, helper text below, `tabular-nums` results.
- `prefers-reduced-motion`: every GSAP timeline checks the gate; camera pans become instant position swaps; Finale becomes a crossfade to the success card (existing behavior, ported).
- `prefers-reduced-transparency`: holo glass panels switch to solid `--bg-2` fill.
- Contrast audit on `--muted` (#9aa3af) against `--bg-2` (#14171d) = 5.6:1, passes AA; verify again after any accent change (accent never carries text).

---

## 4. Architecture

### 4.1 The load-bearing decision: hybrid spatial DOM

**Forms and money live in DOM. The room lives in WebGL. Never the reverse.**

| Option | Verdict |
|---|---|
| Full-3D UI (all panels as meshes, drei `Html`) | Rejected. Native inputs, IME, autofill, selection, zoom, screen readers, and the frozen print pipeline are business requirements. WebGL text is an a11y and perf trap here. |
| DOM-only with CSS 3D (Phase 0 approach, extended) | Good, but cannot deliver the camera pans, holo materials, bloom, or the 3D props the brief requires. |
| **Hybrid: R3F canvas at z0 (environment + props + Finale + camera) driving DOM panels at z2/z3 through shared GSAP choreography** | **Selected.** Each layer does what it is best at; one choreography owner (GSAP) moves both. |

Rules that keep the hybrid honest:
1. Panels behind **input fields** are solid (`--bg-2`), per CINEMATIC §2.3: the 3D shows around forms, not through them.
2. The camera rig publishes to a module-level mutable `rigTarget` object; `useFrame` copies it into the camera. GSAP tweens the object; React never re-renders for camera motion.
3. DOM parallax derives from the same `rigTarget` (pointer + scroll deltas) via `gsap.quickSetter`, clamped to ±12px (A5 spirit: nothing fights input).
4. One `frameloop` owner (Section 5.1). GSAP and R3F never each spin their own rAF loop; gsap.ticker is the heartbeat and R3F invalidates on demand.

### 4.2 Stack and dependencies

```bash
# framework
npx create-next-app@latest beast-invoice-app --ts --tailwind --app --src-dir
# 3D + motion
npm i three @react-three/fiber@^9 @react-three/drei@^10 @react-three/postprocessing@^3 gsap@^3.13 zustand@^5 detect-gpu
# UI
npm i @phosphor-icons/react
# server (from BEAST_BUILD_PLAN)
npm i @libsql/client
# quality
npm i -D vitest @playwright/test
```

| Package | Role | Notes |
|---|---|---|
| Next.js 15 + React 19 + TS | App Router; RSC for shell, client leaves for motion/3D | matches BEAST_BUILD_PLAN locked decision |
| Tailwind v4 | utility styling | `@theme inline` maps the existing `tokens.css` variables; tokens.css stays the single source of truth |
| R3F v9 + drei v10 | Canvas, camera, lights, `ContactShadows` (High tier), `Environment` lightformers | v9 requires React 19 |
| @react-three/postprocessing | Bloom (High tier only), half-res | otherwise sprite glow (Mid) |
| GSAP 3.13+ | ALL choreography: ScrollTrigger, Draggable, InertiaPlugin | all plugins free since 3.13; **no Motion/Framer in this tree** (skill rule: GSAP and Motion must never share frames) |
| zustand 5 | app store (persisted) + spatial store (transient) | Section 7 |
| detect-gpu | quality tiering | Section 4.6 |
| @phosphor-icons/react | all iconography (replaces emoji) | one family, `strokeWidth` standardized via `weight="regular"` |
| @libsql/client | Turso (server-side only) | Phase B |

Fonts stay self-hosted WOFF2 (Space Grotesk 600/700 display, JetBrains Mono 500/700 money, system stack body), `font-display: swap`, preloaded, `next/font`-equivalent via `@font-face` in tokens.css (already vendored in `assets/fonts/`).

### 4.3 React component tree

```
app/layout.tsx                                (RSC: html, fonts, viewport, PWA meta)
└── <Providers>                               ('use client')
    ├── AppStoreProvider                      zustand hydration gate + seed migration
    ├── MotionGate                            gsap.registerPlugin, reduced-motion context
    └── SpatialGate                           tier detection; mounts SceneCanvas only if tier > Low
        └── <AppShell>
            ├── NavRail (desktop ≥1024) / TabBar (mobile)
            ├── SceneCanvas                   (next/dynamic, ssr:false, lazy)
            │   └── <Canvas frameloop="demand">          see 4.4
            ├── <main class="zone-viewport">  perspective container (z1-z3)
            │   ├── routes:
            │   ├── app/page.tsx               → ReceptionView
            │   ├── app/invoice/new/page.tsx   → BuilderView
            │   │     ├── StageTrack (tier High/Mid, motion ok)  |  FlowTrack (fallback)
            │   │     ├── StationClient | StationServices | StationParts
            │   │     ├── StationNotes | StationFinish
            │   │     ├── ServiceRack (draggable cards)
            │   │     ├── PartsWall
            │   │     └── TotalsRail (sticky, Σ console backdrop)
            │   ├── app/invoices/page.tsx      → ArchiveView (InvoiceSlot grid, filters)
            │   ├── app/invoices/[id]/page.tsx → InvoiceDetailView (print sheet host)
            │   ├── app/clients/page.tsx       → ClientsView (BayCard, WatchlistBanner)
            │   ├── app/catalog/page.tsx       → CatalogView (ServiceEditor, PartEditor, CsvImport)
            │   └── app/settings/page.tsx      → SettingsView (BrandingForm, AccentPicker, RatesForm)
            └── OverlayHost (z4)
                ├── FinaleOverlay (SceneSync, SkipControl, SuccessCard)
                ├── Toaster (aria-live)
                └── ConfirmDialog
```

Rendering discipline: every view is a Server Component by default; anything touching GSAP, Draggable, pointer physics, or the spatial store is an isolated `'use client'` leaf. Shared state flows down from the two zustand stores; continuous values never enter React (Section 7).

### 4.4 R3F scene graph

```
<Canvas dpr={tierDpr} gl={{ antialias:false, alpha:true, powerPreference:'high-performance' }}
        frameloop="demand" onCreated={applyToneMapping}>
  <CameraRig>                                   one PerspectiveCamera makeDefault, fov 42
    rigTarget (module ref) ← GSAP tweens        useFrame applies + pointer parallax
  </CameraRig>
  <SceneRoot>
    <Environment>                               dark room, drei LightFormers (no HDR download)
    <hemisphereLight intensity .25 />
    <spotLight key white pos [0,6,4] angle .5 penumbra 1 />        High tier: castShadow (1024)
    <pointLight accentRimL pos [-3.2,2.6,2.5] color uAccent />
    <pointLight accentRimR pos [ 3.2,2.6,2.5] color uAccent />
    <FloorGrid />                               shader plane 40x40 (Section 6.3)
    <NeonStrips />                              2 emissive boxes + glow sprites
    <EmberField count={tier==High?400:tier==Mid?220:0} />
    <ZoneProps zone={activeZone}>               mounted per zone, disposed on exit
      reception:  CarSilhouette (ExtrudeGeometry), StatPodium (holo), LiftRig
      workbench:  BenchSlab (holo backer), SigmaConsole (holo), ToolCluster (instanced holo icons)
      archive:    SlotWall (instanced holo frames)
      bays:       BayPosts (holo pylons), VehicleHolo (wireframe silhouette)
      office:     DeskLamp light cone, FileStack
    </ZoneProps>
    <FinaleGroup visible={mode==='finale'} />   port of finale.js: paper(3 panels), envelope
                                                (body/flap/seal), SparkSystem, streaks
  </SceneRoot>
  <PostFX enabled={tier==='High'}>              Bloom(intensity .55, mipmapBlur, half-res) + Vignette
</Canvas>
```

Zone props are deliberately **few and cheap**: 6-12 meshes per zone, merged geometries where static, instancing for repeats (slot frames, tools). The DOM panels carry the detail; WebGL carries atmosphere. `ZoneProps` unmounts on zone exit and disposes geometries/materials (A5 discipline, now via R3F lifecycle + a `useDispose` helper).

### 4.5 Lighting rig (concrete values)

| Light | Type | Position | Intensity / Color | Tier gate |
|---|---|---|---|---|
| Key | SpotLight | (0, 6, 4) → bench | 1.2, #fff, angle 0.5, penumbra 1.0 | all; shadow map 1024 High only |
| Fill | HemisphereLight | sky #1b1f26 / ground #07080a | 0.25 | all |
| Rim L/R | PointLight | (±3.2, 2.6, 2.5) | 0.9, `uAccent` | all; color re-tints with accent |
| Strips | emissive meshes | ceiling lines | emissiveIntensity 2.2 + bloom | bloom High only |
| Seal flash | PointLight | envelope seal | 0 → 3 on impact frame, decay 0.15s | Finale only |
| Desk lamp | SpotLight | office | 0.8, warm #ffd9a0 | office zone only |

Renderer: `ACESFilmicToneMapping`, `outputColorSpace = SRGBColorSpace`, exposure 1.1 (matches the existing scene-manager's color pipeline).

### 4.6 Quality tier system

```ts
// lib/quality.ts ('use client')
import { getGPUTier } from 'detect-gpu'
export type Tier = 'High' | 'Mid' | 'Low'
export async function detectTier(): Promise<Tier> {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const dataSaver = matchMedia('(prefers-reduced-data: reduce)').matches
  const forced = new URLSearchParams(location.search).get('motion') === 'off'
  if (reduced || dataSaver || forced) return 'Low'
  const { tier } = await getGPUTier()
  const cores = navigator.hardwareConcurrency ?? 4
  const small = Math.min(screen.width, screen.height) < 720
  if (!tier || tier === 0 || cores <= 2) return 'Low'
  if (tier >= 2 && !small) return 'High'
  return 'Mid'
}
```

| Concern | High (desktop dGPU / tier ≥ 2) | Mid (iGPU, tablets, large phones) | Low (old/cheap, reduced-*, `?motion=off`) |
|---|---|---|---|
| Canvas | full scene | full scene, reduced | **never mounts** (CSS pools + poster) |
| DPR cap | min(dpr, 1.75) | min(dpr, 1.5) | n/a |
| Bloom | yes, half-res `mipmapBlur` | sprite glow textures | n/a |
| Shadows | ContactShadows (64px blur) | fake blob planes | n/a |
| Ember particles | 400 | 220 | 0 |
| Floor | grid shader + stage pool | grid shader simplified (no fwidth AA) | CSS gradient |
| Camera | smooth path + parallax | path at 30Hz ambient | instant position swap |
| Builder mode | Stage (scroll pan) default | Stage default | Flow forced |

Tier is detected once at boot before `SceneCanvas` mounts, stored in the spatial store, and re-checked on `visibilitychange` resume (Battery API: drop to Low below 20% where available, per CINEMATIC §8).

---

## 5. Animation System (GSAP)

### 5.1 Runtime contract

- **One heartbeat.** `gsap.ticker` is the only rAF owner. R3F runs `frameloop="demand"`; a single `AmbientDriver` calls `invalidate()` at full rate during active timelines/pointer/scroll, 30Hz during ambient drift, and stops after 8s idle (static frame) until the next input. Tab hidden → ticker sleeps (`gsap.ticker.sleep()` equivalent: remove tick listener on `visibilitychange`); `beforeprint` also stalls rendering (A5/A2).
- **No React state in motion paths.** Timelines tween plain objects/refs (`rigTarget`, DOM transforms, uniform `.value`). React re-renders only for discrete state (zone, tier, data).
- **Every timeline has a reason** (hierarchy, storytelling, feedback, or state transition) and a reduced-motion path. The registry:

| Timeline | Trigger | Duration | Purpose |
|---|---|---|---|
| `zoneTravel` | route change | 700ms | state transition: camera dolly + panel z-recede/rise |
| `stagePan` | Builder scroll (Stage) | scrubbed | storytelling: walk the bench |
| `panelEnter` | section reveal | 500ms + stagger 60ms | hierarchy |
| `hoverLift` / `press` | pointer | 180ms / 80ms | feedback |
| `dragGhost`, `flapInsert` | drag lifecycle | realtime | feedback + state |
| `totalsTween` | any money change | 400ms ease-out | feedback (A8) |
| `finale` | Finish & Send / Open | 2.4s / 1.8s | reward moment (port) |
| `accentShift` | settings accent change | 400ms | state transition (A7) |

### 5.2 Camera rig

```ts
// three/camera-rig.ts
export const rigTarget = { x: 0, y: 1.6, z: 7.2, lx: 0, ly: 1.2, lz: 0 }  // plain object, no React
```

```tsx
function CameraRig() {
  const { camera, invalidate } = useThree()
  useFrame(() => {
    camera.position.lerp(tmpV.set(rigTarget.x, rigTarget.y, rigTarget.z), 0.12)
    lookRef.current.lerp(tmpL.set(rigTarget.lx, rigTarget.ly, rigTarget.lz), 0.12)
    camera.lookAt(lookRef.current)
    invalidate()
  }, -1) // priority: run before ambient drivers
  return null
}
```

Zone travel (route change):

```ts
export function travelToZone(zone: ZoneKey) {
  const [x, y, z] = ZONE_ANCHORS[zone].pos
  const [lx, ly, lz] = ZONE_ANCHORS[zone].look
  gsap.to(rigTarget, {
    x, y, z, lx, ly, lz,
    duration: 0.7, ease: 'power2.inOut',
    onUpdate: () => spatialApi.invalidate(),
  })
}
```

The DOM layer subscribes to the same tween: panel containers get `gsap.to(panels, { z: -80, autoAlpha: 0 })` out, then incoming panels rise (`z: 0 → 24`, stagger). One travel, both worlds.

### 5.3 Builder Stage scroll pan (canonical skeleton applied)

```tsx
'use client'
import { motionOK } from '@/lib/motion/gsap'   // matchMedia gate: reduced-motion + tier, GSAP-owned
function StageTrack({ stations }: { stations: ReactNode[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!motionOK() || spatial.tier === 'Low') return   // Flow mode renders instead
    const ctx = gsap.context(() => {
      const distance = track.current!.scrollWidth - window.innerWidth
      // camera path: bench line, eased in and out
      const path = new THREE.CatmullRomCurve3([
        v(0.4, 1.7, 5.6), v(-0.6, 1.65, 5.2), v(0, 1.6, 4.9),
        v(0.8, 1.7, 5.3), v(0.4, 1.8, 5.9),
      ])
      const state = { p: 0 }
      const panTween = gsap.to(state, {
        p: 1, ease: 'none',
        scrollTrigger: {
          trigger: wrap.current,
          start: 'top top',                 // pin at viewport top, never halfway
          end: () => `+=${distance}`,
          pin: true, scrub: 1, invalidateOnRefresh: true,
        },
        onUpdate: () => {
          const pt = path.getPoint(state.p)
          rigTarget.x = pt.x; rigTarget.y = pt.y; rigTarget.z = pt.z
          stageProgress.value = state.p * (stations.length - 1)
          spatialApi.invalidate()
        },
      })
      // station panels hand off inside the pinned track
      gsap.utils.toArray<HTMLElement>('.station').forEach((el) => {
        gsap.fromTo(el, { autoAlpha: 0.25, z: -60 }, {
          autoAlpha: 1, z: 0, ease: 'none',
          scrollTrigger: { trigger: el, containerAnimation: panTween, start: 'left 70%', end: 'left 40%', scrub: true },
        })
      })
    }, wrap)
    return () => ctx.revert()
  }, [stations.length])
  return (
    <section ref={wrap} className="relative overflow-hidden">
      <div ref={track} className="flex h-[100dvh] items-center">{stations}</div>
    </section>
  )
}
```

Hard rules honored from the skill's canonical skeletons: `start: 'top top'`, `pin: true`, scrub, `invalidateOnRefresh`, strict `ctx.revert()` cleanup. The TotalsRail is pinned separately (z3) so money is always visible during the pan. Flow mode renders the same stations in a plain vertical document flow with `panelEnter` staggers only.

### 5.4 Hover lift + glow (no React state, no scroll listeners)

```ts
const liftX = gsap.quickTo(card, 'rotationY', { duration: 0.3, ease: 'power2.out' })
const liftZ = gsap.quickTo(card, 'z',        { duration: 0.3, ease: 'power2.out' })
card.addEventListener('pointermove', (e) => {
  const r = card.getBoundingClientRect()
  liftX(((e.clientY - r.top) / r.height - 0.5) * -3)   // ≤3° tilt
  liftZ(8)                                             // z-lift, A-spec
  card.style.setProperty('--glow-o', '1')              // border light via CSS var
})
card.addEventListener('pointerleave', () => { liftX(0); liftZ(0); card.style.setProperty('--glow-o', '0') })
```

Touched values are transform-only (`will-change: transform` only while dragging/hovering, then cleared). No `window.addEventListener('scroll')` anywhere in the codebase (banned; ScrollTrigger only).

### 5.5 Drag service card → drop onto invoice

```ts
// ServiceRack card
Draggable.create(cardEl, {
  type: 'x,y', edgeResistance: 0.75, bounds: viewportEl,
  onPress() { gsap.to(cardEl, { scale: 1.04, z: 40, duration: 0.2 }) },
  onDrag()  { dropZone.classList.toggle('is-open', hitTest(lineListEl)) },
  onRelease() {
    if (hitTest(lineListEl)) {
      // insert line via store; FLIP the new row from the ghost's position
      const from = ghostRect(cardEl)
      addServiceLine(service.id)
      requestAnimationFrame(() => flipIn(newRowEl, from))
      totalsTween()                       // A8: money animates to the new value
      sparkPop(cardEl)                    // 3 DOM dots, 300ms (CINEMATIC §4.3)
    }
    gsap.to(cardEl, { x: 0, y: 0, scale: 1, z: 0, duration: 0.35, ease: 'power3.out',
      onComplete: () => Draggable.get(cardEl).update() })
  },
})
```

Hit-testing uses DOM rects (robust, testable), never raycasting. Keyboard-equivalent add remains the chips (A1); drag is enhancement, not gate.

### 5.6 Line-item reorder

Vertical Draggable with `lockAxis: 'y'` + InertiaPlugin; siblings yield via FLIP (`gsap.to(siblings, { y: shift })`); on settle, commit new `seq` order to the store once. Total unchanged, so no totals tween. Touch fallback: up/down buttons per row (A3).

### 5.7 Route transitions

`zoneTravel` (5.2) + panel choreography. The outgoing view's panels recede (`z: -80, autoAlpha: 0, 350ms`), incoming rise with stagger. Route code waits on `document.fonts.ready` on first paint only; never blocks navigation on the 3D layer (the canvas is decorative; navigation must work if it never boots).

### 5.8 Finale (port of the Phase 0 envelope)

The scene graph, beats, projection-matched DOM handoff (`matchDomRect`, already implemented in `three/scene-manager.js:93`), haptics, WebAudio thud, skip affordances, failure path, and reverse variant port **unchanged** in design (CINEMATIC §6 is the spec). What changes:

- `js/motion/tween.js` calls become one GSAP timeline (`finale`) with labels: `commit`, `fold`, `seal`, `launch`, `resolve`; ESC/skip kills the timeline and resolves the same promise.
- `frameloop="demand"` + `invalidate()` per onUpdate keeps the GPU idle when the timeline isn't playing.
- The CanvasTexture paper art stays programmatic (no html2canvas).
- State safety preserved: `finalizeInvoice()` runs **before** the timeline; the success card renders **after** it; crash mid-show loses nothing (A9).

### 5.9 Reduced-motion map

| Feature | Reduced behavior |
|---|---|
| Canvas | never mounts (Low tier); CSS neon pools + bay poster |
| zoneTravel | instant camera swap; panels crossfade 1ms |
| stagePan | Builder switches to Flow mode automatically |
| hoverLift / drag physics | disabled; instant states + focus rings carry affordance |
| totalsTween | value swaps instantly (tabular-nums prevents shift) |
| Finale | crossfade to success card (existing graceful path) |
| skeletons | static blocks (shimmer paused) |

---

## 6. Shader Design

All materials are `ShaderMaterial` (or `onBeforeCompile` patches where a standard material is needed). Every uniform has a mobile-reduction note. WebGL2 (three r180 default), so `fwidth` derivatives are core.

### 6.1 `holoPanelMaterial` (holographic UI elements)

Used by: BenchSlab backer, Σ console, StatPodium, SlotWall frames, ToolCluster icons, seal glow. Uniform `uAccent` re-tints with settings (A7).

```glsl
// vertex
varying vec3 vNormal; varying vec3 vView; varying vec2 vUv; varying vec3 vWorld;
uniform float uTime; uniform float uAmp;        // mobile: 0.0 (flat)
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(p.y * 6.0 + uTime * 1.4) * uAmp;   // subtle breathing, cheap
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}

// fragment
precision highp float;
varying vec3 vNormal; varying vec3 vView; varying vec2 vUv; varying vec3 vWorld;
uniform vec3 uAccent; uniform float uTime; uniform float uOpacity;
uniform float uScanDensity;                     // mobile: 1.6x sparser
uniform float uFlicker;                         // mobile: 0.0 (off)
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
  float scan = smoothstep(0.45, 0.55, fract(vWorld.y * uScanDensity - uTime * 0.6));
  vec2 cell = fract(vUv * 24.0);
  float grid = max(step(cell.x, 0.04), step(cell.y, 0.04));
  float flick = mix(1.0, 0.85 + 0.15 * hash(floor(uTime * 24.0)), uFlicker);
  vec3 col = uAccent * (0.18 + fres * 1.1)
           + vec3(0.9) * grid * 0.08
           + uAccent * scan * 0.22;
  float alpha = (0.08 + fres * 0.75 + scan * 0.12) * uOpacity * flick;
  gl_FragColor = vec4(col, alpha);
}
```

Cost notes: no loops, no textures, one varying set. Mobile reductions are uniform switches, not separate shaders: `uAmp=0`, `uFlicker=0`, scanlines at lower density, and (Mid/Low) the material is shared as a single instance across props of the same class to cut state changes.

### 6.2 `emberFieldMaterial` (global particles, one draw call)

```glsl
// vertex
attribute float aSeed;
uniform float uTime; uniform float uPixelRatio; uniform float uWind;
varying float vFade; varying float vSeed;
void main() {
  vSeed = aSeed;
  vec3 p = position;
  float t = uTime * (0.15 + aSeed * 0.12);
  p.y = mod(p.y + t, 6.0) - 3.0;                          // upward wrap, no CPU updates
  p.x += sin(t * 2.0 + aSeed * 40.0) * 0.18 + uWind * aSeed; // pointer wind impulse
  vFade = smoothstep(3.0, 2.2, abs(p.y));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (2.0 + aSeed * 3.0) * uPixelRatio * (1.0 / -mv.z);
}

// fragment
precision mediump float;
varying float vFade; varying float vSeed;
uniform vec3 uAccent;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vFade * 0.8;
  vec3 c = mix(uAccent, vec3(1.0, 0.54, 0.24), vSeed * 0.7);  // ember blend
  gl_FragColor = vec4(c, a);
}
```

Positions live in the vertex shader from `uTime`: zero per-frame allocation, zero CPU particle work (A5). `uWind` is a smoothed pointer/scroll impulse written by GSAP.

### 6.3 `floorGridMaterial` (the floor)

```glsl
// fragment (vertex: pass world pos)
precision highp float;
varying vec3 vWorld;
uniform vec3 uAccent; uniform float uTime; uniform float uAA;  // uAA 1 High, 0 simplified
float gridLine(vec2 uv, float scale) {
  vec2 g = abs(fract(uv * scale - 0.5) - 0.5);
  if (uAA > 0.5) { vec2 w = fwidth(uv * scale); return 1.0 - min(min(g.x / w.x, g.y / w.y), 1.0); }
  return 1.0 - step(0.02, min(g.x, g.y));                        // cheap branch for Mid
}
void main() {
  vec2 uv = vWorld.xz;
  float fade = smoothstep(9.0, 2.0, length(uv));
  vec3 col = vec3(0.028, 0.032, 0.04)
           + uAccent * (gridLine(uv, 1.0) * 0.10 + gridLine(uv, 4.0) * 0.05) * fade
           + uAccent * 0.05 * smoothstep(0.35, 0.0, abs(length(uv) - 2.4))
               * (0.6 + 0.4 * sin(uTime * 0.8));                 // "stage pool" under the star object
  gl_FragColor = vec4(col, 1.0);
}
```

### 6.4 DOM "holo glass" treatment (labeled CSS approximation)

For glass panels that sit over the canvas, a restrained holo flavor:

```css
.holo-glass {
  position: relative;
  background: var(--glass);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--line);
  box-shadow: var(--edge-light), var(--shadow-2);
}
.holo-glass::after {                       /* scanline sweep, pausable, decorative only */
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent 0 3px, rgb(255 255 255 / .015) 3px 4px);
  mix-blend-mode: overlay;
}
@media (prefers-reduced-transparency: reduce) {
  .holo-glass { background: var(--bg-2); backdrop-filter: none; }
}
@media print { .holo-glass::after, .holo-glass { display: none; } }  /* A2 belt-and-suspenders */
```

This is a web approximation, not an official material; the solid fallback is mandatory.

### 6.5 Mobile complexity matrix

| Technique | High | Mid | Low |
|---|---|---|---|
| Bloom (postprocessing) | half-res mipmapBlur | off (glow sprites) | off |
| Holo breathing warp (`uAmp`) | 1 | 0 | n/a |
| Holo flicker (`uFlicker`) | 1 | 0 | n/a |
| Scanline density | 1.0 | 0.6 | n/a |
| fwidth floor AA | on | off | n/a |
| Particles | 400 | 220 | 0 |
| ContactShadows | on | blob planes | none |
| Shader instances | per class | shared | n/a |

---

## 7. State Management

Two zustand stores plus pure modules. The cinematic layer stays a decorator on state (A9).

```ts
// lib/store/app.ts : data store (persisted)
type BeastState = {
  settings: Settings            // shop name, slogan, tax, labor rate, accentHex, terms
  clients: Client[]; vehicles: Vehicle[]
  services: Service[]; parts: Part[]
  invoices: Invoice[]           // includes drafts; totals snapshot per invoice
}
export const useAppStore = create<BeastState>()(persist(beastSlice, {
  name: 'beast_invoice_v1',
  migrate: migrateMockupHpgV1,   // one-time import from the mockup's hpg_mock_v1 keys
}))
```

- **Persistence now:** `localStorage` via `persist` (same mental model as the mockup; phone/PC parity arrives with Turso).
- **Cloud later:** Phase B swaps persistence to API routes + Turso per BEAST_BUILD_PLAN §3 (all writes server-side, token never in the browser); the store shape is deliberately identical so views don't change. Optimistic writes with rollback on the invoice list.
- **Totals:** `lib/totals.ts` pure functions, shared by UI and (later) API, unit-tested (BEAST_BUILD_PLAN §5). Components never recompute money.
- **Event bus:** `beast:finalized`, `line:added`, `accent:changed` etc. via a tiny emitter; the 3D layer subscribes to these (it never owns data).

```ts
// lib/store/spatial.ts : transient scene store (discrete values ONLY)
type SpatialState = {
  zone: ZoneKey                 // drives ZoneProps mounting
  tier: Tier
  sceneDim: number              // 0..1, tweened for mobile overlays
  finaleMode: null | 'send' | 'receive'
  accentHex: string             // mirrored into shader uniforms on change
}
```

**Continuous values are banned from React:** `rigTarget`, `stageProgress`, drag positions, pointer parallax live in module-level refs tweened by GSAP (Sections 5.2-5.5). Components that need them read in `useFrame` or via `quickSetter`. This is the skill's hard rule (`never useState for pointer/scroll-driven values`) applied store-wide.

Accent flow (A7): Settings writes `accentHex` → store → CSS var `--accent` set on `:root` (instant) → `accentShift` timeline tweens `uAccent` uniforms (400ms crossfade) → neon strips and holo props re-tint in the same motion.

---

## 8. Performance Strategy

### 8.1 Budgets

| Metric | Target |
|---|---|
| First paint (no 3D; RSC shell + CSS) | < 1.2s local; LCP < 2.5s on the counter tablet |
| 3D layer payload (three + R3F + drei, lazy chunk) | ≤ 450KB gzip, loaded after first paint, only tier > Low |
| Sustained FPS | 60 desktop High; ≥ 45 on a 2019-era tablet @ DPR 1.5 Mid |
| GPU memory | one context, ≤ 60MB textures/geometries |
| INP | < 200ms (all input handling off the React render path) |
| CLS | < 0.1 (poster aspect-ratio reserved, fonts preloaded) |

### 8.2 Techniques (mapped to contracts)

- **One context, forever (A5).** `<Canvas>` mounts once in `SpatialGate` and never unmounts per route; zones swap content. Context loss = the #1 WebGL production bug; the app must survive it: `onContextLost` shows the CSS pools and keeps the app fully usable.
- **Render less.** `frameloop="demand"` + `AmbientDriver` (30Hz ambient, full-rate during interaction, stall after 8s idle). Pause on `document.hidden` and `beforeprint`/`afterprint`. DPR caps per tier (4.6). `antialias: false` (DPR hides aliasing at 1.5+).
- **Draw less.** Zone props ≤ 12 meshes, merged static geometry, instanced repeats, shared material instances per class. Particles = one `Points` draw call, shader-driven. No GLTF downloads; everything is primitives + shaders (garage Wi-Fi rule).
- **Lazy everything 3D.** `SceneCanvas = dynamic(() => import('...'), { ssr: false })`, imported on `requestIdleCallback` after first paint; `FinaleGroup` code-splits further and loads on first finalize/open. The invoice flow is 100% functional before any 3D resolves (A1, A6).
- **Never block money.** All math synchronous in `lib/totals.ts`; the render path for inputs is React-pure; motion touches only transforms/opacity (no layout properties animated).
- **Zero-allocation loops.** Reused `Vector3`/`Color` temps; no `new` in `useFrame`/ticker callbacks.
- **No scroll listeners.** ScrollTrigger and `useScroll`-style sources only; DOM parallax via `quickSetter`.
- **Print integrity (A2).** `@media print` hides z0-z4 entirely (canvas, overlays, skeleton shimmer); smoke test diffs print output against the frozen baseline.
- **Battery/data respect.** `prefers-reduced-data` / 2G → Low; Battery API < 20% → drop to Low until charged (CINEMATIC §8 carried forward).
- **Regression guard.** `?motion=off` forces Low tier for automated smoke tests; CI runs the 60-second invoice flow with WebGL disabled.

### 8.3 Loading choreography

1. RSC shell + tokens + fonts paint (CSS pools give the dark showroom instantly).
2. Data hydrates from the persisted store; skeletons only if revalidating from the API later.
3. `requestIdleCallback` → tier detection → tier > Low: lazy-load the 3D chunk → canvas fades in (opacity 0 → 1, 600ms) **after** first render, so the room "lights up" (one motivated moment, not a loading flash).
4. First interaction pre-warms the Finale chunk.

---

## 9. File Structure (production)

```
beast-invoice-app/
├── package.json  next.config.ts  tsconfig.json  postcss.config.mjs
├── .env.local                       # TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, APP_PASSPHRASE, SESSION_SECRET (Phase B)
├── public/
│   ├── manifest.webmanifest         # PWA (installable on the counter tablet)
│   ├── icons/                       # maskable icons
│   └── posters/bay.webp             # Low-tier static showroom image
├── src/
│   ├── app/
│   │   ├── layout.tsx               # shell: fonts, viewport, providers, PWA meta
│   │   ├── page.tsx                 # Reception (dashboard)
│   │   ├── invoice/new/page.tsx     # Workbench (builder)
│   │   ├── invoices/page.tsx        # Archive
│   │   ├── invoices/[id]/page.tsx   # Detail + print sheet host
│   │   ├── clients/page.tsx         # Bays
│   │   ├── catalog/page.tsx         # Parts wall
│   │   ├── settings/page.tsx        # Office
│   │   └── api/                     # Phase B (BEAST_BUILD_PLAN §5 unchanged)
│   ├── components/
│   │   ├── shell/  AppShell.tsx  NavRail.tsx  TabBar.tsx  OverlayHost.tsx  Toaster.tsx
│   │   ├── canvas/ SceneCanvas.tsx  CameraRig.tsx  SceneRoot.tsx  PostFX.tsx
│   │   │            AmbientDriver.tsx  zones/ZoneProps.tsx (per-zone groups)
│   │   │            props/CarSilhouette.tsx  StatPodium.tsx  SigmaConsole.tsx
│   │   │            EmberField.tsx  FloorGrid.tsx  NeonStrips.tsx
│   │   │            finale/FinaleGroup.tsx  Paper.tsx  Envelope.tsx  Sparks.tsx
│   │   ├── builder/ BuilderView.tsx  StageTrack.tsx  FlowTrack.tsx  Station*.tsx
│   │   │            ServiceRack.tsx  PartsWall.tsx  TotalsRail.tsx
│   │   ├── views/   ReceptionView.tsx  ArchiveView.tsx  InvoiceDetailView.tsx
│   │   │            ClientsView.tsx  CatalogView.tsx  SettingsView.tsx
│   │   └── ui/      GlassCard.tsx  HoloPanel.tsx  Chip.tsx  Stepper.tsx  Money.tsx
│   │                Skeleton.tsx  EmptyState.tsx  (owned primitives, never default-styled)
│   ├── three/
│   │   ├── zones.ts                 # ZONE_ANCHORS, zone keys
│   │   ├── rig.ts                   # rigTarget module ref
│   │   ├── quality.ts               # tier detection
│   │   └── materials/
│   │       ├── holoPanel.ts  emberField.ts  floorGrid.ts   # shader defs + uniform presets per tier
│   ├── lib/
│   │   ├── totals.ts  db.ts  auth.ts  email.ts             # BEAST_BUILD_PLAN §5
│   │   ├── store/app.ts  store/spatial.ts
│   │   ├── motion/gsap.ts           # registration, ticker policy, reduced-motion gate
│   │   ├── motion/flip.ts  hit-test.ts
│   │   └── bus.ts                   # beast:* event emitter
│   └── styles/
│       ├── tokens.css               # ported verbatim from the mockup (single source of truth)
│       ├── globals.css              # Tailwind v4 `@theme inline` mapping tokens
│       └── print.css                # frozen; byte-compare against baseline in CI
└── tests/
    ├── totals.test.ts               # discount/tax/rounding edges
    └── e2e/smoke.spec.ts            # 60s flow with ?motion=off, print regression, keyboard-only
```

---

## 10. Deployment

1. **Host:** Vercel Hobby (BEAST_BUILD_PLAN §10). `vercel link`, framework auto-detected; Git-push deploys, preview per PR, prod on `main`.
2. **Database (Phase B):** `turso db create beast-invoice` (free plan); set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSPHRASE`, `SESSION_SECRET` in Vercel env vars. Phase A ships localStorage-only and needs none of these.
3. **Build gate:** `npm run build` (typecheck + build) on every push; Vercel enforces it too. `vitest run` for totals; Playwright smoke with `?motion=off` against the Vercel preview.
4. **Headers (next.config.ts):** immutable cache for `/_next/static` and self-hosted WOFF2; `Content-Security-Policy` allowing `self` (no CDN in the critical path; three ships bundled); `X-Content-Type-Options: nosniff`.
5. **PWA:** manifest + icons; the tablet installs to home screen for fullscreen counter use (BEAST_BUILD_PLAN §7).
6. **Print regression:** CI step prints a seeded invoice to PDF (headless Chromium) and byte-compares layout snapshot against the frozen baseline (A2).
7. **Monitoring:** Vercel Analytics (free) + a manual monthly `turso db export` backup (BEAST_BUILD_PLAN §12).
8. **Rollback:** Vercel instant rollback to the previous deployment; the 3D layer is additive and can be disabled fleet-wide by forcing Low tier via an env flag (`NEXT_PUBLIC_FORCE_2D=1`) without a code change.

---

## 11. Build Phases

Interleaved with BEAST_BUILD_PLAN's Phases A-D (data/auth/CRUD land exactly as planned there; the S-series adds the spatial layer).

| Phase | Contents | Exit criteria |
|---|---|---|
| **S0 + A** | Next.js scaffold, tokens.css port, Tailwind v4 mapping, shell (rail/tab), zustand stores, tier detection, `?motion=off` plumbing, settings CRUD | All routes render in Flow (2D) mode; print regression green |
| **S1 + B (first half)** | Canvas boot, camera rig, floor, neon strips, ember field, PostFX gate; Reception zone + stat podium; zoneTravel between 2 routes | 60fps High/Mid on the dashboard; canvas absent on Low with zero functional loss |
| **S2 + B (second half)** | Workbench: Stage scroll pan, stations, ServiceRack drag-drop, reorder, TotalsRail + Σ console, totals tween | 60-second flow passes keyboard-only in Stage and Flow modes |
| **S3 + C** | Archive, Bays, Office zones; mobile tap-expand overlays + swipe zone switching; Mid-tier reductions; battery/data gates | Tablet manual pass: ≥ 45fps, all targets 44px+, overlays a11y-clean |
| **S4** | Finale port (send + receive variants), spark system, haptics, audio, skip/failure paths; hardening: context-loss, idle stall, print audit, Lighthouse | Acceptance checklist (Section 12) fully green |
| **D** | Resend email behind the stub; server PDF later (BEAST_BUILD_PLAN §8 unchanged) | existing criteria |

Estimates align with BEAST_BUILD_PLAN's session-based sizing: S-series adds roughly 3-4 sessions across Phases A-C.

---

## 12. Acceptance Checklist (final pre-flight)

- [ ] Design read declared; dials explicit (Section 0); redesign-overhaul mode with preserved IA
- [ ] One accent (`--accent`) across every surface; status neon semantic-only; no purple, no gradient slop
- [ ] Zero em-dashes in any UI string; no emoji iconography (Phosphor only); no decorative dots, scroll cues, version labels
- [ ] A1: ≤ 60 s repeat invoice, keyboard-only, `?motion=off`, Low tier, and mobile
- [ ] A2: print/PDF byte-similar to the frozen baseline; 3D invisible in print
- [ ] A3: pick-don't-type preserved; live totals; no calculate button
- [ ] A5: one WebGL context; DPR clamped; paused on hidden/print; zones dispose GPU resources
- [ ] A6: reduced-motion, no-WebGL, reduced-data, 2G render the complete app
- [ ] A7: settings accent re-tints UI + neon + shaders in one 400ms motion
- [ ] A8: money in JetBrains Mono tabular-nums, tweened changes
- [ ] A9: cinematic layer never owns state; finalize-before-show, success-after-show
- [ ] 60fps sustained on counter tablet (Mid) during Finale and Stage pan
- [ ] Contrast ≥ 4.5:1 on all panels; buttons/labels WCAG AA; contrast re-audited after accent change
- [ ] Empty/loading/error states on every view; Finale failure path honest
- [ ] No `window.addEventListener('scroll')`; ScrollTrigger skeletons use `start: 'top top'`, `pin: true`, scrub, cleanup
- [ ] React re-renders never triggered by continuous values (camera, drag, pointer, scroll)
- [ ] 3D chunk lazy, ≤ 450KB gzip, after first paint; app fully usable before it resolves
- [ ] holo glass labeled as approximation with solid `prefers-reduced-transparency` fallback
- [ ] CI: totals tests + typecheck + smoke (`?motion=off`) + print snapshot green
