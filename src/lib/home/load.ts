import 'server-only'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requirePreviewUser } from '@/lib/preview-auth'
import type { HomeLocale } from './defaults'
import { readHome } from './read'

export async function loadHome(locale: HomeLocale, preview: boolean) {
  await connection()
  const payload = await getPayload({ config })
  const user = preview ? await requirePreviewUser(payload) : undefined
  return readHome(payload, { locale, draft: preview, user })
}
