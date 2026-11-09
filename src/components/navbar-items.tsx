'use client'

import { useEffect, useRef, useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { externalHref, internalHref } from '@/lib/navigation-links'
import type { Navbar } from '@/payload-types'

type Item = NonNullable<Navbar['items']>[number]
type NavLink = Item | NonNullable<Item['children']>[number]

function isActive(item: NavLink, pathname: string) {
  if (item.link?.type === 'external') return false
  const href = internalHref(item.link?.path)
  if (!href) return false
  const normalize = (path: string) => path.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  return normalize(href) === normalize(pathname)
}

// The current page is marked by a sage line under its label; hover previews a fainter line.
function indicator(active: boolean | undefined) {
  return `relative after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-center after:rounded-full after:transition-transform after:duration-200 motion-reduce:after:transition-none ${active ? 'after:scale-x-100 after:bg-nav-indicator' : 'after:scale-x-0 after:bg-nav-indicator/45 group-hover:after:scale-x-100'}`
}

function NavigationLink({
  item,
  button = false,
  onClick,
}: {
  item: NavLink
  button?: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const href =
    item.link?.type === 'external' ? externalHref(item.link.url) : internalHref(item.link?.path)
  if (!href) return null
  const active = isActive(item, pathname)
  // Buttons keep their filled style when active; text links use the underline.
  const className = `group block rounded-full px-4 py-3 text-sm font-medium break-words transition-colors motion-reduce:transition-none ${button ? 'bg-primary text-primary-foreground hover:bg-primary/80' : active ? 'text-brand-ink' : 'text-foreground hover:text-brand-ink'}`
  const label = button ? item.label : <span className={indicator(active)}>{item.label}</span>
  const props = {
    className,
    onClick,
    target: item.link?.newTab ? '_blank' : undefined,
    rel: item.link?.newTab ? 'noopener noreferrer' : undefined,
  }
  return item.link?.type === 'external' ? (
    <a href={href} {...props}>
      {label}
    </a>
  ) : (
    <Link href={href} aria-current={active ? 'page' : undefined} {...props}>
      {label}
    </Link>
  )
}

function Dropdown({ item }: { item: Item }) {
  const pathname = usePathname()
  const active = item.children?.some((child) => isActive(child, pathname))
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLLIElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return (
    <li
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false)
          trigger.current?.focus()
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={`nav-${item.id}`}
        onClick={() => setOpen(!open)}
        className={`group flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors motion-reduce:transition-none ${active ? 'text-brand-ink' : 'hover:text-brand-ink'}`}
      >
        <span className={indicator(active)}>{item.label}</span>
        <span
          aria-hidden="true"
          className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          ⌄
        </span>
      </button>
      {open && (
        <ul
          id={`nav-${item.id}`}
          className="z-40 mt-2 min-w-52 rounded-2xl border border-border bg-surface p-2 shadow-nav lg:absolute lg:left-0 lg:max-w-72"
        >
          {item.children?.map((link) => (
            <li key={link.id}>
              <NavigationLink item={link} onClick={() => setOpen(false)} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function NavbarItems({ items }: { items: Navbar['items'] }) {
  return (
    <ul className="flex w-full flex-col gap-1 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center">
      {items?.map((item) =>
        item.type === 'dropdown' ? (
          <Dropdown key={item.id} item={item} />
        ) : (
          <li key={item.id}>
            <NavigationLink item={item} button={item.appearance === 'button'} />
          </li>
        ),
      )}
    </ul>
  )
}
