import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'
import { sha256 } from '../documents/storage'
import { contentSchema } from './schema'
import { renderVisualEmail } from './visual'

const color = /^(?:#[a-fA-F0-9]{3,8}|black|white|gray|navy|green|transparent)$/
const size = /^(?:0|[0-9]{1,3}(?:px|%|em))$/
export function cleanEmailHtml(input: string) {
  let logoIncluded = false
  return sanitizeHtml(input, {
    allowedTags: [
      'p',
      'div',
      'span',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'td',
      'th',
      'a',
      'img',
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
      table: ['width', 'cellpadding', 'cellspacing', 'role'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https', 'mailto', 'cid'],
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        color: [color],
        'background-color': [color],
        'font-family': [
          /^(?:Arial|Verdana|Georgia|Tahoma|sans-serif|serif)(?:,\s*(?:Arial|Verdana|Georgia|Tahoma|sans-serif|serif))*$/,
        ],
        'font-size': [size],
        'font-weight': [/^(?:normal|bold|[1-9]00)$/],
        'text-align': [/^(?:left|center|right)$/],
        'text-decoration': [/^(?:none|underline)$/],
        'line-height': [/^(?:[12](?:\.\d{1,2})?|[1-9][0-9]px)$/],
        padding: [/^\d{1,2}px(?: \d{1,2}px){0,3}$/],
        margin: [/^\d{1,2}px(?: \d{1,2}px){0,3}$/],
        width: [size],
        'max-width': [size],
        'border-collapse': [/^(?:collapse|separate)$/],
        'border-radius': [/^\d{1,2}px$/],
        border: [/^[0-9]px solid #[a-fA-F0-9]{3,6}$/],
      },
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || ''
        if (!/^(?:https:\/\/|mailto:)[^\s\x00-\x1f]+$/i.test(href)) delete attribs.href
        return { tagName, attribs }
      },
      img: (tagName, attribs) => {
        const include = attribs.src === 'cid:company-logo' && !logoIncluded
        if (include) logoIncluded = true
        return {
          tagName,
          attribs: {
            src: include ? 'cid:company-logo' : '',
            alt: (attribs.alt || '').slice(0, 200),
            width: /^[1-9][0-9]{0,2}$/.test(attribs.width || '') ? attribs.width : '180',
          },
        }
      },
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
    nestingLimit: 30,
  })
}
export function normalizeContent(input: unknown) {
  const value = contentSchema.parse(input)
  const rendered = value.design
    ? { ...value, ...renderVisualEmail(value.design, value.logoId) }
    : value
  return contentSchema.parse({ ...rendered, html: cleanEmailHtml(rendered.html) })
}
export function contentHash(content: z.infer<typeof contentSchema>, logoHash: string | null) {
  return sha256(
    JSON.stringify({
      subject: content.subject,
      body: content.body,
      html: content.html,
      logoId: content.logoId,
      logoHash,
    }),
  )
}
