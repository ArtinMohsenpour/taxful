import { test } from 'node:test'
import assert from 'node:assert/strict'
import { config } from 'dotenv'

test(
  'live Gemini extracts a synthetic invoice without customer data',
  { skip: process.env.DOCUMENT_LIVE_GEMINI !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { extractDocument } = await import('../../src/lib/documents/extract')
    try {
      const result = await extractDocument([
        {
          text: 'SYNTHETIC TEST DOCUMENT. Invoice TEST-LIVE-001. Date: 2026-09-13. Supplier: Synthetic Supplier GmbH. Customer: Synthetic Customer GmbH. Consulting: quantity 1, unit price EUR 100.00, net EUR 100.00, VAT 19% EUR 19.00, gross EUR 119.00. Currency EUR. No other details provided.',
        },
      ])
      assert.equal(result.data.documentNumber, 'TEST-LIVE-001')
      assert.equal(result.data.grossAmount, '119.00')
      assert.equal(result.data.issuer.taxId, '')
    } catch (error) {
      // Never dump provider request objects, headers, credentials or document content.
      const status =
        typeof error === 'object' && error && 'status' in error ? String(error.status) : 'unknown'
      let reason = 'Request rejected'
      if (error instanceof Error) {
        try {
          reason = JSON.parse(error.message).error.message
        } catch {
          /* No raw error objects. */
        }
      }
      reason = String(reason)
        .split(process.env.GEMINI_API_KEY || 'no-key')
        .join('[redacted]')
        .slice(0, 1000)
      throw new Error('Synthetic Gemini check failed (HTTP status ' + status + '): ' + reason)
    }
  },
)
