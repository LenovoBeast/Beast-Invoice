import type { Client, Invoice, Part, Service, Settings, Vehicle } from './types'

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function uid(): string {
  return 'id-' + Math.random().toString(36).slice(2, 10)
}

/** Ported verbatim from the mockup's seedData(); demo strings normalized (hyphens, tidy pn). */
export function seedData(): {
  settings: Settings
  clients: Client[]
  vehicles: Vehicle[]
  services: Service[]
  parts: Part[]
  invoices: Invoice[]
} {
  const settings: Settings = {
    name: 'High Performance Garage',
    slogan: 'Precision. Power. Passion.',
    phone: '(555) 700-4200',
    address: '14 Torque Avenue, Springfield',
    taxRate: 8.4,
    laborRate: 120,
    footer: 'Payment due within 14 days. Bank: HPG-001-2233445, parts warranty 12 months / 20,000 km.',
    accentHex: '#ff2d3f',
    nextNumber: 142,
  }
  const clients: Client[] = [
    { id: 'c1', name: 'Jordan Blake', phone: '(555) 014-2282', email: 'jordan.blake@example.com',
      address: '88 Maple Street, Springfield', tier: 'Retail', notes: '', lastVisit: addDays(-12) },
    { id: 'c2', name: 'Kai Osei', phone: '(555) 233-8871', email: 'kai.osei@example.com',
      address: '5 Harbour Road, Bayview', tier: 'VIP', notes: 'Prefers call before any extra work.', lastVisit: addDays(-3) },
    { id: 'c3', name: 'Delta Logistics (Fleet)', phone: '(555) 441-9002', email: 'fleet@deltalog.example.com',
      address: '2 Depot Way, Springfield', tier: 'Fleet', notes: 'PO number required on all invoices.', lastVisit: addDays(-6) },
  ]
  const vehicles: Vehicle[] = [
    { id: 'v1', clientId: 'c1', desc: '2019 BMW M340i', plate: 'ABC-1234', vin: 'WBA5R1C55KED12345', odometer: 61200,
      engine: 'B58 3.0L turbo', color: 'Portimao Blue', watch: 'Rear pads were at 4mm on last visit.' },
    { id: 'v2', clientId: 'c2', desc: '2021 Toyota GR Supra', plate: 'SPRT-77', vin: 'JTCDB22W1M0098765', odometer: 28450,
      engine: 'B58 3.0L turbo', color: 'Renaissance Red', watch: '' },
    { id: 'v3', clientId: 'c3', desc: '2022 Ford Transit 350', plate: 'DLG-882', vin: '1FTBR1C86NK004411', odometer: 88300,
      engine: '3.5L EcoBoost', color: 'Frozen White', watch: 'Due for scheduled fleet service (every 15,000 km).' },
  ]
  const services: Service[] = [
    { id: 's1', name: 'Oil change - synthetic', cat: 'Maintenance', mode: 'flat', price: 129 },
    { id: 's2', name: 'Brake pads + rotors - front', cat: 'Brakes', mode: 'hours', hours: 1.8 },
    { id: 's3', name: 'Brake pads + rotors - rear', cat: 'Brakes', mode: 'hours', hours: 1.8 },
    { id: 's4', name: 'Wheel alignment', cat: 'Maintenance', mode: 'flat', price: 110 },
    { id: 's5', name: 'Diagnostics (computer)', cat: 'Diagnostics', mode: 'hours', hours: 0.5 },
    { id: 's6', name: 'Tire mount & balance (per tire)', cat: 'Tires', mode: 'flat', price: 35 },
    { id: 's7', name: 'AC service / regas', cat: 'Maintenance', mode: 'flat', price: 149 },
    { id: 's8', name: 'Performance ECU tune', cat: 'Performance', mode: 'flat', price: 690 },
  ]
  const parts: Part[] = [
    { id: 'p1', pn: 'BP-FRONT-M340', name: 'Front brake pads (OEM)', brand: 'Textar', price: 104, stock: 6, fits: ['BMW', 'Toyota'] },
    { id: 'p2', pn: 'RO-FRONT-M340', name: 'Front rotors pair', brand: 'Brembo', price: 210, stock: 4, fits: ['BMW', 'Toyota'] },
    { id: 'p3', pn: 'BP-REAR-M340', name: 'Rear brake pads (OEM)', brand: 'Textar', price: 88, stock: 5, fits: ['BMW', 'Toyota'] },
    { id: 'p4', pn: 'OF-B58', name: 'Oil filter (OEM)', brand: 'Mann', price: 14.5, stock: 20, fits: ['BMW', 'Toyota'] },
    { id: 'p5', pn: 'OIL-5W30-5L', name: 'Full synthetic 5W-30 (5L)', brand: 'Liqui Moly', price: 58, stock: 12, fits: ['BMW', 'Toyota'] },
    { id: 'p6', pn: 'WIP-24', name: 'Wiper blades (pair)', brand: 'Bosch', price: 26, stock: 9, fits: ['BMW', 'Toyota', 'Ford'] },
    { id: 'p7', pn: 'CAB-FILT', name: 'Cabin air filter', brand: 'Mann', price: 19, stock: 14, fits: ['BMW', 'Toyota', 'Ford'] },
    { id: 'p8', pn: 'PLUG-IRID', name: 'Iridium spark plugs (set)', brand: 'NGK', price: 72, stock: 7, fits: ['BMW', 'Toyota'] },
    { id: 'p9', pn: 'AIR-FILT-TR', name: 'Engine air filter - Transit', brand: 'Mann', price: 23, stock: 10, fits: ['Ford'] },
  ]
  const invoices: Invoice[] = [
    { id: 'i1', number: 'INV-2026-0141', status: 'Overdue', clientId: 'c2', vehicleId: 'v2',
      created: addDays(-35), due: addDays(-5), odometer: '28,100 km', tier: 'VIP',
      lines: [
        { type: 'labor', name: 'Oil change - synthetic', qty: 1, unit: 129, taxable: true },
        { type: 'part', name: 'Oil filter (OEM)', pn: 'OF-B58', qty: 1, unit: 14.5, taxable: true },
        { type: 'part', name: 'Full synthetic 5W-30 (5L)', pn: 'OIL-5W30-5L', qty: 1, unit: 58, taxable: true },
      ],
      discountPct: 5, customerNote: 'Please call before additional work.',
      internalNote: 'Customer sensitive about wheel scratches.',
      // engine-computed snapshot (the mockup's hand-written 197.42 never added up)
      totals: { labor: 129, parts: 72.5, discount: 10.07, subtotal: 191.43, tax: 16.08, total: 207.51 } },
  ]
  return { settings, clients, vehicles, services, parts, invoices }
}
