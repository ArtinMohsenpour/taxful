import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NavbarPreview } from '@/components/navbar-preview'
import type { Navbar } from '@/payload-types'

vi.mock('@/components/navbar-view', () => ({
  NavbarView: ({ navbar }: { navbar: Navbar }) =>
    React.createElement('div', null, navbar.items?.[0]?.label),
}))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('renders unsaved editor messages through the official hook without a save request', async () => {
  const initial: Navbar = {
    id: 1,
    items: [{ label: 'Saved', type: 'link', link: { type: 'internal', path: '/' } }],
  }
  const updated = { ...initial, items: [{ ...initial.items![0], label: 'Unsaved label' }] }
  const fetcher = vi.fn().mockResolvedValue({ json: async () => updated })
  vi.stubGlobal('fetch', fetcher)
  render(
    React.createElement(NavbarPreview, {
      navbar: initial,
      labels: {
        menu: 'Open menu',
        closeMenu: 'Close menu',
        home: 'Home',
        skip: 'Skip',
        label: 'Nav',
        login: 'Login',
        loginSoon: 'Soon',
      },
    }),
  )
  expect(screen.getByText('Saved')).toBeDefined()
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://untrusted.example',
      data: { type: 'payload-live-preview', globalSlug: 'navbar', data: updated },
    }),
  )
  expect(fetcher).not.toHaveBeenCalled()
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: 'payload-live-preview', globalSlug: 'navbar', locale: 'de', data: updated },
    }),
  )
  await waitFor(() => expect(screen.getByText('Unsaved label')).toBeDefined())
  expect(fetcher.mock.calls[0][1].headers['X-Payload-HTTP-Method-Override']).toBe('GET')
})
