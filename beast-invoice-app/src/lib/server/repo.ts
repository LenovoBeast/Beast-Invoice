import type { Client, Invoice, InvoiceLine, Part, Service, Settings, Vehicle } from '../types'
import { calcTotals, round2 } from '../totals'
import { db } from './db'

/* Server-authoritative data access (BEAST_BUILD_PLAN §3): the browser never
   talks to Turso; totals are recomputed here from the posted lines so the
   client can never write a wrong money snapshot. */

type Row = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : v == null ? fallback : String(v))
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const bool1 = (v: unknown): number => (v ? 1 : 0)

const DEFAULT_SETTINGS: Settings = {
  name: 'High Performance Garage',
  slogan: 'Precision. Power. Passion.',
  phone: '',
  address: '',
  taxRate: 8.4,
  laborRate: 120,
  footer: 'Payment due within 14 days.',
  accentHex: '#ff2d3f',
  nextNumber: 1, // first issued invoice is INV-<year>-0001
}

async function audit(action: string, detail: string): Promise<void> {
  await db().execute({
    sql: 'INSERT INTO audit_log (id, action, detail) VALUES (?, ?, ?)',
    args: [crypto.randomUUID(), action, detail],
  })
}

async function ensureDefaults(): Promise<void> {
  const res = await db().execute("SELECT key FROM settings WHERE key = 'name'")
  if (res.rows.length > 0) return
  const pairs: Array<[string, string]> = [
    ['name', DEFAULT_SETTINGS.name],
    ['slogan', DEFAULT_SETTINGS.slogan],
    ['phone', DEFAULT_SETTINGS.phone],
    ['address', DEFAULT_SETTINGS.address],
    ['tax_rate', String(DEFAULT_SETTINGS.taxRate)],
    ['labor_rate', String(DEFAULT_SETTINGS.laborRate)],
    ['footer', DEFAULT_SETTINGS.footer],
    ['accent_hex', DEFAULT_SETTINGS.accentHex],
    ['next_number', String(DEFAULT_SETTINGS.nextNumber)],
  ]
  await db().batch(pairs.map(([key, value]) => ({
    sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    args: [key, value],
  })), 'write')
}

function mapSettings(rows: Row[]): Settings {
  const kv = new Map(rows.map((r) => [str(r.key), str(r.value)]))
  return {
    name: kv.get('name') ?? DEFAULT_SETTINGS.name,
    slogan: kv.get('slogan') ?? DEFAULT_SETTINGS.slogan,
    phone: kv.get('phone') ?? '',
    address: kv.get('address') ?? '',
    taxRate: num(parseFloat(kv.get('tax_rate') ?? ''), DEFAULT_SETTINGS.taxRate),
    laborRate: num(parseFloat(kv.get('labor_rate') ?? ''), DEFAULT_SETTINGS.laborRate),
    footer: kv.get('footer') ?? '',
    accentHex: kv.get('accent_hex') ?? DEFAULT_SETTINGS.accentHex,
    nextNumber: num(parseInt(kv.get('next_number') ?? '1', 10), 1),
  }
}

function mapClient(r: Row): Client {
  return {
    id: str(r.id), name: str(r.name), phone: str(r.phone), email: str(r.email),
    address: str(r.address), tier: (str(r.tier, 'Retail') as Client['tier']), notes: str(r.notes),
    lastVisit: str(r.last_visit),
  }
}

function mapVehicle(r: Row): Vehicle {
  return {
    id: str(r.id), clientId: str(r.client_id), desc: str(r.desc), plate: str(r.plate),
    vin: str(r.vin), odometer: num(r.odometer), engine: str(r.engine), color: str(r.color),
    watch: str(r.watch),
  }
}

function mapService(r: Row): Service {
  return {
    id: str(r.id), name: str(r.name), cat: str(r.category, 'General'),
    mode: str(r.mode, 'flat') === 'hours' ? 'hours' : 'flat',
    price: r.price == null ? undefined : num(r.price),
    hours: r.hours == null ? undefined : num(r.hours),
  }
}

function mapPart(r: Row): Part {
  return {
    id: str(r.id), pn: str(r.pn), name: str(r.name), brand: str(r.brand),
    price: num(r.price), stock: num(r.stock),
    fits: str(r.fits) ? str(r.fits).split(',') : [],
  }
}

function mapInvoice(r: Row, lines: InvoiceLine[]): Invoice {
  return {
    id: str(r.id), number: str(r.number), status: str(r.status) as Invoice['status'],
    clientId: str(r.client_id), vehicleId: str(r.vehicle_id) || undefined,
    created: str(r.created), due: str(r.due), odometer: str(r.odometer_text) || undefined,
    tier: (str(r.tier) || undefined) as Invoice['tier'],
    lines, discountPct: num(r.discount_pct),
    customerNote: str(r.customer_note), internalNote: str(r.internal_note),
    totals: JSON.parse(str(r.totals_json, '{}')) as Invoice['totals'],
  }
}

export async function getSnapshot(): Promise<{
  settings: Settings; clients: Client[]; vehicles: Vehicle[]
  services: Service[]; parts: Part[]; invoices: Invoice[]
}> {
  await ensureDefaults()
  const [s, c, v, sv, p, i] = await Promise.all([
    db().execute('SELECT key, value FROM settings'),
    db().execute('SELECT * FROM clients ORDER BY name'),
    db().execute('SELECT * FROM vehicles'),
    db().execute('SELECT * FROM services WHERE active = 1 ORDER BY sort, name'),
    db().execute('SELECT * FROM parts WHERE active = 1 ORDER BY name'),
    db().execute('SELECT * FROM invoices ORDER BY number DESC'),
    ])
  const linesRes = await db().execute('SELECT * FROM invoice_lines ORDER BY seq')
  const linesByInvoice = new Map<string, InvoiceLine[]>()
  for (const r of linesRes.rows) {
    const invId = str(r.invoice_id)
    const list = linesByInvoice.get(invId) ?? []
    list.push({
      type: str(r.type) === 'part' ? 'part' : 'labor',
      refId: str(r.ref_id) || undefined, name: str(r.name), pn: str(r.pn) || undefined,
      qty: num(r.qty), unit: num(r.unit), taxable: !!r.taxable,
    })
    linesByInvoice.set(invId, list)
  }
  return {
    settings: mapSettings(s.rows),
    clients: c.rows.map(mapClient),
    vehicles: v.rows.map(mapVehicle),
    services: sv.rows.map(mapService),
    parts: p.rows.map(mapPart),
    invoices: i.rows.map((r) => mapInvoice(r, linesByInvoice.get(str(r.id)) ?? [])),
  }
}

const SETTINGS_COLUMNS: Record<string, string> = {
  name: 'name', slogan: 'slogan', phone: 'phone', address: 'address',
  taxRate: 'tax_rate', laborRate: 'labor_rate', footer: 'footer', accentHex: 'accent_hex',
}

export async function updateSettings(patch: Record<string, unknown>): Promise<Settings> {
  const statements = []
  for (const [appKey, column] of Object.entries(SETTINGS_COLUMNS)) {
    if (appKey in patch && patch[appKey] !== undefined) {
      statements.push({
        sql: `INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [column, String(patch[appKey])],
      })
    }
  }
  if (statements.length > 0) {
    await db().batch(statements, 'write')
    await audit('settings.update', Object.keys(patch).join(','))
  }
  const res = await db().execute('SELECT key, value FROM settings')
  return mapSettings(res.rows)
}

export interface NewClientInput {
  name: string; phone?: string; email?: string; address?: string; tier?: string
  vehicleDesc?: string; plate?: string
}

export async function createClient(input: NewClientInput): Promise<{ client: Client; vehicle?: Vehicle }> {
  const clientId = crypto.randomUUID()
  const today = new Date().toISOString().slice(0, 10)
  await db().execute({
    sql: `INSERT INTO clients (id, name, phone, email, address, tier, notes, last_visit)
          VALUES (?, ?, ?, ?, ?, ?, '', ?)`,
    args: [clientId, input.name, input.phone ?? '', input.email ?? '', input.address ?? '',
      input.tier ?? 'Retail', today],
  })
  let vehicle: Vehicle | undefined
  if (input.vehicleDesc) {
    vehicle = {
      id: crypto.randomUUID(), clientId, desc: input.vehicleDesc, plate: input.plate ?? '',
      vin: '', odometer: 0, engine: '', color: '', watch: '',
    }
    await db().execute({
      sql: `INSERT INTO vehicles (id, client_id, "desc", plate) VALUES (?, ?, ?, ?)`,
      args: [vehicle.id, vehicle.clientId, vehicle.desc, vehicle.plate],
    })
  }
  await audit('client.create', input.name)
  return {
    client: {
      id: clientId, name: input.name, phone: input.phone ?? '', email: input.email ?? '',
      address: input.address ?? '', tier: (input.tier ?? 'Retail') as Client['tier'],
      notes: '', lastVisit: today,
    },
    vehicle,
  }
}

export async function createService(input: Partial<Service> & { name: string }): Promise<Service> {
  const id = crypto.randomUUID()
  await db().execute({
    sql: `INSERT INTO services (id, name, category, mode, price, hours) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, input.name, input.cat ?? 'General', input.mode === 'hours' ? 'hours' : 'flat',
      input.price ?? null, input.hours ?? null],
  })
  return { id, name: input.name, cat: input.cat ?? 'General', mode: input.mode === 'hours' ? 'hours' : 'flat',
    price: input.price, hours: input.hours }
}

export async function createPart(input: { name: string; pn?: string; brand?: string; price?: number; stock?: number }): Promise<Part> {
  const id = crypto.randomUUID()
  await db().execute({
    sql: `INSERT INTO parts (id, pn, name, brand, price, stock, fits) VALUES (?, ?, ?, ?, ?, ?, '')`,
    args: [id, input.pn ?? '', input.name, input.brand ?? '', input.price ?? 0, input.stock ?? 0],
  })
  return { id, pn: input.pn ?? '', name: input.name, brand: input.brand ?? '',
    price: input.price ?? 0, stock: input.stock ?? 0, fits: [] }
}

export interface NewInvoiceInput {
  status: 'Draft' | 'Sent'
  clientId: string
  vehicleId?: string
  tier?: string
  lines: InvoiceLine[]
  discountPct: number
  customerNote?: string
  internalNote?: string
}

export async function createInvoice(input: NewInvoiceInput): Promise<Invoice> {
  if (!input.clientId) throw new Error('clientId is required')
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new Error('At least one line is required')
  const settingsRes = await db().execute("SELECT value FROM settings WHERE key = 'tax_rate'")
  const taxRate = num(parseFloat(str(settingsRes.rows[0]?.value, '8.4')), 8.4)
  const totals = calcTotals(input.lines, input.discountPct, taxRate)

  // Atomic number assignment: RETURNING yields the incremented value; the
  // assigned invoice number is the pre-increment value.
  const inc = await db().execute(
    `UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)
     WHERE key = 'next_number' RETURNING value`,
  )
  const assigned = num(parseInt(str(inc.rows[0]?.value, '1'), 10), 1) - 1
  const number = `INV-${new Date().getFullYear()}-${String(assigned).padStart(4, '0')}`

  const id = crypto.randomUUID()
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)
  const due = dueDate.toISOString().slice(0, 10)

  await db().batch([
    {
      sql: `INSERT INTO invoices (id, number, status, client_id, vehicle_id, tier, created, due,
              discount_pct, customer_note, internal_note, totals_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, number, input.status, input.clientId, input.vehicleId ?? null, input.tier ?? '',
        today, due, input.discountPct ?? 0, input.customerNote ?? '', input.internalNote ?? '',
        JSON.stringify(totals)],
    },
    ...input.lines.map((l, seq) => ({
      sql: `INSERT INTO invoice_lines (id, invoice_id, seq, type, ref_id, name, pn, qty, unit, taxable)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), id, seq, l.type, l.refId ?? null, l.name, l.pn ?? null,
        round2(l.qty), round2(l.unit), bool1(l.taxable)],
    })),
    {
      sql: 'INSERT INTO audit_log (id, action, detail) VALUES (?, ?, ?)',
      args: [crypto.randomUUID(), 'invoice.create', `${number} ${input.status}`],
    },
  ], 'write')

  return {
    id, number, status: input.status, clientId: input.clientId, vehicleId: input.vehicleId,
    created: today, due, tier: (input.tier || undefined) as Invoice['tier'],
    lines: input.lines, discountPct: input.discountPct ?? 0,
    customerNote: input.customerNote ?? '', internalNote: input.internalNote ?? '',
    totals,
  }
}

export async function markInvoicePaid(id: string): Promise<Invoice | null> {
  const now = new Date().toISOString()
  await db().batch([
    {
      sql: `UPDATE invoices SET status = 'Paid',
              payment_json = json_object('method', 'manual', 'paid_at', ?)
            WHERE id = ?`,
      args: [now, id],
    },
    { sql: 'INSERT INTO audit_log (id, action, detail) VALUES (?, ?, ?)', args: [crypto.randomUUID(), 'invoice.pay', id] },
  ], 'write')
  const invRes = await db().execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [id] })
  if (invRes.rows.length === 0) return null
  const linesRes = await db().execute({ sql: 'SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY seq', args: [id] })
  return mapInvoice(invRes.rows[0], linesRes.rows.map((r) => ({
    type: str(r.type) === 'part' ? 'part' : 'labor',
    refId: str(r.ref_id) || undefined, name: str(r.name), pn: str(r.pn) || undefined,
    qty: num(r.qty), unit: num(r.unit), taxable: !!r.taxable,
  })))
}
