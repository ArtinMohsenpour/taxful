// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { readHome } from '@/lib/home/read'
import { homeContent } from '@/lib/home/content'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

describe('Home global', () => {
  it('allows published reads and rejects anonymous writes, drafts and version history', async () => {
    const published = await payload.findGlobal({
      slug: 'home',
      locale: 'de',
      overrideAccess: false,
    })
    expect(published._status).toBe('published')
    expect(published.providers).toHaveLength(6)
    await expect(
      payload.updateGlobal({ slug: 'home', overrideAccess: false, data: { title: 'Denied' } }),
    ).rejects.toThrow()
    await expect(
      payload.findGlobal({ slug: 'home', overrideAccess: false, draft: true }),
    ).rejects.toThrow()
    await expect(
      payload.findGlobalVersions({ slug: 'home', overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('localizes and reorders published content while keeping saved drafts private', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('This test needs an isolated transaction')
    const req = { transactionID }
    try {
      const user = {
        ...(await payload.create({
          collection: 'users',
          req,
          overrideAccess: true,
          data: {
            email: `home-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'content-editor',
          },
        })),
        collection: 'users' as const,
      }
      await payload.updateGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'de',
        data: {
          title: 'Veröffentlicht',
          _status: 'published',
          providers: [{ provider: 'fastbill' }, { provider: 'datev' }],
        },
      })
      await payload.updateGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'en',
        data: { title: 'Published', _status: 'published' },
      })
      const de = await payload.findGlobal({
        slug: 'home',
        req: { transactionID },
        overrideAccess: false,
        locale: 'de',
      })
      const en = await payload.findGlobal({
        slug: 'home',
        req: { transactionID },
        overrideAccess: false,
        locale: 'en',
      })
      expect(de.title).toBe('Veröffentlicht')
      expect(en.title).toBe('Published')
      expect(en.providers?.map((row) => row.provider)).toEqual(['fastbill', 'datev'])
      await payload.updateGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'en',
        draft: true,
        data: { title: 'Private draft', _status: 'draft', providers: [{ provider: 'sage' }] },
      })
      const publicHome = await payload.findGlobal({
        slug: 'home',
        req: { transactionID },
        overrideAccess: false,
        locale: 'en',
        draft: false,
      })
      expect(publicHome.title).toBe('Published')
      expect(publicHome.providers?.map((row) => row.provider)).toEqual(['fastbill', 'datev'])
      const draft = await payload.findGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'en',
        draft: true,
      })
      expect(draft.title).toBe('Private draft')
      expect(draft.providers?.[0].provider).toBe('sage')
      // Publish the saved draft explicitly; publishing is what makes it public.
      await payload.updateGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'en',
        data: { ...draft, _status: 'published' },
      })
      expect(
        (
          await payload.findGlobal({
            slug: 'home',
            req: { transactionID },
            overrideAccess: false,
            locale: 'en',
          })
        ).title,
      ).toBe('Private draft')
      await payload.updateGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'en',
        data: { _status: 'published', eyebrow: '', title: '', titleAccent: '', description: '' },
      })
      const emptyEnglish = await readHome(payload, {
        locale: 'en',
        draft: false,
        req: { transactionID },
      })
      expect(homeContent(emptyEnglish, 'en').labels).toMatchObject({
        eyebrow: '',
        title: '',
        titleAccent: '',
        description: '',
      })
      const german = await readHome(payload, { locale: 'de', draft: false, req: { transactionID } })
      expect(german.title).toBe('Veröffentlicht')
      await payload.updateGlobal({
        slug: 'home',
        req,
        user,
        overrideAccess: false,
        locale: 'de',
        data: {
          _status: 'published',
          eyebrow: null,
          title: null,
          titleAccent: null,
          description: null,
        },
      })
      const emptyGerman = await readHome(payload, {
        locale: 'de',
        draft: false,
        req: { transactionID },
      })
      expect(homeContent(emptyGerman, 'de').labels).toMatchObject({
        eyebrow: '',
        title: '',
        titleAccent: '',
        description: '',
      })
      // Payload rolls back the request transaction on an access failure. Keep
      // this assertion last so no later write can start a fresh transaction.
      await expect(
        payload.findGlobal({
          slug: 'home',
          req: { transactionID },
          overrideAccess: false,
          draft: true,
        }),
      ).rejects.toThrow()
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  }, 30000)

  it('validates company limits and custom-logo requirements before publishing', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('This test needs an isolated transaction')
    const req = { transactionID }
    try {
      const user = {
        ...(await payload.create({
          collection: 'users',
          req,
          overrideAccess: true,
          data: {
            email: `home-${randomUUID()}@example.invalid`,
            password: randomUUID(),
            role: 'manager',
          },
        })),
        collection: 'users' as const,
      }
      for (const providers of [
        [],
        Array.from({ length: 7 }, () => ({ provider: 'datev' as const })),
        [{ provider: 'custom' as const }],
        [{ provider: 'custom' as const, name: 'Custom company' }],
      ]) {
        await expect(
          payload.updateGlobal({
            slug: 'home',
            req,
            user,
            overrideAccess: false,
            data: { _status: 'published', providers },
          }),
        ).rejects.toThrow()
      }
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  }, 30000)
})
