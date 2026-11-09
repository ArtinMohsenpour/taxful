// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

const unique = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`

function minimalServicePage(slug: string) {
  return {
    slug,
    title: 'Test',
    summary: 'Test',
    keyPoints: [{ text: 'a' }, { text: 'b' }],
    sortOrder: 99,
    _status: 'published' as const,
  }
}

// Payload rolls back the request transaction on any failed operation. Every
// write runs in a transaction that is always rolled back, and an expected
// rejection is the last call inside it.
async function inRollback(run: (req: { transactionID: string | number }) => Promise<void>) {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('This test needs an isolated transaction')
  try {
    await run({ transactionID })
  } finally {
    await payload.db.rollbackTransaction(transactionID).catch(() => undefined)
  }
}

async function createUser(
  role: 'super-admin' | 'manager' | 'content-editor',
  req: { transactionID: string | number },
) {
  const user = await payload.create({
    collection: 'users',
    req,
    overrideAccess: true,
    data: { email: `services-${randomUUID()}@example.invalid`, password: randomUUID(), role },
  })
  return { ...user, collection: 'users' as const }
}

describe('Service pages collection', () => {
  it('rejects anonymous create, draft reads and version reads', async () => {
    await inRollback(async (req) => {
      await expect(
        payload.create({
          collection: 'service-pages',
          req,
          overrideAccess: false,
          data: minimalServicePage(unique('anon-denied')),
        }),
      ).rejects.toMatchObject({ name: 'Forbidden' })
    })
    await expect(
      payload.find({ collection: 'service-pages', overrideAccess: false, draft: true }),
    ).rejects.toMatchObject({ name: 'Forbidden' })
    await expect(
      payload.findVersions({ collection: 'service-pages', overrideAccess: false }),
    ).rejects.toMatchObject({ name: 'Forbidden' })
  })

  it('lets each CMS role create a draft that anonymous readers cannot see', async () => {
    await inRollback(async (req) => {
      for (const role of ['super-admin', 'manager', 'content-editor'] as const) {
        const user = await createUser(role, req)
        const doc = await payload.create({
          collection: 'service-pages',
          req,
          user,
          overrideAccess: false,
          draft: true,
          data: { ...minimalServicePage(unique(`draft-${role}`)), _status: 'draft' },
        })
        const editorView = await payload.find({
          collection: 'service-pages',
          req,
          user,
          overrideAccess: false,
          draft: true,
          where: { id: { equals: doc.id } },
        })
        expect(editorView.docs).toHaveLength(1)
        // Payload stores the acting user on a passed req; use a fresh one.
        const publicView = await payload.find({
          collection: 'service-pages',
          req: { transactionID: req.transactionID },
          overrideAccess: false,
          where: { id: { equals: doc.id } },
        })
        expect(publicView.docs).toHaveLength(0)
      }
    })
  }, 30000)

  it.each(['Upper', 'a--b', '-lead', 'trail-', 'prüfen', 'a/b', 'has space'])(
    'rejects the slug %j',
    async (slug) => {
      await inRollback(async (req) => {
        await expect(
          payload.create({
            collection: 'service-pages',
            req,
            overrideAccess: true,
            data: minimalServicePage(slug),
          }),
        ).rejects.toMatchObject({ name: 'ValidationError' })
      })
    },
  )

  it('rejects a duplicate slug', async () => {
    const slug = unique('dup-slug')
    await inRollback(async (req) => {
      await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        data: minimalServicePage(slug),
      })
      await expect(
        payload.create({
          collection: 'service-pages',
          req,
          overrideAccess: true,
          data: minimalServicePage(slug),
        }),
      ).rejects.toMatchObject({ name: 'ValidationError' })
    })
  })
})

describe('FAQ and service-card content items', () => {
  const answer = {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '' as const,
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          children: [
            {
              type: 'text',
              version: 1,
              text: 'Ja.',
              format: 0,
              detail: 0,
              mode: 'normal',
              style: '',
            },
          ],
        },
      ],
    },
  }

  it('stores FAQ and service-card items on a page global', async () => {
    await inRollback(async (req) => {
      const service = await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        data: minimalServicePage(unique('card-target')),
      })
      const saved = await payload.updateGlobal({
        slug: 'faq',
        req,
        overrideAccess: true,
        draft: true,
        locale: 'de',
        data: {
          sections: [
            {
              blockType: 'fullWidth',
              column1: {
                content: [
                  { type: 'faq', faq: [{ question: 'Gilt das?', answer }] },
                  { type: 'services', services: [service.id] },
                ],
              },
            },
          ],
        },
      })
      const items = saved.sections?.[0]?.column1?.content
      expect(items?.[0]).toMatchObject({ type: 'faq', faq: [{ question: 'Gilt das?' }] })
      const cards = items?.[1]?.services
      expect(cards?.map((card) => (typeof card === 'object' ? card.id : card))).toEqual([
        service.id,
      ])
    })
  })

  it('rejects a published FAQ item without a question', async () => {
    await inRollback(async (req) => {
      await expect(
        payload.updateGlobal({
          slug: 'faq',
          req,
          overrideAccess: true,
          locale: 'de',
          data: {
            _status: 'published',
            sections: [
              {
                blockType: 'fullWidth',
                column1: { content: [{ type: 'faq', faq: [{ answer }] }] },
              },
            ],
          },
        }),
      ).rejects.toMatchObject({
        name: 'ValidationError',
        data: { errors: [expect.objectContaining({ path: expect.stringMatching(/question$/) })] },
      })
    })
  })
})
