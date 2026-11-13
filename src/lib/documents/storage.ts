import { mkdir, readFile, stat, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { DocumentError } from './config'
import { r2Client } from '../storage/r2'

// Private document artifacts live in the R2 documents bucket when R2 is
// configured, otherwise in a local private directory (development and tests).
// Both backends keep the same contract: writes never overwrite (EEXIST), a
// missing object reads as ENOENT, and removal is idempotent.
type Kind = 'source' | 'preview' | 'export'
const idPattern = /^[a-f0-9-]{36}$/
const r2 = () => r2Client('documents')

// turbopackIgnore: paths come from runtime config; without it the build traces the whole project.
export function storagePath(id: string, kind: Kind = 'source') {
  if (!idPattern.test(id)) throw new DocumentError('notFound', 404)
  const root = path.resolve(
    /* turbopackIgnore: true */ process.env.DOCUMENT_STORAGE_PATH || '.private/documents',
  )
  const publicDir = path.resolve(/* turbopackIgnore: true */ 'public')
  if (root === publicDir || root.startsWith(publicDir + path.sep))
    throw new Error('Document storage cannot be public')
  if (process.env.NODE_ENV === 'production' && !process.env.DOCUMENT_STORAGE_PATH)
    throw new Error('Configure R2 or a persistent private document volume')
  return path.join(/* turbopackIgnore: true */ root, id + '.' + kind)
}

function objectKey(id: string, kind: Kind) {
  if (!idPattern.test(id)) throw new DocumentError('notFound', 404)
  return `documents/${id}.${kind}`
}

function storageError(code: 'EEXIST' | 'ENOENT') {
  return Object.assign(new Error(`Private object ${code === 'EEXIST' ? 'exists' : 'missing'}`), {
    code,
  })
}

const statusOf = (error: unknown) =>
  (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode

export const sha256 = (buffer: Buffer | string) => createHash('sha256').update(buffer).digest('hex')

export async function writePrivate(id: string, bytes: Buffer, kind: Kind = 'source') {
  const remote = r2()
  if (remote) {
    try {
      await remote.client.send(
        new PutObjectCommand({
          Bucket: remote.bucket,
          Key: objectKey(id, kind),
          Body: bytes,
          ContentLength: bytes.length,
          ContentType: 'application/octet-stream',
          IfNoneMatch: '*',
        }),
      )
    } catch (error) {
      if (statusOf(error) === 412) throw storageError('EEXIST')
      throw error
    }
    return
  }
  const file = storagePath(id, kind)
  await mkdir(/* turbopackIgnore: true */ path.dirname(file), { recursive: true, mode: 0o700 })
  await writeFile(/* turbopackIgnore: true */ file, bytes, { flag: 'wx', mode: 0o600 })
}

export async function readPrivate(id: string, kind: Kind = 'source'): Promise<Buffer> {
  const remote = r2()
  if (remote) {
    try {
      const result = await remote.client.send(
        new GetObjectCommand({ Bucket: remote.bucket, Key: objectKey(id, kind) }),
      )
      if (!result.Body) throw storageError('ENOENT')
      return Buffer.from(await result.Body.transformToByteArray())
    } catch (error) {
      if (statusOf(error) === 404) throw storageError('ENOENT')
      throw error
    }
  }
  return readFile(/* turbopackIgnore: true */ storagePath(id, kind))
}

export async function privateSize(id: string, kind: Kind = 'source'): Promise<number> {
  const remote = r2()
  if (remote) {
    try {
      const result = await remote.client.send(
        new HeadObjectCommand({ Bucket: remote.bucket, Key: objectKey(id, kind) }),
      )
      return result.ContentLength ?? 0
    } catch (error) {
      if (statusOf(error) === 404) throw storageError('ENOENT')
      throw error
    }
  }
  return (await stat(/* turbopackIgnore: true */ storagePath(id, kind))).size
}

export async function removePrivate(id: string, kind: Kind = 'source') {
  const remote = r2()
  if (remote) {
    // S3 deletes are idempotent: a missing object is not an error.
    await remote.client.send(
      new DeleteObjectCommand({ Bucket: remote.bucket, Key: objectKey(id, kind) }),
    )
    return
  }
  await unlink(/* turbopackIgnore: true */ storagePath(id, kind)).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    },
  )
}
