import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { staffPool } from '../../src/lib/staff-auth/database'
import { passwordCorpusFixture } from '../documents/security-fixtures'
export const testUser = { email: `admin-e2e-${randomUUID()}@example.test`, password: randomUUID() }
let userId: number | undefined, cleanup: () => Promise<void>
export async function seedTestUser(): Promise<void> {
  cleanup = await passwordCorpusFixture()
  const payload = await getPayload({ config })
  userId = (
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { ...testUser, role: 'super-admin' },
    })
  ).id
}
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })
  if (userId) {
    await staffPool.query('DELETE FROM public.staff_security_events WHERE user_id=$1', [userId])
    await payload.delete({ collection: 'users', id: userId, overrideAccess: true })
  }
  await cleanup?.()
}
