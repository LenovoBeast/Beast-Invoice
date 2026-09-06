-- Beast Invoice schema (libSQL / SQLite)
-- Apply once:  turso db shell <db-name> < db/schema.sql
-- (or for a local file DB:  sqlite3 local.db < db/schema.sql)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  tier TEXT DEFAULT 'Retail',
  notes TEXT DEFAULT '',
  last_visit TEXT
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  desc TEXT DEFAULT '',
  plate TEXT DEFAULT '',
  vin TEXT DEFAULT '',
  odometer INTEGER DEFAULT 0,
  engine TEXT DEFAULT '',
  color TEXT DEFAULT '',
  watch TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_vehicles_client ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  mode TEXT NOT NULL DEFAULT 'flat',
  price REAL,
  hours REAL,
  taxable INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  pn TEXT DEFAULT '',
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  fits TEXT DEFAULT '',
  taxable INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_parts_pn ON parts(pn);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  client_id TEXT NOT NULL REFERENCES clients(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  odometer_text TEXT DEFAULT '',
  tier TEXT DEFAULT '',
  created TEXT NOT NULL,
  due TEXT NOT NULL,
  discount_pct REAL DEFAULT 0,
  customer_note TEXT DEFAULT '',
  internal_note TEXT DEFAULT '',
  totals_json TEXT NOT NULL,
  payment_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  ref_id TEXT,
  name TEXT NOT NULL,
  pn TEXT,
  qty REAL NOT NULL,
  unit REAL NOT NULL,
  taxable INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_lines_invoice ON invoice_lines(invoice_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  action TEXT NOT NULL,
  detail TEXT
);
