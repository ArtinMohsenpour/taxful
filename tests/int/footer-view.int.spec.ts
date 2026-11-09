import React from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FooterView, type FooterLabels } from '@/components/footer/footer-view'
import { FooterPreview } from '@/components/footer/footer-preview'
import type { Footer, Media } from '@/payload-types'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { ...props, href: `/de${href === '/' ? '' : href}` }),
}))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const labels: FooterLabels = {
  home: 'Taxful home',
  navigation: 'Footer navigation',
  legal: 'Legal',
  social: 'Social media',
  partners: 'Partners',
  contact: 'Contact',
  email: 'Email',
  phone: 'Phone',
  newTab: 'opens in a new tab',
}
const media = (id: number, url: string, alt = 'Logo'): Media => ({
  id,
  alt,
  url,
  filename: url.split('/').at(-1),
  mimeType: 'image/png',
  width: 300,
  height: 100,
  updatedAt: '',
  createdAt: '',
})
const internal = (label: string, path: string) => ({
  label,
  link: { type: 'internal' as const, path },
})

const footer: Footer = {
  id: 1,
  tagline: 'A little more clarity.',
  contact: { email: 'hello@example.com', phone: '+49 (30) 123 456', address: 'Street 1\nBerlin' },
  columns: [
    {
      id: 'company',
      title: 'Company',
      links: [
        internal('About us', 'about'),
        { label: 'Unsafe', link: { type: 'external', url: 'javascript:alert(1)' } },
        {
          label: 'Jobs',
          link: { type: 'external', url: 'https://example.com/jobs', newTab: true },
        },
      ],
    },
    // Columns without a renderable link are hidden instead of leaving an empty heading.
    { id: 'empty', title: 'Empty', links: [internal('Bad', '//evil.example')] },
  ],
  social: [
    { id: 'li', platform: 'linkedin', url: 'https://www.linkedin.com/company/example' },
    { id: 'bad', platform: 'x', url: 'javascript:alert(1)' },
    { id: 'gh', platform: 'github', url: 'https://github.com/example', label: 'Code on GitHub' },
  ],
  partners: [
    {
      id: 'p1',
      name: 'Chamber',
      logo: media(7, '/api/media/file/chamber.png'),
      appearance: 'monochrome',
    },
    {
      id: 'p2',
      name: 'Seal',
      url: 'https://example.org',
      logo: media(8, '/api/media/file/seal.png'),
      logoDark: media(9, '/api/media/file/seal-dark.png'),
    },
    { id: 'p3', name: 'Tracker', logo: media(10, 'https://tracker.example/pixel.png') },
  ],
  copyright: '© {year} Taxful GmbH',
  legalLinks: [internal('Privacy', '/privacy'), internal('Legal notice', '/impressum')],
  note: 'Small print.',
}

it('renders safe links, contact details, social icons, partners and the legal bar', () => {
  render(React.createElement(FooterView, { footer, fallbackLogo: null, labels, year: 2031 }))
  const navigation = screen.getByRole('navigation', { name: 'Footer navigation' })
  expect(within(navigation).getByRole('link', { name: 'About us' }).getAttribute('href')).toBe(
    '/de/about',
  )
  expect(within(navigation).queryByText('Unsafe')).toBeNull()
  expect(within(navigation).queryByRole('heading', { name: 'Empty' })).toBeNull()
  const jobs = within(navigation).getByRole('link', { name: /Jobs/ })
  expect(jobs.getAttribute('target')).toBe('_blank')
  expect(jobs.getAttribute('rel')).toBe('noopener noreferrer')
  expect(jobs.textContent).toContain('opens in a new tab')

  expect(screen.getByRole('link', { name: /hello@example.com/ }).getAttribute('href')).toBe(
    'mailto:hello@example.com',
  )
  expect(screen.getByRole('link', { name: /123 456/ }).getAttribute('href')).toBe('tel:+4930123456')
  const social = screen.getByRole('list', { name: 'Social media' })
  expect(within(social).getAllByRole('link')).toHaveLength(2)
  expect(
    within(social)
      .getByRole('link', { name: /LinkedIn/ })
      .getAttribute('rel'),
  ).toBe('me noopener noreferrer')
  expect(within(social).getByRole('link', { name: /Code on GitHub/ })).toBeDefined()

  // Untrusted media URLs never render; dark variants are separate images.
  expect(screen.queryByAltText('Tracker')).toBeNull()
  expect(screen.getAllByAltText('Seal')).toHaveLength(2)
  expect(screen.getByAltText('Chamber').className).toContain('brightness-0')
  expect(screen.getByRole('link', { name: /Seal/ }).getAttribute('href')).toBe(
    'https://example.org/',
  )

  const legal = screen.getByRole('navigation', { name: 'Legal' })
  expect(within(legal).getByRole('link', { name: 'Legal notice' }).getAttribute('href')).toBe(
    '/de/impressum',
  )
  expect(screen.getByText('© 2031 Taxful GmbH')).toBeDefined()
  expect(screen.getByRole('link', { name: 'Taxful home' }).getAttribute('href')).toBe('/de')
})

it('uses the navigation logo as fallback and shows only the bottom bar when compact', () => {
  const { rerender } = render(
    React.createElement(FooterView, {
      footer: { id: 1, columns: footer.columns },
      fallbackLogo: media(3, '/api/media/file/brand.png', 'Taxful logo'),
      labels,
      year: 2031,
    }),
  )
  expect(screen.getByAltText('Taxful logo').getAttribute('src')).toContain('brand.png')
  rerender(
    React.createElement(FooterView, {
      footer,
      fallbackLogo: null,
      labels,
      year: 2031,
      variant: 'compact',
    }),
  )
  expect(screen.queryByRole('navigation', { name: 'Footer navigation' })).toBeNull()
  expect(screen.getByRole('navigation', { name: 'Legal' })).toBeDefined()
  expect(screen.queryByRole('list', { name: 'Social media' })).toBeNull()
})

it('renders unsaved editor messages through the official live-preview hook', async () => {
  const initial: Footer = { id: 1, copyright: 'Saved {year}' }
  const updated: Footer = { ...initial, copyright: 'Unsaved {year}' }
  const fetcher = vi.fn().mockResolvedValue({ json: async () => updated })
  vi.stubGlobal('fetch', fetcher)
  render(
    React.createElement(FooterPreview, { footer: initial, fallbackLogo: null, labels, year: 2031 }),
  )
  expect(screen.getByText('Saved 2031')).toBeDefined()
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://untrusted.example',
      data: { type: 'payload-live-preview', globalSlug: 'footer', data: updated },
    }),
  )
  expect(fetcher).not.toHaveBeenCalled()
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: 'payload-live-preview', globalSlug: 'footer', locale: 'de', data: updated },
    }),
  )
  await waitFor(() => expect(screen.getByText('Unsaved 2031')).toBeDefined())
})
