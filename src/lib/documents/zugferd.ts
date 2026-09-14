import { create } from 'xmlbuilder2'
import Decimal from 'decimal.js'
import { z } from 'zod'
import type { DocumentRecord } from './schema'
import { invoiceRequirements } from './xrechnung'
import { DocumentError } from './config'
import { sha256 } from './storage'
import { zugferdIssues } from './validation-report'

export function generateCII(data: DocumentRecord) {
  if (invoiceRequirements(data, 'zugferd').length) throw new DocumentError('exportIncomplete')
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('rsm:CrossIndustryInvoice', {
    'xmlns:rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
    'xmlns:ram':
      'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
    'xmlns:udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
  })
  const text = (
    node: typeof root,
    name: string,
    value: string,
    attrs: Record<string, string> = {},
  ) => node.ele(name, attrs).txt(value).up()
  const date = (node: typeof root, name: string, value: string) =>
    text(node.ele(name), 'udt:DateTimeString', value.replaceAll('-', ''), { format: '102' })
  text(
    root.ele('rsm:ExchangedDocumentContext').ele('ram:GuidelineSpecifiedDocumentContextParameter'),
    'ram:ID',
    'urn:cen.eu:en16931:2017',
  )
  const doc = root.ele('rsm:ExchangedDocument')
  text(doc, 'ram:ID', data.documentNumber)
  text(doc, 'ram:TypeCode', '380')
  date(doc, 'ram:IssueDateTime', data.documentDate)
  const transaction = root.ele('rsm:SupplyChainTradeTransaction')
  for (const [index, line] of data.lines.entries()) {
    const item = transaction.ele('ram:IncludedSupplyChainTradeLineItem')
    text(item.ele('ram:AssociatedDocumentLineDocument'), 'ram:LineID', String(index + 1))
    text(item.ele('ram:SpecifiedTradeProduct'), 'ram:Name', line.description)
    text(
      item.ele('ram:SpecifiedLineTradeAgreement').ele('ram:NetPriceProductTradePrice'),
      'ram:ChargeAmount',
      line.unitPrice,
    )
    text(item.ele('ram:SpecifiedLineTradeDelivery'), 'ram:BilledQuantity', line.quantity, {
      unitCode: line.unitCode,
    })
    const settlement = item.ele('ram:SpecifiedLineTradeSettlement'),
      tax = settlement.ele('ram:ApplicableTradeTax')
    text(tax, 'ram:TypeCode', 'VAT')
    text(tax, 'ram:CategoryCode', 'S')
    text(tax, 'ram:RateApplicablePercent', line.taxRate)
    text(
      settlement.ele('ram:SpecifiedTradeSettlementLineMonetarySummation'),
      'ram:LineTotalAmount',
      new Decimal(line.netAmount).toFixed(2),
    )
  }
  const agreement = transaction.ele('ram:ApplicableHeaderTradeAgreement')
  if (data.buyerReference) text(agreement, 'ram:BuyerReference', data.buyerReference)
  for (const [side, element] of [
    ['issuer', 'ram:SellerTradeParty'],
    ['recipient', 'ram:BuyerTradeParty'],
  ] as const) {
    const info = data[side],
      party = agreement.ele(element)
    text(party, 'ram:Name', info.companyName)
    const address = party.ele('ram:PostalTradeAddress')
    text(address, 'ram:PostcodeCode', info.postalCode)
    text(address, 'ram:LineOne', info.address)
    text(address, 'ram:CityName', info.city)
    text(address, 'ram:CountryID', info.country)
    if (info.email)
      text(party.ele('ram:URIUniversalCommunication'), 'ram:URIID', info.email, { schemeID: 'EM' })
    if (info.vatId)
      text(party.ele('ram:SpecifiedTaxRegistration'), 'ram:ID', info.vatId, { schemeID: 'VA' })
    else if (side === 'issuer' && info.taxNumber)
      text(party.ele('ram:SpecifiedTaxRegistration'), 'ram:ID', info.taxNumber, { schemeID: 'FC' })
  }
  date(
    transaction.ele('ram:ApplicableHeaderTradeDelivery').ele('ram:ActualDeliverySupplyChainEvent'),
    'ram:OccurrenceDateTime',
    data.supplyDate,
  )
  const settlement = transaction.ele('ram:ApplicableHeaderTradeSettlement')
  text(settlement, 'ram:InvoiceCurrencyCode', data.currency)
  const payment = settlement.ele('ram:SpecifiedTradeSettlementPaymentMeans')
  text(payment, 'ram:TypeCode', data.paymentMeansCode)
  if (data.paymentMeansCode === '58')
    text(
      payment.ele('ram:PayeePartyCreditorFinancialAccount'),
      'ram:IBANID',
      data.bankAccount.replace(/\s/g, '').toUpperCase(),
    )
  const groups = new Map<string, Decimal>()
  for (const line of data.lines) {
    const rate = new Decimal(line.taxRate).toString()
    groups.set(rate, (groups.get(rate) || new Decimal(0)).plus(line.netAmount))
  }
  for (const [rate, net] of groups) {
    const tax = settlement.ele('ram:ApplicableTradeTax')
    text(tax, 'ram:CalculatedAmount', net.times(rate).div(100).toFixed(2))
    text(tax, 'ram:TypeCode', 'VAT')
    text(tax, 'ram:BasisAmount', net.toFixed(2))
    text(tax, 'ram:CategoryCode', 'S')
    text(tax, 'ram:RateApplicablePercent', rate)
  }
  const terms = settlement.ele('ram:SpecifiedTradePaymentTerms')
  if (data.paymentTerms) text(terms, 'ram:Description', data.paymentTerms)
  if (data.dueDate) date(terms, 'ram:DueDateDateTime', data.dueDate)
  const total = settlement.ele('ram:SpecifiedTradeSettlementHeaderMonetarySummation')
  text(
    total,
    'ram:LineTotalAmount',
    data.lines.reduce((sum, line) => sum.plus(line.netAmount), new Decimal(0)).toFixed(2),
  )
  text(total, 'ram:ChargeTotalAmount', '0.00')
  text(total, 'ram:AllowanceTotalAmount', '0.00')
  text(total, 'ram:TaxBasisTotalAmount', new Decimal(data.netAmount).toFixed(2))
  text(total, 'ram:TaxTotalAmount', new Decimal(data.taxAmount).toFixed(2), {
    currencyID: data.currency,
  })
  text(total, 'ram:GrandTotalAmount', new Decimal(data.grossAmount).toFixed(2))
  text(total, 'ram:TotalPrepaidAmount', '0.00')
  text(total, 'ram:DuePayableAmount', new Decimal(data.grossAmount).toFixed(2))
  return root.end({ prettyPrint: true })
}
const responseSchema = z.object({
  valid: z.literal(true),
  pdfValid: z.literal(true),
  xmlValid: z.literal(true),
  pdf: z.string().max(20_000_000),
  inputSha256: z.string(),
  pdfSha256: z.string(),
  validator: z.string(),
  report: z.string().max(2_000_000),
})
export async function generateZugferd(data: DocumentRecord) {
  const xml = generateCII(data)
  const base = process.env.ZUGFERD_SERVICE_URL || 'http://127.0.0.1:8087'
  let response: Response
  try {
    response = await fetch(base + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
      signal: AbortSignal.timeout(75000),
      redirect: 'error',
    })
  } catch {
    throw new DocumentError('zugferdUnavailable', 503)
  }
  const reader = response.body?.getReader()
  if (!reader) throw new DocumentError('zugferdUnavailable', 503)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 22_000_000) {
      await reader.cancel()
      throw new DocumentError('zugferdUnavailable', 503)
    }
    chunks.push(value)
  }
  if (response.status === 422) {
    const rejected = z
      .object({ report: z.string().max(2_000_000) })
      .safeParse(JSON.parse(Buffer.concat(chunks).toString()))
    throw new DocumentError(
      'zugferdInvalid',
      422,
      rejected.success ? zugferdIssues(rejected.data.report) : undefined,
    )
  }
  if (!response.ok) throw new DocumentError('zugferdUnavailable', 503)
  const result = responseSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString()))
  if (!result.success) throw new DocumentError('zugferdUnavailable', 503)
  const { pdf, ...report } = result.data,
    bytes = Buffer.from(pdf, 'base64')
  if (
    !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
    report.inputSha256 !== sha256(xml) ||
    report.pdfSha256 !== sha256(bytes)
  )
    throw new DocumentError('zugferdInvalid', 422)
  return { bytes, report }
}
