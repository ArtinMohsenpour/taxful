import Decimal from 'decimal.js'
import type { DocumentRecord } from './schema'

// Presence checks are warnings, never a proof that PDF pixels agree with the XML.
// Hidden text and image-only pages still require a person to compare the original.
export function compareInvoiceText(data: DocumentRecord, text: string) {
  const issues: { code: string; message: string }[] = []
  const add = (code: string) => issues.push({ code, message: code })
  const normalize = (value: string) => value.normalize('NFC').toUpperCase().replace(/\s/g, '')
  const normalized = normalize(text)
  if (!normalized || !/[\p{L}\p{N}]/u.test(normalized)) {
    add('pdfTextUnavailable')
    return issues
  }
  for (const [value, code] of [
    [data.documentNumber, 'pdfNumberMismatch'],
    [data.bankAccount, 'pdfBankMismatch'],
    [data.issuer.vatId, 'pdfVatMismatch'],
    [data.recipient.vatId, 'pdfBuyerVatMismatch'],
  ]) {
    if (value.trim() && !normalized.includes(normalize(value))) add(code)
  }
  // Match complete amount tokens, accepting the common German and English display
  // formats. Do not equate 119.00 with 1119.00 or infer locale by parsing source text.
  if (/^\d{1,15}\.\d{2}$/.test(data.grossAmount) || /^\d{1,15}$/.test(data.grossAmount)) {
    const [whole, fraction] = new Decimal(data.grossAmount).toFixed(2).split('.')
    const grouped = (separator: string) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    const candidates = [
      whole + '.' + fraction,
      whole + ',' + fraction,
      grouped(',') + '.' + fraction,
      grouped('.') + ',' + fraction,
    ]
    const amounts = text.replace(/[\u00a0\u202f]/g, ' ').match(/\d[\d.,]*/g) || []
    if (!amounts.some((amount) => candidates.includes(amount))) add('pdfTotalMismatch')
  } else add('pdfTotalMismatch')
  return issues
}
