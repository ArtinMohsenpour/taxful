// Stripe origins follow https://docs.stripe.com/security/guide#content-security-policy.
// Keep these available across client-side navigation to billing.
export function pageSecurityPolicy(nonce: string, preview: boolean, development: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ''} https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com`,
    "script-src-attr 'none'",
    // React, next-themes, Payload and Stripe use inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.stripe.com",
    "font-src 'self' data:",
    `connect-src 'self' https://api.stripe.com https://checkout.stripe.com${development ? ' ws: wss:' : ''}`,
    "frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    `frame-ancestors ${preview ? "'self'" : "'none'"}`,
  ].join('; ')
}

export function baselineSecurityHeaders(https: boolean) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ...(https ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
  ]
}
