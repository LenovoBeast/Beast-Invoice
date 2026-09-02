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

## 🚀 Run it

Open `index.html` in any modern browser, or use the live demo.

```bash
# optional: serve it locally (not required)
python3 -m http.server 8000
# → http://localhost:8000/index.html
```

> 🌐 **Live demo:** https://lenovobeast.github.io/Beast-Invoice/ (GitHub Pages)

**Demo data:** 3 clients, 3 vehicles, 8 services, 9 parts, 1 overdue invoice. Tip: pick **Kai Osei** in a new invoice to see the smart-suggestion banner in action.

## 🗂 Project structure

```
Beast-Invoice/
├── index.html                   # the entire app (HTML + CSS + JS, single file)
├── INVOICE_SYSTEM_PLAN.md       # full system design & build plan
└── README.md
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
