import { DocumentError } from '../documents/config'

export function grantExpiry(
  input: { expiryMode?: 'days' | 'period' | 'date'; days?: number; expiresAt?: string },
  periodEnd: Date | null,
  now = new Date(),
) {
  const mode = input.expiryMode || 'days'
  const expires =
    mode === 'period'
      ? periodEnd
      : mode === 'date'
        ? new Date(input.expiresAt || '')
        : new Date(now.getTime() + (input.days || 30) * 86400000)
  if (
    !expires ||
    !Number.isFinite(expires.getTime()) ||
    expires <= now ||
    expires.getTime() > now.getTime() + 366 * 86400000
  )
    throw new DocumentError('invalidGrantExpiry', 400)
  return expires
}
