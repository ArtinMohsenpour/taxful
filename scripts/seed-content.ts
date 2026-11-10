import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { migrations } from '../src/migrations'
import { seedStarterContent } from '../src/migrations/seeds/starter-content'

// Adds starter website content to a new database: run after `pnpm payload migrate`.
// Areas that already have content are left unchanged, so it is safe to repeat.
const payload = await getPayload({ config })
try {
  // The ledger table is missing until the first migration has run.
  const applied = await payload
    .find({
      collection: 'payload-migrations',
      overrideAccess: true,
      pagination: false,
      depth: 0,
      select: { name: true },
    })
    .catch(() => ({ docs: [] }))
  const names = new Set(applied.docs.map((doc) => doc.name))
  const pending = migrations.filter((migration) => !names.has(migration.name))
  if (pending.length)
    throw new Error(`Run \`pnpm payload migrate\` first (${pending.length} pending migrations).`)

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('A database transaction is required')
  try {
    const seeded = await seedStarterContent(payload, { transactionID })
    await payload.db.commitTransaction(transactionID)
    console.log(
      seeded.length
        ? `Added starter content: ${seeded.join(', ')}.`
        : 'Starter content already present; nothing changed.',
    )
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
} finally {
  await payload.destroy()
}
process.exit(0)
