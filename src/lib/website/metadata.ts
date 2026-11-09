import type { Metadata } from 'next'
import type { ServicePage } from '@/payload-types'
import type { WebsiteLocale, WebsitePageSlug } from './catalog'
import { websitePage } from './catalog'
import type { WebsitePageDocument } from './types'
import { publicMediaURL } from './urls'

export function websiteOrigin() {
  return new URL(process.env.WEBSITE_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000')
    .origin
}

export function pageMetadata(
  page: WebsitePageDocument,
  slug: WebsitePageSlug,
  locale: WebsiteLocale,
  preview: boolean,
): Metadata {
  const definition = websitePage(slug)!
  return seoMetadata({
    path: definition.path,
    seo: page.seo,
    fallbackTitle:
      slug === 'home' ? 'Taxful' : `${page.title?.trim() || definition[locale]} | Taxful`,
    fallbackDescription:
      'subtitle' in page
        ? page.subtitle?.trim()
        : 'description' in page
          ? page.description?.trim()
          : '',
    locale,
    preview,
  })
}

export function servicePageMetadata(
  page: ServicePage,
  locale: WebsiteLocale,
  preview: boolean,
): Metadata {
  return seoMetadata({
    path: `/services/${page.slug}`,
    seo: page.seo,
    fallbackTitle: `${page.title} | Taxful`,
    fallbackDescription: page.summary,
    locale,
    preview,
  })
}

function seoMetadata({
  path,
  seo,
  fallbackTitle,
  fallbackDescription,
  locale,
  preview,
}: {
  path: string
  seo: WebsitePageDocument['seo']
  fallbackTitle: string
  fallbackDescription?: string | null
  locale: WebsiteLocale
  preview: boolean
}): Metadata {
  const base = websiteOrigin()
  const href = (language: string) => `${base}/${language}${path === '/' ? '' : path}`
  const title = seo?.title?.trim() || fallbackTitle
  const description = seo?.description?.trim() || fallbackDescription?.trim() || undefined
  const image = seo?.image
  const imageURL = typeof image === 'object' && image ? publicMediaURL(image.url) : undefined
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: {
      canonical: href(locale),
      languages: { de: href('de'), en: href('en'), 'x-default': href('de') },
    },
    robots:
      preview || seo?.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Taxful',
      title,
      description,
      url: href(locale),
      locale: locale === 'de' ? 'de_DE' : 'en_GB',
      alternateLocale: locale === 'de' ? 'en_GB' : 'de_DE',
      images: imageURL
        ? [{ url: imageURL, alt: typeof image === 'object' && image ? image.alt : '' }]
        : [],
    },
    twitter: {
      card: imageURL ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageURL ? [imageURL] : [],
    },
  }
}
