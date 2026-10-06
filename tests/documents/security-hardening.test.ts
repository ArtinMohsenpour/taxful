import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import proxy from '../../src/proxy'
import { safeDocumentText, safeFilename } from '../../src/lib/security/text'
import {
  companyProfileSchema,
  blankCompanyProfile,
} from '../../src/lib/documents/company-profile-schema'
import { validateRecord, recordSchema } from '../../src/lib/documents/schema'
import { generateXRechnung } from '../../src/lib/documents/xrechnung'
import { generateCII } from '../../src/lib/documents/zugferd'
import {
  customerProxyConfig,
  countsAsPasswordFailure,
} from '../../src/lib/customer-auth/proxy-config'
import { priceInCents } from '../../src/lib/billing/money-input'
import { invoiceFixture } from './fixtures'

test('unsafe source text remains reviewable but cannot be approved/exported in either format', () => {
  for (const character of [
    '\u0001',
    '\u000B',
    '\uD800',
    '\uDFFF',
    '\uFFFE',
    '\uFFFF',
    '\u202E',
    '\u2066',
    '\u200B',
  ]) {
    const data = invoiceFixture()
    data.issuer.companyName = `Supplier${character} GmbH`
    assert.equal(recordSchema.safeParse(data).success, true)
    assert.ok(
      validateRecord(data).some(
        (issue) => issue.field === 'issuer.companyName' && issue.code === 'unsafeText',
      ),
    )
    assert.throws(() => generateXRechnung(data), /exportIncomplete/)
    assert.throws(() => generateCII(data), /exportIncomplete/)
    assert.equal(
      companyProfileSchema.safeParse({
        ...blankCompanyProfile,
        companyName: data.issuer.companyName,
      }).success,
      false,
    )
  }
  const data = invoiceFixture()
  data.lines[0].description = 'Service\u202E'
  data.allowances = [{ amount: '0', reason: 'Reason\u0001' }]
  assert.deepEqual(
    validateRecord(data)
      .filter((issue) => issue.code === 'unsafeText')
      .map((issue) => issue.field),
    ['lines.0.description', 'allowances.0.reason'],
  )
})

test('international names, combining letters, joiners, supplementary Unicode and escaped punctuation survive', () => {
  const data = invoiceFixture()
  data.issuer.companyName = "Müller & Söhne / O'Brien – Nguyễn e\u0301 فارسی\u200Cنام 👩‍💻"
  data.invoiceNote = 'First line\nSecond line\tReference'
  assert.equal(safeDocumentText(data.issuer.companyName), true)
  assert.ok(generateXRechnung(data).includes('Müller &amp; Söhne'))
  assert.ok(generateCII(data).includes('Müller &amp; Söhne'))
  assert.equal(safeFilename('invoice\u202Efdp.exe/\u0001.pdf'), 'invoice_fdp.exe__.pdf')
  assert.equal(safeDocumentText(safeFilename('a'.repeat(179) + '😀.pdf')), true)
})

test('fresh nonces replace forged headers, survive locale routing, and keep private pages unframeable', () => {
  const request = (path: string) =>
    new NextRequest('http://localhost:3000' + path, {
      headers: { 'x-nonce': 'attacker', 'content-security-policy': "script-src 'unsafe-inline'" },
    })
  for (const path of [
    '/de',
    '/en/login',
    '/de/reset-password?token=synthetic',
    '/en/verify-email?token=synthetic',
    '/admin/login',
  ]) {
    const response = proxy(request(path))
    const csp = response.headers.get('content-security-policy')!
    assert.match(csp, /frame-ancestors 'none'/)
    assert.doesNotMatch(csp, /attacker|script-src 'unsafe-inline'/)
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    const nonce = response.headers.get('x-middleware-request-x-nonce')
    assert.ok(nonce)
    assert.ok(csp.includes(`'nonce-${nonce}'`))
    assert.notEqual(proxy(request(path)).headers.get('x-middleware-request-x-nonce'), nonce)
  }
  assert.match(
    proxy(request('/de?preview=true')).headers.get('content-security-policy')!,
    /frame-ancestors 'self'/,
  )
  const denied = proxy(request('/de/portal/billing?preview=true'))
  assert.equal(denied.status, 307)
  assert.equal(denied.headers.get('x-frame-options'), 'DENY')
  assert.match(denied.headers.get('content-security-policy')!, /frame-ancestors 'none'/)
})

test('proxy trust configuration requires valid bounded networks and throttling never locks an account', () => {
  assert.deepEqual(
    customerProxyConfig({
      CUSTOMER_IP_HEADER: 'X-Real-IP',
      CUSTOMER_TRUSTED_PROXIES: '192.0.2.10,2001:db8::/64',
    }),
    {
      ipAddressHeaders: ['x-real-ip'],
      trustedProxies: ['192.0.2.10', '2001:db8::/64'],
    },
  )
  for (const value of [
    '0.0.0.0/0',
    '::/0',
    '10.0.0.0/33',
    '::/129',
    'not-a-network',
    '10.0.0.1/24/extra',
  ])
    assert.throws(() => customerProxyConfig({ CUSTOMER_TRUSTED_PROXIES: value }))
  assert.throws(() => customerProxyConfig({ CUSTOMER_IP_HEADER: 'x-real-ip\r\nx-forged' }))
  assert.equal(countsAsPasswordFailure(429, 'INVALID_EMAIL_OR_PASSWORD'), false)
  assert.equal(countsAsPasswordFailure(403, 'EMAIL_NOT_VERIFIED'), false)
  assert.equal(countsAsPasswordFailure(500), false)
  assert.equal(countsAsPasswordFailure(401, 'INVALID_EMAIL_OR_PASSWORD'), true)
})

test('admin prices convert exactly and reject ambiguous or out-of-range input', () => {
  for (const [input, expected] of [
    ['0', 0],
    ['1.01', 101],
    ['1.15', 115],
    ['10.1', 1010],
    ['10000', 1000000],
  ] as const)
    assert.equal(priceInCents(input), expected)
  for (const input of ['', '-1', '1e3', 'Infinity', '1.001', '1,23', '12abc', '10000.01', null])
    assert.equal(priceInCents(input), null)
})

test('country and currency checks use the pinned official validator lists, not only code length', () => {
  const data = invoiceFixture()
  data.currency = 'ZZZ'
  data.recipient.country = 'ZZ'
  assert.ok(validateRecord(data).some((issue) => issue.field === 'currency'))
  assert.ok(validateRecord(data).some((issue) => issue.field === 'recipient.country'))
  assert.throws(() => generateXRechnung(data), /exportIncomplete/)
  assert.throws(() => generateCII(data), /exportIncomplete/)
  assert.equal(
    companyProfileSchema.safeParse({
      ...blankCompanyProfile,
      companyName: 'Example',
      country: 'ZZ',
    }).success,
    false,
  )
  data.currency = 'CHF'
  data.recipient.country = 'CH'
  assert.ok(
    !validateRecord(data).some((issue) => ['currency', 'recipient.country'].includes(issue.field)),
  )
})
