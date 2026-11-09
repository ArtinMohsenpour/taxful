import { Icon } from '@/components/customer-auth/icon'
import type { WebsiteLocale } from '@/lib/website/catalog'
import type { ServiceCard } from '@/lib/website/types'

export function ServiceCards({
  services,
  locale,
  readMore,
}: {
  services: ServiceCard[]
  locale: WebsiteLocale
  readMore: string
}) {
  if (!services.length) return null
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <li
          key={service.id}
          className="flex flex-col rounded-[1.5rem] border border-border bg-surface p-6 shadow-nav"
        >
          {service.icon && (
            <span className="mb-5 flex size-11 items-center justify-center rounded-[0.9rem] bg-primary/15 text-brand-ink">
              <Icon name={service.icon} />
            </span>
          )}
          <h3 className="text-lg font-semibold tracking-tight text-balance text-foreground">
            {service.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
            {service.summary}
          </p>
          {Boolean(service.keyPoints?.length) && (
            <ul className="mt-4 space-y-1.5 text-sm text-foreground">
              {service.keyPoints?.map((point, index) => (
                <li key={point.id || index} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 size-4 text-brand-ink" />
                  {point.text}
                </li>
              ))}
            </ul>
          )}
          <a
            href={`/${locale}/services/${service.slug}`}
            aria-label={`${readMore}: ${service.title}`}
            className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full pt-6 text-sm font-semibold text-brand-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            {readMore}
            <Icon name="arrow" className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  )
}
