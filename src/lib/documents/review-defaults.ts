import type { DocumentRecord } from './schema'
export function applyReviewDefaults(record: DocumentRecord) {
  const data = { ...record, issuer: { ...record.issuer }, recipient: { ...record.recipient } },
    fields: string[] = []
  if (!data.currency.trim()) {
    data.currency = 'EUR'
    fields.push('currency')
  }
  // German invoices still need a service/delivery date. When the source does not
  // state a different date or period, use the invoice date as the explicit default.
  if (
    !data.supplyDate.trim() &&
    !data.periodStart &&
    !data.periodEnd &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.documentDate)
  ) {
    data.supplyDate = data.documentDate
    fields.push('supplyDate')
  }
  for (const side of ['issuer', 'recipient'] as const)
    if (!data[side].country.trim()) {
      data[side].country = 'DE'
      fields.push(side + '.country')
    }
  return { data, fields }
}
