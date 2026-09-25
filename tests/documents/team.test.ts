import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { hasPermission, canManageTeamRole } from '../../src/lib/customer-auth/permissions'

test('the portal role matrix denies unknown roles and privilege escalation', () => {
  assert.equal(hasPermission('member', 'approve'), false)
  assert.equal(hasPermission('reviewer', 'approve'), true)
  assert.equal(hasPermission('reviewer', 'directory'), false)
  assert.equal(hasPermission('admin', 'billing'), false)
  assert.equal(hasPermission('owner', 'billing'), true)
  assert.equal(hasPermission('member,owner', 'billing'), false)
  assert.equal(canManageTeamRole('admin', 'owner'), false)
  assert.equal(canManageTeamRole('admin', 'admin'), false)
  assert.equal(canManageTeamRole('admin', 'reviewer'), true)
})

test(
  'team hierarchy, invitation identity, seat races, downgrade checks, revocation and audit isolation',
  { skip: process.env.DOCUMENT_INTEGRATION !== 'true' },
  async () => {
    config({ path: ['.env.local', '.env'] })
    assert.ok(
      ['localhost', '127.0.0.1'].includes(process.env.CUSTOMER_SMTP_HOST || ''),
      'Synthetic emails must use local Mailpit',
    )
    const { customerPool: pool } = await import('../../src/lib/customer-auth/database')
    const { manageTeam, respondToInvitation, teamSnapshot, teamRateLimit } =
      await import('../../src/lib/customer-auth/team')
    const { ownerTransaction } = await import('../../src/lib/billing/service')
    const { lockMembership } = await import('../../src/lib/documents/access')
    const users = Array.from({ length: 6 }, () => randomUUID()),
      org = randomUUID(),
      other = randomUUID()
    const [owner, admin, member, reviewer, invitee, outsider] = users
    const mids = users.map(() => randomUUID())
    const ctx = (userId: string, organizationId = org) => ({
      userId,
      organizationId,
      role: 'owner',
    }) // deliberately forged role
    const invite = (email: string, role: 'admin' | 'reviewer' | 'member' = 'member') => ({
      action: 'invite' as const,
      organizationId: org,
      email,
      role,
      locale: 'en' as const,
    })
    try {
      for (const user of users)
        await pool.query(
          'INSERT INTO customer_auth.customer_users(id,name,email,"emailVerified","firstName","lastName") VALUES($1,$2,$3,true,$4,$5)',
          [user, 'Synthetic Team', user + '@example.test', 'Synthetic', 'Team'],
        )
      for (const id of [org, other])
        await pool.query(
          'INSERT INTO customer_auth.organizations(id,name,slug,"createdAt") VALUES($1,$2,$1,now())',
          [id, 'Synthetic Team'],
        )
      await pool.query(
        "INSERT INTO customer_auth.billing_plan_grants(organization_id,plan_id,expires_at,reason,staff_id) VALUES($1,'professional',now()+interval '1 day','Synthetic team test','test')",
        [org],
      )
      for (const [index, role] of ['owner', 'admin', 'member', 'reviewer'].entries())
        await pool.query(
          'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
          [mids[index], org, users[index], role],
        )
      await pool.query(
        'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
        [mids[5], other, outsider, 'owner'],
      )
      await assert.rejects(manageTeam(ctx(member), invite(invitee + '@example.test')), /forbidden/)
      await assert.rejects(
        manageTeam(ctx(reviewer), invite(invitee + '@example.test')),
        /forbidden/,
      )
      await assert.rejects(
        manageTeam(ctx(outsider), invite(invitee + '@example.test')),
        /forbidden/,
      )
      await assert.rejects(
        manageTeam(ctx(admin), invite(invitee + '@example.test', 'admin')),
        /forbidden/,
      )
      await assert.rejects(
        manageTeam(ctx(admin), {
          action: 'role',
          organizationId: org,
          memberId: mids[2],
          role: 'admin',
          expectedRole: 'member',
        }),
        /forbidden/,
      )
      await assert.rejects(
        manageTeam(ctx(owner), {
          action: 'remove',
          organizationId: org,
          memberId: mids[0],
          expectedRole: 'admin',
        }),
        /forbidden/,
      )
      await assert.rejects(
        manageTeam(ctx(admin), {
          action: 'remove',
          organizationId: org,
          memberId: mids[1],
          expectedRole: 'admin',
        }),
        /forbidden/,
      )
      await manageTeam(ctx(admin), {
        action: 'role',
        organizationId: org,
        memberId: mids[2],
        role: 'reviewer',
        expectedRole: 'member',
      })
      await assert.rejects(
        manageTeam(ctx(owner), {
          action: 'role',
          organizationId: org,
          memberId: mids[2],
          role: 'admin',
          expectedRole: 'member',
        }),
        /conflict/,
      )
      await manageTeam(ctx(owner), {
        action: 'role',
        organizationId: org,
        memberId: mids[2],
        role: 'member',
        expectedRole: 'reviewer',
      })
      await assert.rejects(
        ownerTransaction(ctx(admin), async () => true),
        /ownerOnly/,
      )
      const invited = await manageTeam(ctx(owner), invite(invitee + '@example.test', 'reviewer'))
      assert.equal(invited.deliveryFailed, false, 'Mailpit receives invitation')
      const invitation = (await teamSnapshot(ctx(owner))).invitations[0]
      await assert.rejects(
        manageTeam(ctx(owner), invite(invitee + '@example.test')),
        /alreadyInvited/,
      )
      await assert.rejects(
        respondToInvitation(outsider, invitation.id, 'accept'),
        /invitationInvalid/,
      )
      await pool.query(
        'UPDATE customer_auth.customer_users SET "emailVerified"=false WHERE id=$1',
        [invitee],
      )
      await assert.rejects(respondToInvitation(invitee, invitation.id, 'accept'), /forbidden/)
      await pool.query('UPDATE customer_auth.customer_users SET "emailVerified"=true WHERE id=$1', [
        invitee,
      ])
      const seats = (await teamSnapshot(ctx(owner))).seats.used
      await respondToInvitation(invitee, invitation.id, 'accept')
      await respondToInvitation(invitee, invitation.id, 'accept') // replay must not add another seat or event
      assert.equal((await teamSnapshot(ctx(owner))).seats.used, seats)
      const invitedMember = (await teamSnapshot(ctx(owner))).members.find(
        (m) => m.userId === invitee,
      )!
      await manageTeam(ctx(admin), {
        action: 'remove',
        organizationId: org,
        memberId: invitedMember.id,
        expectedRole: 'reviewer',
      })
      await assert.rejects(
        respondToInvitation(invitee, invitation.id, 'accept'),
        /invitationInvalid/,
      )
      await assert.rejects(teamSnapshot(ctx(invitee)), /forbidden/)
      const readOnly = await teamSnapshot(ctx(member))
      assert.deepEqual(readOnly.events, [])
      assert.deepEqual(readOnly.invitations, [])
      assert.equal((await teamSnapshot(ctx(outsider, other))).events.length, 0)
      assert.ok((await teamSnapshot(ctx(owner))).events.some((e) => e.event === 'removed'))
      for (const target of [mids[1], mids[2], mids[3]])
        await pool.query('DELETE FROM customer_auth.organization_memberships WHERE id=$1', [target])
      await pool.query(
        "UPDATE customer_auth.billing_plan_grants SET plan_id='starter' WHERE organization_id=$1",
        [org],
      )
      const race = await Promise.allSettled([
        manageTeam(ctx(owner), invite(invitee + '@example.test')),
        manageTeam(ctx(owner), invite(outsider + '@example.test')),
      ])
      assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1)
      const failure = race.find((r) => r.status === 'rejected') as PromiseRejectedResult
      assert.match(failure.reason.message, /teamLimit/)
      const pending = (await teamSnapshot(ctx(owner))).invitations[0]
      const accepting = users.find((u) => u + '@example.test' === pending.email)!
      await pool.query(
        "UPDATE customer_auth.billing_plan_grants SET plan_id='free' WHERE organization_id=$1",
        [org],
      )
      await assert.rejects(respondToInvitation(accepting, pending.id, 'accept'), /teamLimit/)
      await manageTeam(ctx(owner), {
        action: 'cancel',
        organizationId: org,
        invitationId: pending.id,
        locale: 'en',
      })
      await assert.rejects(
        respondToInvitation(accepting, pending.id, 'accept'),
        /invitationInvalid/,
      )
      assert.equal(
        (await teamSnapshot(ctx(owner))).invitations.find((item) => item.id === pending.id)?.status,
        'canceled',
      )
      await manageTeam(ctx(owner), {
        action: 'delete',
        organizationId: org,
        invitationId: pending.id,
        locale: 'en',
      })
      assert.equal(
        (await teamSnapshot(ctx(owner))).invitations.some((item) => item.id === pending.id),
        false,
      )
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await assert.rejects(lockMembership(client, ctx(member), true), /forbidden/)
        await client.query('ROLLBACK')
      } finally {
        client.release()
      }
      for (let i = 0; i < 20; i++) await teamRateLimit(owner)
      await assert.rejects(teamRateLimit(owner), /tooManyRequests/)
    } finally {
      await pool.query('DELETE FROM customer_auth.organizations WHERE id=ANY($1::text[])', [
        [org, other],
      ])
      await pool.query('DELETE FROM customer_auth.customer_users WHERE id=ANY($1::text[])', [users])
      await pool.end()
    }
  },
)
