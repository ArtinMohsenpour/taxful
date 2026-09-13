import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { DocumentError } from './config'
const idPattern = /^[a-f0-9-]{36}$/
export function storagePath(id: string, kind: 'source' | 'preview' | 'export' = 'source') {
  if (!idPattern.test(id)) throw new DocumentError('notFound', 404)
  const root = path.resolve(process.env.DOCUMENT_STORAGE_PATH || '.private/documents')
  const publicDir = path.resolve('public')
  if (root === publicDir || root.startsWith(publicDir + path.sep))
    throw new Error('Document storage cannot be public')
  if (process.env.NODE_ENV === 'production' && !process.env.DOCUMENT_STORAGE_PATH)
    throw new Error('Configure a persistent private document volume')
  return path.join(root, id + '.' + kind)
}
export const sha256 = (buffer: Buffer | string) => createHash('sha256').update(buffer).digest('hex')
export async function writePrivate(
  id: string,
  bytes: Buffer,
  kind: 'source' | 'preview' | 'export' = 'source',
) {
  const file = storagePath(id, kind)
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  await writeFile(file, bytes, { flag: 'wx', mode: 0o600 })
}
export const readPrivate = (id: string, kind: 'source' | 'preview' | 'export' = 'source') =>
  readFile(storagePath(id, kind))
export async function removePrivate(id: string, kind: 'source' | 'preview' | 'export' = 'source') {
  await unlink(storagePath(id, kind)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}
