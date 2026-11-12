import { describe, expect, it } from 'vitest'
import { createFlowPaths } from '@/components/home/hero/flow-paths'
import { homeContent } from '@/lib/home/content'

const ends = (path: string) => {
  const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
  return { start: numbers.slice(0, 2), end: numbers.slice(-1)[0] }
}

describe('Invoice flow routes', () => {
  it('starts every route under its company tile and ends at the hub trunk', () => {
    for (const layout of ['desktop', 'mobile'] as const)
      for (let sources = 1; sources <= 6; sources++) {
        const geometry = createFlowPaths(layout, sources)
        const width = layout === 'desktop' ? 880 : 360
        const hubTop = 176
        expect(geometry.incoming).toHaveLength(sources)
        expect(geometry.viewBox).toBe(`0 0 ${width} 440`)
        for (const path of geometry.incoming) {
          const { start, end } = ends(path)
          expect(start[0]).toBeGreaterThan(0)
          expect(start[0]).toBeLessThan(width)
          // Vertical finish into the hub along the shared trunk.
          expect(path).toMatch(
            new RegExp(`${width / 2} [\\d.]+ V${hubTop}$|M${width / 2} [\\d.]+ V${hubTop}$`),
          )
          expect(end).toBe(hubTop)
        }
      }
  })

  it('stacks mobile companies in columns so top-row routes run behind the row below', () => {
    const { incoming } = createFlowPaths('mobile', 6)
    // Columns repeat every three companies; the top row starts higher up.
    expect(ends(incoming[0]).start).toEqual([56, 56])
    expect(ends(incoming[3]).start).toEqual([56, 124])
    expect(incoming[1]).toBe('M180 56 V176')
  })

  it('runs the partner lane up into the hub and out to the inbox, mirroring customers', () => {
    for (const layout of ['desktop', 'mobile'] as const) {
      const { customer, partner, inbox, viewBox } = createFlowPaths(layout, 6)
      const width = Number(viewBox.split(' ')[2])
      // Straight up the middle, from the partner card to the hub.
      expect(partner).toMatch(new RegExp(`^M${width / 2} \\d+ V\\d+$`))
      const [, partnerStart, partnerEnd] = partner.match(/^M\d+ (\d+) V(\d+)$/)!.map(Number)
      expect(partnerStart).toBeGreaterThan(partnerEnd)
      // The inbox route is the customer route reflected around the centre.
      const mirror = (path: string) =>
        path.replace(/([MHQV])([^MHQV]*)/g, (_, command: string, args: string) => {
          const numbers = args.trim().split(/\s+/).map(Number)
          if (command === 'V') return `V${numbers[0]} `
          if (command === 'H') return `H${width - numbers[0]} `
          return `${command}${numbers.map((n, i) => (i % 2 ? n : width - n)).join(' ')} `
        })
      expect(mirror(customer).trim()).toBe(inbox)
    }
  })
})

describe('Hero buttons', () => {
  it('keeps at most two safe, labelled buttons', () => {
    const { actions } = homeContent(
      {
        actions: [
          { label: 'Start', link: { type: 'internal', path: '/signup' } },
          { label: 'Unsafe', link: { type: 'external', url: 'javascript:alert(1)' } },
          { label: '   ', link: { type: 'internal', path: '/pricing' } },
          { label: 'Pricing', link: { type: 'internal', path: 'pricing' } },
          { label: 'Third', link: { type: 'internal', path: '/faq' } },
        ],
      },
      'de',
    )
    expect(actions.map((action) => action.label)).toEqual(['Start', 'Pricing'])
    expect(homeContent({}, 'en').actions).toEqual([])
  })
})
