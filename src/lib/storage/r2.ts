import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'

export type R2Bucket = 'documents' | 'media'

const bucketVariables: Record<R2Bucket, string> = {
  documents: 'R2_DOCUMENTS_BUCKET',
  media: 'R2_MEDIA_BUCKET',
}

// Cloudflare R2 through its S3-compatible API. Returns null when R2 is not
// configured, so local development keeps using the private disk directory.
export function r2Settings(
  bucket: R2Bucket,
  env: Record<string, string | undefined> = process.env,
): { bucket: string; config: S3ClientConfig } | null {
  const name = env[bucketVariables[bucket]]
  const endpoint = env.R2_ENDPOINT
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  if (!name && !endpoint && !accessKeyId && !secretAccessKey) return null
  if (!name || !endpoint || !accessKeyId || !secretAccessKey)
    throw new Error(`Incomplete R2 configuration for the ${bucket} bucket`)
  const url = new URL(endpoint)
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search)
    throw new Error('R2_ENDPOINT must be an https origin without a path')
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(name))
    throw new Error(`Invalid ${bucketVariables[bucket]}`)
  return {
    bucket: name,
    config: {
      endpoint: url.origin,
      region: 'auto',
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 3,
      requestHandler: { connectionTimeout: 5000, requestTimeout: 30000 },
      // R2 does not need the SDK's default request checksums; only send them
      // when an operation requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    },
  }
}

const clients = new Map<R2Bucket, { bucket: string; client: S3Client }>()

export function r2Client(bucket: R2Bucket) {
  const cached = clients.get(bucket)
  if (cached) return cached
  const settings = r2Settings(bucket)
  if (!settings) return null
  const entry = { bucket: settings.bucket, client: new S3Client(settings.config) }
  clients.set(bucket, entry)
  return entry
}
