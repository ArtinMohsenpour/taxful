import type { ContentItem, WebsitePageDocument, WebsiteSection } from '@/lib/website/types'
import type { WebsiteLocale, WebsitePageSlug } from '@/lib/website/catalog'
import { WebsiteRichText } from './rich-text'
import { MediaContent } from './media-content'
import { WebsiteFormView } from './form'

export function sectionColumns(section: WebsiteSection) {
  return [
    section.column1,
    ...('column2' in section ? [section.column2] : []),
    ...('column3' in section ? [section.column3] : []),
  ]
}

function Content({
  item,
  locale,
  columns,
  page,
  preview,
}: {
  item: ContentItem
  locale: WebsiteLocale
  columns: number
  page: WebsitePageSlug
  preview: boolean
}) {
  switch (item.type) {
    case 'text':
      return <WebsiteRichText data={item.text} locale={locale} />
    case 'image':
    case 'video':
      return <MediaContent item={item} locale={locale} columns={columns} />
    case 'form':
      return typeof item.form === 'object' &&
        item.form?.enabled &&
        item.form._status === 'published' ? (
        <WebsiteFormView form={item.form} locale={locale} page={page} preview={preview} />
      ) : null
    default:
      return null
  }
}

export function WebsiteSections({
  sections,
  locale,
  page,
  preview = false,
}: {
  sections: WebsitePageDocument['sections']
  locale: WebsiteLocale
  page: WebsitePageSlug
  preview?: boolean
}) {
  if (!sections?.length) return null
  return (
    <div className="space-y-8 pb-16 sm:space-y-12 sm:pb-24">
      {sections.map((section, index) => {
        const columns = sectionColumns(section)
        const id = `section-${index + 1}`
        const tone =
          section.tone === 'surface'
            ? 'border border-border bg-surface shadow-nav'
            : section.tone === 'accent'
              ? 'bg-accent/65'
              : ''
        return (
          <section
            key={section.id || index}
            aria-labelledby={section.title?.trim() ? `${id}-title` : undefined}
            data-layout={section.blockType}
            className={`rounded-[2rem] ${tone} ${section.tone !== 'plain' && section.tone ? 'p-6 sm:p-10' : 'py-6 sm:py-10'}`}
          >
            {(section.eyebrow?.trim() || section.title?.trim() || section.subtitle?.trim()) && (
              <div className="mb-8 max-w-2xl sm:mb-10">
                {section.eyebrow?.trim() && (
                  <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-brand-ink uppercase">
                    {section.eyebrow}
                  </p>
                )}
                {section.title?.trim() && (
                  <h2
                    id={`${id}-title`}
                    className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
                  >
                    {section.title}
                  </h2>
                )}
                {section.subtitle?.trim() && (
                  <p className="mt-4 leading-relaxed text-pretty text-muted-foreground">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}
            <div
              className={`grid gap-8 sm:gap-10 ${columns.length === 2 ? 'md:grid-cols-2' : columns.length === 3 ? 'lg:grid-cols-3' : ''} ${section.alignment === 'center' ? 'items-center' : 'items-start'}`}
            >
              {columns.map((column, columnIndex) => (
                <div key={columnIndex} className="min-w-0 space-y-6" data-column={columnIndex + 1}>
                  {column?.content?.map((item, itemIndex) => (
                    <Content
                      key={item.id || itemIndex}
                      item={item}
                      locale={locale}
                      columns={columns.length}
                      page={page}
                      preview={preview}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
