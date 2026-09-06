export type Tier = 'High' | 'Mid' | 'Low'

export type ZoneKey = 'reception' | 'workbench' | 'archive' | 'bays' | 'catalog' | 'office'

export type ClientTier = 'Retail' | 'VIP' | 'Fleet'

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void'

export interface Settings {
  name: string
  slogan: string
  phone: string
  address: string
  taxRate: number
  laborRate: number
  footer: string
  accentHex: string
  nextNumber: number
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  address: string
  tier: ClientTier
  notes: string
  lastVisit: string
}

export interface Vehicle {
  id: string
  clientId: string
  desc: string
  plate: string
  vin: string
  odometer: number
  engine: string
  color: string
  watch: string
}

export interface Service {
  id: string
  name: string
  cat: string
  mode: 'flat' | 'hours'
  price?: number
  hours?: number
}

export interface Part {
  id: string
  pn: string
  name: string
  brand: string
  price: number
  stock: number
  fits: string[]
}

export interface InvoiceLine {
  type: 'labor' | 'part'
  refId?: string // catalog id (nullable for ad-hoc lines, BEAST_BUILD_PLAN schema)
  name: string
  pn?: string
  qty: number
  unit: number
  taxable: boolean
}

export interface Totals {
  labor: number
  parts: number
  discount: number
  subtotal: number
  tax: number
  total: number
}

export interface Invoice {
  id: string
  number: string
  status: InvoiceStatus
  clientId: string
  vehicleId?: string
  created: string
  due: string
  odometer?: string
  tier?: ClientTier
  lines: InvoiceLine[]
  discountPct: number
  customerNote: string
  internalNote: string
  totals: Totals
}

export interface Draft {
  clientId?: string
  vehicleId?: string
  lines: InvoiceLine[]
  discountPct: number
  customerNote: string
  internalNote: string
}
