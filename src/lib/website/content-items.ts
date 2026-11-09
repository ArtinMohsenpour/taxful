import type { ContentItem, WebsiteSections } from './types'

// Every content item of a page, in reading order, regardless of column layout.
export function contentItems(sections: WebsiteSections): ContentItem[] {
  return (sections ?? []).flatMap((section) =>
    [
      section.column1,
      'column2' in section ? section.column2 : undefined,
      'column3' in section ? section.column3 : undefined,
    ].flatMap((column) => column?.content ?? []),
  )
}
