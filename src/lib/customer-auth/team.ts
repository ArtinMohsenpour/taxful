import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { z } from 'zod'
import { customerPool } from './database'
import { canManageTeamRole, hasPermission, type TeamRole } from './permissions'
import { sendCustomerEmail } from './email'
import { DocumentError } from '../documents/config'
import { lockMembership, type DocumentContext } from '../documents/access'
import { billingLock, effectiveEntitlements, usageSnapshot } from '../billing/usage'

const id = z.string().min(1).max(200)
const editableRole = z.enum(['admin', 'reviewer', 'member'])
export const teamActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('invite'),
      organizationId: id,
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      role: editableRole,
      locale: z.enum(['de', 'en']),
    })
    .strict(),
  z
    .object({
      action: z.literal('role'),
      organizationId: id,
      memberId: id,
      role: editableRole,
      expectedRole: editableRole,
    })
    .strict(),
  z
    .object({
      action: z.literal('remove'),
      organizationId: id,
      memberId: id,
      expectedRole: editableRole,
    })
    .strict(),
  z
    .object({
      action: z.enum(['cancel', 'resend', 'delete']),
      organizationId: id,
      invitationId: id,
      locale: z.enum(['de', 'en']),
    })
    .strict(),
  z.object({ action: z.enum(['accept', 'reject']), invitationId: id }).strict(),
])
type TeamAction = z.infer<typeof teamActionSchema>
type Invitation = {
  id: string
  organizationId: string
  email: string
  role: string
  status: string
  expiresAt: Date
  last_sent_at: Date | null
}

async function audit(
  client: PoolClient,
  org: string,
  actor: string,
  event: string,
  label: string,
  details: object = {},
) {
  await client.query(
    'INSERT INTO customer_auth.team_audit_events(organization_id,actor_id,event,target_label,details) VALUES($1,$2,$3,$4,$5)',
    [org, actor, event, label, details],
  )
}
export async function teamRateLimit(userId: string) {
  const result = await customerPool.query(
    `INSERT INTO customer_auth.team_request_limits(user_id) VALUES($1)
    ON CONFLICT(user_id) DO UPDATE SET
    requests=CASE WHEN team_request_limits.window_started<now()-interval '1 minute' THEN 1 ELSE team_request_limits.requests+1 END,
    window_started=CASE WHEN team_request_limits.window_started<now()-interval '1 minute' THEN now() ELSE team_request_limits.window_started END
    WHERE team_request_limits.requests<20 OR team_request_limits.window_started<now()-interval '1 minute' RETURNING user_id`,
    [userId],
  )
  if (!result.rowCount) throw new DocumentError('tooManyRequests', 429)
}
function translateError(error: unknown): never {
  if (error instanceof Error && error.message === 'teamLimit')
    throw new DocumentError('teamLimit', 409)
  throw error
}
export async function teamSnapshot(context: DocumentContext, before?: string) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const role = await lockMembership(client, context)
    if (!hasPermission(role, 'files')) throw new DocumentError('forbidden', 403)
    const manage = hasPermission(role, 'team')
    const members = await client.query<{
      id: string
      userId: string
      role: TeamRole
      name: string
      email: string
    }>(
      `SELECT m.id,m."userId",m.role,u.name,u.email FROM customer_auth.organization_memberships m
      JOIN customer_auth.customer_users u ON u.id=m."userId" WHERE m."organizationId"=$1 ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,m."createdAt",m.id`,
      [context.organizationId],
    )
    const invitations = manage
      ? await client.query<Invitation & { delivery_status: string; expired: boolean }>(
          `SELECT id,"organizationId",email,role,status,"expiresAt",delivery_status,last_sent_at,("expiresAt"<=now()) AS expired FROM customer_auth.organization_invitations
      WHERE "organizationId"=$1 AND status IN ('pending','canceled','rejected','accepted') ORDER BY "createdAt" DESC,id LIMIT 100`,
          [context.organizationId],
        )
      : { rows: [] }
    const events = manage
      ? await client.query<{
          id: string
          event: string
          target_label: string
          details: { from?: TeamRole; to?: TeamRole }
          created_at: Date
          actor: string
        }>(
          `SELECT e.id::text,e.event,e.target_label,e.details,e.created_at,COALESCE(u.name,'') AS actor FROM customer_auth.team_audit_events e
      LEFT JOIN customer_auth.customer_users u ON u.id=e.actor_id WHERE e.organization_id=$1 AND ($2::bigint IS NULL OR e.id<$2::bigint) ORDER BY e.id DESC LIMIT 31`,
          [context.organizationId, before || null],
        )
      : { rows: [] }
    const plan = await effectiveEntitlements(client, context.organizationId)
    const used = await usageSnapshot(client, context.organizationId)
    await client.query('COMMIT')
    return {
      role,
      members: members.rows,
      invitations: invitations.rows,
      seats: { used: used.seats, limit: plan.team_members },
      events: events.rows.slice(0, 30),
      nextCursor: events.rows.length > 30 ? events.rows[29].id : null,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export type TeamSnapshot = Awaited<ReturnType<typeof teamSnapshot>>

export async function invitationPreview(invitationId: string) {
  if (!invitationId || invitationId.length > 200) return null
  const result = await customerPool.query<{
    name: string
    role: TeamRole
    expiresAt: Date
    status: string
    email: string
    account_exists: boolean
  }>(
    `SELECT o.name,i.role,i."expiresAt",i.status,i.email,
      EXISTS(SELECT 1 FROM customer_auth.customer_users u WHERE lower(u.email)=lower(i.email)) AS account_exists
     FROM customer_auth.organization_invitations i
    JOIN customer_auth.organizations o ON o.id=i."organizationId" WHERE i.id=$1`,
    [invitationId],
  )
  const invitation = result.rows[0]
  if (!invitation || !['admin', 'reviewer', 'member'].includes(invitation.role)) return null
  const [local, domain = ''] = invitation.email.split('@')
  return {
    name: invitation.name,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    status: invitation.status,
    valid: invitation.status === 'pending' && invitation.expiresAt.getTime() > Date.now(),
    maskedEmail: `${Array.from(local).slice(0, 2).join('')}***@${domain}`,
    accountExists: invitation.account_exists,
  }
}

export async function invitationDetails(userId: string, invitationId: string) {
  if (!invitationId || invitationId.length > 200) return null
  const result = await customerPool.query<{ name: string; role: TeamRole; expiresAt: Date }>(
    `SELECT o.name,i.role,i."expiresAt" FROM customer_auth.organization_invitations i
    JOIN customer_auth.organizations o ON o.id=i."organizationId"
    JOIN customer_auth.customer_users u ON lower(u.email)=lower(i.email)
    WHERE i.id=$1 AND u.id=$2 AND u."emailVerified" AND NOT u.suspended
    AND i.status='pending' AND i."expiresAt">now() AND i.role IN ('admin','reviewer','member')`,
    [invitationId, userId],
  )
  return result.rows[0] || null
}

// DB work and audit are atomic. SMTP happens after commit; delivery failure retains a retryable invite.
export async function manageTeam(
  context: DocumentContext,
  input: Exclude<TeamAction, { action: 'accept' | 'reject' }>,
) {
  if (input.organizationId !== context.organizationId) throw new DocumentError('forbidden', 403)
  const client = await customerPool.connect()
  let delivery: { id: string; email: string; locale: 'de' | 'en'; attempt: Date } | undefined
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('team:'||$1))", [
      context.organizationId,
    ])
    const role = await lockMembership(client, context)
    if (!hasPermission(role, 'team')) throw new DocumentError('forbidden', 403)
    // Follow document/billing lock order: membership rows before the billing lock.
    if (input.action === 'role' || input.action === 'remove') {
      const target = (
        await client.query<{ role: string; userId: string }>(
          'SELECT role,"userId" FROM customer_auth.organization_memberships WHERE id=$1 AND "organizationId"=$2',
          [input.memberId, context.organizationId],
        )
      ).rows[0]
      if (!target) throw new DocumentError('notFound', 404)
      if (target.userId === context.userId || !canManageTeamRole(role, target.role))
        throw new DocumentError('forbidden', 403)
      await client.query(
        'SELECT id FROM customer_auth.organization_memberships WHERE id=$1 AND "organizationId"=$2 FOR UPDATE',
        [input.memberId, context.organizationId],
      )
    }
    await billingLock(client, context.organizationId)
    if (input.action === 'invite') {
      if (!canManageTeamRole(role, input.role)) throw new DocumentError('forbidden', 403)
      const existing = await client.query(
        `SELECT 1 FROM customer_auth.organization_memberships m JOIN customer_auth.customer_users u ON u.id=m."userId" WHERE m."organizationId"=$1 AND lower(u.email)=$2`,
        [context.organizationId, input.email],
      )
      if (existing.rowCount) throw new DocumentError('alreadyMember', 409)
      const pending = await client.query(
        `SELECT 1 FROM customer_auth.organization_invitations WHERE "organizationId"=$1 AND lower(email)=$2 AND status='pending' AND "expiresAt">now()`,
        [context.organizationId, input.email],
      )
      if (pending.rowCount) throw new DocumentError('alreadyInvited', 409)
      await client.query(
        `UPDATE customer_auth.organization_invitations SET status='canceled' WHERE "organizationId"=$1 AND lower(email)=$2 AND status='pending'`,
        [context.organizationId, input.email],
      )
      const invitationId = randomUUID()
      const sent = await client.query<{ last_sent_at: Date }>(
        `INSERT INTO customer_auth.organization_invitations(id,"organizationId",email,role,status,"expiresAt","inviterId",delivery_status,last_sent_at)
        VALUES($1,$2,$3,$4,'pending',now()+interval '7 days',$5,'sending',date_trunc('milliseconds',now())) RETURNING last_sent_at`,
        [invitationId, context.organizationId, input.email, input.role, context.userId],
      )
      await audit(client, context.organizationId, context.userId, 'invited', input.email, {
        to: input.role,
      })
      delivery = {
        id: invitationId,
        email: input.email,
        locale: input.locale,
        attempt: sent.rows[0].last_sent_at,
      }
    } else if (input.action === 'role' || input.action === 'remove') {
      const target = (
        await client.query<{ userId: string; role: string; name: string }>(
          `SELECT m."userId",m.role,u.name FROM customer_auth.organization_memberships m JOIN customer_auth.customer_users u ON u.id=m."userId" WHERE m.id=$1 AND m."organizationId"=$2`,
          [input.memberId, context.organizationId],
        )
      ).rows[0]
      if (!target) throw new DocumentError('notFound', 404)
      if (
        target.userId === context.userId ||
        !canManageTeamRole(role, target.role) ||
        (input.action === 'role' && !canManageTeamRole(role, input.role))
      )
        throw new DocumentError('forbidden', 403)
      if (target.role !== input.expectedRole) throw new DocumentError('conflict', 409)
      if (input.action === 'role') {
        if (target.role !== input.role) {
          await client.query(
            'UPDATE customer_auth.organization_memberships SET role=$3 WHERE id=$1 AND "organizationId"=$2',
            [input.memberId, context.organizationId, input.role],
          )
          await audit(client, context.organizationId, context.userId, 'roleChanged', target.name, {
            from: target.role,
            to: input.role,
          })
        }
      } else {
        await client.query(
          'DELETE FROM customer_auth.organization_memberships WHERE id=$1 AND "organizationId"=$2',
          [input.memberId, context.organizationId],
        )
        await client.query(
          'UPDATE customer_auth.customer_sessions SET "activeOrganizationId"=NULL WHERE "userId"=$1 AND "activeOrganizationId"=$2',
          [target.userId, context.organizationId],
        )
        // An older invitation must not restore access after removal.
        await client.query(
          `UPDATE customer_auth.organization_invitations SET status='canceled' WHERE "organizationId"=$1 AND status='pending' AND lower(email)=(SELECT lower(email) FROM customer_auth.customer_users WHERE id=$2)`,
          [context.organizationId, target.userId],
        )
        await audit(client, context.organizationId, context.userId, 'removed', target.name)
      }
    } else {
      const invite = (
        await client.query<Invitation>(
          'SELECT * FROM customer_auth.organization_invitations WHERE id=$1 AND "organizationId"=$2 FOR UPDATE',
          [input.invitationId, context.organizationId],
        )
      ).rows[0]
      if (!invite) throw new DocumentError('invitationInvalid', 409)
      if (!canManageTeamRole(role, invite.role)) throw new DocumentError('forbidden', 403)
      if (input.action === 'delete') {
        await client.query(
          'DELETE FROM customer_auth.organization_invitations WHERE id=$1 AND "organizationId"=$2',
          [invite.id, context.organizationId],
        )
        await audit(client, context.organizationId, context.userId, 'deleted', invite.email, {
          status: invite.status,
        })
      } else if (invite.status !== 'pending') {
        throw new DocumentError('invitationInvalid', 409)
      } else if (input.action === 'cancel') {
        await client.query(
          "UPDATE customer_auth.organization_invitations SET status='canceled' WHERE id=$1",
          [invite.id],
        )
        await audit(client, context.organizationId, context.userId, 'revoked', invite.email)
      } else {
        if (invite.last_sent_at && Date.now() - invite.last_sent_at.getTime() < 60000)
          throw new DocumentError('resendWait', 429)
        // Re-check capacity even for an existing reservation after a plan downgrade.
        const plan = await effectiveEntitlements(client, context.organizationId)
        const used = await usageSnapshot(client, context.organizationId)
        if (used.seats + (invite.expiresAt.getTime() <= Date.now() ? 1 : 0) > plan.team_members)
          throw new DocumentError('teamLimit', 409)
        const sent = await client.query<{ last_sent_at: Date }>(
          `UPDATE customer_auth.organization_invitations SET "expiresAt"=now()+interval '7 days',delivery_status='sending',last_sent_at=date_trunc('milliseconds',now()) WHERE id=$1 RETURNING last_sent_at`,
          [invite.id],
        )
        await audit(client, context.organizationId, context.userId, 'resent', invite.email)
        delivery = {
          id: invite.id,
          email: invite.email,
          locale: input.locale,
          attempt: sent.rows[0].last_sent_at,
        }
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    translateError(error)
  } finally {
    client.release()
  }
  if (delivery) {
    let sent = false
    try {
      const url = new URL(`/${delivery.locale}/accept-invitation`, process.env.BETTER_AUTH_URL)
      url.searchParams.set('id', delivery.id)
      await sendCustomerEmail(delivery.email, url.href, 'invite', delivery.locale)
      sent = true
    } catch {
      /* No recipient, token or SMTP credentials in logs. */
    }
    await customerPool.query(
      'UPDATE customer_auth.organization_invitations SET delivery_status=$2 WHERE id=$1 AND last_sent_at=$3',
      [delivery.id, sent ? 'sent' : 'failed', delivery.attempt],
    )
    return { ok: true, deliveryFailed: !sent }
  }
  return { ok: true, deliveryFailed: false }
}

export async function respondToInvitation(
  userId: string,
  invitationId: string,
  action: 'accept' | 'reject',
) {
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    const user = (
      await client.query<{
        email: string
        emailVerified: boolean
        suspended: boolean
        name: string
      }>(
        'SELECT email,"emailVerified",suspended,name FROM customer_auth.customer_users WHERE id=$1 FOR SHARE',
        [userId],
      )
    ).rows[0]
    if (!user || !user.emailVerified || user.suspended) throw new DocumentError('forbidden', 403)
    const ref = (
      await client.query<Invitation>(
        'SELECT * FROM customer_auth.organization_invitations WHERE id=$1',
        [invitationId],
      )
    ).rows[0]
    if (!ref || ref.email.toLowerCase() !== user.email.toLowerCase())
      throw new DocumentError('invitationInvalid', 404)
    await billingLock(client, ref.organizationId)
    const invite = (
      await client.query<Invitation>(
        'SELECT * FROM customer_auth.organization_invitations WHERE id=$1 FOR UPDATE',
        [invitationId],
      )
    ).rows[0]
    if (
      !invite ||
      invite.email.toLowerCase() !== user.email.toLowerCase() ||
      !['admin', 'reviewer', 'member'].includes(invite.role)
    )
      throw new DocumentError('invitationInvalid', 409)
    const member = await client.query(
      'SELECT 1 FROM customer_auth.organization_memberships WHERE "organizationId"=$1 AND "userId"=$2',
      [invite.organizationId, userId],
    )
    if (action === 'accept' && invite.status === 'accepted' && member.rowCount) {
      await client.query('COMMIT')
      return { organizationId: invite.organizationId }
    }
    if (invite.status !== 'pending' || invite.expiresAt.getTime() <= Date.now())
      throw new DocumentError('invitationInvalid', 409)
    if (action === 'accept' && !member.rowCount)
      await client.query(
        'INSERT INTO customer_auth.organization_memberships(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now())',
        [randomUUID(), invite.organizationId, userId, invite.role],
      )
    await client.query('UPDATE customer_auth.organization_invitations SET status=$2 WHERE id=$1', [
      invite.id,
      action === 'accept' ? 'accepted' : 'rejected',
    ])
    await audit(
      client,
      invite.organizationId,
      userId,
      action === 'accept' ? 'joined' : 'declined',
      user.name,
    )
    await client.query('COMMIT')
    return { organizationId: invite.organizationId }
  } catch (error) {
    await client.query('ROLLBACK')
    translateError(error)
  } finally {
    client.release()
  }
}
