// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { staffPool } from '@/lib/staff-auth/database'
import { staffFirstFactor, beginStaffMfa, verifyStaffMfa } from '@/lib/staff-auth/service'
import { totp } from '@/lib/staff-auth/crypto'
import { passwordCorpusFixture } from '../documents/security-fixtures'
let payload: Payload, cleanupCorpus: () => Promise<void>
beforeAll(async () => {
  cleanupCorpus = await passwordCorpusFixture()
  payload = await getPayload({ config })
})
afterAll(async () => {
  await payload?.destroy()
  await staffPool.end()
  await cleanupCorpus?.()
})
it('requires staff MFA, binds proof to the login session, prevents replay and consumes recovery codes once', async () => {
  const password = randomUUID(),
    email = `staff-mfa-${randomUUID()}@example.test`
  const user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: { email, password, role: 'content-editor' },
  })
  try {
    const login = await payload.login({ collection: 'users', data: { email, password } })
    const headers = new Headers({ authorization: `JWT ${login.token}` })
    expect((await payload.auth({ headers })).user).toBeNull()
    const first = await staffFirstFactor(payload, headers)
    const setup = await beginStaffMfa(first)
    const code = totp(setup.secret, Math.floor(Date.now() / 30000))
    const verified = await verifyStaffMfa(first, code)
    expect(verified.codes).toHaveLength(10)
    headers.set('cookie', `taxful-staff-mfa=${verified.token}`)
    expect((await payload.auth({ headers })).user?.id).toBe(user.id)
    await expect(verifyStaffMfa(first, code)).rejects.toMatchObject({ code: 'invalidCode' })
    const second = await payload.login({ collection: 'users', data: { email, password } })
    const secondHeaders = new Headers({
      authorization: `JWT ${second.token}`,
      cookie: headers.get('cookie')!,
    })
    expect((await payload.auth({ headers: secondHeaders })).user).toBeNull()
    const secondUser = await staffFirstFactor(payload, secondHeaders)
    const recovered = await verifyStaffMfa(secondUser, verified.codes![0])
    await expect(verifyStaffMfa(secondUser, verified.codes![0])).rejects.toMatchObject({
      code: 'invalidCode',
    })
    secondHeaders.set('cookie', `taxful-staff-mfa=${recovered.token}`)
    expect((await payload.auth({ headers: secondHeaders })).user?.id).toBe(user.id)
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { password: randomUUID() },
    })
    expect((await payload.auth({ headers })).user).toBeNull()
    expect((await payload.auth({ headers: secondHeaders })).user).toBeNull()
    await expect(verifyStaffMfa(secondUser, verified.codes![1])).rejects.toMatchObject({
      code: 'signInAgain',
    })
    const resetToken = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })
    expect(resetToken).toBeTruthy()
    const reset = await payload.resetPassword({
      collection: 'users',
      overrideAccess: true,
      data: { token: resetToken!, password: randomUUID() },
    })
    const resetHeaders = new Headers({ authorization: `JWT ${reset.token}` })
    expect((await payload.auth({ headers: resetHeaders })).user).toBeNull()
    expect(
      (await staffPool.query('SELECT verified FROM public.staff_mfa WHERE user_id=$1', [user.id]))
        .rows[0].verified,
    ).toBe(true)
    const queue = await staffPool.query(
      'SELECT n.kind FROM public.staff_security_notifications n JOIN public.staff_security_events e ON e.id=n.event_id WHERE e.user_id=$1',
      [user.id],
    )
    expect(queue.rows.map((r) => r.kind).sort()).toEqual([
      'passwordChanged',
      'passwordChanged',
      'security',
      'security',
    ])
  } finally {
    // Audit events intentionally retain anonymous history; remove only this fixture's records.
    await staffPool.query('DELETE FROM public.staff_security_events WHERE user_id=$1', [user.id])
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
  }
}, 30000)
it('rejects known breached staff passwords on create, update and reset', async () => {
  const bad = 'Known breached synthetic password'
  await expect(
    payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email: `bad-${randomUUID()}@example.test`, password: bad, role: 'content-editor' },
    }),
  ).rejects.toThrow('appeared in a breach')
  const user = await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: `policy-${randomUUID()}@example.test`,
      password: randomUUID(),
      role: 'content-editor',
    },
  })
  try {
    await expect(
      payload.update({
        collection: 'users',
        id: user.id,
        overrideAccess: true,
        data: { password: bad },
      }),
    ).rejects.toThrow('appeared in a breach')
    await expect(
      payload.resetPassword({
        collection: 'users',
        data: { password: bad, token: 'synthetic-invalid-token' },
        overrideAccess: true,
      }),
    ).rejects.toThrow('appeared in a breach')
  } finally {
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
  }
})
