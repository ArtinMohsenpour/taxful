import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { ServicePage } from '@/payload-types'
import { websitePage, type WebsiteLocale } from './catalog'
import { contentItems } from './content-items'
import { websiteOrigin } from './metadata'
import type { WebsiteSections } from './types'

type JsonLd = { '@context': 'https://schema.org'; '@type': string; [key: string]: unknown }

// JSON-LD is inserted as script text; escaping "<" keeps editor text from
// closing the script element.
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function faqJsonLd(sections: WebsiteSections): JsonLd | null {
  const questions = contentItems(sections).flatMap((item) =>
    item.type === 'faq' ? (item.faq ?? []) : [],
  )
  if (!questions.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: convertLexicalToPlaintext({ data: answer }) },
    })),
  }
}

export function servicePageJsonLd(page: ServicePage, locale: WebsiteLocale): JsonLd[] {
  const origin = websiteOrigin()
  const services = websitePage('services')!
  const url = `${origin}/${locale}/services/${page.slug}`
  const breadcrumb = [
    { name: websitePage('home')![locale], item: `${origin}/${locale}` },
    { name: services[locale], item: `${origin}/${locale}${services.path}` },
    { name: page.title, item: url },
  ]
  const nodes: (JsonLd | null)[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: page.title,
      description: page.summary,
      url,
      provider: { '@type': 'Organization', name: 'Taxful', url: origin },
      areaServed: { '@type': 'Country', name: 'DE' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumb.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...entry,
      })),
    },
    faqJsonLd(page.sections),
  ]
  return nodes.filter((node) => node !== null)
}
