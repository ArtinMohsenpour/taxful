import Decimal from 'decimal.js'
import type { DocumentRecord } from './schema'
import type { InvoiceAdjustment } from './invoice-types'
export const numericAmount = (value: string | undefined): value is string =>
  !!value && /^\d{1,15}(\.\d{1,6})?$/.test(value)
export const sumAdjustments = (items: InvoiceAdjustment[] = []) =>
  items.reduce((sum, item) => sum.plus(item.amount), new Decimal(0))
export function adjustedLineNet(line: DocumentRecord['lines'][number]) {
  if (
    ![line.quantity, line.unitPrice, line.priceBaseQuantity || '1'].every(numericAmount) ||
    new Decimal(line.priceBaseQuantity || '1').lte(0) ||
    [...(line.allowances || []), ...(line.charges || [])].some((a) => !numericAmount(a.amount))
  )
    return null
  return new Decimal(line.quantity)
    .times(line.unitPrice)
    .div(line.priceBaseQuantity || '1')
    .minus(sumAdjustments(line.allowances))
    .plus(sumAdjustments(line.charges))
    .toFixed(2)
}
export function priceForLineNet(line: DocumentRecord['lines'][number], net: string) {
  if (
    !numericAmount(net) ||
    !numericAmount(line.quantity) ||
    new Decimal(line.quantity).lte(0) ||
    !numericAmount(line.priceBaseQuantity || '1') ||
    [...(line.allowances || []), ...(line.charges || [])].some((a) => !numericAmount(a.amount))
  )
    return null
  return new Decimal(net)
    .plus(sumAdjustments(line.allowances))
    .minus(sumAdjustments(line.charges))
    .times(line.priceBaseQuantity || '1')
    .div(line.quantity)
    .toFixed(2)
}
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
  if (
    [...(data.allowances || []), ...(data.charges || [])].some(
      (a) => !numericAmount(a.amount) || !numericAmount(a.taxRate),
    ) ||
    (data.prepaidAmount && !numericAmount(data.prepaidAmount))
  )
    return null
  const groups = new Map<string, { category: string; rate: string; net: Decimal }>(),
    invalidLines: number[] = []
  const accumulate = (category: string, rate: string, net: Decimal) => {
    const key = `${category}:${new Decimal(rate).toString()}`
    const group = groups.get(key) || {
      category,
      rate: new Decimal(rate).toString(),
      net: new Decimal(0),
    }
    group.net = group.net.plus(net)
    groups.set(key, group)
  }
  for (const [index, line] of data.lines.entries()) {
    const rate = new Decimal(line.taxRate).toString()
    accumulate(line.taxCategory || 'S', rate, new Decimal(line.netAmount))
    const expected = adjustedLineNet(line)
    if (expected === null || !new Decimal(expected).minus(line.netAmount).abs().lte(0.02))
      invalidLines.push(index)
  }
  for (const item of data.allowances || [])
    accumulate(item.taxCategory || 'S', item.taxRate!, new Decimal(item.amount).negated())
  for (const item of data.charges || [])
    accumulate(item.taxCategory || 'S', item.taxRate!, new Decimal(item.amount))
  const breakdown = [...groups.values()].map(({ category, rate, net }) => ({
    category,
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
    payable: net
      .plus(tax)
      .minus(data.prepaidAmount || '0')
      .toFixed(2),
    lineNet: data.lines.reduce((sum, line) => sum.plus(line.netAmount), new Decimal(0)).toFixed(2),
    allowances: sumAdjustments(data.allowances).toFixed(2),
    charges: sumAdjustments(data.charges).toFixed(2),
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
