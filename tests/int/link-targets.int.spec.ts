// @vitest-environment node
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import {
  listLinkTargets,
  normalizeLinkPath,
  staticLinkTargets,
  unlinkableRoutes,
} from '@/lib/website/link-targets'
import { linkTargetsEndpoint } from '@/lib/website/link-targets-endpoint'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

// Static routes under src/app/(frontend)/[locale], ignoring route groups and dynamic segments.
async function folderRoutes(dir: string, segments: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const routes = entries.some((entry) => entry.name === 'page.tsx')
    ? [`/${segments.join('/')}`]
    : []
  for (const entry of entries.filter((item) => item.isDirectory())) {
    if (entry.name.startsWith('[')) continue
    const next = /^\(.*\)$/.test(entry.name) ? segments : [...segments, entry.name]
    routes.push(...(await folderRoutes(path.join(dir, entry.name), next)))
  }
  return routes
}

describe('Link targets', () => {
  it('offers every folder route except token and private workspace routes', async () => {
    const routes = await folderRoutes(path.resolve('src/app/(frontend)/[locale]'))
    const offered = staticLinkTargets.map((target) => target.path)
    for (const route of routes) expect([...offered, ...unlinkableRoutes]).toContain(route)
    for (const route of offered) expect(routes).toContain(route)
  })

  it('lists localized service pages with publication status', async () => {
    const slug = `link-target-${randomUUID().slice(0, 8)}`
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('A transaction is required for this test')
    // The picker runs with the editor's access; drafts are listed for CMS users only.
    const editor = { id: 1, collection: 'users', role: 'content-editor' } as PayloadRequest['user']
    const req = { transactionID, user: editor }
    try {
      await payload.create({
        collection: 'service-pages',
        req,
        overrideAccess: true,
        draft: true,
        locale: 'de',
        data: { slug, title: 'Entwurfsleistung', summary: 'Test', _status: 'draft' },
      })
      const groups = await listLinkTargets(payload, { locale: 'de', req })
      expect(groups.map((group) => group.id)).toEqual(['website', 'services', 'legal', 'customer'])
      const services = groups.find((group) => group.id === 'services')!.options
      expect(services[0]).toMatchObject({ path: '/services', label: 'Leistungen' })
      expect(services).toContainEqual({
        path: `/services/${slug}`,
        label: 'Entwurfsleistung',
        status: 'draft',
      })
      const en = await listLinkTargets(payload, { locale: 'en', req })
      expect(en[0].options[0]).toMatchObject({ path: '/', label: 'Home' })
      const anonymous = await listLinkTargets(payload, { locale: 'de', req: { transactionID } })
      expect(anonymous.find((group) => group.id === 'services')!.options).not.toContainEqual(
        expect.objectContaining({ path: `/services/${slug}` }),
      )
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  })

  it('is available to CMS editors only', async () => {
    const call = (user?: unknown) =>
      linkTargetsEndpoint.handler({
        payload,
        user,
        searchParams: new URLSearchParams('locale=en'),
      } as unknown as PayloadRequest)
    expect((await call()).status).toBe(403)
    expect((await call({ collection: 'customers', role: 'super-admin' })).status).toBe(403)
    const allowed = await call({ collection: 'users', role: 'content-editor' })
    expect(allowed.status).toBe(200)
    expect(allowed.headers.get('cache-control')).toContain('no-store')
    const body = (await allowed.json()) as { groups: { id: string }[] }
    expect(body.groups).toHaveLength(4)
  })

  it('normalizes stored paths for matching', () => {
    expect(normalizeLinkPath('services')).toBe('/services')
    expect(normalizeLinkPath('/about/')).toBe('/about')
    expect(normalizeLinkPath('/#faq')).toBe('/')
    expect(normalizeLinkPath('/faq?x=1')).toBe('/faq')
    expect(normalizeLinkPath('')).toBe('')
  })
})
