type FlowGeometry = {
  viewBox: string
  // One entry per company, in order.
  incoming: readonly string[]
  // Outgoing: Taxful to the customer card.
  customer: string
  // Incoming lane: the partner card up into Taxful, then Taxful to the inbox card.
  partner: string
  inbox: string
}

// Each scene matches its CSS: company tiles across the top, the Taxful hub in the
// middle and the customer, partner and inbox cards at the bottom (see
// invoice-flow.module.css). Desktop shows the three cards in one row; mobile shows
// customer and inbox side by side, with the partner card centred below them.
const scenes = {
  desktop: {
    width: 880,
    columns: (sources: number) => Math.max(1, sources),
    tileHeight: 64,
    rowGap: 12,
    columnGap: 12,
    rail: 116,
    hubTop: 176,
    radius: 18,
    // Card centres at 161, 440 and 719; the hub spans y 176–268. The horizontal runs
    // sit at y = 300 so the chips clear the cards on tablets.
    customer: 'M400 268 V276 Q400 300 376 300 H189 Q161 300 161 328 V364',
    partner: 'M440 364 V268',
    inbox: 'M480 268 V276 Q480 300 504 300 H691 Q719 300 719 328 V364',
  },
  mobile: {
    width: 360,
    columns: (sources: number) => Math.min(3, Math.max(1, sources)),
    tileHeight: 56,
    rowGap: 12,
    columnGap: 12,
    rail: 146,
    hubTop: 176,
    radius: 14,
    // Hub spans y 176–255, the chips sit at y 275 and the destination cards start at
    // 300. The partner route starts behind the bottom-anchored partner card (y 440) and
    // rises through the gap between the cards. Routes start just inside the hub.
    customer: 'M164 255 V265 Q164 275 154 275 H96 Q86 275 86 285 V300',
    partner: 'M180 440 V255',
    inbox: 'M196 255 V265 Q196 275 206 275 H264 Q274 275 274 285 V300',
  },
} as const

export type FlowLayout = keyof typeof scenes

const round = (value: number) => Math.round(value * 10) / 10

// Every company drops onto one shared rail, which feeds a single trunk into the
// hub. On mobile, top-row lines run straight down behind the tiles below them.
export function createFlowPaths(layout: FlowLayout, sources: number): FlowGeometry {
  const scene = scenes[layout]
  const columns = scene.columns(sources)
  const tileWidth = (scene.width - (columns - 1) * scene.columnGap) / columns
  const trunk = scene.width / 2
  const r = scene.radius
  const incoming = Array.from({ length: sources }, (_, index) => {
    const row = Math.floor(index / columns)
    const x = round(tileWidth / 2 + (index % columns) * (tileWidth + scene.columnGap))
    const top = round(row * (scene.tileHeight + scene.rowGap) + scene.tileHeight)
    if (Math.abs(x - trunk) < 1) return `M${trunk} ${top} V${scene.hubTop}`
    const toward = x < trunk ? 1 : -1
    return [
      `M${x} ${top}`,
      `V${scene.rail - r}`,
      `Q${x} ${scene.rail} ${round(x + toward * r)} ${scene.rail}`,
      `H${trunk - toward * r}`,
      `Q${trunk} ${scene.rail} ${trunk} ${scene.rail + r}`,
      `V${scene.hubTop}`,
    ].join(' ')
  })
  return {
    viewBox: `0 0 ${scene.width} 440`,
    incoming,
    customer: scene.customer,
    partner: scene.partner,
    inbox: scene.inbox,
  }
}
