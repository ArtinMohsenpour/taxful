import type { Payload, PayloadRequest } from 'payload'

type Locale = 'de' | 'en'
type Entry = { path: string; de: string; en: string }

// Only existing routes. Social profiles, contact details and partner logos are
// left for editors: they must never be invented.
const columns: { de: string; en: string; links: Entry[] }[] = [
  {
    de: 'Leistungen',
    en: 'Services',
    links: [
      { path: '/services', de: 'Alle Leistungen', en: 'All services' },
      {
        path: '/services/e-rechnung-erstellen',
        de: 'E-Rechnung erstellen',
        en: 'Create e-invoices',
      },
      {
        path: '/services/pdf-in-e-rechnung-umwandeln',
        de: 'PDF in E-Rechnung umwandeln',
        en: 'Convert PDF to e-invoice',
      },
      {
        path: '/services/e-rechnung-empfangen',
        de: 'E-Rechnung empfangen',
        en: 'Receive e-invoices',
      },
      { path: '/services/e-rechnung-pruefen', de: 'E-Rechnung prüfen', en: 'Validate e-invoices' },
    ],
  },
  {
    de: 'Unternehmen',
    en: 'Company',
    links: [
      { path: '/about', de: 'Über uns', en: 'About us' },
      { path: '/how-it-works', de: 'So funktioniert es', en: 'How it works' },
      { path: '/pricing', de: 'Preise', en: 'Pricing' },
      { path: '/faq', de: 'Häufige Fragen', en: 'FAQ' },
      { path: '/contact', de: 'Kontakt', en: 'Contact us' },
    ],
  },
  {
    de: 'Kundenbereich',
    en: 'Customer area',
    links: [
      { path: '/login', de: 'Anmelden', en: 'Log in' },
      { path: '/signup', de: 'Registrieren', en: 'Sign up' },
    ],
  },
]

const legalLinks: Entry[] = [
  { path: '/privacy', de: 'Datenschutz', en: 'Privacy' },
  { path: '/terms', de: 'Nutzungsbedingungen', en: 'Terms of use' },
  { path: '/impressum', de: 'Impressum', en: 'Legal notice' },
]

const copy = {
  de: { tagline: 'Ein bisschen mehr Klarheit für Ihre Rechnungen.', copyright: '© {year} Taxful' },
  en: { tagline: 'A little more clarity for your invoices.', copyright: '© {year} Taxful' },
}

const link = (entry: Entry, locale: Locale, id?: string | null) => ({
  ...(id ? { id } : {}),
  label: entry[locale],
  link: { type: 'internal' as const, path: entry.path, newTab: false },
})

// Publishes starter navigation once. An existing footer is never overwritten.
export async function seedFooter(payload: Payload, req: Partial<PayloadRequest>) {
  const existing = await payload.findGlobal({
    slug: 'footer',
    req,
    overrideAccess: true,
    draft: true,
    depth: 0,
    select: { columns: true, legalLinks: true },
  })
  if (existing.columns?.length || existing.legalLinks?.length) return

  const saved = await payload.updateGlobal({
    slug: 'footer',
    req,
    overrideAccess: true,
    locale: 'de',
    data: {
      ...copy.de,
      columns: columns.map((column) => ({
        title: column.de,
        links: column.links.map((entry) => link(entry, 'de')),
      })),
      legalLinks: legalLinks.map((entry) => link(entry, 'de')),
      _status: 'published',
    },
  })
  // Reuse the German row ids so English only adds translations to the same structure.
  await payload.updateGlobal({
    slug: 'footer',
    req,
    overrideAccess: true,
    locale: 'en',
    data: {
      ...copy.en,
      columns: columns.map((column, index) => ({
        id: saved.columns?.[index]?.id,
        title: column.en,
        links: column.links.map((entry, linkIndex) =>
          link(entry, 'en', saved.columns?.[index]?.links?.[linkIndex]?.id),
        ),
      })),
      legalLinks: legalLinks.map((entry, index) =>
        link(entry, 'en', saved.legalLinks?.[index]?.id),
      ),
      _status: 'published',
    },
  })
}
