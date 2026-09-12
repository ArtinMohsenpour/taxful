import { config } from 'dotenv'
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

config({ path: ['.env.local', '.env'] })
const { customerPool } = await import('../src/lib/customer-auth/database')
await customerPool.query('CREATE SCHEMA IF NOT EXISTS customer_auth')
const directory = 'src/customer-migrations'
mkdirSync(directory, { recursive: true })
try {
  if (process.argv.includes('--generate')) {
    const { auth } = await import('../src/lib/customer-auth/auth')
    const { getMigrations } = await import('better-auth/db/migration')
    const plan = await getMigrations(auth.options)
    const sql = await plan.compileMigrations()
    const file = `${directory}/0001_customer_auth.sql`
    if (readdirSync(directory).includes('0001_customer_auth.sql'))
      throw new Error(
        'Initial migration already exists; generate a new reviewed migration for schema changes.',
      )
    writeFileSync(file, sql)
    console.log(`Generated ${file}; review before applying.`)
  } else {
    const client = await customerPool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SELECT pg_advisory_xact_lock(hashtext('taxful-customer-migrations'))")
      await client.query(
        'CREATE TABLE IF NOT EXISTS customer_auth.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
      )
      for (const file of readdirSync(directory)
        .filter((name) => name.endsWith('.sql'))
        .sort()) {
        const sql = readFileSync(`${directory}/${file}`, 'utf8')
        const checksum = createHash('sha256').update(sql).digest('hex')
        const previous = await client.query(
          'SELECT checksum FROM customer_auth.schema_migrations WHERE name = $1',
          [file],
        )
        if (previous.rowCount) {
          if (previous.rows[0].checksum !== checksum)
            throw new Error(`Applied migration changed: ${file}`)
          continue
        }
        await client.query(sql)
        await client.query(
          'INSERT INTO customer_auth.schema_migrations (name, checksum) VALUES ($1, $2)',
          [file, checksum],
        )
        console.log(`Applied ${file}`)
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
} finally {
  await customerPool.end()
}
