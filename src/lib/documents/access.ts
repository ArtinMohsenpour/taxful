import { auth } from '../customer-auth/auth'
import { customerPool } from '../customer-auth/database'
import { DocumentError } from './config'
import type { PoolClient } from 'pg'
import { hasPermission } from '../customer-auth/permissions'
export type DocumentContext = { userId: string; organizationId: string; role: string }
export const canApprove = (role: string) => hasPermission(role, 'approve')
export const canDeleteDocument = (context: DocumentContext, uploadedBy: string | null) =>
  hasPermission(context.role, 'files') &&
  (context.userId === uploadedBy || hasPermission(context.role, 'settings'))
export async function documentContext(headers: Headers): Promise<DocumentContext> {
  const session = await auth.api.getSession({ headers })
  if (!session) throw new DocumentError('unauthorized', 401)
  if (!session.user.emailVerified) throw new DocumentError('unverified', 403)
  const active = session.session.activeOrganizationId
  const organizations = await auth.api.listOrganizations({ headers })
  const selected = active || organizations[0]?.id
  const memberships = await customerPool.query(
    'SELECT "organizationId", role FROM customer_auth.organization_memberships WHERE "userId"=$1 ORDER BY "createdAt", id',
    [session.user.id],
  )
  const membership = memberships.rows.find((row) => row.organizationId === selected)
  if (!membership || !hasPermission(membership.role, 'files'))
    throw new DocumentError('companyRequired', 403)
  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  }
}
export async function lockMembership(
  client: PoolClient,
  context: DocumentContext,
  approve = false,
) {
  const result = await client.query(
    'SELECT role FROM customer_auth.organization_memberships WHERE "organizationId"=$1 AND "userId"=$2 FOR SHARE',
    [context.organizationId, context.userId],
  )
  if (
    !result.rows[0] ||
    !hasPermission(result.rows[0].role, 'files') ||
    (approve && !canApprove(result.rows[0].role))
  )
    throw new DocumentError('forbidden', 403)
  return result.rows[0].role as string
}
export function checkOrigin(request: Request) {
  const origin = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : ''
  if (!origin || request.headers.get('origin') !== origin) throw new DocumentError('forbidden', 403)
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    throw new DocumentError('forbidden', 403)
}
