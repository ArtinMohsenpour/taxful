'use client'

import { Link, NavGroup } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

// Same markup and classes as Payload's default navigation links.
export function AdministrationLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <NavGroup label="Administration">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link key={href} className="nav__link" href={href} prefetch={false}>
            {active && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{label}</span>
          </Link>
        )
      })}
    </NavGroup>
  )
}
