import type { ContentItem } from '@/lib/website/types'
import type { WebsiteLocale } from '@/lib/website/catalog'
import { WebsiteRichText } from './rich-text'

export function FaqList({ items, locale }: { items: ContentItem['faq']; locale: WebsiteLocale }) {
  if (!items?.length) return null
  return (
    <div className="divide-y divide-border overflow-hidden rounded-[1.5rem] border border-border bg-surface">
      {items.map((item, index) => (
        <details key={item.id || index} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none sm:px-6 [&::-webkit-details-marker]:hidden">
            {item.question}
            <span
              aria-hidden="true"
              className="text-xl leading-none text-brand-ink transition-transform group-open:rotate-45 motion-reduce:transition-none"
            >
              +
            </span>
          </summary>
          <div className="px-5 pb-5 sm:px-6">
            <WebsiteRichText data={item.answer} locale={locale} />
          </div>
        </details>
      ))}
    </div>
  )
}
