import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { DocumentError } from './config'
import { emptyRecord, recordSchema, type DocumentRecord } from './schema'
import { createHash } from 'node:crypto'
import { kindFromCode, taxCategorySchema, type InvoiceAdjustment } from './invoice-types'

const UBL = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
const CII = 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100'
const RAM = 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100'
const UDT = 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100'
type Node = {
  name: string
  ns: string
  text: string
  attrs: Record<string, string>
  children: Node[]
}
export type StructuredInvoice = {
  xml: string
  xmlSha256: string
  format: 'xrechnung-ubl' | 'xrechnung-cii' | 'zugferd-cii'
  profile: string
  data: DocumentRecord
}
export const maxInvoiceXmlBytes = 1_000_000

export function decodeInvoiceXml(bytes: Uint8Array) {
  if (bytes.length > maxInvoiceXmlBytes) throw new DocumentError('xmlTooLarge')
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new DocumentError('invalidInvoiceXml')
  }
  // No DTD, external entities, stylesheet instructions or non-UTF8 encodings.
  if (
    text.includes('\0') ||
    /<!DOCTYPE|<!ENTITY|<\?(?!xml\s)/i.test(text) ||
    /encoding\s*=\s*["'](?!utf-8["'])/i.test(text)
  )
    throw new DocumentError('invalidInvoiceXml')
  if (!text.trimStart().startsWith('<') || (text.match(/</g)?.length || 0) > 40000)
    throw new DocumentError('invalidInvoiceXml')
  return text
}
function tree(xml: string): Node {
  if (XMLValidator.validate(xml) !== true) throw new DocumentError('invalidInvoiceXml')
  const ordered: unknown = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
  }).parse(xml)
  let count = 0
  function nodes(raw: unknown, namespaces: Record<string, string>, depth: number): Node[] {
    if (!Array.isArray(raw) || depth > 64) throw new DocumentError('invalidInvoiceXml')
    const result: Node[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') throw new DocumentError('invalidInvoiceXml')
      for (const [name, value] of Object.entries(item)) {
        if (name === ':@' || name.startsWith('#') || name.startsWith('?')) continue
        if (++count > 20000) throw new DocumentError('invalidInvoiceXml')
        const attrs: Record<string, string> = {}
        for (const [key, attribute] of Object.entries(item[':@'] || {}))
          attrs[key.replace(/^@_/, '')] = String(attribute)
        const scope = { ...namespaces }
        for (const [key, value] of Object.entries(attrs))
          if (key === 'xmlns') scope[''] = value
          else if (key.startsWith('xmlns:')) scope[key.slice(6)] = value
        const parts = name.split(':'),
          local = parts.at(-1)!,
          prefix = parts.length === 2 ? parts[0] : ''
        if (parts.length > 2 || (prefix && !scope[prefix]))
          throw new DocumentError('invalidInvoiceXml')
        if (!Array.isArray(value)) throw new DocumentError('invalidInvoiceXml')
        const text = value
          .map((v) =>
            typeof v === 'object' && v !== null && '#text' in v ? String(v['#text']) : '',
          )
          .join('')
          .trim()
        result.push({
          name: local,
          ns: scope[prefix] || '',
          text,
          attrs,
          children: nodes(value, scope, depth + 1),
        })
      }
    }
    return result
  }
  const roots = nodes(ordered, {}, 0)
  if (roots.length !== 1) throw new DocumentError('invalidInvoiceXml')
  return roots[0]
}
const many = (node: Node | undefined, name: string, ns: string) =>
  node?.children.filter((n) => n.name === name && n.ns === ns) || []
const one = (node: Node | undefined, name: string, ns: string) => {
  const found = many(node, name, ns)
  if (found.length > 1) throw new DocumentError('ambiguousInvoiceXml')
  return found[0]
}
const val = (node: Node | undefined, name: string, ns: string) => one(node, name, ns)?.text || ''
const basic = (node: Node | undefined, name: string) => val(node, name, CBC)
const ram = (node: Node | undefined, name: string) => val(node, name, RAM)
function ciiDate(node: Node | undefined) {
  const date =
    one(node, 'DateTimeString', UDT) ||
    one(node, 'DateTimeString', 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100')
  return date?.attrs.format === '102' && /^\d{8}$/.test(date.text)
    ? date.text.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
    : ''
}
function category(value: string) {
  const parsed = taxCategorySchema.safeParse(value)
  if (!parsed.success) throw new DocumentError('unsupportedInvoiceProfile')
  return parsed.data
}
function ublAdjustments(
  node: Node | undefined,
  charge: boolean,
  document: boolean,
): InvoiceAdjustment[] {
  return many(node, 'AllowanceCharge', CAC)
    .filter((n) => basic(n, 'ChargeIndicator') === String(charge))
    .map((n) => ({
      amount: basic(n, 'Amount'),
      reason: basic(n, 'AllowanceChargeReason') || basic(n, 'AllowanceChargeReasonCode'),
      percentage: basic(n, 'MultiplierFactorNumeric') || undefined,
      baseAmount: basic(n, 'BaseAmount') || undefined,
      ...(document
        ? {
            taxCategory: category(basic(one(n, 'TaxCategory', CAC), 'ID')),
            taxRate: basic(one(n, 'TaxCategory', CAC), 'Percent'),
          }
        : {}),
    }))
}
function ciiAdjustments(
  node: Node | undefined,
  charge: boolean,
  document: boolean,
): InvoiceAdjustment[] {
  return many(node, 'SpecifiedTradeAllowanceCharge', RAM)
    .filter((n) => val(one(n, 'ChargeIndicator', RAM), 'Indicator', UDT) === String(charge))
    .map((n) => ({
      amount: ram(n, 'ActualAmount'),
      reason: ram(n, 'Reason') || ram(n, 'ReasonCode'),
      percentage: ram(n, 'CalculationPercent') || undefined,
      baseAmount: ram(n, 'BasisAmount') || undefined,
      ...(document
        ? {
            taxCategory: category(ram(one(n, 'CategoryTradeTax', RAM), 'CategoryCode')),
            taxRate: ram(one(n, 'CategoryTradeTax', RAM), 'RateApplicablePercent'),
          }
        : {}),
    }))
}
function ublParty(node: Node | undefined): DocumentRecord['issuer'] {
  const p = { ...emptyRecord('invoice').issuer },
    party = one(node, 'Party', CAC),
    address = one(party, 'PostalAddress', CAC),
    contact = one(party, 'Contact', CAC)
  p.companyName =
    basic(one(party, 'PartyLegalEntity', CAC), 'RegistrationName') ||
    basic(one(party, 'PartyName', CAC), 'Name')
  p.address = [
    basic(address, 'StreetName'),
    basic(address, 'AdditionalStreetName'),
    ...many(address, 'AddressLine', CAC).map((n) => basic(n, 'Line')),
  ]
    .filter(Boolean)
    .join(', ')
  p.postalCode = basic(address, 'PostalZone')
  p.city = basic(address, 'CityName')
  p.country = basic(one(address, 'Country', CAC), 'IdentificationCode')
  p.name = basic(contact, 'Name')
  p.email = basic(contact, 'ElectronicMail')
  p.phone = basic(contact, 'Telephone')
  const endpoint = one(party, 'EndpointID', CBC)
  if (!p.email && endpoint?.attrs.schemeID === 'EM') p.email = endpoint.text
  for (const registration of many(party, 'PartyTaxScheme', CAC)) {
    const id = basic(registration, 'CompanyID'),
      scheme = basic(one(registration, 'TaxScheme', CAC), 'ID')
    if (scheme === 'VAT') p.vatId = id
    else if (scheme === 'FC') p.taxNumber = id
  }
  return p
}
function ciiParty(node: Node | undefined): DocumentRecord['issuer'] {
  const p = { ...emptyRecord('invoice').issuer },
    address = one(node, 'PostalTradeAddress', RAM),
    contact = one(node, 'DefinedTradeContact', RAM)
  p.companyName = ram(node, 'Name')
  p.address = ['LineOne', 'LineTwo', 'LineThree']
    .map((k) => ram(address, k))
    .filter(Boolean)
    .join(', ')
  p.postalCode = ram(address, 'PostcodeCode')
  p.city = ram(address, 'CityName')
  p.country = ram(address, 'CountryID')
  p.name = ram(contact, 'PersonName')
  p.email = ram(one(contact, 'EmailURIUniversalCommunication', RAM), 'URIID')
  p.phone = ram(one(contact, 'TelephoneUniversalCommunication', RAM), 'CompleteNumber')
  const electronic = one(one(node, 'URIUniversalCommunication', RAM), 'URIID', RAM)
  if (!p.email && electronic?.attrs.schemeID === 'EM') p.email = electronic.text
  for (const registration of many(node, 'SpecifiedTaxRegistration', RAM)) {
    const id = one(registration, 'ID', RAM)
    if (id?.attrs.schemeID === 'VA') p.vatId = id.text
    else if (id?.attrs.schemeID === 'FC') p.taxNumber = id.text
  }
  return p
}
export function parseStructuredInvoice(bytes: Uint8Array): StructuredInvoice {
  const xml = decodeInvoiceXml(bytes),
    root = tree(xml),
    data = emptyRecord('invoice')
  let profile = '',
    format: StructuredInvoice['format']
  const credit =
    root.name === 'CreditNote' &&
    root.ns === 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2'
  if ((root.name === 'Invoice' && root.ns === UBL) || credit) {
    profile = basic(root, 'CustomizationID')
    const kind = kindFromCode(basic(root, credit ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'))
    if (!profile.includes('xrechnung') || !kind || credit !== (kind === 'credit_note'))
      throw new DocumentError('unsupportedInvoiceProfile')
    data.invoiceKind = kind
    data.invoiceNote = many(root, 'Note', CBC)
      .map((n) => n.text)
      .join('\n')
    data.periodStart = basic(one(root, 'InvoicePeriod', CAC), 'StartDate')
    data.periodEnd = basic(one(root, 'InvoicePeriod', CAC), 'EndDate')
    data.precedingInvoices = many(root, 'BillingReference', CAC).map((n) => ({
      number: basic(one(n, 'InvoiceDocumentReference', CAC), 'ID'),
      date: basic(one(n, 'InvoiceDocumentReference', CAC), 'IssueDate'),
    }))
    data.allowances = ublAdjustments(root, false, true)
    data.charges = ublAdjustments(root, true, true)
    for (const tax of many(root, 'TaxTotal', CAC).flatMap((n) => many(n, 'TaxSubtotal', CAC))) {
      const cat = one(tax, 'TaxCategory', CAC)
      if (basic(cat, 'ID') === 'E')
        data.taxExemptionReason =
          basic(cat, 'TaxExemptionReason') || basic(cat, 'TaxExemptionReasonCode')
      if (basic(cat, 'ID') === 'AE')
        data.reverseChargeReason =
          basic(cat, 'TaxExemptionReason') || basic(cat, 'TaxExemptionReasonCode')
    }
    format = 'xrechnung-ubl'
    data.documentNumber = basic(root, 'ID')
    data.documentDate = basic(root, 'IssueDate')
    data.dueDate = basic(root, 'DueDate')
    data.currency = basic(root, 'DocumentCurrencyCode')
    data.buyerReference = basic(root, 'BuyerReference')
    data.issuer = ublParty(one(root, 'AccountingSupplierParty', CAC))
    data.recipient = ublParty(one(root, 'AccountingCustomerParty', CAC))
    data.supplyDate = basic(one(root, 'Delivery', CAC), 'ActualDeliveryDate')
    data.paymentTerms = many(root, 'PaymentTerms', CAC)
      .map((n) => basic(n, 'Note'))
      .filter(Boolean)
      .join('\n')
    const payment = one(root, 'PaymentMeans', CAC)
    data.paymentMeansCode = basic(payment, 'PaymentMeansCode')
    data.bankAccount = basic(one(payment, 'PayeeFinancialAccount', CAC), 'ID')
    const totals = one(root, 'LegalMonetaryTotal', CAC)
    data.netAmount = basic(totals, 'TaxExclusiveAmount')
    data.grossAmount = basic(totals, 'TaxInclusiveAmount')
    data.prepaidAmount = basic(totals, 'PrepaidAmount')
    const taxes = many(root, 'TaxTotal', CAC)
      .flatMap((n) => many(n, 'TaxAmount', CBC))
      .filter((n) => n.attrs.currencyID === data.currency)
    if (taxes.length !== 1) throw new DocumentError('ambiguousInvoiceXml')
    data.taxAmount = taxes[0].text
    data.lines = many(root, credit ? 'CreditNoteLine' : 'InvoiceLine', CAC).map((line) => {
      const item = one(line, 'Item', CAC),
        quantity = one(line, credit ? 'CreditedQuantity' : 'InvoicedQuantity', CBC)
      return {
        description: basic(item, 'Name') || basic(item, 'Description'),
        quantity: quantity?.text || '',
        unitCode: quantity?.attrs.unitCode || '',
        unitPrice: basic(one(line, 'Price', CAC), 'PriceAmount'),
        netAmount: basic(line, 'LineExtensionAmount'),
        taxRate: basic(one(item, 'ClassifiedTaxCategory', CAC), 'Percent'),
        taxCategory: category(basic(one(item, 'ClassifiedTaxCategory', CAC), 'ID')),
        priceBaseQuantity: basic(one(line, 'Price', CAC), 'BaseQuantity') || undefined,
        allowances: ublAdjustments(line, false, false),
        charges: ublAdjustments(line, true, false),
      }
    })
  } else if (root.name === 'CrossIndustryInvoice' && root.ns === CII) {
    profile = ram(
      one(
        one(root, 'ExchangedDocumentContext', CII),
        'GuidelineSpecifiedDocumentContextParameter',
        RAM,
      ),
      'ID',
    )
    if (
      !/xrechnung|urn:cen\.eu:en16931:2017|urn:factur-x\.eu:1p0:(basic|en16931|extended)|urn:zugferd\.de:2p[0-9]:/.test(
        profile,
      )
    )
      throw new DocumentError('unsupportedInvoiceProfile')
    format = profile.includes('xrechnung') ? 'xrechnung-cii' : 'zugferd-cii'
    const document = one(root, 'ExchangedDocument', CII)
    const kind = kindFromCode(ram(document, 'TypeCode'))
    if (!kind) throw new DocumentError('unsupportedInvoiceProfile')
    data.invoiceKind = kind
    data.invoiceNote = many(document, 'IncludedNote', RAM)
      .map((n) => ram(n, 'Content'))
      .join('\n')
    data.documentNumber = ram(document, 'ID')
    data.documentDate = ciiDate(one(document, 'IssueDateTime', RAM))
    const transaction = one(root, 'SupplyChainTradeTransaction', CII),
      agreement = one(transaction, 'ApplicableHeaderTradeAgreement', RAM),
      delivery = one(transaction, 'ApplicableHeaderTradeDelivery', RAM),
      settlement = one(transaction, 'ApplicableHeaderTradeSettlement', RAM)
    data.periodStart = ciiDate(
      one(one(settlement, 'BillingSpecifiedPeriod', RAM), 'StartDateTime', RAM),
    )
    data.periodEnd = ciiDate(
      one(one(settlement, 'BillingSpecifiedPeriod', RAM), 'EndDateTime', RAM),
    )
    data.precedingInvoices = many(settlement, 'InvoiceReferencedDocument', RAM).map((n) => ({
      number: ram(n, 'IssuerAssignedID'),
      date: ciiDate(one(n, 'FormattedIssueDateTime', RAM)),
    }))
    data.allowances = ciiAdjustments(settlement, false, true)
    data.charges = ciiAdjustments(settlement, true, true)
    for (const tax of many(settlement, 'ApplicableTradeTax', RAM)) {
      if (ram(tax, 'CategoryCode') === 'E')
        data.taxExemptionReason = ram(tax, 'ExemptionReason') || ram(tax, 'ExemptionReasonCode')
      if (ram(tax, 'CategoryCode') === 'AE')
        data.reverseChargeReason = ram(tax, 'ExemptionReason') || ram(tax, 'ExemptionReasonCode')
    }
    data.issuer = ciiParty(one(agreement, 'SellerTradeParty', RAM))
    data.recipient = ciiParty(one(agreement, 'BuyerTradeParty', RAM))
    data.buyerReference = ram(agreement, 'BuyerReference')
    data.supplyDate = ciiDate(
      one(one(delivery, 'ActualDeliverySupplyChainEvent', RAM), 'OccurrenceDateTime', RAM),
    )
    data.currency = ram(settlement, 'InvoiceCurrencyCode')
    const terms = one(settlement, 'SpecifiedTradePaymentTerms', RAM),
      payment = one(settlement, 'SpecifiedTradeSettlementPaymentMeans', RAM)
    data.paymentTerms = ram(terms, 'Description')
    data.dueDate = ciiDate(one(terms, 'DueDateDateTime', RAM))
    data.paymentMeansCode = ram(payment, 'TypeCode')
    data.bankAccount = ram(one(payment, 'PayeePartyCreditorFinancialAccount', RAM), 'IBANID')
    const totals = one(settlement, 'SpecifiedTradeSettlementHeaderMonetarySummation', RAM)
    data.netAmount = ram(totals, 'TaxBasisTotalAmount')
    data.grossAmount = ram(totals, 'GrandTotalAmount')
    data.prepaidAmount = ram(totals, 'TotalPrepaidAmount')
    const taxes = many(totals, 'TaxTotalAmount', RAM).filter(
      (n) => n.attrs.currencyID === data.currency,
    )
    if (taxes.length !== 1) throw new DocumentError('ambiguousInvoiceXml')
    data.taxAmount = taxes[0].text
    data.lines = many(transaction, 'IncludedSupplyChainTradeLineItem', RAM).map((line) => {
      const quantity = one(one(line, 'SpecifiedLineTradeDelivery', RAM), 'BilledQuantity', RAM),
        prices = one(line, 'SpecifiedLineTradeAgreement', RAM),
        lineSettlement = one(line, 'SpecifiedLineTradeSettlement', RAM)
      return {
        description: ram(one(line, 'SpecifiedTradeProduct', RAM), 'Name'),
        quantity: quantity?.text || '',
        unitCode: quantity?.attrs.unitCode || '',
        unitPrice: ram(one(prices, 'NetPriceProductTradePrice', RAM), 'ChargeAmount'),
        netAmount: ram(
          one(lineSettlement, 'SpecifiedTradeSettlementLineMonetarySummation', RAM),
          'LineTotalAmount',
        ),
        taxRate: ram(one(lineSettlement, 'ApplicableTradeTax', RAM), 'RateApplicablePercent'),
        taxCategory: category(ram(one(lineSettlement, 'ApplicableTradeTax', RAM), 'CategoryCode')),
        priceBaseQuantity:
          ram(one(prices, 'NetPriceProductTradePrice', RAM), 'BasisQuantity') || undefined,
        allowances: ciiAdjustments(lineSettlement, false, false),
        charges: ciiAdjustments(lineSettlement, true, false),
      }
    })
  } else throw new DocumentError('unsupportedInvoiceProfile')
  // This is a bounded read-only projection, not a complete copy of every XML field.
  // Never rebuild a supplier invoice from it; preserve the complete original.
  const parsed = recordSchema.safeParse(data)
  if (!parsed.success) throw new DocumentError('invoiceImportLimit')
  return {
    xml,
    xmlSha256: createHash('sha256').update(bytes).digest('hex'),
    format,
    profile,
    data: parsed.data,
  }
}
