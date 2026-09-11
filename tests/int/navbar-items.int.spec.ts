import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NavbarItems } from '@/components/navbar-items'

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  Link: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { ...props, href: `/de${href}` }),
}))
afterEach(cleanup)

it('highlights Home at the locale root and leaves other links inactive', () => {
  render(
    React.createElement(NavbarItems, {
      items: [
        { id: 'home', label: 'Home', type: 'link', link: { type: 'internal', path: '/' } },
        { id: 'about', label: 'About', type: 'link', link: { type: 'internal', path: '/about/' } },
      ],
    }),
  )
  const home = screen.getByRole('link', { name: 'Home' })
  expect(home.getAttribute('aria-current')).toBe('page')
  expect(home.className).toContain('bg-accent')
  expect(screen.getByRole('link', { name: 'About' }).hasAttribute('aria-current')).toBe(false)
})

it('opens dropdowns, renders internal/external links, closes on Escape and outside click', () => {
  render(
    React.createElement(NavbarItems, {
      items: [
        {
          id: 'services',
          label: 'Services',
          type: 'dropdown',
          children: [
            { id: 'internal', label: 'About', link: { type: 'internal', path: '/about' } },
            {
              id: 'external',
              label: 'External',
              link: { type: 'external', url: 'https://example.com', newTab: true },
            },
          ],
        },
      ],
    }),
  )
  const trigger = screen.getByRole('button', { name: 'Services' })
  fireEvent.click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByRole('link', { name: 'About' }).getAttribute('href')).toBe('/de/about')
  expect(screen.getByRole('link', { name: 'External' }).getAttribute('rel')).toBe(
    'noopener noreferrer',
  )
  fireEvent.keyDown(screen.getByRole('link', { name: 'About' }), { key: 'Escape' })
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(trigger)
  fireEvent.click(trigger)
  fireEvent.pointerDown(document.body)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
})
