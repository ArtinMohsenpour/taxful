import { XMLParser, XMLValidator } from 'fast-xml-parser'
export type ExportIssue = { code: string; message: string; field?: string }
export function zugferdIssues(report: string): ExportIssue[] {
  if (
    report.length > 2_000_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(report) ||
    XMLValidator.validate(report) !== true
  )
    return []
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(report)
  const result: ExportIssue[] = []
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'error' || key === 'exception')
        for (const error of Array.isArray(value) ? value : [value]) {
          if (result.length >= 20) break
          const message = String(typeof error === 'string' ? error : error?.['#text'] || '')
            .replace(/ from \/xslt\/.*$/s, '')
            .slice(0, 1200)
          const code =
            message.match(/\[ID ([\w-]+)\]/)?.[1] ||
            message.match(/^\[([\w-]+)\]/)?.[1] ||
            'validation'
          const location = String(error?.['@_location'] || '')
          let field: string | undefined = (
            {
              'BR-CO-14': 'taxAmount',
              'BR-CO-13': 'netAmount',
              'BR-CO-15': 'grossAmount',
            } as Record<string, string>
          )[code]
          if (/unitCode/i.test(message)) {
            const index = location.match(/IncludedSupplyChainTradeLineItem.*?\[(\d+)\]/)?.[1]
            if (index) field = 'lines.' + (Number(index) - 1) + '.unitCode'
          }
          if (message) result.push({ code, message, field })
        }
      else if (Array.isArray(value)) value.forEach(walk)
      else walk(value)
    }
  }
  walk(parsed)
  return result
}
