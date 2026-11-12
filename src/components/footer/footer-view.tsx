import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { CmsLink } from '../cms-link'
import type { Footer, Media } from '@/payload-types'
import { copyrightText, emailHref, phoneHref } from '@/lib/footer/contact'
import { socialPlatformName } from '@/lib/footer/social'
import { externalHref, linkHref } from '@/lib/navigation-links'
import { publicMediaURL } from '@/lib/website/urls'
import { TaxfulWordmark } from '../brand/wordmark'
import { SocialIcon, UiIcon } from './icons'

export type FooterLabels = Record<
  | 'home'
  | 'navigation'
  | 'legal'
  | 'social'
  | 'partners'
  | 'contact'
  | 'email'
  | 'phone'
  | 'newTab',
  string
>

export type FooterVariant = 'full' | 'compact'

type StoredLinkRow = NonNullable<Footer['legalLinks']>[number]

// Shared by the server render and the Live Preview client, so it must stay hook-free.
// Every href and media URL is re-checked because preview data comes from the editor.
function mediaImage(value: number | Media | null | undefined) {
  if (!value || typeof value !== 'object' || !value.mimeType?.startsWith('image/')) return null
  const src = publicMediaURL(value.url)
  return src
    ? { src, alt: value.alt ?? '', width: value.width || 180, height: value.height || 48 }
    : null
}

// Footer links show a small arrow when they open a new tab; CmsLink announces it.
function FooterLink({
  entry,
  newTabLabel,
  className,
}: {
  entry: StoredLinkRow
  newTabLabel: string
  className: string
}) {
  if (!entry.label) return null
  return (
    <CmsLink link={entry.link} className={className} newTabLabel={newTabLabel}>
      {entry.label}
      {entry.link?.newTab && (
        <UiIcon name="external" className="ml-1 inline size-3.5 align-[-0.125em] opacity-70" />
      )}
    </CmsLink>
  )
}

function BrandLogo({
  footer,
  fallbackLogo,
  label,
}: {
  footer: Footer
  fallbackLogo: Media | null
  label: string
}) {
  const own = mediaImage(footer.logo)
  const logo = own ?? mediaImage(fallbackLogo)
  const dark = own ? mediaImage(footer.logoDark) : null
  const imageClass = 'h-10 w-auto max-w-48 object-contain sm:h-11'
  return (
    <Link
      href="/"
      aria-label={label}
      className="inline-flex min-w-0 items-center gap-2.5 self-start rounded-lg"
    >
      {logo ? (
        <>
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            unoptimized
            className={`${imageClass} ${dark ? 'dark:hidden' : ''}`}
          />
          {dark && (
            <Image
              src={dark.src}
              alt={dark.alt}
              width={dark.width}
              height={dark.height}
              unoptimized
              className={`${imageClass} hidden dark:block`}
            />
          )}
        </>
      ) : (
        <TaxfulWordmark />
      )}
    </Link>
  )
}

function Contact({ footer, labels }: { footer: Footer; labels: FooterLabels }) {
  const email = emailHref(footer.contact?.email)
  const phone = phoneHref(footer.contact?.phone)
  const address = footer.contact?.address?.trim()
  if (!email && !phone && !address) return null
  const row = 'flex items-start gap-3'
  const icon = 'mt-0.5 size-4 shrink-0 text-brand-ink'
  const link =
    'break-all text-foreground underline-offset-4 transition-colors hover:text-brand-ink hover:underline motion-reduce:transition-none'
  return (
    <address
      aria-label={labels.contact}
      className="flex flex-col gap-3 text-sm text-muted-foreground not-italic"
    >
      {address && (
        <p className={row}>
          <UiIcon name="location" className={icon} />
          <span className="whitespace-pre-line">{address}</span>
        </p>
      )}
      {email && (
        <p className={row}>
          <UiIcon name="mail" className={icon} />
          <a href={email} className={link}>
            <span className="sr-only">{labels.email}: </span>
            {footer.contact!.email!.trim()}
          </a>
        </p>
      )}
      {phone && (
        <p className={row}>
          <UiIcon name="phone" className={icon} />
          <a href={phone} className={link}>
            <span className="sr-only">{labels.phone}: </span>
            {footer.contact!.phone!.trim()}
          </a>
        </p>
      )}
    </address>
  )
}

function Social({ footer, labels }: { footer: Footer; labels: FooterLabels }) {
  const profiles = (footer.social ?? []).flatMap((profile) => {
    const href = externalHref(profile.url)
    return href ? [{ ...profile, href }] : []
  })
  if (!profiles.length) return null
  const title = footer.socialTitle?.trim()
  return (
    <div className="flex flex-col gap-3">
      <h2
        id="footer-social"
        className={title ? 'text-sm font-semibold text-foreground' : 'sr-only'}
      >
        {title || labels.social}
      </h2>
      <ul aria-labelledby="footer-social" className="flex flex-wrap gap-2">
        {profiles.map((profile) => {
          const name = profile.label?.trim() || socialPlatformName(profile.platform)
          return (
            <li key={profile.id ?? profile.href}>
              <a
                href={profile.href}
                target="_blank"
                rel="me noopener noreferrer"
                title={name}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-accent/50 text-brand-ink transition-colors hover:border-primary/70 hover:bg-accent motion-reduce:transition-none"
              >
                <SocialIcon platform={profile.platform} className="size-[1.15rem]" />
                <span className="sr-only">
                  {name} ({labels.newTab})
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Partners({ footer, labels }: { footer: Footer; labels: FooterLabels }) {
  const partners = (footer.partners ?? []).flatMap((partner) => {
    const logo = mediaImage(partner.logo)
    return logo ? [{ ...partner, logo, href: externalHref(partner.url) }] : []
  })
  if (!partners.length) return null
  const title = footer.partnersTitle?.trim()
  return (
    <section
      aria-labelledby="footer-partners"
      className="border-t border-border/80 px-6 py-8 sm:px-10"
    >
      <h2
        id="footer-partners"
        className={
          title
            ? 'text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase'
            : 'sr-only'
        }
      >
        {title || labels.partners}
      </h2>
      <ul
        className={`grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center ${title ? 'mt-5' : ''}`}
      >
        {partners.map((partner) => {
          const monochrome = partner.appearance === 'monochrome'
          const dark = monochrome ? null : mediaImage(partner.logoDark)
          const imageClass = `h-7 w-auto max-w-full object-contain sm:h-9 sm:max-w-36 ${monochrome ? 'opacity-70 brightness-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none dark:invert' : ''}`
          const logos: ReactNode = (
            <>
              <Image
                src={partner.logo.src}
                alt={partner.name}
                width={partner.logo.width}
                height={partner.logo.height}
                unoptimized
                className={`${imageClass} ${dark ? 'dark:hidden' : ''}`}
              />
              {dark && (
                <Image
                  src={dark.src}
                  alt={partner.name}
                  width={dark.width}
                  height={dark.height}
                  unoptimized
                  className={`${imageClass} hidden dark:block`}
                />
              )}
            </>
          )
          // Original-colour logos without a dark version sit on a light plate in dark mode.
          const plate = !monochrome && !dark ? 'dark:border-transparent dark:bg-logo-plate' : ''
          const tile = `group flex h-16 w-full items-center justify-center rounded-2xl border border-border bg-background/60 px-4 sm:h-[4.5rem] sm:w-auto sm:min-w-32 sm:px-6 ${plate}`
          return (
            <li key={partner.id ?? partner.name}>
              {partner.href ? (
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={partner.name}
                  className={`${tile} transition-colors hover:border-primary/70 motion-reduce:transition-none`}
                >
                  {logos}
                  <span className="sr-only"> ({labels.newTab})</span>
                </a>
              ) : (
                <div className={tile}>{logos}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function bottomBarContent(footer: Footer, year: number) {
  const copyright = copyrightText(footer.copyright, year)
  const note = footer.note?.trim()
  const legal = (footer.legalLinks ?? []).filter((entry) => entry.label && linkHref(entry.link))
  return copyright || note || legal.length ? { copyright, note, legal } : null
}

function BottomBar({
  content: { copyright, note, legal },
  labels,
  compact,
}: {
  content: NonNullable<ReturnType<typeof bottomBarContent>>
  labels: FooterLabels
  compact: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-4 px-6 text-sm text-muted-foreground sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 ${compact ? 'py-5' : 'border-t border-border/80 py-6'}`}
    >
      {(copyright || note) && (
        <div className="flex min-w-0 flex-col gap-1">
          {copyright && <p>{copyright}</p>}
          {note && <p className="max-w-2xl text-xs leading-relaxed whitespace-pre-line">{note}</p>}
        </div>
      )}
      {legal.length > 0 && (
        <nav aria-label={labels.legal} className="lg:ml-auto lg:max-w-1/2 lg:shrink-0">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
            {legal.map((entry) => (
              <li key={entry.id ?? entry.label}>
                <FooterLink
                  entry={entry}
                  newTabLabel={labels.newTab}
                  className="rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline motion-reduce:transition-none"
                />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

export function FooterView({
  footer,
  fallbackLogo,
  labels,
  year,
  variant = 'full',
}: {
  footer: Footer
  fallbackLogo: Media | null
  labels: FooterLabels
  year: number
  variant?: FooterVariant
}) {
  const shell = 'mx-auto w-full max-w-6xl px-3 pb-3 sm:px-6 sm:pb-6'
  const card =
    'site-footer overflow-hidden rounded-[1.5rem] border border-border/80 bg-surface/90 shadow-nav'

  const bottomBar = bottomBarContent(footer, year)

  // Customer pages show only the legal bar; without content there is nothing to show.
  if (variant === 'compact')
    return bottomBar ? (
      <footer id="site-footer" className={`${shell} mt-4`}>
        <div className={card}>
          <BottomBar content={bottomBar} labels={labels} compact />
        </div>
      </footer>
    ) : null

  const columns = (footer.columns ?? [])
    .map((column) => ({
      ...column,
      links: (column.links ?? []).filter((entry) => entry.label && linkHref(entry.link)),
    }))
    .filter((column) => column.title && column.links.length)
  const tagline = footer.tagline?.trim()

  return (
    <footer id="site-footer" className={`${shell} mt-6 sm:mt-8`}>
      <div className={card}>
        <div
          className={`grid gap-x-16 gap-y-12 px-6 pt-10 pb-10 sm:px-10 sm:pt-12 ${columns.length ? 'lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]' : ''}`}
        >
          <div className="flex flex-col gap-6">
            <BrandLogo footer={footer} fallbackLogo={fallbackLogo} label={labels.home} />
            {tagline && (
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{tagline}</p>
            )}
            <Contact footer={footer} labels={labels} />
            <Social footer={footer} labels={labels} />
          </div>
          {columns.length > 0 && (
            <nav aria-label={labels.navigation}>
              <div
                style={
                  {
                    '--footer-columns': columns.length,
                    '--footer-columns-sm': Math.min(columns.length, 3),
                  } as CSSProperties
                }
                className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-[repeat(var(--footer-columns-sm),minmax(0,1fr))] lg:grid-cols-[repeat(var(--footer-columns),minmax(0,1fr))]"
              >
                {columns.map((column) => (
                  <div key={column.id ?? column.title} className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
                    <ul className="mt-4 flex flex-col gap-3 text-sm">
                      {column.links.map((entry) => (
                        <li key={entry.id ?? entry.label}>
                          <FooterLink
                            entry={entry}
                            newTabLabel={labels.newTab}
                            className="rounded-sm break-words text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline motion-reduce:transition-none"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          )}
        </div>
        <Partners footer={footer} labels={labels} />
        {bottomBar && <BottomBar content={bottomBar} labels={labels} compact={false} />}
      </div>
    </footer>
  )
}
