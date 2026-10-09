import type { PoolClient } from 'pg'
import { DocumentError } from '../documents/config'

// Check current database state at the sensitive operation, not a UI flag or role claim.
export async function requireDocumentMfa(
  client: Pick<PoolClient, 'query'>,
  context: { userId: string; sessionId?: string },
) {
  const result = await client.query(
    `SELECT 1 FROM customer_auth.customer_sessions s
      JOIN customer_auth.customer_users u ON u.id=s."userId"
      JOIN customer_auth.customer_two_factors f ON f."userId"=u.id
     WHERE s.id=$1 AND s."userId"=$2 AND s."expiresAt">now()
       AND u."twoFactorEnabled" AND NOT u.suspended AND f.verified
       AND s."securityVerifiedAt" IS NOT NULL
     FOR SHARE OF s,u,f`,
    [context.sessionId || '', context.userId],
  )
  if (!result.rowCount) throw new DocumentError('mfaRequired', 403)
}
