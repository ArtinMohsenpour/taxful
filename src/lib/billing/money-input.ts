// HTML number inputs expose a canonical dot separator, independent of display locale.
export function priceInCents(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,5}(\.\d{1,2})?$/.test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return cents <= 1_000_000 ? cents : null
}
