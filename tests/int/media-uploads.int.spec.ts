// @vitest-environment node
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import {
  MEDIA_TYPE_MESSAGE,
  isSafeSvg,
  isSvgDocument,
  mediaResponseHeaders,
  mediaUploadError,
} from '@/lib/website/media-uploads'

let payload: Payload
let png: Buffer
beforeAll(async () => {
  payload = await getPayload({ config })
  png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#8B9A6E' } })
    .png()
    .toBuffer()
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

const file = (name: string, data: Buffer | string, mimetype = 'application/octet-stream') => ({
  name,
  mimetype,
  data: Buffer.isBuffer(data) ? data : Buffer.from(data),
})
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`

describe('Media upload policy', () => {
  it('accepts only website asset types whose content matches the extension', async () => {
    expect(await mediaUploadError(file('photo.png', png, 'image/png'))).toBeNull()
    expect(await mediaUploadError(file('Foto mit Leerzeichen.PNG', png))).toBeNull()
    expect(await mediaUploadError(file('photo.jpg', png, 'image/jpeg'))).toBe(
      'The file content does not match its .jpg extension.',
    )
    expect(await mediaUploadError(file('clip.webm', 'not a video', 'video/webm'))).toMatch(
      /does not match/,
    )
    expect(
      await mediaUploadError(file('captions.vtt', 'WEBVTT\n\n00:00.000 --> 00:01.000\nHi')),
    ).toBeNull()
    expect(
      await mediaUploadError(file('captions.vtt', '1\n00:00:00,000 --> 00:00:01,000')),
    ).toMatch(/WebVTT/)
  })

  it('rejects documents that the browser could run as same-origin pages', async () => {
    const xmlSvg = `<?xml version="1.0"?><x:svg xmlns:x="http://www.w3.org/2000/svg"><x:script>alert(1)</x:script></x:svg>`
    for (const name of [
      'logo.xml',
      'page.html',
      'page.html?',
      'page.htm',
      'a.xhtml',
      'notes.txt',
      'noextension',
      'a/b.png',
      'a%2e.png',
      'a.png#x',
    ])
      expect(await mediaUploadError(file(name, name.endsWith('.png') ? png : xmlSvg))).toBe(
        MEDIA_TYPE_MESSAGE,
      )
  })

  it('scans SVG logos, including namespaced and re-encoded markup', async () => {
    expect(await mediaUploadError(file('logo.svg', svg('<path d="M0 0h1"/>')))).toBeNull()
    for (const body of [
      '<script>alert(1)</script>',
      '<SCRIPT>alert(1)</SCRIPT>',
      '<rect onload="alert(1)"/>',
      '<foreignObject><div/></foreignObject>',
      '<a href="javascript:alert(1)"><rect/></a>',
      '<image href="data:text/html,x"/>',
    ])
      expect(await mediaUploadError(file('logo.svg', svg(body)))).toMatch(/scripts or embedded/)
    expect(
      await mediaUploadError(
        file(
          'logo.svg',
          '<x:svg xmlns:x="http://www.w3.org/2000/svg"><x:script>1</x:script></x:svg>',
        ),
      ),
    ).toMatch(/scripts or embedded/)
    expect(
      await mediaUploadError(
        file('logo.svg', Buffer.from(`﻿${svg('<script>1</script>')}`, 'utf16le')),
      ),
    ).toBe('SVG files must be UTF-8 encoded.')
    expect(await mediaUploadError(file('logo.svg', 'hello'))).toBe('This file is not an SVG image.')
    expect(isSvgDocument('<?xml version="1.0"?>\n<!-- logo -->\n<svg width="1">')).toBe(true)
    expect(isSafeSvg(svg('<x:foreignObject/>'))).toBe(false)
  })

  it('sandboxes every file response and downloads anything that is not an image or video', () => {
    const headersFor = (type: string) =>
      mediaResponseHeaders({ headers: new Headers({ 'Content-Type': type }) })
    const image = headersFor('image/svg+xml')
    expect(image.get('Content-Security-Policy')).toMatch(/^sandbox; default-src 'none'/)
    expect(image.get('X-Content-Type-Options')).toBe('nosniff')
    expect(image.get('Content-Disposition')).toBeNull()
    expect(headersFor('video/webm').get('Content-Disposition')).toBeNull()
    for (const type of ['text/html', 'application/xml', 'text/plain; charset=utf-8', ''])
      expect(headersFor(type).get('Content-Disposition')).toBe('attachment')
  })

  it('enforces the policy through the Payload Local API', async () => {
    await expect(
      payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: 'Synthetic XML document' },
        file: file(
          `${randomUUID()}.xml`,
          '<?xml version="1.0"?><svg/>',
          'application/xml',
        ) as never,
      }),
    ).rejects.toThrow()
    const ok = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Synthetic allowed image' },
      file: { name: `${randomUUID()}.png`, mimetype: 'image/png', data: png, size: png.length },
    })
    try {
      expect(ok.mimeType).toBe('image/png')
    } finally {
      await payload.delete({ collection: 'media', id: ok.id, overrideAccess: true })
    }
  })
})
