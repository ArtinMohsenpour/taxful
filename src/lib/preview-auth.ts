import 'server-only'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Payload } from 'payload'

export async function requirePreviewUser(payload: Payload) {
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'users') notFound()
  return user
}
