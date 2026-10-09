// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

import { beforeAll, afterAll } from 'vitest'
import { passwordCorpusFixture } from './tests/documents/security-fixtures'
let cleanupPasswordCorpus: (() => Promise<void>) | undefined
beforeAll(async () => {
  cleanupPasswordCorpus = await passwordCorpusFixture()
})
afterAll(async () => {
  await cleanupPasswordCorpus?.()
})
