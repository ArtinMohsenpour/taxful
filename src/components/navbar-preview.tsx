'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import type { Navbar } from '@/payload-types'
import { NavbarView, type NavbarLabels } from './navbar-view'

export function NavbarPreview({ navbar, labels }: { navbar: Navbar; labels: NavbarLabels }) {
  const { data } = useLivePreview<Navbar>({
    initialData: navbar,
    serverURL: typeof window === 'undefined' ? '' : window.location.origin,
    depth: 1,
  })
  return <NavbarView navbar={data} labels={labels} />
}
