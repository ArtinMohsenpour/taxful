import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { linkHref, type StoredLink } from '@/lib/navigation-links'

// Renders a CMS link group (navigation-link fields). Hook-free, so server pages and
// Live Preview clients share it. The href is re-checked here because preview data is
// unvalidated; unsafe or empty links render nothing. Internal paths get the active
// locale prefix; external URLs stay plain anchors.
export function CmsLink({
  link,
  className,
  newTabLabel,
  children,
}: {
  link: StoredLink | null | undefined
  className?: string
  // Announced to screen readers when the link opens a new tab.
  newTabLabel?: string
  children: ReactNode
}) {
  const href = linkHref(link)
  if (!href) return null
  const newTab = Boolean(link?.newTab)
  const props = {
    className,
    target: newTab ? '_blank' : undefined,
    rel: newTab ? 'noopener noreferrer' : undefined,
  }
  const content = (
    <>
      {children}
      {newTab && newTabLabel && <span className="sr-only"> ({newTabLabel})</span>}
    </>
  )
  return link?.type === 'external' ? (
    <a href={href} {...props}>
      {content}
    </a>
  ) : (
    <Link href={href} {...props}>
      {content}
    </Link>
  )
}
