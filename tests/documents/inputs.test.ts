import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { detectDocument, prepareDocument } from '../../src/lib/documents/prepare'
import { extractDocument } from '../../src/lib/documents/extract'
import { invoiceFixture } from './fixtures'
import { syntheticPdf } from './pdf-fixture'
test('reads a real text PDF and safely normalizes a raster image', async () => {
  const bytes = syntheticPdf()
  assert.equal(await detectDocument(bytes), 'application/pdf')
  const pdf = await prepareDocument(bytes, 'application/pdf')
  assert.equal(pdf.pages, 1)
  assert.match(pdf.text, /119.00 EUR/)
  assert.equal(pdf.method, 'vision')
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#ffffff' } })
    .png()
    .toBuffer()
  const image = await prepareDocument(png, 'image/png')
  assert.equal(image.pages, 1)
  assert.ok(image.preview)
  assert.equal(image.parts[0].inlineData?.mimeType, 'image/png')
})
test('PDF routing sends clean paragraphs as text but keeps column layouts on vision', async () => {
  const content =
    'BT /F1 6 Tf 20 90 Td (Synthetic Supplier issues invoice TEST-ROUTE-001 on 2026-09-13.) Tj 0 -15 Td (Customer Synthetic GmbH received consulting services.) Tj 0 -15 Td (Net amount EUR 100.00 and VAT 19 percent EUR 19.00.) Tj 0 -15 Td (Total EUR 119.00 payable in cash.) Tj ET'
  const clean = await prepareDocument(syntheticPdf(content), 'application/pdf')
  assert.equal(clean.method, 'text')
  assert.ok(clean.parts[0].text)
  assert.ok(clean.fallbackParts?.[0].inlineData)
  const columns = await prepareDocument(
    syntheticPdf(content + ' BT /F1 6 Tf 20 20 Td (Item) Tj 150 0 Td (Price EUR 100.00) Tj ET'),
    'application/pdf',
  )
  assert.equal(columns.method, 'vision')
})
test('reads DOCX text without rendering uploaded HTML', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'taxful-docx-test-'))
  try {
    await mkdir(path.join(directory, 'word'))
    await mkdir(path.join(directory, '_rels'))
    await writeFile(
      path.join(directory, '[Content_Types].xml'),
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    )
    await writeFile(
      path.join(directory, '_rels', '.rels'),
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    )
    await writeFile(
      path.join(directory, 'word', 'document.xml'),
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic invoice 119.00 EUR</w:t></w:r></w:p></w:body></w:document>',
    )
    const file = path.join(directory, 'synthetic.docx')
    await promisify(execFile)('zip', ['-q', '-r', file, '[Content_Types].xml', 'word', '_rels'], {
      cwd: directory,
    })
    const bytes = await readFile(file),
      mime = await detectDocument(bytes)
    const result = await prepareDocument(bytes, mime)
    assert.equal(result.pages, null)
    assert.match(result.text, /119.00 EUR/)
    assert.equal(result.parts.length, 1)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
test('Gemini adapter uses structured output without tools and rejects malformed output', async () => {
  const originalFetch = globalThis.fetch,
    originalKey = process.env.GEMINI_API_KEY,
    originalEnabled = process.env.DOCUMENT_AI_ENABLED
  process.env.GEMINI_API_KEY = 'synthetic-not-a-real-api-key'
  process.env.DOCUMENT_AI_ENABLED = 'true'
  let malformed = false
  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(
      String(init?.body || (input instanceof Request ? await input.text() : '')),
    )
    assert.equal(body.tools, undefined)
    assert.equal(body.generationConfig.responseMimeType, 'application/json')
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            role: 'model',
            parts: [
              {
                text: JSON.stringify(
                  malformed
                    ? { bad: 'schema' }
                    : { data: invoiceFixture(), evidence: [], warnings: [] },
                ),
              },
            ],
          },
        },
      ],
    })
  }
  try {
    assert.equal(
      (await extractDocument([{ text: 'Synthetic fixture' }])).data.documentNumber,
      'TEST-2026-001',
    )
    malformed = true
    await assert.rejects(extractDocument([{ text: 'Synthetic fixture' }]))
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = originalKey
    if (originalEnabled === undefined) delete process.env.DOCUMENT_AI_ENABLED
    else process.env.DOCUMENT_AI_ENABLED = originalEnabled
  }
})
