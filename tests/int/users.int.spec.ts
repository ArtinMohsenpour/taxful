// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
afterAll(async () => {
  await payload?.destroy()
})

it('enforces manager and self-profile permissions without persisting test accounts', async () => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { role: { equals: 'super-admin' } },
    limit: 1,
  })
  expect(docs[0]).toBeDefined()
  const manager = { ...docs[0], collection: 'users' as const }
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Transaction required')
  try {
    const editor = {
      ...(await payload.create({
        collection: 'users',
        req: { transactionID },
        user: manager,
        overrideAccess: false,
        data: {
          email: `test-${randomUUID()}@example.invalid`,
          password: randomUUID(),
          role: 'content-editor',
        },
      })),
      collection: 'users' as const,
    }
    const updated = await payload.update({
      collection: 'users',
      id: editor.id,
      req: { transactionID },
      user: editor,
      overrideAccess: false,
      data: {
        firstName: 'Erika',
        lastName: 'Musterfrau',
        phoneNumber: '+49 123 456',
        address: { city: 'Berlin' },
        role: 'manager',
      },
    })
    expect(updated.firstName).toBe('Erika')
    expect(updated.lastName).toBe('Musterfrau')
    expect(updated.phoneNumber).toBe('+49 123 456')
    expect(updated.address?.city).toBe('Berlin')
    expect(updated.role).toBe('content-editor')
    const promoted = await payload.update({
      collection: 'users',
      id: editor.id,
      req: { transactionID },
      user: manager,
      overrideAccess: false,
      data: { role: 'manager' },
    })
    expect(promoted.role).toBe('manager')
    const staffManager = { ...promoted, collection: 'users' as const }
    await expect(
      payload.create({
        collection: 'users',
        user: staffManager,
        overrideAccess: false,
        data: {
          email: `test-${randomUUID()}@example.invalid`,
          password: randomUUID(),
          role: 'super-admin',
        },
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'users',
        id: manager.id,
        user: staffManager,
        overrideAccess: false,
        data: { role: 'manager' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({
        collection: 'users',
        id: manager.id,
        user: staffManager,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({
        collection: 'users',
        id: manager.id,
        req: { transactionID },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'users',
        req: { transactionID },
        user: editor,
        overrideAccess: false,
        data: {
          email: `test-${randomUUID()}@example.invalid`,
          password: randomUUID(),
          role: 'manager',
        },
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'users',
        id: manager.id,
        req: { transactionID },
        user: editor,
        overrideAccess: false,
        data: { phoneNumber: 'blocked' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'users', user: null, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.delete({
        collection: 'users',
        id: manager.id,
        req: { transactionID },
        user: manager,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  } finally {
    await payload.db.rollbackTransaction(transactionID)
  }
})
