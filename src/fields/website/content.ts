import type { Field, GroupField } from 'payload'
import {
  BoldFeature,
  ItalicFeature,
  UnderlineFeature,
  ParagraphFeature,
  HeadingFeature,
  LinkFeature,
  OrderedListFeature,
  UnorderedListFeature,
  BlockquoteFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const editor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    OrderedListFeature(),
    UnorderedListFeature(),
    BlockquoteFeature(),
    LinkFeature({ enabledCollections: [] }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
})

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
const when = (type: string) => (_: unknown, sibling: Record<string, unknown>) =>
  sibling?.type === type

export function columnField(name: string, label: string): GroupField {
  return {
    name,
    label,
    type: 'group',
    fields: [
      {
        name: 'content',
        type: 'array',
        label: 'Content items',
        interfaceName: 'WebsiteContentItem',
        maxRows: 12,
        labels: { singular: 'Content item', plural: 'Content items' },
        admin: { initCollapsed: true },
        fields: contentFields(),
      },
    ],
  }
}

function contentFields(): Field[] {
  return [
    {
      name: 'type',
      label: 'Content type',
      type: 'select',
      required: true,
      defaultValue: 'text',
      options: [
        { label: 'Rich text', value: 'text' },
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
        { label: 'Form', value: 'form' },
      ],
    },
    // Lexical renders through a custom field component. A conditional row also
    // hides that component in the editor; the inner condition retains validation.
    {
      type: 'row',
      admin: { condition: when('text') },
      fields: [
        {
          name: 'text',
          type: 'richText',
          editor,
          required: true,
          admin: { condition: when('text') },
        },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { in: imageTypes } },
      admin: { condition: when('image') },
    },
    {
      name: 'imageAlt',
      label: 'Image description override',
      type: 'text',
      maxLength: 300,
      admin: {
        condition: when('image'),
        description: 'Optional. Uses the media description when left blank.',
      },
    },
    {
      name: 'imageFit',
      type: 'select',
      defaultValue: 'natural',
      options: [
        { label: 'Original proportions', value: 'natural' },
        { label: 'Landscape crop (4:3)', value: 'landscape' },
        { label: 'Square crop', value: 'square' },
      ],
      admin: { condition: when('image') },
    },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { in: ['video/mp4', 'video/webm'] } },
      admin: {
        condition: when('video'),
        description:
          'Upload MP4 or WebM to Media. Uses native controls without autoplay or external tracking.',
      },
    },
    {
      name: 'videoTitle',
      label: 'Video title',
      type: 'text',
      required: true,
      maxLength: 160,
      admin: { condition: when('video') },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { in: imageTypes } },
      admin: { condition: when('video') },
    },
    {
      name: 'captions',
      label: 'WebVTT captions',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { equals: 'text/vtt' } },
      admin: {
        condition: when('video'),
        description:
          'Add localized captions for spoken audio. For visual-only videos, provide an equivalent text description below.',
      },
    },
    {
      type: 'row',
      admin: { condition: when('video') },
      fields: [
        {
          name: 'transcript',
          label: 'Transcript / equivalent description',
          type: 'richText',
          editor,
          admin: { condition: when('video') },
        },
      ],
    },
    {
      name: 'form',
      label: 'Reusable form',
      type: 'relationship',
      relationTo: 'website-forms',
      required: true,
      filterOptions: { enabled: { equals: true }, _status: { equals: 'published' } },
      admin: {
        condition: when('form'),
        description:
          'Create and publish forms under Website → Forms. Submissions go to the private CMS inbox.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      maxLength: 500,
      admin: { condition: (_, sibling) => ['image', 'video'].includes(sibling?.type) },
    },
  ]
}
