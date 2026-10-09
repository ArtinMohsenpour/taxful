import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import { passwordCorpusFixture } from '../documents/security-fixtures'
import { totp } from '../../src/lib/staff-auth/crypto'
import { staffPool } from '../../src/lib/staff-auth/database'
const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'
let payload: Payload, cleanup: () => Promise<void>, userId: number
const email = `staff-browser-${randomUUID()}@example.test`,
  password = randomUUID()
test.beforeAll(async () => {
  cleanup = await passwordCorpusFixture()
  const { default: config } = await import('../../src/payload.config')
  payload = await getPayload({ config })
  userId = (
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email, password, role: 'content-editor' },
    })
  ).id
})
test.afterAll(async () => {
  if (userId) {
    await staffPool.query('DELETE FROM public.staff_security_events WHERE user_id=$1', [userId])
    await payload.delete({ collection: 'users', id: userId, overrideAccess: true })
  }
  await cleanup?.()
})
test('staff must finish authenticator enrollment before REST, GraphQL or admin access', async ({
  page,
}) => {
  test.setTimeout(90000)
  const chained = await page.request.post(origin + '/api/graphql', {
    data: {
      query:
        'mutation($email:String!,$password:String!,$id:Int!) { loginUser(email:$email,password:$password) { token } updateUser(id:$id,data:{firstName:"BYPASS"}) { id } }',
      variables: { email, password, id: userId },
    },
  })
  const chainedBody = await chained.json()
  expect(chainedBody.data?.loginUser?.token).toBeTruthy()
  expect(chainedBody.errors?.length).toBeGreaterThan(0)
  expect(
    (await payload.findByID({ collection: 'users', id: userId, overrideAccess: true })).firstName,
  ).not.toBe('BYPASS')
  await page.goto(origin + '/admin/login')
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible()
  await page.getByRole('combobox').selectOption('de')
  await expect(page.getByRole('heading', { name: 'Anmeldung für Mitarbeitende' })).toBeVisible()
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=password]').fill(password)
  const enrollment = page.waitForResponse(
    (r) => r.url().endsWith('/api/staff-mfa') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  const setup = (await (await enrollment).json()) as { secret: string }
  expect(setup.secret).toMatch(/^[A-Z2-7]{32}$/)
  await expect(page.getByRole('heading', { name: 'Authenticator einrichten' })).toBeVisible()
  expect((await page.request.get(origin + '/api/users')).status()).toBe(403)
  const graph = await page.request.post(origin + '/api/graphql', {
    data: { query: 'query { meUser { user { id } } }' },
  })
  const graphBody = await graph.json()
  expect(graphBody.data?.meUser?.user || null).toBeNull()
  await page.locator('input[name=code]').fill(totp(setup.secret, Math.floor(Date.now() / 30000)))
  await page.getByRole('button', { name: 'Bestätigen', exact: true }).click()
  await expect(page.locator('li code')).toHaveCount(10)
  await page.getByRole('button', { name: 'Codes gespeichert — Verwaltung öffnen' }).click()
  await expect(page).toHaveURL(origin + '/admin')
  expect((await page.request.get(origin + '/api/users')).status()).toBe(200)
  await page.request.post(origin + '/api/users/logout')
  expect((await page.request.get(origin + '/api/users')).status()).toBe(403)
})
