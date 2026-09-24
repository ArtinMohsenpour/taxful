import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import mammoth from 'mammoth'
import yauzl from 'yauzl'
import { documentLimits, DocumentError } from './config'
import type { Part } from '@google/genai'
import {
  decodeInvoiceXml,
  parseStructuredInvoice,
  type StructuredInvoice,
} from './structured-invoice'

export const supportedMimes = new Set([
  'application/pdf',
  'application/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'image/gif',
  'image/avif',
])
export function invoiceAttachment(attachments: { filename: string; content: Uint8Array }[]) {
  if (
    attachments.length !== 1 ||
    !/^(factur-x|zugferd-invoice|xrechnung)\.xml$/i.test(attachments[0].filename)
  )
    throw new DocumentError('activePdf')
  const embedded = Buffer.from(attachments[0].content)
  return { embedded, structured: parseStructuredInvoice(embedded) }
}
export async function detectDocument(bytes: Buffer) {
  // Detect XML by content, never by an extension supplied by the uploader.
  if (
    bytes
      .subarray(0, 256)
      .toString('utf8')
      .replace(/^\uFEFF/, '')
      .trimStart()
      .startsWith('<')
  ) {
    decodeInvoiceXml(bytes)
    return 'application/xml'
  }
  const type = await fileTypeFromBuffer(bytes)
  if (!type || !supportedMimes.has(type.mime)) throw new DocumentError('unsupportedFile')
  return type.mime
}
async function inspectDocx(buffer: Buffer): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new DocumentError('invalidFile'))
      let total = 0,
        entries = 0
      const media: Buffer[] = []
      let hasDocument = false
      const fail = () => {
        zip.close()
        reject(new DocumentError('invalidFile'))
      }
      zip.on('error', fail)
      zip.on('entry', (entry) => {
        entries++
        total += entry.uncompressedSize
        if (
          entries > 1000 ||
          total > 40 * 1024 * 1024 ||
          entry.uncompressedSize > 10 * 1024 * 1024 ||
          entry.isEncrypted() ||
          /vbaProject|word\/embeddings\//i.test(entry.fileName)
        )
          return fail()
        if (entry.fileName === 'word/document.xml') hasDocument = true
        if (/^word\/media\//.test(entry.fileName) && !entry.fileName.endsWith('/')) {
          if (media.length >= 8) return fail()
          zip.openReadStream(entry, (error, stream) => {
            if (error || !stream) return fail()
            const chunks: Buffer[] = []
            let size = 0
            stream.on('data', (chunk) => {
              size += chunk.length
              if (size > 10 * 1024 * 1024) {
                stream.destroy()
                fail()
              } else chunks.push(chunk)
            })
            stream.on('error', fail)
            stream.on('end', () => {
              media.push(Buffer.concat(chunks))
              zip.readEntry()
            })
          })
        } else zip.readEntry()
      })
      zip.on('end', () => (hasDocument ? resolve(media) : reject(new DocumentError('invalidFile'))))
      zip.readEntry()
    })
  })
}
async function normalizeImage(bytes: Buffer) {
  const mime = await detectDocument(bytes)
  if (!mime.startsWith('image/')) throw new DocumentError('unsupportedFile')
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' })
  const metadata = await image.metadata()
  if ((metadata.pages || 1) > 1) throw new DocumentError('multiPageImage')
  return image
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
}
export async function prepareDocument(bytes: Buffer, mime: string): Promise<PreparedDocument> {
  if (mime === 'application/xml') {
    const structured = parseStructuredInvoice(bytes)
    return { text: structured.xml, pages: null, parts: [], method: 'structured_xml', structured }
  }
  if (mime.startsWith('image/')) {
    const preview = await normalizeImage(bytes)
    return {
      text: '',
      pages: 1,
      preview,
      parts: [{ inlineData: { mimeType: 'image/png', data: preview.toString('base64') } }],
      method: 'vision',
    }
  }
  if (mime === 'application/pdf') {
    const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const task = getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: false,
      stopAtErrors: true,
    })
    try {
      const pdf = await task.promise
      if (pdf.numPages > documentLimits().maxPages) throw new DocumentError('tooManyPages')
      if (await pdf.getJSActions()) throw new DocumentError('activePdf')
      const attachments = await pdf.getAttachments()
      let structured: StructuredInvoice | undefined
      let embedded: Buffer | undefined
      if (attachments?.size) {
        if (attachments.size !== 1) throw new DocumentError('activePdf')
        const [id, attachment] = attachments.entries().next().value!
        if (!/^(factur-x|zugferd-invoice|xrechnung)\.xml$/i.test(attachment.filename))
          throw new DocumentError('activePdf')
        const content = attachment.content ?? (await pdf.getAttachmentContent(id))
        if (!content) throw new DocumentError('invalidInvoiceXml')
        ;({ embedded, structured } = invoiceAttachment([
          { filename: attachment.filename, content },
        ]))
      }
      let text = ''
      let textSafe = true
      for (let page = 1; page <= pdf.numPages; page++) {
        const pdfPage = await pdf.getPage(page)
        if (await pdfPage.getJSActions()) throw new DocumentError('activePdf')
        if (structured) continue
        const content = await pdfPage.getTextContent()
        const items = content.items.filter((item) => 'str' in item)
        // Keep actual line breaks and column gaps; never flatten invoice tables into one sentence.
        let pageText = '',
          lastY: number | undefined,
          right = 0
        let columns = false
        for (const item of items) {
          const [, , , , x, y] = item.transform
          const newLine = lastY !== undefined && Math.abs(y - lastY) > 3
          const gap = lastY !== undefined && !newLine ? x - right : 0
          // PDF.js can represent a column gap as a synthetic whitespace item.
          const wideSpace = !item.str.trim() && item.width > 24
          if (gap > 24 || wideSpace || item.transform[1] !== 0 || item.transform[2] !== 0)
            columns = true
          pageText += (newLine ? '\n' : gap > 12 || wideSpace ? '\t' : ' ') + item.str
          if (item.hasEOL) pageText += '\n'
          lastY = y
          right = x + item.width
        }
        const operators = await pdfPage.getOperatorList()
        const images = operators.fnArray.some((op) =>
          [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject].includes(
            op,
          ),
        )
        if (!readableText(pageText) || columns || images) textSafe = false
        text += '\n[Page ' + page + ']\n' + pageText.trim()
        if (text.length > 100_000) throw new DocumentError('tooMuchText')
      }
      const visual: Part[] = [
        { inlineData: { mimeType: 'application/pdf', data: bytes.toString('base64') } },
      ]
      if (structured)
        return {
          text: structured.xml,
          pages: pdf.numPages,
          parts: [],
          method: 'embedded_xml',
          structured,
          embedded,
        }
      return {
        text,
        pages: pdf.numPages,
        parts: textSafe ? [{ text: 'Extracted PDF text with page references:\n' + text }] : visual,
        fallbackParts: textSafe ? visual : undefined,
        method: textSafe ? 'text' : 'vision',
      }
    } finally {
      await task.destroy()
    }
  }
  const images = await inspectDocx(bytes)
  const result = await mammoth.extractRawText({ buffer: bytes })
  if (result.value.length > 100_000) throw new DocumentError('tooMuchText')
  const parts: Part[] = [
    { text: 'Word document text (page numbers unavailable):\n' + result.value },
  ]
  for (const image of images) {
    const normalized = await normalizeImage(image)
    parts.push({ inlineData: { mimeType: 'image/png', data: normalized.toString('base64') } })
  }
  return { text: result.value, pages: null, parts, method: images.length ? 'text_images' : 'text' }
}

export type PreparedDocument = {
  text: string
  pages: number | null
  parts: Part[]
  fallbackParts?: Part[]
  preview?: Buffer
  method: 'text' | 'vision' | 'text_images' | 'structured_xml' | 'embedded_xml'
  structured?: StructuredInvoice
  embedded?: Buffer
}
export function readableText(text: string) {
  const value = text.trim()
  return (
    value.length >= 120 &&
    (value.match(/[\p{L}\p{N}]/gu)?.length || 0) / value.length > 0.45 &&
    !/[\uFFFD\u0000]/u.test(value)
  )
}
