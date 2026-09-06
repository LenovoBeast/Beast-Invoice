import type { InvoiceLine, Service, Totals } from './types'

export function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100
}

/** Single source of truth for money math. Ported verbatim from the mockup's calcTotals().
    Discount applies to the gross, tax applies to the taxable base after discount. */
export function calcTotals(lines: InvoiceLine[], discountPct: number, taxRate: number): Totals {
  let labor = 0, parts = 0, base = 0
  for (const l of lines) {
    const amt = l.qty * l.unit
    if (l.type === 'labor') {
      labor += amt
      if (l.taxable) base += amt
    } else {
      parts += amt
      if (l.taxable) base += amt
    }
  }
  const gross = labor + parts
  const discount = round2(gross * (discountPct || 0) / 100)
  const taxableBase = round2(base * (1 - (discountPct || 0) / 100))
  const tax = round2(taxableBase * taxRate / 100)
  const total = round2(gross - discount + tax)
  return { labor: round2(labor), parts: round2(parts), discount, subtotal: round2(gross - discount), tax, total }
}

export function servicePrice(s: Service, laborRate: number): number {
  return s.mode === 'flat' ? (s.price ?? 0) : (s.hours ?? 0) * laborRate
}

export function servicePriceLabel(s: Service, laborRate: number): string {
  return s.mode === 'flat'
    ? `$${(s.price ?? 0).toFixed(2)}`
    : `${s.hours}h × $${laborRate}/h = $${servicePrice(s, laborRate).toFixed(2)}`
}
