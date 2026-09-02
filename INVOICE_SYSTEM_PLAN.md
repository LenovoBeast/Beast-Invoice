# High Performance Garage Workshop — Invoice Generator System Plan

**Version:** 1.0 (Planning)
**Goal:** A garage-staff-friendly invoice generator where a complete, professional invoice takes **under 60 seconds** and fewer than 20 interactions — built for greasy hands, a counter tablet, and zero typing wherever possible.

---

## 1. Design Principles

| Principle | What it means in practice |
|---|---|
| **Type nothing if you can pick it** | Every field is a dropdown, autocomplete, checkbox, or stepper first; free text is the fallback, not the default. |
| **The database remembers** | Client, vehicle, and last-used settings auto-fill from history. Repeat customers = 3 clicks. |
| **Math is never manual** | Labor, parts, discounts, tax, and totals are computed live and cannot be overridden silently (override requires a reason note). |
| **Speed at the counter** | Big touch targets, keyboard-first flow for desktop, one-screen invoice builder, everything saved as draft automatically. |
| **Look professional by default** | Branded template applied automatically; staff never touch layout. |

---

## 2. System Overview

### 2.1 Suggested stack (lightweight, small-shop friendly)

- **App:** Web app (Next.js/React or similar) — runs on the shop desktop, counter tablet, and phone browser. One codebase, no install.
- **Database:** SQLite/Postgres — single-file simplicity locally, or hosted Postgres if multi-terminal.
- **PDF:** Headless Chrome print-to-PDF from the branded HTML template (pixel-perfect, no extra layout engine).
- **Email:** [Resend](https://resend.com) — simple SDK, PDF attachments supported, generous free tier for a small shop's volume. Server-side API key (`RESEND_API_KEY`); sender on the workshop's verified domain (e.g., `invoices@workshopdomain.com`).
- **Optional later:** Barcode/QR scanner for part numbers, SMS via provider, accounting export (CSV → QuickBooks/Xero).

### 2.2 Core modules

```
┌─────────────────────────────────────────────────────────┐
│                  INVOICE BUILDER (one screen)            │
│  Client → Vehicle → Services → Parts → Notes → Review   │
└──────┬───────────┬──────────────┬───────────────┬───────┘
       │           │              │               │
┌──────▼─────┐ ┌───▼────┐  ┌──────▼──────┐  ┌─────▼─────┐
│  Clients & │ │Service │  │ Calculation │  │ Template  │
│  Vehicles  │ │& Parts │  │   Engine    │  │  & Brand  │
│  Database  │ │Catalog │  │ (live math) │  │  Engine   │
└────────────┘ └────────┘  └─────────────┘  └─────┬─────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │  PDF Generator + Email Out  │
                                    └─────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Clients
- `id`, `name`, `phone`, `email`, `billing_address`
- `tax_id` (if business client), `price_tier` (Retail / Fleet / VIP / Wholesale)
- `default_notes` (e.g., "Fleet account — PO number required")
- `created_at`, `last_visit`

### 3.2 Vehicles
- `id`, `client_id`, `make`, `model`, `year`, `plate_vin`, `odometer`
- `engine_transmission`, `color`
- `known_issues` / `watchlist` (e.g., "Rear brake pads at 4mm on 2026-05-10") — surfaces as a suggestion when the vehicle is selected
- `service_history` → derived from past invoices

### 3.3 Service Catalog (labor)
- `id`, `name` ("Oil change — synthetic"), `default_hours` or flat `price`
- `hourly_rate` override per service (or shop default), `taxable` (labor tax rules vary by region)
- `category` (Maintenance / Performance / Diagnostics / Tires / Exhaust / Tuning…)
- `active` flag (retired items stay on old invoices)

### 3.4 Parts Catalog
- `id`, `part_number`, `name`, `brand`, `supplier`
- `cost`, `retail_price` (auto margin option), `stock_qty` (optional)
- `fits` (optional make/model list — powers "parts that fit this vehicle" filtering)
- `taxable` (parts usually always taxed), `active`

### 3.5 Invoices
- `id`, `number` (auto: `INV-2026-0142`), `status` (Draft / Sent / Paid / Overdue / Void)
- `client_id`, `vehicle_id`, `odometer_at_service`
- Line items: `{type: labor|part, ref_id, description, qty, unit_price, discount, tax_rate}`
- `global_discount`, `tax_rate` (with component breakdown), `totals_snapshot`
- `notes_internal` (staff only), `notes_customer` (prints on invoice)
- `tech_name`, `bay`, `promised_date` (optional job-shop fields)
- `payment` info (method, reference), `pdf_path`, `email_log`

### 3.6 Settings
- Shop identity: name, logo, address, phone, email, tax IDs, payment instructions, terms
- Tax rules: rate(s), labor-taxable toggle, component display (state/province + local)
- Numbering scheme, default price tier, default labor rate
- Email: template text, subject line, CC bookkeeper, sender identity

---

## 4. Primary Workflow — "The 60-Second Invoice"

### Step 0 — Start (1 click)
Dashboard has one hero button: **"+ New Invoice"**. Keyboard shortcut `N`.

### Step 1 — Identify the customer (2–5 clicks)
- **Search box accepts anything:** name, phone, plate, or VIN — one field, fuzzy autocomplete with grouped results:

  ```
  🔍 jordan                [or type plate: ABC-1234]
  ─────────────────────────────────────────
  👤 Jordan Blake — (555) 014-2282        ← 4 previous visits
     🚗 2019 BMW M340i — plate ABC-1234
  👤 Jordan's Plumbing (Fleet) — 3 vehicles
  ```

- Selecting a client **auto-fills** contact info and shows their vehicles; selecting a vehicle auto-fills make/model/year/plate/odometer hint.
- **New customer path:** one compact form (name, phone, email, plate). Phone-first design: typing the phone number can pre-match existing records. After the invoice, the system offers "Save details" automatically — no separate CRM trip.
- ⭐ **Upsell/memory surfacing:** when a vehicle is chosen, a small banner shows watchlist items and due services: *"Last oil change 9,200 km ago — suggest oil service?"* One click adds it as a line item.

### Step 2 — Add services (checkbox-fast)
- **"Common Jobs" quick panel:** the 8–10 most-used services (oil change, brake pads+rotors, alignment, diag fee, tire mount/balance, state inspection) as **toggle chips with price shown**. Tap to add. This covers ~80% of invoices with zero typing.
- **Category browse:** accordion of catalog categories → checkbox list → click to add line.
- **Autocomplete search:** typing "brak" suggests "Brake pads — front (0.8h)", "Brake fluid flush"… Enter adds the highlighted item.
- Each added line shows editable **hours × rate** steppers (+/- buttons and arrow keys). Changing hours recalculates instantly.

### Step 3 — Add parts (tap-to-add, quantity steppers)
- **"Fits this vehicle" filter** (when parts have fitment data) — defaults to filtered view.
- Search by **name or part number** (scanner-ready: scanning a barcode fills the field). Enter/click adds line at retail price.
- Quantity steppers with live per-line total; stock warning if qty exceeds on-hand.
- **Common bundles:** "Brake job kit" = pads + rotors + fluid, one tap, expandable if they want to remove a component.

### Step 4 — Review & totals (glance, not work)
Live summary panel (always visible on desktop; sticky bar on tablet):

```
Labor ....... $420.00   (3.5h × $120)
Parts ....... $186.42   (5 items)
Subtotal .... $606.42
Discount .... −$30.00   [Fleet 5% ▾]  ← tier discounts auto-suggested
Tax .........  $51.05   (8.4% — parts+labor per settings)
─────────────────────────
TOTAL ....... $627.47
```

- Tax and totals recompute on every keystroke. No "calculate" button exists.
- Discount reasons are required for manual (non-tier) discounts → stored on the invoice.
- **Notes:** two clearly separated fields — **Customer notes** (prints, e.g., "Re-check in 1,500 km") and **Internal notes** (never prints, e.g., "Customer sensitive about wheel scratches"). Quick-insert chips for common notes.

### Step 5 — Finish (1–2 clicks)
One **"Finish"** button offers three parallel actions (all remembered as defaults):
- ☑ **Download PDF** — branded template renders instantly; filename `INV-2026-0142_Blake_BMW.pdf`
- ☑ **Email to client** — pre-filled subject/body with the PDF attached; "Send" or "Send + mark as Sent"
- ☐ **Print** — counter copy / work order copy

After finishing: one-click **"New invoice for this client"** (repeat work) or **"New invoice for this vehicle"** (follow-up) — history pre-loaded.

---

## 5. Key Functionalities (detailed)

### 5.1 Auto-fill engine
- Unified client/vehicle/plate/VIN search as described; results ranked by recency + visit count.
- Selecting a vehicle pre-loads: last odometer, last services, known issues, preferred tier, last invoice's labor rate.
- **Duplicate detection** on new-client entry (name/phone/plate match) to avoid database drift.

### 5.2 Catalog management (kept effortless)
- **"Create from invoice" learning:** when staff types a part/service that doesn't exist, the system offers "Save to catalog" — the catalog grows organically from real work.
- Bulk CSV import for initial parts list; supplier price-list import updates costs and can auto-adjust retail by margin rule.
- Retire (not delete) items so historical invoices always render correctly.

### 5.3 Calculation engine (single source of truth)
- Rules: `line_total = qty × unit_price − line_discount`; global discount applied per configured order; tax applied per line `taxable` flag; rounding at line level (configurable).
- Supports: per-tier pricing (Retail/Fleet/VIP multipliers), hourly vs. flat-rate labor, tax-inclusive display toggle for regions that quote tax-in.
- Locked snapshot stored on finalization; later catalog price changes never mutate old invoices.

### 5.4 Templates & branding
- **Template designer (admin-only):** logo upload, color accent (from logo automatically), font choice, paper size (A4/Letter), required fields toggle, footer terms, payment/QR details.
- 2–3 built-in layouts: *Standard*, *Compact counter copy*, *Detailed job card* (with tech/bay hours).
- Live preview pane with real invoice data; template versioned — re-prints of old invoices use their original layout.
- Invoice numbers and tax IDs rendered per settings; optional bilingual footer.

### 5.5 PDF & email delivery
- **PDF:** rendered server-side from the final HTML template → consistent output on every device; stored per invoice for re-download.
- **Email (Resend):**
  - Server-side client with `RESEND_API_KEY` (never in browser code).
  - Attachment: invoice PDF; subject: `Invoice INV-2026-0142 — Blake Motors` (customizable).
  - Body template with variables: client first name, vehicle, total, due date, shop signature, payment link (optional, e.g., Stripe later).
  - **Send log** on each invoice: sent-at, to-address, provider status → "Resend" button with the same thread subject for clean follow-ups.
  - CC bookkeeper option; failure fallback shows the PDF download if email can't send.

### 5.6 Status & follow-through
- Status board: Draft / Sent / Paid / Overdue with aging; overdue auto-flags after N days.
- Record payment with method + reference; paid invoices get a "PAID" stamp variant on the PDF.
- Export: CSV of all invoices (date-range) for accounting; per-client statements ("all invoices, total outstanding").

---

## 6. UX Considerations for Garage Staff

| Context | Design response |
|---|---|
| Standing at a counter, often one-handed | 44px+ touch targets, top-anchored primary actions, no hover-only affordances |
| Greasy gloves / dirty screens | High-contrast theme, large type option, screen wipe-friendly big buttons; optional **"Glove Mode"** (larger hit areas, less precision needed) |
| Interruptions constant | **Autosave drafts every change**; reopening resumes exactly; nothing lost on browser crash |
| Speed matters more than beauty | Keyboard flow: `N` new → type client → `Enter` → common-jobs chips → `Enter` on search → `F` finish. Power users never touch the mouse |
| Mistakes happen | Line items removable with one tap + undo toast; "void & reissue" flow preserves audit trail; edit allowed only while Draft |
| Trust & transparency | Totals always visible; print shows per-line detail; staff can't silently change tax rates (settings are admin-gated and logged) |
| Low tech comfort | Every screen does exactly one job; consistent "+ Add" pattern; a 1-page laminated cheat sheet of keyboard shortcuts |
| Offline/weak Wi-Fi in the workshop bays | Local-first storage with sync when reconnected (phase 2) — invoicing at the car shouldn't die with the router |

**Accessibility & clarity:** color is never the only signal (paid = stamp + green + text), all icons have labels, and error messages say the fix ("Add a client name to finish the invoice").

---

## 7. Screen Inventory

1. **Dashboard** — New Invoice (hero), Drafts, Overdue, today's takings, quick search.
2. **Invoice Builder** — the single workflow screen (Steps 1–5 above).
3. **Clients & Vehicles** — searchable list, detail view with history timeline, merge-duplicates tool.
4. **Catalog** — services & parts tabs, inline edit, import/export, bundles editor.
5. **Invoices List** — filters (status/date/client), bulk PDF export, status chips.
6. **Invoice Detail** — full preview, re-send email, record payment, print copies.
7. **Settings (admin)** — branding/template designer, tax rules, numbering, email identity, users/roles.

Roles: **Admin** (settings, catalog pricing, void), **Staff** (create/send/record payment), optional **Mechanic** (view assigned jobs, add internal notes).

---

## 8. Build Plan (phased)

**Phase 1 — MVP (weeks 1–3): "Invoices out the door"**
- Client/vehicle DB + unified search & autofill
- Service/parts catalog with CSV import
- Invoice builder with common-jobs chips, live totals, tax, discounts
- One branded template + PDF download + print

**Phase 2 — Speed & polish (weeks 4–5)**
- Email sending via Resend (attachments, templates, send log, Resend button)
- Statuses & payments; overdue flags; CSV accounting export
- Keyboard shortcuts, autosave drafts, "new invoice for this client/vehicle"
- Tier pricing, bundles, notes quick-chips

**Phase 3 — Grow (later)**
- Fitment filtering, barcode scanner input, stock levels
- Template designer UI, multiple layouts, bilingual invoices
- Online payment links, client-facing invoice portal, SMS delivery
- Multi-terminal with sync, role management, audit log

---

## 9. Edge Cases & Rules to Nail

- Walk-in with no history → fast new-client form; offer save at finish.
- Old vehicle with no plate → plate optional; VIN or nickname ("Dad's truck") allowed.
- Warranty/recall work → $0.00 line with reason code, excluded from revenue reports.
- Mixed taxable/non-taxable lines → per-line tax flags, not invoice-wide assumption.
- Estimate → invoice conversion (clone estimate lines into a new invoice).
- Refunds/credits → negative line items with reason, admin-gated.
- Client disputes a price → immutable snapshot + audit log of who changed what and when.
- Email bounces → status shown on invoice; fallback always: download PDF.

---

## 10. Success Metrics

- ⏱ **Median time to finish an invoice** — target < 60s for repeat clients, < 3 min for new walk-ins
- 🔁 % of invoices created without any free-typed line item — target > 70% after 2 weeks
- 📧 % of invoices delivered by email — target > 60%
- 💰 Overdue receivables aging — trending down after Phase 2
- 😀 Staff adoption — invoices/day created in-system vs. old method (paper/Word) within week 1
