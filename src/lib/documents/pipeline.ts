import type { PreparedDocument } from './prepare'
import { extractDocument } from './extract'
import { validateRecord, reviewWarnings } from './schema'

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
