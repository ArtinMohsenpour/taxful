import { createReadStream } from 'node:fs'
import { open, rename, rm } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

// Import the SHA-1-ordered (not prevalence-ordered) Pwned Passwords corpus.
// Never accepts or prints plaintext passwords. Source and destination must differ.
const [input, output] = process.argv.slice(2)
if (!input || !output || resolve(input) === resolve(output))
  throw new Error('Usage: pnpm security:corpus SHA1_ORDERED_INPUT OUTPUT')
const temporary = `${resolve(output)}.${randomUUID()}.tmp`
const file = await open(temporary, 'wx', 0o600)
let previous = '',
  lastWritten = '',
  count = 0
try {
  const lines = createInterface({ input: createReadStream(input), crlfDelay: Infinity })
  for await (const line of lines) {
    const match = /^([A-Fa-f0-9]{40})(?::([0-9]{1,12}))?$/.exec(line)
    if (!match) throw new Error('Invalid corpus record')
    const hash = match[1].toUpperCase()
    if (hash < previous) throw new Error('Input corpus must be sorted by SHA-1 hash')
    if (hash !== lastWritten && (!match[2] || Number(match[2]) > 0)) {
      await file.write(hash + '\n')
      lastWritten = hash
      count++
    }
    previous = hash
  }
  if (!count) throw new Error('Corpus is empty')
  await file.sync()
  await file.close()
  await rename(temporary, output)
  console.log(JSON.stringify({ event: 'password_corpus_imported', records: count }))
} catch (error) {
  await file.close().catch(() => {})
  await rm(temporary, { force: true })
  throw error
}
