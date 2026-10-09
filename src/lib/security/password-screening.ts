import { securitySignal } from './signals'
import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'
import { APIError } from 'better-auth/api'

// Local corpus format: sorted SHA-1 hashes, exactly 40 uppercase hex bytes + LF
// per record. Binary search avoids loading a multi-gigabyte corpus into memory.
async function localBreach(hash: string, path: string) {
  const file = await open(path, 'r')
  try {
    // Read size from this descriptor so an atomic corpus refresh cannot mix files.
    const info = await file.stat()
    if (!info.isFile() || info.size === 0 || info.size % 41 !== 0)
      throw new Error('Invalid password corpus')
    let low = 0,
      high = info.size / 41 - 1
    const buffer = Buffer.alloc(41)
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const read = await file.read(buffer, 0, 41, mid * 41)
      if (read.bytesRead !== 41 || !/^[A-F0-9]{40}\n$/.test(buffer.toString('ascii')))
        throw new Error('Invalid password corpus')
      const current = buffer.toString('ascii', 0, 40)
      if (current === hash) return true
      if (current < hash) low = mid + 1
      else high = mid - 1
    }
    return false
  } finally {
    await file.close()
  }
}
export async function passwordIsBreached(
  password: string,
  options: { mode?: string; path?: string; fetcher?: typeof fetch } = {},
) {
  const mode = options.mode || process.env.PASSWORD_SCREENING_MODE || 'local'
  const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
  if (mode === 'local') {
    const path = options.path || process.env.PASSWORD_BLOCKLIST_PATH
    if (!path) throw new Error('Password screening is not configured')
    return localBreach(hash, path)
  }
  if (mode !== 'hibp') throw new Error('Invalid password screening mode')
  const response = await (options.fetcher || fetch)(
    `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`,
    {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Taxful-Password-Screening' },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      redirect: 'error',
    },
  )
  if (!response.ok || !response.body) throw new Error('Password screening unavailable')
  const reader = response.body.getReader()
  let length = 0
  const parts: Uint8Array[] = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > 256 * 1024) throw new Error('Password screening response too large')
      parts.push(value)
    }
  } finally {
    await reader.cancel()
  }
  const lines = Buffer.concat(parts).toString('utf8').trim().split(/\r?\n/)
  if (!lines.length || lines.some((line) => !/^[A-F0-9]{35}:\d{1,12}$/.test(line)))
    throw new Error('Invalid password screening response')
  return lines.some((line) => line.slice(0, 35) === hash.slice(5) && Number(line.slice(36)) > 0)
}
export async function requireSafePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 15 || password.length > 128) return // Existing length validation provides its specific error.
  try {
    if (await passwordIsBreached(password))
      throw new APIError('BAD_REQUEST', {
        code: 'PASSWORD_BREACHED',
        message: 'Choose a password that has not appeared in a data breach.',
      })
  } catch (error) {
    if (error instanceof APIError) throw error
    await securitySignal('password_screening_unavailable')
    throw new APIError('SERVICE_UNAVAILABLE', {
      code: 'PASSWORD_SCREENING_UNAVAILABLE',
      message: 'Password safety checking is temporarily unavailable. Please try again later.',
    })
  }
}
