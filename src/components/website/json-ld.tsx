import { serializeJsonLd } from '@/lib/website/structured-data'

export function JsonLd({ data }: { data: object | object[] | null }) {
  if (!data || (Array.isArray(data) && !data.length)) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
