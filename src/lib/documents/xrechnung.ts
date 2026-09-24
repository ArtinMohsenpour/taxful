import { create } from 'xmlbuilder2'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import Decimal from 'decimal.js'
import { type DocumentRecord } from './schema'
import { DocumentError } from './config'
import { createHash } from 'node:crypto'
import { calculateInvoice } from './invoice-calculation'
import { invoiceTypeCodes, type InvoiceAdjustment } from './invoice-types'
import { invoiceNote, paymentAttachment } from './invoice-notes'

export const VALIDATOR_VERSION = 'KoSIT 1.6.3 / XRechnung 3.0.2 / 2026-08-31'
import { xrechnungRequirements } from './invoice-requirements'
export { invoiceRequirements, xrechnungRequirements, validIban } from './invoice-requirements'
export function generateXRechnung(data: DocumentRecord) {
  if (xrechnungRequirements(data).length) throw new DocumentError('exportIncomplete')
  const credit = data.invoiceKind === 'credit_note'
  const calculated = calculateInvoice(data)!
  const invoice = create({ version: '1.0', encoding: 'UTF-8' }).ele(
    credit ? 'CreditNote' : 'Invoice',
    {
      xmlns: `urn:oasis:names:specification:ubl:schema:xsd:${credit ? 'CreditNote' : 'Invoice'}-2`,
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    },
  )
  const text = (
    node: typeof invoice,
    name: string,
    value: string,
    attrs?: Record<string, string>,
  ) =>
    node
      .ele(name, attrs || {})
      .txt(value)
      .up()
  text(
    invoice,
    'cbc:CustomizationID',
    'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
  )
  text(invoice, 'cbc:ProfileID', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0')
  text(invoice, 'cbc:ID', data.documentNumber)
  text(invoice, 'cbc:IssueDate', data.documentDate)
  if (data.dueDate && !credit) text(invoice, 'cbc:DueDate', data.dueDate)
  text(
    invoice,
    credit ? 'cbc:CreditNoteTypeCode' : 'cbc:InvoiceTypeCode',
    invoiceTypeCodes[data.invoiceKind || 'standard'],
  )
  if (invoiceNote(data)) text(invoice, 'cbc:Note', invoiceNote(data))
  text(invoice, 'cbc:DocumentCurrencyCode', data.currency)
  text(invoice, 'cbc:BuyerReference', data.buyerReference)
  if (data.periodStart || data.periodEnd) {
    const period = invoice.ele('cac:InvoicePeriod')
    if (data.periodStart) text(period, 'cbc:StartDate', data.periodStart)
    if (data.periodEnd) text(period, 'cbc:EndDate', data.periodEnd)
  }
  for (const ref of data.precedingInvoices || []) {
    const reference = invoice.ele('cac:BillingReference').ele('cac:InvoiceDocumentReference')
    text(reference, 'cbc:ID', ref.number)
    text(reference, 'cbc:IssueDate', ref.date)
  }
  const payments = paymentAttachment(data)
  if (payments) {
    const attachment = invoice.ele('cac:AdditionalDocumentReference')
    text(attachment, 'cbc:ID', 'payments.csv')
    text(attachment, 'cbc:DocumentDescription', 'Vereinnahmte Teilentgelte / Advance payments')
    text(attachment.ele('cac:Attachment'), 'cbc:EmbeddedDocumentBinaryObject', payments, {
      mimeCode: 'text/csv',
      filename: 'payments.csv',
    })
  }
  for (const [side, tag] of [
    ['issuer', 'cac:AccountingSupplierParty'],
    ['recipient', 'cac:AccountingCustomerParty'],
  ] as const) {
    const info = data[side]
    const party = invoice.ele(tag).ele('cac:Party')
    text(party, 'cbc:EndpointID', info.email, { schemeID: 'EM' })
    text(party.ele('cac:PartyName'), 'cbc:Name', info.companyName)
    const address = party.ele('cac:PostalAddress')
    text(address, 'cbc:StreetName', info.address)
    text(address, 'cbc:CityName', info.city)
    text(address, 'cbc:PostalZone', info.postalCode)
    text(address.ele('cac:Country'), 'cbc:IdentificationCode', info.country)
    if (info.vatId || (side === 'issuer' && info.taxNumber)) {
      const tax = party.ele('cac:PartyTaxScheme')
      text(tax, 'cbc:CompanyID', info.vatId || info.taxNumber)
      text(tax.ele('cac:TaxScheme'), 'cbc:ID', info.vatId ? 'VAT' : 'FC')
    }
    text(party.ele('cac:PartyLegalEntity'), 'cbc:RegistrationName', info.companyName)
    if (side === 'issuer') {
      const contact = party.ele('cac:Contact')
      text(contact, 'cbc:Name', info.name)
      text(contact, 'cbc:Telephone', info.phone)
      text(contact, 'cbc:ElectronicMail', info.email)
    }
  }
  if (data.supplyDate) text(invoice.ele('cac:Delivery'), 'cbc:ActualDeliveryDate', data.supplyDate)
  const payment = invoice.ele('cac:PaymentMeans')
  text(payment, 'cbc:PaymentMeansCode', data.paymentMeansCode)
  if (data.paymentMeansCode === '58')
    text(
      payment.ele('cac:PayeeFinancialAccount'),
      'cbc:ID',
      data.bankAccount.replace(/\s/g, '').toUpperCase(),
    )
  if (data.paymentTerms || (credit && data.dueDate))
    text(
      invoice.ele('cac:PaymentTerms'),
      'cbc:Note',
      [data.paymentTerms, credit && data.dueDate ? `Fällig am / Due: ${data.dueDate}` : '']
        .filter(Boolean)
        .join(' · '),
    )
  const currency = { currencyID: data.currency }
  const allowance = (
    parent: typeof invoice,
    item: InvoiceAdjustment,
    charge: boolean,
    document: boolean,
  ) => {
    const node = parent.ele('cac:AllowanceCharge')
    text(node, 'cbc:ChargeIndicator', String(charge))
    text(node, 'cbc:AllowanceChargeReason', item.reason)
    if (item.percentage) text(node, 'cbc:MultiplierFactorNumeric', item.percentage)
    text(node, 'cbc:Amount', new Decimal(item.amount).toFixed(2), currency)
    if (item.baseAmount)
      text(node, 'cbc:BaseAmount', new Decimal(item.baseAmount).toFixed(2), currency)
    if (document) {
      const tax = node.ele('cac:TaxCategory')
      text(tax, 'cbc:ID', item.taxCategory || 'S')
      text(tax, 'cbc:Percent', item.taxRate!)
      text(tax.ele('cac:TaxScheme'), 'cbc:ID', 'VAT')
    }
  }
  for (const item of data.allowances || []) allowance(invoice, item, false, true)
  for (const item of data.charges || []) allowance(invoice, item, true, true)
  const total = invoice.ele('cac:TaxTotal')
  text(total, 'cbc:TaxAmount', new Decimal(data.taxAmount).toFixed(2), currency)
  for (const group of calculated.breakdown) {
    const sub = total.ele('cac:TaxSubtotal')
    text(sub, 'cbc:TaxableAmount', group.net, currency)
    text(sub, 'cbc:TaxAmount', group.tax, currency)
    const category = sub.ele('cac:TaxCategory')
    text(category, 'cbc:ID', group.category)
    text(category, 'cbc:Percent', group.rate)
    if (group.category === 'E') text(category, 'cbc:TaxExemptionReason', data.taxExemptionReason!)
    if (group.category === 'AE') {
      text(category, 'cbc:TaxExemptionReasonCode', 'VATEX-EU-AE')
      text(category, 'cbc:TaxExemptionReason', data.reverseChargeReason!)
    }
    text(category.ele('cac:TaxScheme'), 'cbc:ID', 'VAT')
  }
  const sum = data.lines.reduce((sum, line) => sum.plus(line.netAmount), new Decimal(0))
  const monetary = invoice.ele('cac:LegalMonetaryTotal')
  text(monetary, 'cbc:LineExtensionAmount', sum.toFixed(2), currency)
  text(monetary, 'cbc:TaxExclusiveAmount', new Decimal(data.netAmount).toFixed(2), currency)
  text(monetary, 'cbc:TaxInclusiveAmount', new Decimal(data.grossAmount).toFixed(2), currency)
  if (data.allowances?.length)
    text(monetary, 'cbc:AllowanceTotalAmount', calculated.allowances, currency)
  if (data.charges?.length) text(monetary, 'cbc:ChargeTotalAmount', calculated.charges, currency)
  if (data.prepaidAmount)
    text(monetary, 'cbc:PrepaidAmount', new Decimal(data.prepaidAmount).toFixed(2), currency)
  text(monetary, 'cbc:PayableAmount', calculated.payable, currency)
  for (const [index, line] of data.lines.entries()) {
    const item = invoice.ele(credit ? 'cac:CreditNoteLine' : 'cac:InvoiceLine')
    text(item, 'cbc:ID', String(index + 1))
    text(item, credit ? 'cbc:CreditedQuantity' : 'cbc:InvoicedQuantity', line.quantity, {
      unitCode: line.unitCode,
    })
    text(item, 'cbc:LineExtensionAmount', new Decimal(line.netAmount).toFixed(2), currency)
    for (const adjustment of line.allowances || []) allowance(item, adjustment, false, false)
    for (const adjustment of line.charges || []) allowance(item, adjustment, true, false)
    const product = item.ele('cac:Item')
    text(product, 'cbc:Name', line.description)
    const category = product.ele('cac:ClassifiedTaxCategory')
    text(category, 'cbc:ID', line.taxCategory || 'S')
    text(category, 'cbc:Percent', line.taxRate)
    text(category.ele('cac:TaxScheme'), 'cbc:ID', 'VAT')
    const price = item.ele('cac:Price')
    text(price, 'cbc:PriceAmount', line.unitPrice, currency)
    if (line.priceBaseQuantity)
      text(price, 'cbc:BaseQuantity', line.priceBaseQuantity, { unitCode: line.unitCode })
  }
  return invoice.end({ prettyPrint: true })
}
type ReportIssue = { code: string; message: string }
export async function validateXRechnung(
  xml: string,
): Promise<{ valid: boolean; validator: string; issues: ReportIssue[] }> {
  const endpoint = process.env.XRECHNUNG_VALIDATOR_URL || 'http://127.0.0.1:8086'
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    })
  } catch {
    throw new DocumentError('validatorUnavailable', 503)
  }
  if (![200, 406].includes(response.status)) throw new DocumentError('validatorUnavailable', 503)
  const reader = response.body?.getReader()
  if (!reader) throw new DocumentError('validatorUnavailable', 503)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 3_000_000) {
      await reader.cancel()
      throw new DocumentError('validatorUnavailable', 503)
    }
    chunks.push(value)
  }
  const report = Buffer.concat(chunks).toString()
  if (/<!DOCTYPE|<!ENTITY/i.test(report) || XMLValidator.validate(report) !== true)
    throw new DocumentError('validatorUnavailable', 503)
  const parsed = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    processEntities: false,
  }).parse(report)
  if (
    !parsed.report ||
    parsed.report.documentIdentification?.documentHash?.hashValue !==
      createHash('sha256').update(xml).digest('base64')
  )
    throw new DocumentError('validatorUnavailable', 503)
  const issues: ReportIssue[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'message') {
        for (const issue of Array.isArray(value) ? value : [value]) {
          if (issue && typeof issue === 'object' && issue['@_code'] && issues.length < 40)
            issues.push({
              code: String(issue['@_code']),
              message: String(issue['#text'] || '').slice(0, 1000),
            })
        }
      }
      if (key === 'failed-assert')
        for (const issue of Array.isArray(value) ? value : [value]) {
          if (issues.length < 40)
            issues.push({
              code: String(issue['@_id'] || 'validation'),
              message: String(
                typeof issue.text === 'object' ? issue.text['#text'] : issue.text || '',
              ).slice(0, 1000),
            })
        }
      else if (Array.isArray(value)) value.forEach(walk)
      else walk(value)
    }
  }
  walk(parsed)
  if (response.status !== 200 && !issues.length)
    issues.push({ code: 'schema', message: 'The official validator rejected this invoice.' })
  return {
    valid:
      response.status === 200 &&
      parsed.report['@_valid'] === 'true' &&
      Object.hasOwn(parsed.report.assessment || {}, 'accept'),
    validator: VALIDATOR_VERSION,
    issues,
  }
}
