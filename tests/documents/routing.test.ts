import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractPreparedDocument } from '../../src/lib/documents/pipeline'
import { readableText, type PreparedDocument } from '../../src/lib/documents/prepare'
import { documentFilters } from '../../src/lib/documents/listing'
import { invoiceFixture } from './fixtures'

test('text routing preserves a valid result and falls back once for inconsistent totals', async () => {
  const prepared: PreparedDocument = {
    text: 'Synthetic text',
    pages: 1,
    parts: [{ text: 'local text' }],
    fallbackParts: [{ text: 'visual fixture' }],
    method: 'text',
  }
  let calls = 0
  const good = { data: invoiceFixture(), evidence: [], warnings: [], model: 'synthetic' }
  const first = await extractPreparedDocument(prepared, async () => {
    calls++
    return good
  })
  assert.equal(first.method, 'text')
  assert.equal(calls, 1)
  calls = 0
  const second = await extractPreparedDocument(prepared, async () => {
    calls++
    return calls === 1 ? { ...good, data: { ...good.data, grossAmount: '999.00' } } : good
  })
  assert.equal(second.method, 'vision')
  assert.equal(calls, 2)
  assert.equal(second.data.grossAmount, '119.00')
  calls = 0
  await assert.rejects(
    extractPreparedDocument(prepared, async () => {
      calls++
      throw new Error('network')
    }),
  )
  assert.equal(calls, 1)
})
test('unreadable text and invalid or reversed date filters are rejected', () => {
  assert.equal(readableText('short text'), false)
  assert.equal(readableText('Invoice contents '.repeat(20) + '\uFFFD'), false)
  assert.equal(readableText('Invoice contents '.repeat(20)), true)
  assert.throws(() => documentFilters(new URLSearchParams('from=2026-02-30')))
  assert.throws(() => documentFilters(new URLSearchParams('from=2026-09-13&to=2026-09-12')))
  assert.throws(() => documentFilters(new URLSearchParams('page=-1')))
  assert.equal(documentFilters(new URLSearchParams('q=tax&status=exported')).q, 'tax')
})
