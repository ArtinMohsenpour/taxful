// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { readWebsitePage } from '@/lib/website/read'
import { submitWebsiteForm } from '@/lib/website/forms/submit'
import { submissionSchema, validateAnswers } from '@/lib/website/forms/validation'
import { websiteLink, publicMediaURL } from '@/lib/website/urls'
import { readHome } from '@/lib/home/read'
import sharp from 'sharp'
import { PUBLIC_MEDIA_MAX_BYTES } from '@/lib/website/media-settings'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

describe('Reusable website content', () => {
  it('populates usable media URLs on saved home and page blocks, including filenames with spaces', async () => {
    const data = await sharp({
      create: { width: 8, height: 6, channels: 3, background: '#8B9A6E' },
    })
      .png()
      .toBuffer()
    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Synthetic persisted image' },
      file: {
        name: `website image ${randomUUID()}.png`,
        mimetype: 'image/png',
        data,
        size: data.length,
      },
    })
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('An isolated transaction is required')
    try {
      const sections = [
        {
          blockType: 'fullWidth' as const,
          column1: { content: [{ type: 'image' as const, image: media.id }] },
        },
      ]
      for (const slug of ['home', 'about'] as const)
        await payload.updateGlobal({
          slug,
          locale: 'en',
          overrideAccess: true,
          req: { transactionID },
          data: { sections, _status: 'published' },
        })
      for (const page of [
        await readHome(payload, { locale: 'en', draft: false, req: { transactionID } }),
        await readWebsitePage(payload, 'about', 'en', false, undefined, { transactionID }),
      ]) {
        const image = page.sections?.[0].column1?.content?.[0].image
        expect(typeof image).toBe('object')
        if (!image || typeof image !== 'object') throw new Error('Media was not populated')
        expect(image.filename).toBe(media.filename)
        expect(image.url).toBe(media.url)
        expect(publicMediaURL(image.url)).toContain('%20')
      }
    } finally {
      await payload.db.rollbackTransaction(transactionID)
      await payload.delete({ collection: 'media', id: media.id, overrideAccess: true })
    }
  })

  it('rejects oversized media through the Local API before storing a file', async () => {
    await expect(
      payload.create({
        collection: 'media',
        overrideAccess: true,
        data: { alt: 'Oversized synthetic file' },
        file: {
          name: `oversized-${randomUUID()}.webm`,
          mimetype: 'video/webm',
          data: Buffer.alloc(0),
          size: PUBLIC_MEDIA_MAX_BYTES + 1,
        },
      }),
    ).rejects.toMatchObject({ status: 413 })
  })
  it('serves published localized pages, hides legal drafts and rejects anonymous changes', async () => {
    const de = await readWebsitePage(payload, 'services', 'de')
    const en = await readWebsitePage(payload, 'services', 'en')
    expect(de.title).toBe('Ein klarer Weg zur E-Rechnung.')
    expect(en.title).toBe('A clear path to e-invoicing.')
    expect(en.sections?.map((section) => section.blockType)).toEqual(['threeColumns', 'fullWidth'])
    const legal = await readWebsitePage(payload, 'privacy', 'de')
    expect(legal._status).not.toBe('published')
    await expect(readWebsitePage(payload, 'privacy', 'de', true)).rejects.toThrow()
    await expect(
      payload.updateGlobal({ slug: 'about', overrideAccess: false, data: { title: 'Denied' } }),
    ).rejects.toThrow()
    await expect(
      payload.findGlobalVersions({ slug: 'contact', overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'website-forms', draft: true, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'form-submissions', overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'form-submissions',
        overrideAccess: false,
        data: {
          reference: randomUUID(),
          fingerprint: 'test',
          form: 1,
          sourcePage: 'contact',
          locale: 'de',
          answers: {},
          status: 'new',
        },
      }),
    ).rejects.toThrow()
  })

  it('supports all three layouts, localized blank headings, draft preview and explicit publication', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('An isolated transaction is required')
    try {
      const req = { transactionID }
      const user = {
        ...(await payload.create({
          collection: 'users',
          overrideAccess: true,
          req,
          data: {
            email: `website-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'content-editor',
          },
        })),
        collection: 'users' as const,
      }
      await payload.updateGlobal({
        slug: 'about',
        locale: 'en',
        overrideAccess: false,
        user,
        req,
        draft: true,
        data: {
          title: 'Private preview',
          _status: 'draft',
          sections: [
            {
              blockType: 'fullWidth',
              column1: {
                content: [
                  {
                    type: 'text',
                    text: {
                      root: {
                        type: 'root',
                        version: 1,
                        indent: 0,
                        format: '',
                        direction: null,
                        children: [
                          {
                            type: 'paragraph',
                            version: 1,
                            children: [
                              {
                                type: 'text',
                                version: 1,
                                text: 'Synthetic section text.',
                                format: 0,
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
            { blockType: 'twoColumns', column1: { content: [] }, column2: { content: [] } },
            {
              blockType: 'threeColumns',
              column1: { content: [] },
              column2: { content: [] },
              column3: { content: [] },
            },
          ],
        },
      })
      const publicPage = await readWebsitePage(payload, 'about', 'en', false, undefined, {
        transactionID,
      })
      expect(publicPage.title).toBe('More clarity for your invoices.')
      const draft = await readWebsitePage(payload, 'about', 'en', true, user, { transactionID })
      expect(draft.title).toBe('Private preview')
      expect(draft.sections).toHaveLength(3)
      await payload.updateGlobal({
        slug: 'about',
        locale: 'en',
        overrideAccess: false,
        user,
        req,
        data: { ...draft, _status: 'published', title: '', eyebrow: '', subtitle: '' },
      })
      const published = await readWebsitePage(payload, 'about', 'en', false, undefined, {
        transactionID,
      })
      expect(published.title).toBe('')
      expect(published.sections).toHaveLength(3)
      const german = await readWebsitePage(payload, 'about', 'de', false, undefined, {
        transactionID,
      })
      expect(german.title).toBe('Mehr Klarheit für Ihre Rechnungen.')
      expect(german.sections).toHaveLength(1)
      await payload.updateGlobal({
        slug: 'about',
        locale: 'en',
        overrideAccess: false,
        user,
        req,
        data: { sections: [], _status: 'published' },
      })
      expect(
        (await readWebsitePage(payload, 'about', 'en', false, undefined, { transactionID }))
          .sections,
      ).toBeNull()
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  }, 30000)

  it('validates the selected content type when publishing', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('An isolated transaction is required')
    try {
      const req = { transactionID }
      const user = {
        ...(await payload.create({
          collection: 'users',
          overrideAccess: true,
          req,
          data: {
            email: `website-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'manager',
          },
        })),
        collection: 'users' as const,
      }
      await expect(
        payload.updateGlobal({
          slug: 'about',
          locale: 'en',
          overrideAccess: false,
          user,
          req,
          data: {
            _status: 'published',
            sections: [{ blockType: 'fullWidth', column1: { content: [{ type: 'video' }] } }],
          },
        }),
      ).rejects.toThrow()
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  })
})

describe('Private form inbox', () => {
  it('validates fields, stores label snapshots, prevents duplicate retries and rejects unpublished placements', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('An isolated transaction is required')
    try {
      const page = await readWebsitePage(payload, 'contact', 'en', false, undefined, {
        transactionID,
      })
      const section = page.sections?.[0]
      const form = section && 'column2' in section ? section.column2?.content?.[0].form : null
      if (!form || typeof form !== 'object')
        throw new Error('Expected the populated published contact form')
      const input = {
        formId: form.id,
        reference: randomUUID(),
        page: 'contact' as const,
        locale: 'en' as const,
        website: '',
        answers: {
          name: 'Synthetic test',
          email: 'contact-test@example.invalid',
          message: 'Synthetic message only.',
        },
      }
      expect(submissionSchema.safeParse(input).success).toBe(true)
      expect(validateAnswers(form, { ...input.answers, email: 'invalid' }).errors).toEqual([
        'email',
      ])
      expect(validateAnswers(form, { ...input.answers, message: '' }).errors).toEqual(['message'])
      expect(validateAnswers(form, { ...input.answers, unexpected: 'extra' }).errors).toEqual([
        '_form',
      ])
      expect(await submitWebsiteForm(payload, input, { transactionID })).toEqual({ accepted: true })
      expect(await submitWebsiteForm(payload, input, { transactionID })).toEqual({ accepted: true })
      const records = await payload.find({
        collection: 'form-submissions',
        overrideAccess: true,
        req: { transactionID },
        where: { reference: { equals: input.reference } },
      })
      expect(records.totalDocs).toBe(1)
      expect(records.docs[0].answers).toContainEqual({
        key: 'email',
        label: 'Email',
        value: 'contact-test@example.invalid',
      })
      await expect(
        submitWebsiteForm(
          payload,
          { ...input, answers: { ...input.answers, message: 'Different message' } },
          { transactionID },
        ),
      ).rejects.toThrow()
      await expect(
        submitWebsiteForm(
          payload,
          { ...input, reference: randomUUID(), page: 'about' },
          { transactionID },
        ),
      ).rejects.toThrow()
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  }, 30000)

  it('validates dropdown options, required checkboxes and unsafe URL schemes', () => {
    const form = {
      fields: [
        {
          key: 'topic',
          type: 'select',
          label: 'Topic',
          required: true,
          options: [{ value: 'invoices', label: 'Invoices' }],
        },
        { key: 'confirm', type: 'checkbox', label: 'Confirm', required: true },
      ],
    } as Parameters<typeof validateAnswers>[0]
    expect(validateAnswers(form, { topic: 'invoices', confirm: true }).errors).toEqual([])
    expect(validateAnswers(form, { topic: 'other', confirm: false }).errors).toEqual([
      'topic',
      'confirm',
    ])
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,unsafe',
      '//example.com',
      '/%5cunsafe',
    ])
      expect(websiteLink(url, 'en')).toBeUndefined()
    expect(websiteLink('/contact', 'de')).toBe('/de/contact')
    expect(websiteLink('/de/about', 'en')).toBe('/en/about')
    expect(publicMediaURL('https://tracker.invalid/image.png')).toBeUndefined()
    expect(publicMediaURL('/api/media/file/example.png')).toBe('/api/media/file/example.png')
  })
})
