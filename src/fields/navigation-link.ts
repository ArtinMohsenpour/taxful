import type { Field, TextFieldSingleValidation } from 'payload'
import { externalHref, internalHref } from '../lib/navigation-links'

const validateSlug: TextFieldSingleValidation = (value, { siblingData }) =>
  (siblingData as { type?: string }).type !== 'internal' ||
  !value ||
  Boolean(internalHref(value)) ||
  'Enter a local slug or path without a language prefix.'
const validateURL: TextFieldSingleValidation = (value, { siblingData }) =>
  (siblingData as { type?: string }).type !== 'external' ||
  Boolean(externalHref(value)) ||
  'Enter a valid HTTP or HTTPS URL without credentials.'

export const navigationLinkFields = (): Field[] => [
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
    label: 'Internal slug / path',
    type: 'text',
    admin: {
      condition: (_, sibling) => sibling.type === 'internal',
      description:
        'Use / for home or a slug such as about. Do not include /de or /en. This links to a page; it does not create one.',
    },
    validate: validateSlug,
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
