import type { Block, BlocksField } from 'payload'
import { columnField } from '../../fields/website/content'

function layout(slug: string, label: string, columns: number, interfaceName: string): Block {
  return {
    slug,
    interfaceName,
    labels: { singular: label, plural: label },
    fields: [
      { name: 'eyebrow', type: 'text', maxLength: 100 },
      { name: 'title', label: 'Section title', type: 'text', maxLength: 160 },
      { name: 'subtitle', type: 'textarea', maxLength: 600 },
      {
        type: 'row',
        fields: [
          {
            name: 'tone',
            label: 'Background',
            type: 'select',
            defaultValue: 'plain',
            options: [
              { label: 'Page background', value: 'plain' },
              { label: 'Cream surface', value: 'surface' },
              { label: 'Soft accent', value: 'accent' },
            ],
            admin: { width: '50%' },
          },
          {
            name: 'alignment',
            label: 'Column alignment',
            type: 'select',
            defaultValue: 'top',
            options: [
              { label: 'Top', value: 'top' },
              { label: 'Vertically centered', value: 'center' },
            ],
            admin: { width: '50%' },
          },
        ],
      },
      ...Array.from({ length: columns }, (_, index) =>
        columnField(`column${index + 1}`, columns === 1 ? 'Content' : `Column ${index + 1}`),
      ),
    ],
  }
}

export const websiteLayouts: Block[] = [
  layout('fullWidth', '100% — full width', 1, 'FullWidthSection'),
  layout('twoColumns', '50% / 50% — two columns', 2, 'TwoColumnSection'),
  layout('threeColumns', '33% / 33% / 33% — three columns', 3, 'ThreeColumnSection'),
]

export function sectionsField(): BlocksField {
  return {
    name: 'sections',
    label: 'Page sections',
    type: 'blocks',
    localized: true,
    maxRows: 30,
    blocks: [],
    blockReferences: ['fullWidth', 'twoColumns', 'threeColumns'],
    admin: {
      initCollapsed: true,
      description:
        'Add, reorder and reuse layouts. Columns stack in reading order on mobile. Each locale has its own sections.',
    },
  }
}
