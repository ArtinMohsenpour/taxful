import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync, chmodSync } from 'node:fs'
import { parse } from 'dotenv'

const file = '.env.local'
const existing = {
  ...parse(existsSync('.env') ? readFileSync('.env') : ''),
  ...parse(existsSync(file) ? readFileSync(file) : ''),
  ...process.env,
}
const defaults = {
  BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
  BETTER_AUTH_URL: 'http://localhost:3000',
  CUSTOMER_SMTP_HOST: '127.0.0.1',
  CUSTOMER_SMTP_PORT: '1026',
  CUSTOMER_SMTP_SECURE: 'false',
  CUSTOMER_EMAIL_FROM: 'Taxful <no-reply@taxful.test>',
}
const missing = Object.entries(defaults).filter(([key]) => !existing[key])
if (missing.length) {
  appendFileSync(
    file,
    '\n# Local customer authentication\n' +
      missing.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') +
      '\n',
    { mode: 0o600 },
  )
  chmodSync(file, 0o600)
}
console.log('Customer authentication environment is ready. Secret values were not printed.')
