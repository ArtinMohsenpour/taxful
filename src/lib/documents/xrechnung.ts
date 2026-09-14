import { create } from 'xmlbuilder2'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import Decimal from 'decimal.js'
import { type DocumentRecord } from './schema'
import { DocumentError } from './config'
import { createHash } from 'node:crypto'

export const VALIDATOR_VERSION = 'KoSIT 1.6.3 / XRechnung 3.0.2 / 2026-08-31'
import { xrechnungRequirements } from './invoice-requirements'
export { invoiceRequirements, xrechnungRequirements, validIban } from './invoice-requirements'
export function generateXRechnung(data: DocumentRecord) {
  if (xrechnungRequirements(data).length) throw new DocumentError('exportIncomplete')
  const invoice = create({ version: '1.0', encoding: 'UTF-8' }).ele('Invoice', {
    xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  })
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
  if (data.dueDate) text(invoice, 'cbc:DueDate', data.dueDate)
  text(invoice, 'cbc:InvoiceTypeCode', '380')
  text(invoice, 'cbc:DocumentCurrencyCode', data.currency)
  text(invoice, 'cbc:BuyerReference', data.buyerReference)
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
  text(invoice.ele('cac:Delivery'), 'cbc:ActualDeliveryDate', data.supplyDate)
  const payment = invoice.ele('cac:PaymentMeans')
  text(payment, 'cbc:PaymentMeansCode', data.paymentMeansCode)
  if (data.paymentMeansCode === '58')
    text(
      payment.ele('cac:PayeeFinancialAccount'),
      'cbc:ID',
      data.bankAccount.replace(/\s/g, '').toUpperCase(),
    )
  if (data.paymentTerms) text(invoice.ele('cac:PaymentTerms'), 'cbc:Note', data.paymentTerms)
  const currency = { currencyID: data.currency }
  const total = invoice.ele('cac:TaxTotal')
  text(total, 'cbc:TaxAmount', new Decimal(data.taxAmount).toFixed(2), currency)
  const groups = new Map<string, Decimal>()
  for (const line of data.lines) {
    const rate = new Decimal(line.taxRate).toString()
    groups.set(rate, (groups.get(rate) || new Decimal(0)).plus(line.netAmount))
  }
  for (const [rate, net] of groups) {
    const sub = total.ele('cac:TaxSubtotal')
    text(sub, 'cbc:TaxableAmount', net.toFixed(2), currency)
    text(sub, 'cbc:TaxAmount', net.times(rate).div(100).toFixed(2), currency)
    const category = sub.ele('cac:TaxCategory')
    text(category, 'cbc:ID', 'S')
    text(category, 'cbc:Percent', rate)
    text(category.ele('cac:TaxScheme'), 'cbc:ID', 'VAT')
  }
  const sum = data.lines.reduce((sum, line) => sum.plus(line.netAmount), new Decimal(0))
  const monetary = invoice.ele('cac:LegalMonetaryTotal')
  text(monetary, 'cbc:LineExtensionAmount', sum.toFixed(2), currency)
  text(monetary, 'cbc:TaxExclusiveAmount', new Decimal(data.netAmount).toFixed(2), currency)
  text(monetary, 'cbc:TaxInclusiveAmount', new Decimal(data.grossAmount).toFixed(2), currency)
  text(monetary, 'cbc:PayableAmount', new Decimal(data.grossAmount).toFixed(2), currency)
  for (const [index, line] of data.lines.entries()) {
    const item = invoice.ele('cac:InvoiceLine')
    text(item, 'cbc:ID', String(index + 1))
    text(item, 'cbc:InvoicedQuantity', line.quantity, { unitCode: line.unitCode })
    text(item, 'cbc:LineExtensionAmount', new Decimal(line.netAmount).toFixed(2), currency)
    const product = item.ele('cac:Item')
    text(product, 'cbc:Name', line.description)
    const category = product.ele('cac:ClassifiedTaxCategory')
    text(category, 'cbc:ID', 'S')
    text(category, 'cbc:Percent', line.taxRate)
    text(category.ele('cac:TaxScheme'), 'cbc:ID', 'VAT')
    text(item.ele('cac:Price'), 'cbc:PriceAmount', line.unitPrice, currency)
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
