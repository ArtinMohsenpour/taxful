'use client'

import { useRowLabel } from '@payloadcms/ui'

// Shows the first filled field (e.g. a column title) instead of "Item 01".
export default function RowLabel({
  fields,
  fallback,
  options,
}: {
  fields: string[]
  fallback: string
  options?: Record<string, string>
}) {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const value = fields
    .map((field) => data?.[field])
    .find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  const number = String((rowNumber ?? 0) + 1).padStart(2, '0')
  return <span>{value ? (options?.[value] ?? value) : `${fallback} ${number}`}</span>
}
