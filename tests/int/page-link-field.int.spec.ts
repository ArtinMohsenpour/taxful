import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ value: '' as string, setValue: vi.fn() }))
vi.mock('@payloadcms/ui', () => ({
  useField: () => ({
    path: 'columns.0.links.0.link.path',
    value: state.value,
    setValue: (next: string) => {
      state.value = next
      state.setValue(next)
    },
    showError: false,
    disabled: false,
  }),
  useLocale: () => ({ code: 'de' }),
  withCondition: <T>(component: T) => component,
  FieldLabel: ({ label }: { label: string }) => React.createElement('label', null, label),
  FieldError: () => null,
  FieldDescription: ({ description }: { description: string }) =>
    React.createElement('p', null, description),
}))

const groups = [
  {
    id: 'website',
    label: 'Website',
    options: [
      { path: '/', label: 'Startseite', status: 'published' },
      { path: '/about', label: 'Über uns', status: 'published' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    options: [
      { path: '/services', label: 'Leistungen', status: 'published' },
      { path: '/services/e-rechnung-pruefen', label: 'E-Rechnung prüfen', status: 'draft' },
    ],
  },
  { id: 'customer', label: 'Customer area', options: [{ path: '/login', label: 'Anmelden' }] },
]

beforeEach(() => {
  state.value = ''
  state.setValue.mockClear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ groups }) }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function renderField() {
  const { default: PageLinkField } = await import('@/components/admin/page-link-field')
  const props = {
    field: { name: 'path', label: 'Page', admin: { description: 'Pick a page' } },
    path: 'columns.0.links.0.link.path',
  }
  const view = render(React.createElement(PageLinkField as React.FC<typeof props>, props))
  const rerender = () =>
    view.rerender(React.createElement(PageLinkField as React.FC<typeof props>, props))
  return { input: screen.getByRole('combobox'), rerender }
}

it('lists grouped pages, filters while typing and chooses with the keyboard', async () => {
  const { input, rerender } = await renderField()
  fireEvent.focus(input)
  const list = await screen.findByRole('listbox', { name: 'Pages' })
  await waitFor(() => expect(within(list).getAllByRole('group')).toHaveLength(3))
  expect(within(list).getByRole('group', { name: 'Services' })).toBeDefined()
  expect(within(list).getByRole('group', { name: 'Customer area' })).toBeDefined()
  expect(within(list).getByText('Draft')).toBeDefined()

  fireEvent.change(input, { target: { value: 'prüf' } })
  rerender()
  expect(within(list).getAllByRole('option')).toHaveLength(1)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input.getAttribute('aria-activedescendant')).toBeTruthy()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(state.setValue).toHaveBeenLastCalledWith('/services/e-rechnung-pruefen')
  rerender()
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(screen.getByText(/draft, visitors get/)).toBeDefined()
})

it('keeps a typed custom path on Enter and marks it as custom', async () => {
  const { input, rerender } = await renderField()
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '/kampagne' } })
  rerender()
  expect(await screen.findByText(/No page matches/)).toBeDefined()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(state.setValue).toHaveBeenLastCalledWith('/kampagne')
  rerender()
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(screen.getByText(/Custom path/)).toBeDefined()
})

it('recognises stored values without a leading slash and closes on Escape', async () => {
  state.value = 'about'
  const { input } = await renderField()
  fireEvent.click(input)
  const option = await screen.findByRole('option', { name: /Über uns/ })
  expect(option.getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('option', { name: /Anmelden/ }))
  expect(state.setValue).toHaveBeenLastCalledWith('/login')
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).toBeNull()
})
