import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FaqList } from '@/components/website/faq-list'
import { WebsiteSections } from '@/components/website/sections'
import { ServicePageContent } from '@/components/website/service-page'
import type { ServicePage } from '@/payload-types'
import type { ServiceCard, WebsiteSections as Sections } from '@/lib/website/types'

afterEach(cleanup)
const h = React.createElement

const text = (value: string, url?: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: url
          ? [
              {
                type: 'link',
                version: 3,
                direction: null,
                format: '',
                indent: 0,
                fields: { linkType: 'custom', url, newTab: false },
                children: [
                  {
                    type: 'text',
                    version: 1,
                    text: value,
                    format: 0,
                    detail: 0,
                    mode: 'normal',
                    style: '',
                  },
                ],
              },
            ]
          : [
              {
                type: 'text',
                version: 1,
                text: value,
                format: 0,
                detail: 0,
                mode: 'normal',
                style: '',
              },
            ],
      },
    ],
  },
})

const card = (id: number): ServiceCard => ({
  id,
  slug: `service-${id}`,
  title: `Service ${id}`,
  summary: `Summary ${id}`,
  keyPoints: [{ text: `Point ${id}` }],
  icon: 'converter',
})

const cardsSection = (services: (number | ServiceCard)[] | null): Sections => [
  {
    blockType: 'fullWidth',
    column1: { content: [{ type: 'services', services: services as number[] }] },
  },
]

describe('FAQ items', () => {
  it('renders each question as an expandable summary with a localized answer link', () => {
    const { container } = render(
      h(FaqList, {
        locale: 'de',
        items: [
          { question: 'Kostet das etwas?', answer: text('Preise', '/pricing') },
          { question: 'Gibt es eine Testphase?', answer: text('Ja.') },
        ],
      }),
    )
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(2)
    expect(details[0].querySelector('summary')?.textContent).toContain('Kostet das etwas?')
    expect(screen.getByRole('link', { name: 'Preise' }).getAttribute('href')).toBe('/de/pricing')
  })
})

describe('service card items', () => {
  const published = [card(1), card(2), card(3)]
  const cards = { items: published, readMore: 'Mehr erfahren' }

  it('follows the editor selection and drops unpublished services', () => {
    render(h(WebsiteSections, { sections: cardsSection([2, 99, 1]), locale: 'de', cards }))
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/de/services/service-2',
      '/de/services/service-1',
    ])
    expect(links[0].getAttribute('aria-label')).toBe('Mehr erfahren: Service 2')
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Service 2',
      'Service 1',
    ])
  })

  it('shows every published service when nothing is selected', () => {
    render(h(WebsiteSections, { sections: cardsSection(null), locale: 'en', cards }))
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/en/services/service-1',
      '/en/services/service-2',
      '/en/services/service-3',
    ])
  })

  it('renders nothing without a published list', () => {
    const { container } = render(h(WebsiteSections, { sections: cardsSection(null), locale: 'de' }))
    expect(container.querySelector('ul')).toBeNull()
  })
})

describe('forms outside page globals', () => {
  it('does not render a form when no page global is given', () => {
    const form = {
      id: 1,
      enabled: true,
      _status: 'published',
      fields: [],
    }
    const { container } = render(
      h(WebsiteSections, {
        locale: 'de',
        sections: [
          {
            blockType: 'fullWidth',
            column1: { content: [{ type: 'form', form: form as never }] },
          },
        ],
      }),
    )
    expect(container.querySelector('form')).toBeNull()
  })
})

describe('service page header', () => {
  it('shows the title, lead, key points and calls to action', () => {
    const page = {
      id: 1,
      slug: 'e-rechnung-erstellen',
      title: 'E-Rechnung erstellen',
      summary: 'XRechnung und ZUGFeRD in wenigen Schritten.',
      keyPoints: [{ text: 'XRechnung 3.0.2' }, { text: 'ZUGFeRD EN16931' }],
      sortOrder: 10,
      sections: [],
      updatedAt: '',
      createdAt: '',
    } as ServicePage
    render(
      h(ServicePageContent, {
        data: page,
        locale: 'de',
        labels: {
          services: 'Leistungen',
          keyPoints: 'Auf einen Blick',
          startFree: 'Kostenlos starten',
          viewPricing: 'Preise ansehen',
        },
      }),
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('E-Rechnung erstellen')
    expect(screen.getByText('XRechnung und ZUGFeRD in wenigen Schritten.')).toBeTruthy()
    const points = screen.getByRole('list', { name: 'Auf einen Blick' })
    expect(within(points).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Leistungen' }).getAttribute('href')).toBe(
      '/de/services',
    )
    expect(screen.getByRole('link', { name: 'Kostenlos starten' }).getAttribute('href')).toBe(
      '/de/signup',
    )
    expect(screen.getByRole('link', { name: 'Preise ansehen' }).getAttribute('href')).toBe(
      '/de/pricing',
    )
  })
})
