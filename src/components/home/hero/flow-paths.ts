type FlowGeometry = {
  viewBox: string
  incoming: readonly string[]
  customer: string
  taxOffice: string
}

// Coordinates align with the responsive provider grid, central hub and destination cards.
const flowPaths: Record<'desktop' | 'mobile', FlowGeometry> = {
  desktop: {
    viewBox: '0 0 880 440',
    incoming: [
      'M68 64 V90 Q68 120 98 120 H372 Q400 120 400 148 V176',
      'M217 64 V102 Q217 138 253 138 H393 Q416 138 416 161 V176',
      'M366 64 V120 Q366 154 400 154 H432 V176',
      'M514 64 V120 Q514 154 480 154 H448 V176',
      'M663 64 V102 Q663 138 627 138 H487 Q464 138 464 161 V176',
      'M812 64 V90 Q812 120 782 120 H508 Q480 120 480 148 V176',
    ],
    customer: 'M420 268 V284 Q420 316 388 316 H252 Q224 316 224 344 V364',
    taxOffice: 'M460 268 V284 Q460 316 492 316 H628 Q656 316 656 344 V364',
  },
  mobile: {
    viewBox: '0 0 360 440',
    incoming: [
      'M56 56 V58 Q56 62 50 62 H2 Q-6 62 -6 70 V166 Q-6 188 16 188 H131 Q148 188 148 205 V220',
      'M180 56 V58 Q180 62 174 62 H124 Q118 62 118 68 V166 Q118 198 150 198 H160 V220',
      'M304 56 V58 Q304 62 310 62 H358 Q366 62 366 70 V166 Q366 188 344 188 H229 Q212 188 212 205 V220',
      'M56 124 V146 Q56 174 84 174 H144 Q172 174 172 202 V220',
      'M180 124 V220',
      'M304 124 V146 Q304 174 276 174 H216 Q188 174 188 202 V220',
    ],
    customer: 'M164 300 V310 Q164 326 148 326 H108 Q88 326 88 346 V358',
    taxOffice: 'M196 300 V310 Q196 326 212 326 H252 Q272 326 272 346 V358',
  },
}

export type FlowLayout = keyof typeof flowPaths

export function createFlowPaths(layout: FlowLayout, sources: number): FlowGeometry {
  if (sources === 6) return flowPaths[layout]
  const desktop = layout === 'desktop'
  const width = desktop ? 880 : 360
  const columns = desktop ? Math.max(1, sources) : Math.min(3, Math.max(1, sources))
  const tileWidth = (width - (columns - 1) * 12) / columns
  const incoming = Array.from({ length: sources }, (_, index) => {
    const column = index % columns
    const startX = tileWidth / 2 + column * (tileWidth + 12)
    const endX = width / 2 + (index - (sources - 1) / 2) * (desktop ? 16 : 12)
    if (desktop) return `M${startX} 64 C${startX} 142 ${endX} 102 ${endX} 176`
    if (sources <= 3) return `M${startX} 56 C${startX} 152 ${endX} 154 ${endX} 220`
    if (index >= columns) return `M${startX} 124 C${startX} 186 ${endX} 166 ${endX} 220`
    const bypassX = column === 0 ? -6 : column === columns - 1 ? 366 : 118
    const direction = column === columns - 1 ? 1 : -1
    return `M${startX} 56 V58 Q${startX} 62 ${startX + direction * 6} 62 H${bypassX - direction * 6} Q${bypassX} 62 ${bypassX} 68 V168 Q${bypassX} 198 ${endX} 198 V220`
  })
  return { ...flowPaths[layout], incoming }
}
