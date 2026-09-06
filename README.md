# 🏁 Beast Invoice

**High Performance Garage** — a fast, garage-staff-friendly invoice generator.

Built for the counter, not the office: a complete, professional invoice in **under 60 seconds** with minimal typing. Every field is a dropdown, autocomplete, checkbox, or stepper first — free text is the fallback, not the default.

> **Status:** 🧪 Mockup / prototype for testing. Runs entirely in the browser, zero dependencies, no build step. Email sending is **simulated** (nothing is sent).

---

## ✨ Features (current mockup)

- **🔍 One-box client search** — type a name, phone, plate, or VIN; results show tier and vehicle count. Picking one auto-fills contact details.
- **🚗 Vehicle auto-fill + smart suggestions** — selecting a vehicle surfaces its service watchlist ("Rear pads were at 4mm…") as a one-tap add, plus VIP/Fleet tier discount buttons.
- **⚡ Common-job service chips** — the 8 most-used jobs as toggle chips with prices; category autocomplete for the rest.
- **⚙ Parts with steppers** — search by name or part number, quantity steppers with live line totals and stock warnings.
- **Σ Live totals** — labor, parts, discount, tax, and grand total recalculate on every input. No "calculate" button exists.
- **📝 Notes done right** — quick-chip buttons for common notes; customer notes print, internal notes never do.
- **🧾 Branded invoice template** — workshop name, slogan, accent color, tax rate, and labor rate are all customizable in Settings and restyle the invoice live.
- **🖨 PDF via print** — "Finish & Print" opens the print dialog; choose *Save as PDF*. File-ready invoice layout with an optional PAID stamp.
- **📧 Mock email** — "Finish & Send" marks the invoice Sent and simulates delivery (placeholder for [Resend](https://resend.com) integration later).
- **💾 Drafts & persistence** — data is stored in your browser's localStorage; `↺ Reset Demo` restores the seeded demo data anytime.

## 🎬 Cinematic redesign (Phase 0)

The dark "Showroom at Night" theme is in, and the invoice finale is now a **3D envelope sequence** (Three.js, lazily loaded — it never blocks the 60-second core flow):

- **🎭 Seal & Send (3D)** — after *Finish & Send*, the invoice folds, slides into an envelope, gets a wax-seal stamp (sparks + haptics + thud), then launches off-screen.
- **📩 Receive (3D)** — open any invoice from the Invoices list and watch the envelope fly in, seal pop, and the paper unfold.
- Everything is **skippable** (Skip button, Esc, or click the scrim) and **degrades gracefully** — no WebGL, reduced-motion, or `?motion=off` falls back to the plain flow.
- Branding accent set in Settings drives the UI focus rings, neon glow, *and* the 3D finale materials.
- The printed/PDF invoice is untouched (light theme, frozen in `css/print.css`).

## 🏗 Real build ("Showroom OS" — in progress)

`beast-invoice-app/` is the production Next.js app implementing `BEAST_3D_BLUEPRINT.md`:
React 19 + React Three Fiber 9 + GSAP + Tailwind v4 + zustand. Phase S0+A plus the first
S1 slice are in: all zones render in 2D Flow mode, the WebGL showroom (floor grid, neon
strips, ember particles, show car on the lift) boots lazily after first paint, and the
60-second builder flow works end to end against localStorage.

```bash
cd beast-invoice-app
npm install
npm run dev   # http://localhost:3000
```

`?motion=off` disables the 3D layer entirely (Low tier; used by CI smoke tests).

## 🚀 Run it

Open `index.html` in any modern browser, or use the live demo.

```bash
# optional: serve it locally (not required)
python3 -m http.server 8000
# → http://localhost:8000/index.html
```

> 🌐 **Live demo:** https://lenovobeast.github.io/Beast-Invoice/ (GitHub Pages)

**Demo data:** 3 clients, 3 vehicles, 8 services, 9 parts, 1 overdue invoice. Tip: pick **Kai Osei** in a new invoice to see the smart-suggestion banner in action.

## 🗂 Project structure```
Beast-Invoice/
├── index.html               # app logic + markup (styles/3D split out below)
├── css/tokens.css           # design tokens (color, type, motion, elevation)
├── css/theme.css            # dark glass theme + cinematic overlay styles
├── css/print.css            # ❄ frozen print sheet — do not restyle
├── js/motion/tween.js       # dependency-free tween engine (shared rAF loop)
├── js/main3d.js             # lazy 3D entry — exposes window.Beast3D
├── three/scene-manager.js   # ONE WebGL context, DPR-capped, pause-on-hidden
├── three/scenes/finale.js   # the envelope finale scene
├── vendor/                  # Three.js r180 (self-hosted: three.module.js + three.core.js)
├── assets/fonts/            # Space Grotesk + JetBrains Mono (self-hosted WOFF2)
├── BEAST_BUILD_PLAN.md      # real-build plan (Next.js + Turso + Vercel, $0 tier)
├── BEAST_3D_BLUEPRINT.md    # "Showroom OS" 3D redesign blueprint (production target)
├── CINEMATIC_REDESIGN_PLAN.md  # Phase 0 cinematic spec (superseded for architecture)
└── INVOICE_SYSTEM_PLAN.md   # full system design & build plan
```

## 🗺 Roadmap

- [ ] Real email delivery (Resend, PDF attachment, send log)
- [ ] Invoice status board with payments & overdue flags
- [ ] Barcode scanner input for part numbers
- [ ] Estimate → invoice conversion
- [ ] CSV export for accounting
- [ ] Multi-terminal sync (local-first, phase 2 of the plan)

See **[INVOICE_SYSTEM_PLAN.md](INVOICE_SYSTEM_PLAN.md)** for the full design: data model, calculation rules, UX principles for garage staff, 3-phase build plan, and edge cases.

---

🤖 Generated with Codebuff
