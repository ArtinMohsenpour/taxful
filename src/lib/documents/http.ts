import { DocumentError } from './config'
export const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders })
}
export function failure(error: unknown) {
  if (error instanceof DocumentError)
    return json({ error: error.code, issues: error.issues }, error.status)
  // Never log file content, extracted identities, tokens, or provider errors.
  console.error('Document operation failed.')
  return json({ error: 'genericError' }, 500)
}
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length') || 0) > limit)
    throw new DocumentError('fileTooLarge', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new DocumentError('invalidRequest')
  const chunks: Uint8Array[] = []
  let size = 0
  let timedOut = false
  const deadline = setTimeout(() => {
    timedOut = true
    void reader.cancel()
  }, 30000)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) {
        await reader.cancel()
        throw new DocumentError('fileTooLarge', 413)
      }
      chunks.push(value)
    }
    if (timedOut) throw new DocumentError('invalidRequest', 408)
    return Buffer.concat(chunks)
  } finally {
    clearTimeout(deadline)
  }
}
export function documentId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new DocumentError('notFound', 404)
  return id
}
