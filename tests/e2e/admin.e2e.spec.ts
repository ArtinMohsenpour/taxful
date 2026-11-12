import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('groups the sidebar by task with administration last', async () => {
    await page.goto('http://localhost:3000/admin')
    const groups = page.locator('nav .nav-group')
    await expect(groups.locator('.nav-group__label')).toHaveText([
      'Services',
      'Forms',
      'Media',
      'Pages',
      'Legal',
      'Site settings',
      'Administration',
    ])
    const items = (index: number) => groups.nth(index).locator('.nav__link-label')
    await expect(items(0)).toHaveText(['Service pages', 'Services overview'])
    await expect(items(3)).toHaveText(['Home', 'About us', 'How it works', 'FAQ', 'Contact us'])
    await expect(items(4)).toHaveText(['Privacy policy', 'Terms of use', 'Legal notice (Impressum)'])
    await expect(items(5)).toHaveText(['Navigation', 'Footer'])
    // The seeded test user is a super admin.
    await expect(items(6)).toHaveText(['Staff accounts', 'Customers & billing'])
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    const listViewArtifact = page.locator('h1', { hasText: 'Staff accounts' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
