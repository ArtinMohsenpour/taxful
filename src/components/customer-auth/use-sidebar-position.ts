'use client'

import { useLayoutEffect, useRef } from 'react'

export function useSidebarPosition() {
  const sidebar = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const element = sidebar.current
    const main = element?.closest('main')
    const navbar = main?.parentElement?.querySelector('header')
    if (!element || !main) return

    const updatePosition = () => {
      const top = Number.parseFloat(getComputedStyle(element).top) || 0
      const bottom = Number.parseFloat(getComputedStyle(main).paddingBottom) || 0
      // A taller menu follows the page; it never needs an internal scrollbar.
      element.dataset.sticky = String(
        element.getBoundingClientRect().height + top + bottom <= window.innerHeight,
      )
    }
    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    observer.observe(element)
    if (navbar) observer.observe(navbar)
    window.addEventListener('resize', updatePosition)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  return sidebar
}
