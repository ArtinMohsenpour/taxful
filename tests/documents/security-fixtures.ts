import { randomUUID, createHash } from 'node:crypto'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Pool } from 'pg'

// Only synthetic users created by the calling test. Real login/enrollment is
// exercised separately; domain fixtures need an explicitly verified session.
export async function verifiedCustomerSession(pool: Pool, userId: string, id = randomUUID()) {
  await pool.query(
    'UPDATE customer_auth.customer_users SET "twoFactorEnabled"=true WHERE id=$1 AND email LIKE \'%@example.test\'',
    [userId],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_two_factors(id,"userId",secret,"backupCodes",verified) VALUES($1,$2,\'synthetic-only\',\'[]\',true)',
    [randomUUID(), userId],
  )
  await pool.query(
    'INSERT INTO customer_auth.customer_sessions(id,token,"userId","expiresAt","updatedAt","securityVerifiedAt") VALUES($1,$2,$3,now()+interval \'1 day\',now(),now())',
    [id, randomUUID(), userId],
  )
  return id
}
export async function passwordCorpusFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'taxful-password-test-'))
  const path = join(dir, 'hashes')
  await writeFile(
    path,
    createHash('sha1').update('Known breached synthetic password').digest('hex').toUpperCase() +
      '\n',
  )
  const oldMode = process.env.PASSWORD_SCREENING_MODE,
    oldPath = process.env.PASSWORD_BLOCKLIST_PATH
  process.env.PASSWORD_SCREENING_MODE = 'local'
  process.env.PASSWORD_BLOCKLIST_PATH = path
  return async () => {
    if (oldMode === undefined) delete process.env.PASSWORD_SCREENING_MODE
    else process.env.PASSWORD_SCREENING_MODE = oldMode
    if (oldPath === undefined) delete process.env.PASSWORD_BLOCKLIST_PATH
    else process.env.PASSWORD_BLOCKLIST_PATH = oldPath
    await rm(dir, { recursive: true, force: true })
  }
}
