'use client'

import { useOrderedLivePreview } from '@/lib/live-preview'
import type { Navbar } from '@/payload-types'
import { NavbarView, type NavbarLabels } from './navbar-view'

export function NavbarPreview({ navbar, labels }: { navbar: Navbar; labels: NavbarLabels }) {
  const data = useOrderedLivePreview(navbar)
  return <NavbarView navbar={data} labels={labels} />
}
