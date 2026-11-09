import { convertMarkdownToLexical } from '@payloadcms/richtext-lexical'
import type { SanitizedServerEditorConfig } from '@payloadcms/richtext-lexical'
import type { WebsiteSections } from '../../../lib/website/types'
import type { ItemSeed, LocaleSeed, SectionSeed, ServiceSlug } from './types'

type Context = { editorConfig: SanitizedServerEditorConfig; ids: Map<ServiceSlug, number> }

const text = (markdown: string, { editorConfig }: Context) =>
  convertMarkdownToLexical({ editorConfig, markdown: markdown.trim() })

function item(seed: ItemSeed, context: Context) {
  if (typeof seed === 'string') return { type: 'text' as const, text: text(seed, context) }
  if ('faq' in seed)
    return {
      type: 'faq' as const,
      faq: seed.faq.map(({ question, answer }) => ({ question, answer: text(answer, context) })),
    }
  return {
    type: 'services' as const,
    services: seed.services.flatMap((slug) => context.ids.get(slug) ?? []),
  }
}

export function toSections(sections: SectionSeed[], context: Context) {
  return sections.map(({ layout = 'fullWidth', columns, eyebrow, title, subtitle, tone }) => ({
    blockType: layout,
    eyebrow,
    title,
    subtitle,
    tone: tone ?? 'plain',
    ...Object.fromEntries(
      columns.map((column, index) => [
        `column${index + 1}`,
        { content: column.map((entry) => item(entry, context)) },
      ]),
    ),
  })) as unknown as NonNullable<WebsiteSections>
}

export function toServicePage(seed: LocaleSeed, context: Context) {
  return {
    title: seed.title,
    summary: seed.summary,
    keyPoints: seed.keyPoints.map((point) => ({ text: point })),
    sections: toSections(seed.sections, context),
    seo: { title: seed.seo.title, description: seed.seo.description },
  }
}
