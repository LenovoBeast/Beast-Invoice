import { describe, expect, it } from 'vitest'
import { calcTotals, servicePrice } from '../src/lib/totals'
import type { InvoiceLine } from '../src/lib/types'

const line = (partial: Partial<InvoiceLine>): InvoiceLine => ({
  type: 'labor', name: 'x', qty: 1, unit: 100, taxable: true, ...partial,
})

describe('calcTotals', () => {
  it('computes the seed invoice (labor 129 + parts 72.50, 5% discount, 8.4% tax)', () => {
    const lines: InvoiceLine[] = [
      { type: 'labor', name: 'Oil change - synthetic', qty: 1, unit: 129, taxable: true },
      { type: 'part', name: 'Oil filter (OEM)', pn: 'OF-B58', qty: 1, unit: 14.5, taxable: true },
      { type: 'part', name: 'Full synthetic 5W-30 (5L)', pn: 'OIL-5W30-5L', qty: 1, unit: 58, taxable: true },
    ]
    expect(calcTotals(lines, 5, 8.4)).toEqual({
      labor: 129, parts: 72.5, discount: 10.07, subtotal: 191.43, tax: 16.08, total: 207.51,
    })
  })

  it('returns zeros for an empty invoice', () => {
    expect(calcTotals([], 0, 8.4)).toEqual({
      labor: 0, parts: 0, discount: 0, subtotal: 0, tax: 0, total: 0,
    })
  })

  it('applies no discount at 0%', () => {
    const t = calcTotals([line({ unit: 200 })], 0, 10)
    expect(t.discount).toBe(0)
    expect(t.total).toBe(220)
  })

  it('taxes only the taxable base after discount; non-taxable lines escape tax', () => {
    const lines: InvoiceLine[] = [
      line({ type: 'labor', unit: 100, taxable: true }),
      line({ type: 'part', name: 'Towel pack', qty: 2, unit: 25, taxable: false }),
    ]
    const t = calcTotals(lines, 10, 10)
    expect(t.labor).toBe(100)
    expect(t.parts).toBe(50)
    expect(t.discount).toBe(15) // 10% of 150 gross
    expect(t.subtotal).toBe(135)
    expect(t.tax).toBe(9) // 10% of taxable base (100 - 10%)
    expect(t.total).toBe(144)
  })

  it('handles fractional labor hours and rounds money to cents', () => {
    const t = calcTotals([line({ unit: 0.5 })], 0, 8.4)
    expect(t.labor).toBe(0.5)
    expect(t.tax).toBe(0.04) // 0.5 * 8.4% = 0.042 -> 0.04
    expect(t.total).toBe(0.54)
  })

  it('supports half-quantity labor (30 min) at the labor rate', () => {
    expect(servicePrice({ id: 'x', name: 'Diagnostics', cat: '', mode: 'hours', hours: 0.5 }, 120)).toBe(60)
    expect(servicePrice({ id: 'x', name: 'Oil change', cat: '', mode: 'flat', price: 129 }, 120)).toBe(129)
  })
})
