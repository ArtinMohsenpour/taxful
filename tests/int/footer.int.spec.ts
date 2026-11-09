// @vitest-environment node
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { readFooter } from '@/lib/footer/read'
import { copyrightText, emailHref, phoneHref } from '@/lib/footer/contact'
import type { Footer } from '@/payload-types'
import { isSafeSvg, looksLikeSvg } from '@/lib/website/svg-safety'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

const internal = (label: string, path: string) => ({
  label,
  link: { type: 'internal' as const, path },
})

describe('Footer', () => {
  it('rejects anonymous writes and draft reads, and permits published reads', async () => {
    await expect(
      payload.updateGlobal({ slug: 'footer', overrideAccess: false, data: { columns: [] } }),
    ).rejects.toThrow()
    await expect(
      payload.findGlobal({ slug: 'footer', overrideAccess: false, draft: true }),
    ).rejects.toThrow()
    await expect(
      payload.findGlobal({ slug: 'footer', overrideAccess: false, draft: false }),
    ).resolves.toBeDefined()
  })

  it('persists localized columns, social profiles and partners without committing test data', async () => {
    const data = await sharp({
      create: { width: 12, height: 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    const logo = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Synthetic partner logo' },
      file: { name: `partner ${randomUUID()}.png`, mimetype: 'image/png', data, size: data.length },
    })
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('A transaction is required for this test')
    const req = { transactionID }
    try {
      const user = {
        ...(await payload.create({
          collection: 'users',
          req,
          overrideAccess: true,
          data: {
            email: `footer-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'content-editor',
          },
        })),
        collection: 'users' as const,
      }
      const saved = await payload.updateGlobal({
        slug: 'footer',
        locale: 'de',
        user,
        overrideAccess: false,
        req,
        data: {
          _status: 'published',
          tagline: 'Mehr Klarheit.',
          contact: { email: 'hallo@example.com', phone: '+49 30 123456' },
          columns: [{ title: 'Unternehmen', links: [internal('Über uns', 'about')] }],
          social: [{ platform: 'linkedin', url: 'https://www.linkedin.com/company/example' }],
          partners: [{ name: 'Partner', logo: logo.id, appearance: 'monochrome' }],
          copyright: '© {year} Taxful',
          legalLinks: [internal('Impressum', '/impressum')],
        },
      })
      // English translates the shared structure; the untranslated legal label falls back to German.
      await payload.updateGlobal({
        slug: 'footer',
        locale: 'en',
        user,
        overrideAccess: false,
        req,
        data: {
          _status: 'published',
          tagline: 'More clarity.',
          columns: saved.columns!.map((column) => ({
            ...column,
            title: 'Company',
            links: column.links!.map((entry) => ({ ...entry, label: 'About us' })),
          })),
        },
      })
      const de = await readFooter(payload, { locale: 'de', req })
      const en = await readFooter(payload, { locale: 'en', req })
      expect(de.footer.columns?.[0].title).toBe('Unternehmen')
      expect(en.footer.columns?.[0].title).toBe('Company')
      expect(en.footer.columns?.[0].links?.[0].label).toBe('About us')
      expect(en.footer.tagline).toBe('More clarity.')
      expect(en.footer.legalLinks?.[0].label).toBe('Impressum')
      expect(en.footer.social?.[0].platform).toBe('linkedin')
      const partnerLogo = en.footer.partners?.[0].logo
      expect(typeof partnerLogo === 'object' && partnerLogo.url).toMatch(/^\/api\/media\/file\//)

      const invalid: Partial<Footer>[] = [
        { columns: [{ title: 'X', links: [internal('Unsafe', 'javascript:alert(1)')] }] },
        { columns: [{ title: 'X', links: [internal('Missing', '')] }] },
        { legalLinks: [{ label: 'Bad', link: { type: 'external', url: 'javascript:alert(1)' } }] },
        { social: [{ platform: 'x', url: 'ftp://example.com' }] },
        { partners: [{ name: 'Bad', logo: logo.id, url: 'javascript:alert(1)' }] },
        { contact: { phone: 'call me' } },
      ]
      for (const data of invalid)
        await expect(
          payload.updateGlobal({ slug: 'footer', req, user, overrideAccess: false, data }),
        ).rejects.toThrow(/invalid/i)
    } finally {
      await payload.db.rollbackTransaction(transactionID)
      await payload.delete({ collection: 'media', id: logo.id, overrideAccess: true })
    }
  })

  it('accepts safe SVG logos, rejects unsafe SVG uploads and explains unsupported formats', async () => {
    const svg = (body: string) =>
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40">${body}</svg>`)
    const upload = (name: string, data: Buffer, mimetype: string) =>
      payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: 'Synthetic footer logo' },
        file: { name: `${randomUUID()}-${name}`, mimetype, data, size: data.length },
      })
    for (const body of [
      '<script>alert(1)</script>',
      '<rect width="1" height="1" onload="alert(1)"/>',
      '<foreignObject><div>x</div></foreignObject>',
      '<a href="javascript:alert(1)"><rect width="1" height="1"/></a>',
    ])
      await expect(upload('unsafe.svg', svg(body), 'image/svg+xml')).rejects.toThrow()
    // Detection does not trust the client MIME type or file name.
    await expect(
      upload('disguised.png', svg('<script>alert(1)</script>'), 'image/png'),
    ).rejects.toThrow()

    const logo = await upload(
      'logo.svg',
      svg('<rect width="120" height="40" fill="#52613f"/>'),
      'image/svg+xml',
    )
    const text = await upload('notes.txt', Buffer.from('not an image'), 'text/plain')
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('A transaction is required for this test')
    const req = { transactionID }
    try {
      expect(logo.mimeType).toBe('image/svg+xml')
      await payload.updateGlobal({
        slug: 'footer',
        req,
        overrideAccess: true,
        locale: 'de',
        data: {
          _status: 'published',
          logo: logo.id,
          partners: [{ name: 'SVG partner', logo: logo.id, appearance: 'monochrome' }],
        },
      })
      const { footer } = await readFooter(payload, { locale: 'de', req })
      const partnerLogo = footer.partners?.[0].logo
      expect(typeof partnerLogo === 'object' && partnerLogo.url).toMatch(/\.svg$/)
      await expect(
        payload.updateGlobal({
          slug: 'footer',
          req,
          overrideAccess: true,
          data: { _status: 'published', partners: [{ name: 'Text', logo: text.id }] },
        }),
      ).rejects.toThrow(/invalid/i)
      const error = await payload
        .updateGlobal({
          slug: 'footer',
          req,
          overrideAccess: true,
          data: { _status: 'published', logo: text.id },
        })
        .catch((caught: { data?: { errors?: { message: string }[] } }) => caught)
      expect(JSON.stringify(error)).toContain('Choose an SVG, PNG, WebP, AVIF, JPEG or GIF image.')
    } finally {
      await payload.db.rollbackTransaction(transactionID)
      for (const id of [logo.id, text.id])
        await payload.delete({ collection: 'media', id, overrideAccess: true })
    }
  })

  it('detects SVG content independently of the declared type', () => {
    expect(looksLikeSvg({ name: 'a.png' }, '<?xml version="1.0"?>\n<svg xmlns="x">')).toBe(true)
    expect(looksLikeSvg({ name: 'a.png', mimetype: 'image/png' }, '\u0089PNG')).toBe(false)
    expect(isSafeSvg('<svg><path d="M0 0h1"/></svg>')).toBe(true)
    expect(isSafeSvg('<svg><SCRIPT>x</SCRIPT></svg>')).toBe(false)
    expect(isSafeSvg('<svg><image href="data:text/html,x"/></svg>')).toBe(false)
  })

  it('formats copyright years and contact links safely', () => {
    expect(copyrightText('© {year} Taxful – {year}', 2030)).toBe('© 2030 Taxful – 2030')
    expect(copyrightText('  ', 2030)).toBe('')
    expect(phoneHref('+49 (0)30 / 123-45 67')).toBe('tel:+490301234567')
    expect(phoneHref('javascript:alert(1)')).toBeNull()
    expect(phoneHref('12')).toBeNull()
    expect(emailHref('hallo@example.com')).toBe('mailto:hallo@example.com')
    expect(emailHref('hallo@example.com?bcc=x@evil.test')).toBeNull()
    expect(emailHref('hallo@example.com?bcc=evil')).toBeNull()
    expect(emailHref('a?cc=b@example.com')).toBeNull()
    expect(emailHref('not an email')).toBeNull()
  })
})
