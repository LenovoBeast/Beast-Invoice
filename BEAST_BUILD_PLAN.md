# Beast Invoice — Real Build Plan

**Companion to:** `INVOICE_SYSTEM_PLAN.md` (system design) and `index.html` (working mockup)
**Status:** Planning → ready to scaffold
**Last updated:** September 2026

---

## 1. Locked Decisions

| Decision | Choice | Why |
|---|---|---|
| Users | **Single user (owner)** | No role system; one passphrase gate instead of full auth |
| Budget | **$0 — free tiers only** | All services below have free tiers sized for one shop |
| Devices | **Counter PC + tablet/phone** | Responsive, touch-first UI; same app everywhere |
| Email | **Deferred** | Interface stubbed now; Resend wired in when an account exists |
| Data | **Real cloud DB from day one** | Phone + PC must see the same invoices — localStorage won't do |

---

## 2. Stack (researched, free-tier verified)

| Layer | Service | Free tier (what matters at this scale) |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Open source; one codebase for UI + API routes |
| Hosting | **Vercel Hobby** | Free, Git-push deploys, HTTPS, serverless functions incl. Hobby usage limits far above one shop's traffic |
| Database | **Turso (managed libSQL/SQLite)** | Free plan with generous rows/storage/reads for a few thousand records; SQL, edge-low latency |
| DB client | `@libsql/client` | Official driver, serverless-friendly |
| UI | Tailwind CSS + the mockup's design language | Same look as the approved mockup |
| PDF | Browser print-to-PDF now → `@react-pdf/renderer` or headless Chrome later | Same trick as the mockup, proven |
| Email | Resend (stub now, free tier later) | Free tier covers a shop's invoice volume when wired |

**Why Turso over Postgres:** SQLite-class ops for a single-user app — no connection pooling concerns, one tiny DB, cheapest/free-est path, and libSQL scales down to nothing. If multi-user ever happens, migration to Postgres is a known path but not planned.

---

## 3. Architecture

```
┌────────────────────────── Vercel (free) ──────────────────────────┐
│  Next.js App Router                                               │
│  ┌───────────────────────┐      ┌──────────────────────────────┐ │
│  │ UI (React, touch-first)│ ───► │ API route handlers (Node)    │ │
│  │ / /invoices /clients… │      │ /api/invoices /api/clients…  │ │
│  └───────────────────────┘      └──────────────┬───────────────┘ │
│        passphrase gate (signed cookie)         │                  │
└────────────────────────────────────────────────┼──────────────────┘
                                                 │ @libsql/client
                                        ┌────────▼─────────┐
                                        │ Turso (libSQL)   │
                                        │ clients, vehicles│
                                        │ services, parts  │
                                        │ invoices, audit  │
                                        └──────────────────┘
```

- **All writes go through API routes** — the Turso auth token never reaches the browser.
- **Totals engine lives in `lib/totals.ts`**, shared by API and UI (single source of truth), with unit tests.
- **Invoice immutability:** finalized invoices store a `totals_snapshot` and line snapshots; catalog price changes never mutate history.

---

## 4. Database Schema (SQLite / libSQL)

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,          -- 'shop_name', 'tax_rate', 'next_number', …
  value TEXT NOT NULL
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,           -- nanoid
  name TEXT NOT NULL,
  phone TEXT DEFAULT '', email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  tier TEXT DEFAULT 'Retail',    -- Retail | VIP | Fleet
  default_notes TEXT DEFAULT '',
  last_visit TEXT,               -- ISO date
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  make TEXT DEFAULT '', model TEXT DEFAULT '', year INTEGER,
  plate TEXT DEFAULT '', vin TEXT DEFAULT '',
  odometer INTEGER, engine TEXT DEFAULT '', color TEXT DEFAULT '',
  watch TEXT DEFAULT ''          -- service-watchlist note → suggestion banner
);
CREATE INDEX idx_vehicles_client ON vehicles(client_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  mode TEXT NOT NULL DEFAULT 'flat',  -- 'flat' | 'hours'
  price REAL, hours REAL,
  taxable INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,           -- retire, never delete
  sort INTEGER DEFAULT 0              -- powers "common jobs" chip order
);

CREATE TABLE parts (
  id TEXT PRIMARY KEY,
  pn TEXT DEFAULT '',            -- part number (scanner-ready)
  name TEXT NOT NULL, brand TEXT DEFAULT '',
  cost REAL DEFAULT 0, price REAL NOT NULL,
  stock INTEGER, fits TEXT DEFAULT '',  -- CSV of makes
  taxable INTEGER DEFAULT 1, active INTEGER DEFAULT 1
);
CREATE INDEX idx_parts_pn ON parts(pn);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,   -- INV-2026-0142
  status TEXT NOT NULL DEFAULT 'Draft',  -- Draft|Sent|Paid|Overdue|Void
  client_id TEXT NOT NULL REFERENCES clients(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  odometer_text TEXT DEFAULT '',
  created TEXT NOT NULL, due TEXT NOT NULL,
  discount_pct REAL DEFAULT 0,
  customer_note TEXT DEFAULT '', internal_note TEXT DEFAULT '',
  totals_json TEXT NOT NULL,     -- snapshot {labor,parts,discount,subtotal,tax,total}
  payment_json TEXT,             -- {method, reference, paid_at}
  email_json TEXT                -- future: {sent_at, to, provider_status}
);
CREATE INDEX idx_invoices_client ON invoices(client_id);

CREATE TABLE invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,            -- 'labor' | 'part'
  ref_id TEXT,                   -- catalog id (nullable for ad-hoc lines)
  name TEXT NOT NULL, pn TEXT,
  qty REAL NOT NULL, unit REAL NOT NULL, taxable INTEGER DEFAULT 1
);
CREATE INDEX idx_lines_invoice ON invoice_lines(invoice_id);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL,          -- 'invoice.finalize', 'settings.update', …
  detail TEXT
);
```

---

## 5. Project Structure

```
beast-invoice-app/
├── package.json
├── next.config.ts
├── .env.local                    # TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, APP_PASSPHRASE, SESSION_SECRET
├── drizzle/                      # (optional) migrations — or plain schema.sql applied once
├── src/
│   ├── app/
│   │   ├── layout.tsx            # shell: top bar, viewport meta, PWA manifest
│   │   ├── page.tsx              # dashboard
│   │   ├── invoice/new/page.tsx  # the 60-second builder
│   │   ├── invoices/page.tsx     # list + status filters
│   │   ├── invoices/[id]/page.tsx# detail, print, (send later)
│   │   ├── clients/page.tsx      # clients & vehicles
│   │   ├── catalog/page.tsx      # services + parts editor
│   │   ├── settings/page.tsx     # branding, tax, rates
│   │   └── api/
│   │       ├── auth/route.ts     # passphrase → signed cookie
│   │       ├── clients/route.ts  + [id]/route.ts
│   │       ├── vehicles/route.ts
│   │       ├── catalog/route.ts  # services+parts CRUD
│   │       ├── invoices/route.ts + [id]/route.ts + [id]/pay/route.ts
│   │       └── search/route.ts   # unified client/plate/VIN search
│   ├── lib/
│   │   ├── totals.ts             # the calculation engine (shared, unit-tested)
│   │   ├── db.ts                 # libSQL client singleton
│   │   ├── auth.ts               # cookie signing/verification
│   │   └── email.ts              # sendInvoiceEmail() stub → Resend later
│   └── components/               # ClientSearch, ServiceChips, PartPicker,
│                                 # TotalsPanel, InvoiceSheet, NoteChips…
└── tests/
    └── totals.test.ts            # discount/tax/rounding rules
```

---

## 6. Auth — Single User, Done Simply

- `APP_PASSPHRASE` in Vercel env vars; login screen posts to `/api/auth`.
- On success: HttpOnly signed cookie (`SESSION_SECRET` HMAC, 30-day expiry). Middleware guards every page + API route.
- No DB user table, no password reset flows, no roles. If a second staff user ever appears, upgrade path is a `users` table + sessions — noted, not built.
- Cookie applies to tablet and phone alike; "remember this device" = the cookie lifetime.

## 7. Multi-Device UX Plan (counter + tablet/phone)

| Concern | Approach |
|---|---|
| Layout | Mobile-first: single column, 44px+ targets, sticky totals bar; two-column + side summary at ≥920px (mockup's grid reused) |
| Touch | Bottom-anchored primary action on mobile ("Finish"), large chips/steppers — directly ported from mockup CSS |
| Shared state | Server is the source of truth; lists revalidate after mutations (SWR or React 19 `useActionState`) |
| Speed on bays' Wi-Fi | API routes are tiny JSON; pages cached; forms optimistic with rollback |
| Offline (phase 2) | Local-first queue in IndexedDB, sync on reconnect — only if actually needed |
| PWA | Manifest + install hint so the tablet opens it like an app, fullscreen |

## 8. PDF & Email

- **Now:** same as mockup — dedicated print stylesheet + `window.print()` from the invoice detail page → Save as PDF. Zero dependencies, pixel-perfect enough, works on tablet browsers too.
- **Later (optional polish):** server-rendered PDF via `@react-pdf/renderer` route → real attachment bytes.
- **Email stub:** `lib/email.ts` exports `sendInvoiceEmail(inv, pdf)` that logs "MOCK" and records `{mock:true}` into `invoices.email_json`. When Resend arrives: add `RESEND_API_KEY` + verified domain, implement the function, UI button flips from disabled to live. No other code changes — the interface is the contract.

## 9. Migration from Mockup → Real DB

One-time script (`scripts/import-mockup.ts`):
1. Export JSON from the browser mockup (localStorage → downloadable file; small "Export demo data" button added to mockup Settings, or just hand-copy the few real records).
2. Script maps JSON → `clients`, `vehicles`, `services`, `parts`, `invoices` inserts into Turso.
3. In practice: seed the catalog from the real price list (CSV import endpoint: `pn,name,brand,cost,price,stock`) and start fresh — historical paper invoices don't import.

## 10. Deployment Workflow

```
git push → GitHub → Vercel (auto-build + deploy preview per PR, prod on main)
```

1. `vercel` CLI link once; framework auto-detected (Next.js).
2. Env vars set in Vercel dashboard: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSPHRASE`, `SESSION_SECRET`.
3. Turso DB created via CLI (`turso db create beast-invoice`) — free plan.
4. Custom domain later is a DNS record + Vercel toggle (free).

## 11. Build Phases

**Phase A — Skeleton (1–2 sessions)**
- Scaffold Next.js + TS + Tailwind; Turso schema applied; auth gate working
- Clients/vehicles CRUD + unified search API
- Settings page (branding/tax/rate) backed by `settings` table

**Phase B — The 60-second invoice (the core)**
- Builder page: client search → vehicle pick → service chips → parts picker
- `lib/totals.ts` + unit tests (discount tiers, per-line tax, rounding)
- Finalize: number sequence, snapshot, invoice detail + print sheet
- Dashboard: stats + recent invoices; invoices list with status chips

**Phase C — Polish & devices**
- Tablet/phone pass: sticky totals, bottom action bar, PWA manifest
- Catalog editor (retire/restore, CSV import), notes quick-chips
- Audit log entries; payment recording; overdue flagging (computed, no cron)

**Phase D — Email & beyond (when ready)**
- Resend integration behind the existing stub
- PDF attachment route, send log, re-send button
- Optional: `@react-pdf/renderer`, estimates→invoices, accounting CSV export

## 12. Verification Plan

- `npm test` — totals engine edge cases (taxable mixes, tier discount, rounding, qty 0.5h labor)
- Typecheck + build gate on every push (Vercel does this too)
- Manual checklist per release: new walk-in client invoice ≤ 3 min on phone; repeat-client invoice ≤ 60 s; print sheet matches on-screen totals; invoice survives catalog price change
- Backup: `turso db export` monthly (or Litestream later) — cheap insurance

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier limit surprises (Turso/Vercel) | One shop's traffic is orders of magnitude below limits; usage dashboard checked monthly |
| Phone keyboard pain | All inputs maximize pick-over-type (chips/autocomplete), `inputmode` attributes on numeric fields |
| Data loss | Server DB from day one (no localStorage), monthly export |
| Scope creep | Phases A–C are the product; everything else lives in the roadmap |
| Losing the mockup's feel | Port the exact CSS design tokens; builder interaction parity is an acceptance criterion |

---

## 14. Cost Summary

| Item | Monthly |
|---|---|
| Vercel Hobby | $0 |
| Turso free plan | $0 |
| Resend (later, free tier) | $0 |
| Domain (optional) | ~$1 (yearly/12) |
| **Total** | **$0** |
