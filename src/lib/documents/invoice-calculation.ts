import Decimal from 'decimal.js'
import type { DocumentRecord } from './schema'
export function calculateInvoice(data: DocumentRecord) {
  if (
    !data.lines.length ||
    data.lines.some((line) =>
      [line.quantity, line.unitPrice, line.netAmount, line.taxRate].some(
        (value) => !/^\d{1,15}(\.\d{1,6})?$/.test(value),
      ),
    )
  )
    return null
  const groups = new Map<string, Decimal>(),
    invalidLines: number[] = []
  for (const [index, line] of data.lines.entries()) {
    const rate = new Decimal(line.taxRate).toString()
    groups.set(rate, (groups.get(rate) || new Decimal(0)).plus(line.netAmount))
    if (
      !new Decimal(line.quantity)
        .times(line.unitPrice)
        .toDecimalPlaces(2)
        .equals(new Decimal(line.netAmount))
    )
      invalidLines.push(index)
  }
  const breakdown = [...groups].map(([rate, net]) => ({
    rate,
    net: net.toFixed(2),
    tax: net.times(rate).div(100).toFixed(2),
  }))
  const net = breakdown.reduce((sum, group) => sum.plus(group.net), new Decimal(0))
  const tax = breakdown.reduce((sum, group) => sum.plus(group.tax), new Decimal(0))
  return {
    breakdown,
    net: net.toFixed(2),
    tax: tax.toFixed(2),
    gross: net.plus(tax).toFixed(2),
    invalidLines,
  }
}
