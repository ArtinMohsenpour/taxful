import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'

const origin = process.env.SECURITY_TEST_ORIGIN || 'http://localhost:3100'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext()
const page = await context.newPage()
const errors: string[] = []
page.on('pageerror', (error) => errors.push(error.message))
await page.addInitScript(() => {
  const violations: string[] = []
  Object.assign(window, { securityTestViolations: violations })
  document.addEventListener('securitypolicyviolation', (event) => {
    violations.push(`${event.effectiveDirective}: ${event.blockedURI}`)
  })
})
try {
  for (const path of [
    '/en',
    '/de',
    '/en/login',
    '/de/login',
    '/en/signup',
    '/de/signup',
    '/en/reset-password?token=synthetic',
    '/de/verify-email?token=synthetic',
    '/admin/login',
  ]) {
    const response = await page.goto(origin + path)
    assert.ok(response)
    assert.equal(response.status(), 200)
    const headers = response.headers()
    assert.match(headers['content-security-policy'], /script-src .*'nonce-/)
    assert.equal(headers['referrer-policy'], 'no-referrer')
    assert.equal(headers['x-content-type-options'], 'nosniff')
    assert.equal(headers['x-frame-options'], 'DENY')
    await expect(page.locator('body')).toBeVisible()
    await page.waitForLoadState('networkidle')
    const violations = await page.evaluate(
      () => (window as unknown as { securityTestViolations: string[] }).securityTestViolations,
    )
    assert.deepEqual(violations, [], `${path}: unexpected CSP violations`)
    console.log(`Passed ${path.split('?')[0]}`)
  }
  // Inject into the HTML response so parser execution is subject to CSP (DevTools
  // evaluation is privileged and is not an accurate XSS test).
  await page.route('**/en?csp-test=1', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace(
      '</head>',
      '<script>window.securityTestInjected = true</script></head>',
    )
    await route.fulfill({ response, body })
  })
  await page.goto(origin + '/en?csp-test=1')
  assert.equal(await page.evaluate(() => 'securityTestInjected' in window), false)
  const oversized = await context.request.post(origin + '/api/customer-auth/sign-in/email', {
    headers: { origin, 'content-type': 'application/json' },
    data: JSON.stringify({ email: 'synthetic@example.test', password: 'x'.repeat(70_000) }),
  })
  assert.equal(oversized.status(), 413)
  assert.deepEqual(errors, [])
  console.log('Passed inline-script rejection and bounded authentication requests')
} finally {
  await browser.close()
}
