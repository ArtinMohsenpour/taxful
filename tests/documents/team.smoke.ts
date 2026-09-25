// Synthetic accounts only. Invitation mail stays in the local development inbox.
import { config } from 'dotenv'
import { chromium, expect, type BrowserContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { blankCompanyProfile } from '../../src/lib/documents/company-profile-schema'
config({ path: ['.env.local', '.env'] })
assert.ok(['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''))
const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
const browser = await chromium.launch({ headless: true })
const org = randomUUID(),
  other = randomUUID(),
  users = Array.from({ length: 5 }, () => randomUUID()),
  mids = users.map(() => randomUUID())
const roles = ['owner', 'admin', 'reviewer', 'member'] as const
const password = randomUUID() + '-Synthetic',
  origin = 'http://localhost:3100'
const errors: string[] = []
const contexts: BrowserContext[] = []
const post = (ctx: BrowserContext, path: string, data: object) =>
  ctx.request.post(path, { headers: { origin }, data })
try {
  for (const [index, user] of users.entries()) {
    await pool.query(
      'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
      [
        user,
        `Synthetic ${roles[index] || 'invitee'}`,
        user + '@example.test',
        'Synthetic',
        roles[index] || 'invitee',
      ],
    )
    await pool.query(
      'INSERT INTO customer_auth.customer_accounts(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())',
      [randomUUID(), user, 'credential', await hashPassword(password)],
    )
  }
  for (const id of [org, other])
    await pool.query(
      'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
      [id, 'Synthetic Team Workspace'],
    )
  await pool.query(
    "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,'professional',now()+interval '1 day','Synthetic team browser','test')",
    [org],
  )
  for (const [index, role] of roles.entries())
    await pool.query(
      'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
      [mids[index], org, users[index], role],
    )
  const anonymous = await browser.newContext({ baseURL: origin })
  assert.equal((await anonymous.request.get('/api/team')).status(), 401)
  assert.equal((await anonymous.request.get('/en/portal/team', { maxRedirects: 0 })).status(), 307)
  await anonymous.close()
  for (const user of users) {
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 1050 },
    })
    contexts.push(context)
    assert.equal(
      (
        await post(context, '/api/customer-auth/sign-in/email', {
          email: user + '@example.test',
          password,
        })
      ).status(),
      200,
    )
  }
  const [owner, admin, reviewer, member, invitee] = contexts
  assert.equal(
    (
      await owner.request.post('/api/team', {
        headers: { origin: 'https://evil.example.test' },
        data: { action: 'remove', organizationId: org, memberId: mids[3], expectedRole: 'member' },
      })
    ).status(),
    403,
  )
  assert.equal(
    (
      await post(owner, '/api/team', {
        action: 'remove',
        organizationId: other,
        memberId: mids[3],
        expectedRole: 'member',
      })
    ).status(),
    403,
  )
  for (const path of [
    'invite-member',
    'update-member-role',
    'remove-member',
    'accept-invitation',
    'leave',
  ])
    assert.equal(
      (await post(owner, '/api/customer-auth/organization/' + path, {})).status(),
      403,
      `provider bypass ${path}`,
    )
  for (const ctx of [member, reviewer]) {
    const snapshot = await (await ctx.request.get('/api/team')).json()
    assert.deepEqual(snapshot.events, [])
    assert.deepEqual(snapshot.invitations, [])
    assert.equal(
      (
        await post(ctx, '/api/team', {
          action: 'invite',
          organizationId: org,
          email: users[4] + '@example.test',
          role: 'member',
          locale: 'en',
        })
      ).status(),
      403,
    )
  }
  assert.equal(
    (
      await post(admin, '/api/team', {
        action: 'role',
        organizationId: org,
        memberId: mids[3],
        expectedRole: 'member',
        role: 'admin',
      })
    ).status(),
    403,
  )
  assert.equal(
    (
      await post(admin, '/api/team', {
        action: 'remove',
        organizationId: org,
        memberId: mids[0],
        expectedRole: 'admin',
      })
    ).status(),
    403,
  )
  const profile = { ...blankCompanyProfile, companyName: 'Synthetic company' }
  for (const ctx of [member, reviewer]) {
    assert.equal(
      (
        await post(ctx, '/api/invoices/customers', {
          organizationId: org,
          revision: 0,
          data: profile,
        })
      ).status(),
      403,
    )
    assert.equal(
      (
        await ctx.request.put('/api/company-profile', {
          headers: { origin },
          data: { organizationId: org, revision: 0, data: profile },
        })
      ).status(),
      403,
    )
    assert.equal(
      (
        await post(ctx, '/api/billing/manage', {
          action: 'view',
          organizationId: org,
          locale: 'en',
        })
      ).status(),
      403,
    )
  }
  assert.equal(
    (
      await post(admin, '/api/billing/manage', {
        action: 'view',
        organizationId: org,
        locale: 'en',
      })
    ).status(),
    403,
  )
  assert.equal(
    (
      await post(admin, '/api/invoices/customers', {
        organizationId: org,
        revision: 0,
        data: profile,
      })
    ).status(),
    200,
  )
  assert.equal((await member.request.get('/api/invoices/customers')).status(), 200)
  const page = await owner.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/en/portal/team')
  await expect(page.getByRole('heading', { name: 'Team management', exact: true })).toBeVisible()
  await page.getByLabel('Email address', { exact: true }).fill(users[4] + '@example.test')
  await page.getByRole('button', { name: 'Role Member', exact: true }).click()
  await page.getByRole('option', { name: 'Accountant / reviewer', exact: true }).click()
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Team updated.')
  await expect(page.getByText('Email sent', { exact: true })).toBeVisible()
  const invitation = (await (await owner.request.get('/api/team')).json()).invitations[0]
  const joinPage = await invitee.newPage()
  joinPage.on('pageerror', (e) => errors.push(e.message))
  await joinPage.goto('/en/accept-invitation?id=' + encodeURIComponent(invitation.id))
  await expect(joinPage.getByText('Synthetic Team Workspace', { exact: true })).toBeVisible()
  await joinPage.getByRole('button', { name: 'Accept invitation', exact: true }).click()
  await joinPage.waitForURL('**/en/portal')
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  const invitedRow = page.locator('section').filter({has:page.getByRole('heading',{name:/^Members /})}).locator('li').filter({ hasText: users[4] + '@example.test' })
  await invitedRow.getByRole('button', { name: 'Change role', exact: true }).click()
  const confirmation = page.getByRole('alertdialog')
  await confirmation
    .getByRole('button', { name: 'Role Accountant / reviewer', exact: true })
    .click()
  await page.getByRole('option', { name: 'Member', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Confirm change', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await expect(invitedRow.getByText('Member', { exact: true })).toBeVisible()
  await invitedRow.getByRole('button', { name: 'Remove member', exact: true }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Confirm change', exact: true })
    .click()
  await expect(invitedRow).toHaveCount(0)
  assert.equal((await invitee.request.get('/api/team')).status(), 403)
  assert.equal((await invitee.request.get('/api/invoices/customers')).status(), 403)
  assert.equal(
    (await post(invitee, '/api/team', { action: 'accept', invitationId: invitation.id })).status(),
    409,
  )
  await mkdir('.private/team-check', { recursive: true })
  await page.screenshot({ path: '.private/team-check/team-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/de/portal/team')
  await expect(page.getByRole('heading', { name: 'Teamverwaltung', exact: true })).toBeVisible()
  await page.getByText('Wer darf was?', { exact: true }).click()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: '.private/team-check/team-mobile-de.png', fullPage: true })
  await page.evaluate(() => localStorage.setItem('theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: '.private/team-check/team-dark-mobile.png', fullPage: true })
  const readonly = await member.newPage()
  await readonly.goto('/en/portal/team')
  await expect(
    readonly.getByText('You can view this team. Ask an owner or administrator to change access.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(readonly.getByRole('button', { name: 'Send invitation', exact: true })).toHaveCount(
    0,
  )
  await expect(readonly.getByRole('heading', { name: 'Team activity', exact: true })).toHaveCount(0)
  await readonly.goto('/en/portal/billing')
  await expect(
    readonly.getByText('Only a company owner can access billing. Contact your workspace owner.', {
      exact: true,
    }),
  ).toBeVisible()
  assert.deepEqual(errors, [])
  console.log(
    'Team invitation, acceptance, role change, removal, API authorization, bypass rejection and EN/DE mobile/dark checks passed.',
  )
} finally {
  await browser.close()
  await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1::text[])', [
    [org, other],
  ])
  await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1::text[])', [users])
  await pool.end()
}
