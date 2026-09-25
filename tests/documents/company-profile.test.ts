import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import {
  blankCompanyProfile,
  companyProfileSchema,
  fillCompanyDetails,
  matchingCompanySide,
} from '../../src/lib/documents/company-profile-schema'
import { invoiceFixture } from './fixtures'

test('company prefill preserves extracted values, targets one party and rejects ambiguous identification', () => {
  const data = invoiceFixture(),
    profile = {
      ...blankCompanyProfile,
      companyName: 'Company from settings',
      country: 'DE',
      vatId: data.issuer.vatId,
    }
  data.issuer.country = ''
  assert.equal(matchingCompanySide(data, profile), 'issuer')
  const result = fillCompanyDetails(data, profile, 'issuer')
  assert.equal(result.data.issuer.country, 'DE')
  assert.equal(result.data.issuer.companyName, data.issuer.companyName)
  assert.deepEqual(result.data.recipient, data.recipient)
  assert.deepEqual(result.filled, ['issuer.country'])
  data.recipient.vatId = data.issuer.vatId
  assert.equal(matchingCompanySide(data, profile), null)
  assert.equal(companyProfileSchema.safeParse({ ...profile, taxId: '12345678901' }).success, false)
})
test(
  'company settings enforce current roles, workspace isolation and revision conflicts',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { getCompanyProfile, saveCompanyProfile } =
      await import('../../src/lib/documents/company-profile')
    const org = randomUUID(),
      other = randomUUID(),
      owner = randomUUID(),
      member = randomUUID()
    const context = { userId: owner, organizationId: org, role: 'owner' }
    const input = {
      data: { ...blankCompanyProfile, companyName: 'Synthetic Company', country: 'DE' },
      revision: 0,
    }
    try {
      for (const id of [owner, member])
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
          [id, 'Synthetic', id + '@example.test'],
        )
      for (const id of [org, other])
        await pool.query(
          'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
          [id, 'Synthetic Company'],
        )
      await pool.query(
        "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,'starter',now()+interval '1 day','Synthetic fixture','test')",
        [org],
      )
      for (const [userId, role] of [
        [owner, 'owner'],
        [member, 'member'],
      ])
        await pool.query(
          'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
          [randomUUID(), org, userId, role],
        )
      await assert.rejects(saveCompanyProfile({ ...context, userId: member }, input), {
        message: 'forbidden',
      })
      assert.equal((await saveCompanyProfile(context, input)).revision, 1)
      await assert.rejects(saveCompanyProfile(context, input), { message: 'conflict' })
      assert.equal(await getCompanyProfile({ ...context, organizationId: other }), null)
      assert.equal((await getCompanyProfile(context)).data.companyName, 'Synthetic Company')
      assert.equal((await saveCompanyProfile(context, { ...input, revision: 1 })).revision, 2)
    } finally {
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1::text[])', [
        [org, other],
      ])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1::text[])', [
        [owner, member],
      ])
      await pool.end()
    }
  },
)
