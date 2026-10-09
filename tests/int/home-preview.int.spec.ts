import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HomePreview } from '@/components/home/home-preview'
import { homeContent } from '@/lib/home/content'
import { homeDefaults } from '@/lib/home/defaults'
import type { Home } from '@/payload-types'
import type { FlowProvider, HeroLabels } from '@/lib/home/types'

vi.mock('@/components/home/hero/hero-section', () => ({
  HeroSection: ({ labels, providers }: { labels: HeroLabels; providers: FlowProvider[] }) =>
    React.createElement(
      'div',
      null,
      labels.title,
      ...providers.map((provider) =>
        React.createElement('span', { key: provider.id }, provider.name),
      ),
    ),
}))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const fallback = homeDefaults.de
const initial: Home = {
  id: 1,
  eyebrow: fallback.eyebrow,
  title: 'Saved heading',
  titleAccent: fallback.titleAccent,
  description: fallback.description,
  diagram: fallback.flow,
  steps: fallback.steps,
  providers: [{ id: 'datev', provider: 'datev' }],
}

it('previews unsaved copy and company changes using the official hook and same-origin messages', async () => {
  const updated: Home = {
    ...initial,
    title: 'Unsaved heading',
    providers: [{ id: 'sage', provider: 'sage' }],
  }
  const fetcher = vi.fn().mockResolvedValue({ json: async () => updated })
  vi.stubGlobal('fetch', fetcher)
  render(React.createElement(HomePreview, { home: initial, locale: 'de' }))
  expect(screen.getByText('Saved heading')).toBeDefined()
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://untrusted.example',
      data: { type: 'payload-live-preview', globalSlug: 'home', data: updated },
    }),
  )
  expect(fetcher).not.toHaveBeenCalled()
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: 'payload-live-preview', globalSlug: 'home', locale: 'de', data: updated },
    }),
  )
  await waitFor(() => expect(screen.getByText('Unsaved heading')).toBeDefined())
  expect(screen.getByText('Sage')).toBeDefined()
  expect(screen.queryByText('DATEV')).toBeNull()
  expect(fetcher.mock.calls[0][1].headers['X-Payload-HTTP-Method-Override']).toBe('GET')
})

it('keeps preview layouts usable with incomplete fields and populated custom media', () => {
  const custom: Home = {
    ...initial,
    title: '',
    providers: [
      {
        id: 'custom',
        provider: 'custom',
        name: 'My software',
        logo: {
          id: 42,
          alt: 'Logo',
          url: '/api/media/file/logo.png',
          mimeType: 'image/png',
          width: 160,
          height: 40,
          createdAt: '2026-10-09T00:00:00Z',
          updatedAt: '2026-10-09T00:00:00Z',
        },
      },
    ],
  }
  const content = homeContent(custom, 'de')
  expect(content.labels.title).toBe('')
  expect(content.providers[0]).toMatchObject({
    name: 'My software',
    src: '/api/media/file/logo.png',
    width: 160,
    height: 40,
  })
  expect(
    homeContent({ ...initial, providers: [{ provider: 'custom', logo: 42 }] }, 'de').providers,
  ).toEqual([])
  const withoutProviders = { ...initial }
  Reflect.deleteProperty(withoutProviders, 'providers')
  expect(homeContent(withoutProviders, 'de').providers).toHaveLength(6)
})
