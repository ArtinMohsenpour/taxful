import { isIP } from 'node:net'

// This interprets a header chain; it does not authenticate the direct sender.
// The deployment must block direct origin access and overwrite the chosen header.
export function customerProxyConfig(env: Record<string, string | undefined> = process.env) {
  const header = (env.CUSTOMER_IP_HEADER || 'x-forwarded-for').trim().toLowerCase()
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(header)) throw new Error('Invalid CUSTOMER_IP_HEADER')
  const trustedProxies = (env.CUSTOMER_TRUSTED_PROXIES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  for (const entry of trustedProxies) {
    const [address, prefix, extra] = entry.split('/')
    const version = isIP(address)
    if (
      !version ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d{1,3}$/.test(prefix) ||
          Number(prefix) < 1 ||
          Number(prefix) > (version === 4 ? 32 : 128)))
    )
      throw new Error('Invalid CUSTOMER_TRUSTED_PROXIES; use specific proxy IPs or CIDRs')
  }
  return { ipAddressHeaders: [header], trustedProxies }
}

export function countsAsPasswordFailure(status: number, code?: string) {
  // Throttling, CSRF, provider outages and disabled accounts are not wrong passwords.
  return status === 401 && code === 'INVALID_EMAIL_OR_PASSWORD'
}
