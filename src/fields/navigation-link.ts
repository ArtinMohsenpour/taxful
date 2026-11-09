import type { Field, TextFieldSingleValidation } from 'payload'
import { externalHref, internalHref } from '../lib/navigation-links'

const slugMessage = 'Enter a local slug or path without a language prefix.'
// Navbar validates its own active links in a hook (dropdown parents have none);
// other link lists require the path at field level for precise editor errors.
const validateSlug =
  (required: boolean): TextFieldSingleValidation =>
  (value, { siblingData }) =>
    (siblingData as { type?: string }).type !== 'internal' ||
    (!value ? !required || slugMessage : Boolean(internalHref(value)) || slugMessage)
const validateURL: TextFieldSingleValidation = (value, { siblingData }) =>
  (siblingData as { type?: string }).type !== 'external' ||
  Boolean(externalHref(value)) ||
  'Enter a valid HTTP or HTTPS URL without credentials.'

export const navigationLinkFields = ({ requirePath = false } = {}): Field[] => [
  {
    name: 'type',
    type: 'radio',
    required: true,
    defaultValue: 'internal',
    options: [
      { label: 'Internal page (slug)', value: 'internal' },
      { label: 'External URL', value: 'external' },
    ],
  },
  {
    name: 'path',
    label: 'Page',
    type: 'text',
    admin: {
      condition: (_, sibling) => sibling.type === 'internal',
      // Grouped page picker that still accepts a typed path.
      components: { Field: '/components/admin/page-link-field' },
      description:
        'Pick a page from the list or type a path such as /about or /#faq. Do not include /de or /en; the language is added automatically.',
    },
    validate: validateSlug(requirePath),
  },
  {
    name: 'url',
    type: 'text',
    admin: {
      condition: (_, sibling) => sibling.type === 'external',
      description: 'Full URL beginning with https:// or http://.',
    },
    validate: validateURL,
  },
  { name: 'newTab', type: 'checkbox', defaultValue: false, label: 'Open in a new tab' },
]
