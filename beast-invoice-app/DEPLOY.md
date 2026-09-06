# Deploying Beast Invoice for a client

Zero-cost stack: **Vercel** (hosting) + **Turso** (libSQL database) + a passphrase gate.
Takes about 15 minutes the first time.

## 1. Create the database

```bash
# one-time: install the Turso CLI (https://docs.turso.tech/cli)
turso db create beast-invoice
turso db show beast-invoice --url          # -> TURSO_DATABASE_URL
turso db tokens create beast-invoice       # -> TURSO_AUTH_TOKEN
```

Apply the schema (idempotent, safe to re-run):

```bash
turso db shell beast-invoice < beast-invoice-app/db/schema.sql
```

## 2. Generate secrets

```bash
openssl rand -hex 32   # -> SESSION_SECRET
# pick a shop passphrase for APP_PASSPHRASE (this is the only login)
```

## 3. Deploy to Vercel

1. Push this repo to GitHub (already done if you are reading this from a fresh clone).
2. `vercel` → import the repo.
3. **Project Settings → General → Root Directory: `beast-invoice-app`** (the repo also
   contains the legacy mockup; the app lives in this subfolder).
4. Add environment variables (Production + Preview):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `APP_PASSPHRASE`
   - `SESSION_SECRET`
5. Deploy. Every push to `main` ships to production; PRs get preview URLs.

> No env vars set? The app deliberately falls back to **local mode** (data stays in the
> browser) so previews and demos still work. Real deployments must set all four.

## 4. First run (hand this to the client)

1. Open the site, enter the shop passphrase.
2. **Settings** → workshop name, slogan, phone, address, tax rate, labor rate, accent color.
3. **Catalog** → add your services (flat price or hours × labor rate) and parts.
   This is the price list the builder uses. Unlimited custom services are supported.
4. **Clients** → quick-add clients and vehicles.
5. **New Invoice** → pick a client, tap services, set part quantities, finish & send.

## 5. Tablet / counter setup

- Open the site in the tablet browser → "Add to Home Screen" (PWA manifest is included;
  the app runs fullscreen like a native app).
- Sign in once; the session cookie lasts 30 days on that device.

## 6. Printing / PDF

Invoice → **Print / PDF** → the browser dialog → "Save as PDF". The printed sheet is a
frozen light-paper design independent of the dark showroom theme.

## 7. Operations

- **Backups:** `turso db export beast-invoice > backup-$(date +%F).sql` monthly (or Litestream later).
- **Email:** stubbed (`lib/email` not yet wired); invoices are marked Sent locally for now.
- **Logs:** Vercel dashboard → Deployments → Functions for API logs.
- **Cost:** $0 (Vercel Hobby + Turso free plan are sized far above one shop's traffic).

## Local server-mode testing

You can run the full server stack locally against a file database:

```bash
cd beast-invoice-app
echo 'TURSO_DATABASE_URL=file:./local.db
APP_PASSPHRASE=dev
SESSION_SECRET=dev-secret-not-for-prod' > .env.local
npm run build && npm start
```

Delete `local.db` to start over. `.env*` and `local.db` are gitignored.
