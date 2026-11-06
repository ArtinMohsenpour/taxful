import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { ContentItem } from '@/lib/website/types'
import type { WebsiteLocale } from '@/lib/website/catalog'
import { websiteLink } from '@/lib/website/urls'
import styles from './website.module.css'

export function WebsiteRichText({
  data,
  locale,
}: {
  data: ContentItem['text']
  locale: WebsiteLocale
}) {
  if (!data?.root?.children?.length) return null
  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    link: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children })
      const href = websiteLink(node.fields.url, locale)
      return href ? (
        <a
          href={href}
          target={node.fields.newTab ? '_blank' : undefined}
          rel={node.fields.newTab ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      ) : (
        <>{children}</>
      )
    },
    autolink: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children })
      const href = websiteLink(node.fields.url, locale)
      return href ? <a href={href}>{children}</a> : <>{children}</>
    },
  })
  return <RichText data={data} converters={converters} className={styles.prose} />
}
