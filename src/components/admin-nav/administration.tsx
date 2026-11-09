import type { ServerProps } from 'payload'
import { isSuperAdmin } from '@/access/cms-users'
import { AdministrationLinks } from './administration-links'

// Rendered after Payload's own groups so administration stays at the bottom.
export default function AdministrationNav({ permissions, user }: ServerProps) {
  const links = [
    permissions?.collections?.users?.read && {
      href: '/admin/collections/users',
      label: 'Staff accounts',
    },
    isSuperAdmin(user || null) && { href: '/admin/billing', label: 'Customers & billing' },
  ].filter((link) => link !== false && link !== undefined)
  return links.length ? <AdministrationLinks links={links} /> : null
}
