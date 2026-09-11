// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { externalHref, internalHref } from '@/lib/navigation-links'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  await payload?.destroy()
})

describe('Navbar', () => {
  it('rejects anonymous writes and permits public reads', async () => {
    await expect(
      payload.updateGlobal({ slug: 'navbar', overrideAccess: false, data: { items: [] } }),
    ).rejects.toThrow()
    await expect(
      payload.findGlobal({ slug: 'navbar', overrideAccess: false, draft: false }),
    ).resolves.toBeDefined()
  })

  it('persists localized dropdowns and buttons, without committing test data', async () => {
    const users = await payload.find({ collection: 'users', limit: 1 })
    expect(users.docs[0]).toBeDefined()
    const user = { ...users.docs[0], collection: 'users' as const }
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('A transaction is required for this test')
    const req = { transactionID }
    try {
      const saved = await payload.updateGlobal({
        slug: 'navbar',
        locale: 'de',
        user,
        overrideAccess: false,
        req,
        data: {
          _status: 'published',
          items: [
            {
              label: 'Start',
              type: 'link',
              appearance: 'button',
              link: { type: 'internal', path: '/' },
            },
            {
              label: 'Informationen',
              type: 'dropdown',
              children: [
                {
                  label: 'Extern',
                  link: { type: 'external', url: 'https://example.com/', newTab: true },
                },
              ],
            },
          ],
        },
      })
      const translated = saved.items!.map((item, index) => ({
        ...item,
        label: index === 0 ? 'Home' : 'Information',
      }))
      await payload.updateGlobal({
        slug: 'navbar',
        locale: 'en',
        user,
        overrideAccess: false,
        req,
        data: { items: translated, _status: 'published' },
      })
      const de = await payload.findGlobal({
        slug: 'navbar',
        locale: 'de',
        req,
        overrideAccess: false,
      })
      const en = await payload.findGlobal({
        slug: 'navbar',
        locale: 'en',
        req,
        overrideAccess: false,
      })
      expect(de.items?.[0].label).toBe('Start')
      expect(en.items?.[0].label).toBe('Home')
      expect(en.items?.[1].children?.[0].link?.newTab).toBe(true)
      await expect(
        payload.updateGlobal({
          slug: 'navbar',
          req,
          user,
          overrideAccess: false,
          data: {
            items: [
              {
                type: 'link',
                label: 'Unsafe',
                link: { type: 'external', url: 'javascript:alert(1)' },
              },
            ],
          },
        }),
      ).rejects.toThrow()
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  })

  it('normalizes slugs and blocks unsafe destinations', () => {
    expect(internalHref('about')).toBe('/about')
    expect(internalHref('/#faq')).toBe('/#faq')
    for (const value of [
      '//evil.test',
      '/%2fexample.com',
      'javascript:alert(1)',
      '/de/about',
      '/\\evil.test',
    ])
      expect(internalHref(value)).toBeNull()
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,bad',
      'https://user:password@example.com',
    ])
      expect(externalHref(value)).toBeNull()
    expect(externalHref('https://example.com')).toBe('https://example.com/')
  })
})
