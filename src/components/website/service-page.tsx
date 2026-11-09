import type { ServicePage } from '@/payload-types'
import type { WebsiteLocale } from '@/lib/website/catalog'
import type { ServiceCardsData } from '@/lib/website/types'
import { Icon } from '@/components/customer-auth/icon'
import { WebsiteSections } from './sections'

export type ServicePageLabels = {
  services: string
  keyPoints: string
  startFree: string
  viewPricing: string
}

export function ServicePageContent({
  data,
  locale,
  cards,
  labels,
}: {
  data: ServicePage
  locale: WebsiteLocale
  cards?: ServiceCardsData
  labels: ServicePageLabels
}) {
  return (
    <>
      <header className="mx-auto max-w-3xl py-14 text-center sm:py-20">
        <a
          href={`/${locale}/services`}
          className="mb-4 inline-block text-xs font-semibold tracking-[0.18em] text-brand-ink uppercase underline-offset-4 hover:underline"
        >
          {labels.services}
        </a>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {data.title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
          {data.summary}
        </p>
        {Boolean(data.keyPoints?.length) && (
          <ul
            aria-label={labels.keyPoints}
            className="mt-8 flex flex-wrap justify-center gap-2 text-sm"
          >
            {data.keyPoints?.map((point, index) => (
              <li
                key={point.id || index}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5"
              >
                <Icon name="check" className="size-4 text-brand-ink" />
                {point.text}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={`/${locale}/signup`}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 motion-reduce:transition-none"
          >
            {labels.startFree}
          </a>
          <a
            href={`/${locale}/pricing`}
            className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent motion-reduce:transition-none"
          >
            {labels.viewPricing}
          </a>
        </div>
      </header>
      {/* Articles are read top to bottom; a narrower column keeps lines readable. */}
      <div className="mx-auto max-w-4xl">
        <WebsiteSections sections={data.sections} locale={locale} cards={cards} />
      </div>
    </>
  )
}
