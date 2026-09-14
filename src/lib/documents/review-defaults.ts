import type { DocumentRecord } from './schema'
export function applyReviewDefaults(record: DocumentRecord) {
  const data = { ...record, issuer: { ...record.issuer }, recipient: { ...record.recipient } },
    fields: string[] = []
  if (!data.currency.trim()) {
    data.currency = 'EUR'
    fields.push('currency')
  }
  for (const side of ['issuer', 'recipient'] as const)
    if (!data[side].country.trim()) {
      data[side].country = 'DE'
      fields.push(side + '.country')
    }
  return { data, fields }
}
