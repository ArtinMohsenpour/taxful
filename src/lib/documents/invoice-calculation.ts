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
        .minus(line.netAmount)
        .abs()
        .lte(0.02)
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

// Review inputs accept a decimal comma, but stored values remain canonical.
export function normalizeDecimalInput(value: string) {
  return /^\d+,\d*$/.test(value.trim()) ? value.trim().replace(',', '.') : value
}
export function calculateLineNet(quantity: string, unitPrice: string) {
  if (![quantity, unitPrice].every((value) => /^\d{1,15}(\.\d{1,6})?$/.test(value))) return null
  return new Decimal(quantity).times(unitPrice).toFixed(2)
}
export function netFromGrossPrice(quantity: string, grossPrice: string, rate: string) {
  if (
    calculateLineNet(quantity, grossPrice) === null ||
    !/^\d{1,3}(\.\d{1,6})?$/.test(rate) ||
    new Decimal(rate).gt(100)
  )
    return null
  const price = new Decimal(grossPrice).div(new Decimal(1).plus(new Decimal(rate).div(100)))
  const unitPrice = price.toFixed(2)
  return { unitPrice, netAmount: price.times(quantity).toFixed(2) }
}

export function netFromGrossLine(quantity: string, gross: string, rate: string) {
  if (!/^\d{1,15}(\.\d{1,6})?$/.test(quantity) || new Decimal(quantity).lte(0)) return null
  const result = netFromGrossPrice('1', gross, rate)
  return result
    ? {
        netAmount: result.netAmount,
        unitPrice: new Decimal(result.netAmount).div(quantity).toFixed(2),
      }
    : null
}
// Allocate each VAT group's rounding residual to its final line so rows add up
// to the same category totals used by both XML exporters.
export function lineAmounts(data: DocumentRecord) {
  const valid = (line: DocumentRecord['lines'][number]) =>
    [line.netAmount, line.taxRate].every((value) => /^\d{1,15}(\.\d{1,6})?$/.test(value))
  const netByRate = new Map<string, Decimal>()
  for (const line of data.lines.filter(valid)) {
    const rate = new Decimal(line.taxRate).toString()
    netByRate.set(rate, (netByRate.get(rate) || new Decimal(0)).plus(line.netAmount))
  }
  const remaining = new Map(
    [...netByRate].map(([rate, net]) => [rate, net.times(rate).div(100).toDecimalPlaces(2)]),
  )
  return data.lines.map((line, index) => {
    if (!valid(line)) return null
    const rate = new Decimal(line.taxRate).toString()
    const last = !data.lines
      .slice(index + 1)
      .some((row) => valid(row) && new Decimal(row.taxRate).eq(rate))
    const tax = last
      ? remaining.get(rate)!
      : new Decimal(line.netAmount).times(rate).div(100).toDecimalPlaces(2)
    remaining.set(rate, remaining.get(rate)!.minus(tax))
    return {
      net: new Decimal(line.netAmount).toFixed(2),
      tax: tax.toFixed(2),
      gross: new Decimal(line.netAmount).plus(tax).toFixed(2),
    }
  })
}
