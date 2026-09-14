import type { PreparedDocument } from './prepare'
import { extractDocument } from './extract'
import { validateRecord, reviewWarnings, emptyRecord } from './schema'
import type { Classification } from './classify'

export async function extractClassifiedDocument(
  prepared: PreparedDocument,
  classification: Classification,
  extract = extractDocument,
) {
  if (classification.kind !== 'invoice' || classification.confidence !== 'high')
    return {
      data: emptyRecord(classification.kind),
      evidence: [],
      warnings: [],
      model: 'classification-only',
      method: prepared.method,
    }
  return extractPreparedDocument(prepared, extract)
}

// Only a structurally valid response can trigger one visual fallback. Network/auth failures
// are not retried here: another request could duplicate a billed extraction.
export async function extractPreparedDocument(
  prepared: PreparedDocument,
  extract = extractDocument,
) {
  let result = await extract(prepared.parts)
  let method = prepared.method
  if (
    prepared.fallbackParts &&
    (validateRecord(result.data).length > 0 ||
      reviewWarnings(result.data).includes('lineSum') ||
      result.data.documentType === 'other' ||
      (result.data.documentType === 'invoice' && !result.data.lines.length) ||
      result.evidence.some((item) => item.confidence === 'low'))
  ) {
    result = await extract(prepared.fallbackParts)
    method = 'vision'
  }
  return { ...result, method }
}
