import type { ServicePage } from '../../../payload-types'

export type ServiceSlug =
  | 'e-rechnung-erstellen'
  | 'pdf-in-e-rechnung-umwandeln'
  | 'e-rechnung-empfangen'
  | 'e-rechnung-pruefen'
  | 'gutschrift-korrektur-schlussrechnung'
  | 'rechnungen-digital-verwalten'

/** Markdown text, a FAQ list, or service cards (an empty list shows all services). */
export type ItemSeed =
  string | { faq: { question: string; answer: string }[] } | { services: ServiceSlug[] }

export type SectionSeed = {
  layout?: 'fullWidth' | 'twoColumns' | 'threeColumns'
  eyebrow?: string
  title?: string
  subtitle?: string
  tone?: 'plain' | 'surface' | 'accent'
  columns: ItemSeed[][]
}

export type LocaleSeed = {
  title: string
  summary: string
  keyPoints: string[]
  seo: { title: string; description: string }
  sections: SectionSeed[]
}

export type ServiceSeed = {
  slug: ServiceSlug
  sortOrder: number
  icon: NonNullable<ServicePage['icon']>
  de: LocaleSeed
  en: LocaleSeed
}

export type LandingSeed = Record<
  'de' | 'en',
  Omit<LocaleSeed, 'summary' | 'keyPoints'> & { eyebrow: string; subtitle: string }
>
