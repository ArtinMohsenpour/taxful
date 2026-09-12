'use client'

import { useEffect, useRef, useState } from 'react'
import { NavbarItems } from './navbar-items'
import { Link } from '@/i18n/navigation'
import { Preferences } from './preferences'
import Image from 'next/image'
import type { Navbar } from '@/payload-types'

export type NavbarLabels = Record<
  'home' | 'skip' | 'label' | 'login' | 'loginSoon' | 'menu' | 'closeMenu',
  string
>
export function NavbarView({ navbar, labels }: { navbar: Navbar; labels: NavbarLabels }) {
  const [open, setOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const logo = typeof navbar.logo === 'object' ? navbar.logo : null

  return (
    <header
      ref={header}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false)
          toggle.current?.focus()
        }
      }}
      className="sticky top-3 z-30 mx-auto w-full max-w-6xl px-3 sm:top-6 sm:px-6"
    >
      <a
        href="#main"
        className="sr-only rounded-full bg-surface px-5 py-3 text-brand-ink focus:not-sr-only focus:absolute focus:top-full"
      >
        {labels.skip}
      </a>
      <nav
        aria-label={labels.label}
        className="site-navbar flex flex-wrap items-center justify-between gap-x-3 gap-y-0 rounded-[1.5rem] border border-border/80 bg-surface/90 px-4 py-3 shadow-nav backdrop-blur-xl sm:px-7 lg:py-4"
      >
        <Link
          href="/"
          aria-label={labels.home}
          onClick={() => setOpen(false)}
          className="group flex min-w-0 items-center gap-2.5 rounded-lg"
        >
          {logo?.url && logo.mimeType?.startsWith('image/') ? (
            <Image
              src={logo.url}
              alt={logo.alt}
              width={logo.width || 180}
              height={logo.height || 48}
              unoptimized
              className="h-10 w-auto max-w-44 object-contain sm:h-12 sm:max-w-48"
            />
          ) : (
            <>
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-[0.9rem] bg-primary text-xl font-semibold text-primary-foreground"
              >
                t.
              </span>
              <span className="text-[1.65rem] font-semibold tracking-[-0.065em] text-foreground">
                taxful<span className="text-brand-ink">.</span>
              </span>
            </>
          )}
        </Link>
        <button
          ref={toggle}
          type="button"
          aria-label={open ? labels.closeMenu : labels.menu}
          aria-expanded={open}
          aria-controls="navbar-panel"
          onClick={() => setOpen(!open)}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-accent/50 text-brand-ink transition-colors hover:bg-accent lg:hidden"
        >
          <span
            aria-hidden="true"
            className={`absolute h-0.5 w-4 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-45' : '-translate-y-1'}`}
          />
          <span
            aria-hidden="true"
            className={`absolute h-0.5 w-4 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${open ? '-rotate-45' : 'translate-y-1'}`}
          />
        </button>
        <div
          id="navbar-panel"
          className={`${open ? 'mobile-nav-open flex' : 'hidden'} max-h-[calc(100dvh-7rem)] w-full flex-col gap-5 overflow-y-auto pt-5 pb-2 lg:ml-3 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:gap-3 lg:overflow-visible lg:p-0`}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setOpen(false)
          }}
        >
          <div className="border-t border-border pt-3 lg:flex-1 lg:border-0 lg:pt-0">
            <NavbarItems items={navbar.items} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 lg:justify-end lg:border-0 lg:pt-0">
            <Preferences />
            <button
              type="button"
              disabled
              title={labels.loginSoon}
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed"
            >
              {labels.login}
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
