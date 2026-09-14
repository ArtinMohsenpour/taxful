import { customerPool } from '../customer-auth/database'
import { lockMembership, type DocumentContext } from './access'
import { companyProfileSchema } from './company-profile-schema'
import { DocumentError } from './config'
import { z } from 'zod'

export const canManageCompany = (role: string) =>
  role.split(',').some((value) => ['owner', 'admin'].includes(value))
export async function getCompanyProfile(context: DocumentContext) {
  const result = await customerPool.query(
    'SELECT data,revision FROM customer_auth.company_invoice_profiles WHERE organization_id=$1',
    [context.organizationId],
  )
  return result.rows[0] || null
}
export async function saveCompanyProfile(context: DocumentContext, input: unknown) {
  const parsed = z
    .object({ data: companyProfileSchema, revision: z.number().int().nonnegative() })
    .strict()
    .safeParse(input)
  if (!parsed.success) throw new DocumentError('companyProfileInvalid')
  const client = await customerPool.connect()
  try {
    await client.query('BEGIN')
    if (!canManageCompany(await lockMembership(client, context)))
      throw new DocumentError('forbidden', 403)
    const result = await client.query(
      `INSERT INTO customer_auth.company_invoice_profiles(organization_id,data,updated_by)
      SELECT $1,$2,$3 WHERE $4=0
      ON CONFLICT(organization_id) DO NOTHING RETURNING revision`,
      [context.organizationId, parsed.data.data, context.userId, parsed.data.revision],
    )
    let revision = result.rows[0]?.revision
    if (revision === undefined) {
      const updated = await client.query(
        `UPDATE customer_auth.company_invoice_profiles SET data=$2,revision=revision+1,updated_by=$3,updated_at=now()
        WHERE organization_id=$1 AND revision=$4 RETURNING revision`,
        [context.organizationId, parsed.data.data, context.userId, parsed.data.revision],
      )
      if (!updated.rows[0]) throw new DocumentError('conflict', 409)
      revision = updated.rows[0].revision
    }
    await client.query('COMMIT')
    return { revision }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
