import { z } from 'zod'
import { DocumentError } from './config'

const filters = z
  .object({
    q: z.string().trim().max(120).default(''),
    status: z
      .enum([
        'all',
        'queued',
        'processing',
        'needs_review',
        'approved',
        'exported',
        'failed',
        'unsupported',
      ])
      .default('all'),
    type: z.enum(['all', 'pdf', 'word', 'image']).default('all'),
    from: z.union([z.iso.date(), z.literal('')]).default(''),
    to: z.union([z.iso.date(), z.literal('')]).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to)

export function documentFilters(params = new URLSearchParams()) {
  const parsed = filters.safeParse(Object.fromEntries(params))
  if (!parsed.success) throw new DocumentError('invalidRequest')
  return parsed.data
}
export type DocumentFilters = ReturnType<typeof documentFilters>
