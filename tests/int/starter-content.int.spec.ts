// @vitest-environment node
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { seedStarterContent } from '@/migrations/seeds/starter-content'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
}, 30000)
afterAll(async () => {
  await payload?.destroy()
})

const migrationsDir = path.resolve('src/migrations')

describe('Starter content', () => {
  // The Local API reads the current schema, so a migration that uses it cannot be
  // replayed on an empty database. Content belongs in `pnpm content:seed`.
  it('keeps migrations and the seeds they import free of Local API calls', async () => {
    const files = (await readdir(migrationsDir)).filter((name) => /^\d.*\.ts$/.test(name))
    for (const name of files) {
      const source = await readFile(path.join(migrationsDir, name), 'utf8')
      const imported = [...source.matchAll(/from '\.\/(seeds\/[^']+)'/g)].map((match) => match[1])
      for (const [file, code] of [
        [name, source],
        ...(await Promise.all(
          imported.map(
            async (seed) =>
              [seed, await readFile(path.join(migrationsDir, `${seed}.ts`), 'utf8')] as const,
          ),
        )),
      ])
        expect(code, file).not.toMatch(/\bpayload\.(?!logger\b)\w+\(/)
    }
  })

  it('adds each area once and leaves existing content unchanged', async () => {
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('A transaction is required for this test')
    const req = { transactionID }
    const snapshot = async () => ({
      forms: (await payload.count({ collection: 'website-forms', req })).totalDocs,
      servicePages: (await payload.count({ collection: 'service-pages', req })).totalDocs,
      services: (await payload.countGlobalVersions({ global: 'services', req })).totalDocs,
      about: (await payload.countGlobalVersions({ global: 'about', req })).totalDocs,
      footer: (await payload.countGlobalVersions({ global: 'footer', req })).totalDocs,
    })
    try {
      // On a populated database the first run already changes nothing.
      await seedStarterContent(payload, req)
      const seeded = await snapshot()
      expect(seeded.forms).toBeGreaterThan(0)
      expect(seeded.servicePages).toBeGreaterThan(0)
      expect(seeded.footer).toBeGreaterThan(0)
      expect(await seedStarterContent(payload, req)).toEqual([])
      expect(await snapshot()).toEqual(seeded)
    } finally {
      await payload.db.rollbackTransaction(transactionID)
    }
  })
})
