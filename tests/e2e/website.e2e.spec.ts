import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import config from '@/payload.config'
import sharp from 'sharp'
import type { Media, About } from '@/payload-types'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

const origin = process.env.E2E_BASE_URL || 'http://localhost:3000'
const references: string[] = []
const mediaIds: number[] = []
test.beforeEach(async () => {
  await seedTestUser()
})
test.afterEach(async () => {
  const payload = await getPayload({ config })
  for (const id of mediaIds.splice(0))
    await payload.delete({ collection: 'media', id, overrideAccess: true })
  for (const reference of references.splice(0))
    await payload.delete({
      collection: 'form-submissions',
      overrideAccess: true,
      where: { reference: { equals: reference } },
    })
  await cleanupTestUser()
})

test('public pages are bilingual, responsive and include canonical metadata', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const [locale, title] of [
    ['de', 'Ein klarer Weg zur E-Rechnung.'],
    ['en', 'A clear path to e-invoicing.'],
  ]) {
    await page.goto(`${origin}/${locale}/services`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${origin}/${locale}/services`,
    )
    await expect(page.locator('link[hreflang="de"]')).toHaveAttribute(
      'href',
      `${origin}/de/services`,
    )
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const layout = await page
        .locator('[data-layout="threeColumns"] > div:last-child')
        .evaluate((element) => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        }))
      expect(layout.columns).toBe(width >= 1024 ? 3 : 1)
      expect(layout.overflow).toBe(false)
    }
    await page.goto(`${origin}/${locale}/contact`)
    await expect(
      page.getByRole('textbox', { name: locale === 'de' ? 'E-Mail' : 'Email' }),
    ).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
  expect(errors).toEqual([])
})

test('drafts and private form records stay inaccessible anonymously', async ({ request }) => {
  for (const path of [
    '/en/privacy',
    '/de/terms',
    '/en/impressum',
    '/en/about?preview=true',
    '/de/contact?preview=true',
    '/en/unknown-page',
  ])
    expect((await request.get(`${origin}${path}`)).status()).toBe(404)
  expect((await request.get(`${origin}/api/globals/about?draft=true`)).status()).toBe(403)
  expect((await request.get(`${origin}/api/website-forms?draft=true`)).status()).toBe(403)
  expect((await request.get(`${origin}/api/form-submissions`)).status()).toBe(403)
  const sitemap = await (await request.get(`${origin}/sitemap.xml`)).text()
  expect(sitemap).toContain('/en/services')
  expect(sitemap).not.toContain('/privacy')
  expect(sitemap).not.toContain('/portal')
})

test('contact messages save to the CMS inbox, with server validation and safe retries', async ({
  page,
  request,
}) => {
  const syntheticIP = `198.51.100.${Math.floor(Math.random() * 200) + 20}`
  await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': syntheticIP })
  await page.goto(`${origin}/en/contact`)
  await page.getByRole('textbox', { name: 'Name', exact: false }).fill('Synthetic website test')
  await page
    .getByRole('textbox', { name: 'Email', exact: false })
    .fill('website-e2e@example.invalid')
  await page
    .getByRole('textbox', { name: 'Message', exact: false })
    .fill('Synthetic message for the CMS inbox test.')
  const sent = page.waitForRequest((request) => request.url().endsWith('/api/website-forms/submit'))
  await page.getByRole('button', { name: 'Send message' }).click()
  const body = (await sent).postDataJSON()
  references.push(body.reference)
  await expect(page.getByRole('status')).toHaveText('Thank you. Your message has been saved.')
  const duplicate = await request.post(`${origin}/api/website-forms/submit`, {
    headers: { origin, 'x-forwarded-for': syntheticIP },
    data: body,
  })
  expect(duplicate.status()).toBe(200)
  const invalid = await request.post(`${origin}/api/website-forms/submit`, {
    headers: { origin, 'x-forwarded-for': syntheticIP },
    data: { ...body, reference: randomUUID(), answers: { ...body.answers, email: 'invalid' } },
  })
  expect(invalid.status()).toBe(400)
  expect((await invalid.json()).fields).toContain('email')
  const foreign = await request.post(`${origin}/api/website-forms/submit`, {
    headers: { origin: 'https://foreign.invalid' },
    data: body,
  })
  expect(foreign.status()).toBe(403)
  const oversized = await request.post(`${origin}/api/website-forms/submit`, {
    headers: { origin, 'x-forwarded-for': syntheticIP },
    data: { padding: 'a'.repeat(33000) },
  })
  expect(oversized.status()).toBe(413)
  const payload = await getPayload({ config })
  const inbox = await payload.find({
    collection: 'form-submissions',
    overrideAccess: true,
    where: { reference: { equals: body.reference } },
  })
  expect(inbox.totalDocs).toBe(1)
  expect(inbox.docs[0].answers).toContainEqual({
    key: 'message',
    label: 'Message',
    value: 'Synthetic message for the CMS inbox test.',
  })
})

test('the page editor previews unsaved headings and exposes the reusable layout picker', async ({
  page,
}) => {
  test.setTimeout(60000)
  page.setDefaultTimeout(10000)
  await login({ page, user: testUser })
  await page.request.get(`${origin}/api/globals/about?locale=en&draft=true`)
  await page.goto(`${origin}/admin/globals/about?locale=en`)
  await expect(page.getByRole('heading', { name: 'About us page', exact: true })).toBeVisible()
  await page.locator('#live-preview-toggler').click()
  const preview = page.frameLocator('iframe[src*="previewGlobal=about"]')
  await expect(preview.getByRole('heading', { level: 1 })).toHaveText(
    'More clarity for your invoices.',
  )
  const editorUpdated = page.waitForResponse(
    (response) =>
      response.url().includes('/admin/globals/about') && response.request().method() === 'POST',
  )
  await page.locator('input[name="title"]').fill('Unsaved page preview')
  await expect(preview.getByRole('heading', { level: 1 })).toHaveText('Unsaved page preview')
  await editorUpdated
  await page.getByRole('button', { name: 'Content', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /Add.*Page sections|Add.*Section/i }).first(),
  ).toBeVisible()
  await page.screenshot({ path: '/private/tmp/taxful-website-editor.png', fullPage: false })
  const column = page.locator('#field-sections__0__column1__content')
  if (!(await column.isVisible()))
    await page
      .locator('#field-sections')
      .getByRole('button', { name: 'Show All', exact: true })
      .click()
  await expect(column).toBeVisible()
  const contentType = page.locator('#field-sections__0__column1__content__0__type')
  if (!(await contentType.isVisible()))
    await column.locator('.collapsible__toggle--collapsed').first().click()
  await expect(contentType).toBeVisible()
  for (const type of ['Image', 'Video', 'Form', 'Rich text']) {
    await contentType.click()
    await page.getByRole('option', { name: type, exact: true }).click()
    const base = '#field-sections__0__column1__content__0__'
    await expect(page.locator(`${base}image`)).toBeVisible({ visible: type === 'Image' })
    await expect(page.locator(`${base}video`)).toBeVisible({ visible: type === 'Video' })
    await expect(page.locator(`${base}form`)).toBeVisible({ visible: type === 'Form' })
    const editors = page.locator(
      '#field-sections__0__column1__content [contenteditable="true"]:visible',
    )
    await expect(editors).toHaveCount(type === 'Rich text' || type === 'Video' ? 1 : 0)
  }
  await page.getByRole('button', { name: 'Add Section', exact: true }).click()
  await expect(page.getByText('100% — full width', { exact: true })).toBeVisible()
  await expect(page.getByText('33% / 33% / 33% — three columns', { exact: true })).toBeVisible()
})

test('preview renders uploaded images, video and captions across layouts and themes', async ({
  page,
}) => {
  test.setTimeout(60000)
  await login({ page, user: testUser })
  const upload = async (name: string, mimetype: string, data: Buffer): Promise<Media> => {
    const response = await page.request.post(`${origin}/api/media?locale=en`, {
      multipart: {
        _payload: JSON.stringify({ alt: 'Synthetic preview media' }),
        file: { name, mimeType: mimetype, buffer: data },
      },
    })
    expect(response.status()).toBe(201)
    const { doc: media } = (await response.json()) as { doc: Media }
    expect(media.filesize).toBe(data.length)
    mediaIds.push(media.id)
    return media
  }
  const image = await upload(
    `website-test-${randomUUID()}.png`,
    'image/png',
    await sharp({ create: { width: 600, height: 400, channels: 3, background: '#8B9A6E' } })
      .png()
      .toBuffer(),
  )
  const captions = await upload(
    `website-test-${randomUUID()}.vtt`,
    'text/vtt',
    Buffer.from('WEBVTT\n\n00:00.000 --> 00:01.000\nSynthetic captions\n'),
  )
  const videoBytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 90
    const context = canvas.getContext('2d')!
    const stream = canvas.captureStream(10)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks))
    })
    recorder.start()
    for (let index = 0; index < 5; index++) {
      context.fillStyle = index % 2 ? '#8B9A6E' : '#EAE2D6'
      context.fillRect(0, 0, 160, 90)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    recorder.stop()
    const blob = await stopped
    stream.getTracks().forEach((track) => track.stop())
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  // EBML's global Void element supplies valid padding, making the WebM larger
  // than Next's former 10 MB proxy cap while keeping native video playback valid.
  const paddingSize = 11 * 1024 * 1024
  const voidHeader = Buffer.alloc(5)
  voidHeader[0] = 0xec
  voidHeader.writeUInt32BE(0x10000000 + paddingSize, 1)
  const video = await upload(
    `website-test-${randomUUID()}.webm`,
    'video/webm',
    Buffer.concat([Buffer.from(videoBytes), voidHeader, Buffer.alloc(paddingSize)]),
  )
  // Known oversized requests receive a readable rejection before multipart parsing.
  const oversizedMedia = await page.request.post(`${origin}/api/media?locale=en`, {
    headers: { 'Content-Type': 'application/octet-stream' },
    data: Buffer.alloc(52 * 1024 * 1024),
  })
  expect(oversizedMedia.status()).toBe(413)
  expect((await oversizedMedia.json()).errors[0].message).toContain('50 MB')
  const data = (await (
    await page.request.get(`${origin}/api/globals/about?locale=en&draft=true`)
  ).json()) as About
  await page.goto(`${origin}/en/about?preview=true&previewGlobal=about`)
  const content: About = {
    ...data,
    title: 'Reusable content preview',
    sections: [
      {
        blockType: 'fullWidth',
        tone: 'surface',
        title: 'Full width',
        column1: {
          content: [{ type: 'image', image, imageAlt: 'Synthetic image', imageFit: 'landscape' }],
        },
      },
      {
        blockType: 'twoColumns',
        tone: 'plain',
        title: 'Two columns',
        column1: data.sections?.[0].column1,
        column2: {
          content: [
            {
              type: 'video',
              video,
              videoTitle: 'Synthetic video',
              poster: image,
              captions,
              transcript: data.sections?.[0].column1?.content?.[0].text,
            },
          ],
        },
      },
      {
        blockType: 'threeColumns',
        tone: 'accent',
        title: 'Three columns',
        column1: data.sections?.[0].column1,
        column2: data.sections?.[0].column1,
        column3: data.sections?.[0].column1,
      },
    ],
  }
  // Wait for hydration by repeating the same preview message until the official
  // hook is subscribed. No database edits or arbitrary timeout are needed.
  await expect
    .poll(async () => {
      await page.evaluate((data) => {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: location.origin,
            data: { type: 'payload-live-preview', globalSlug: 'about', locale: 'en', data },
          }),
        )
      }, content)
      return await page.getByRole('heading', { level: 1 }).textContent()
    })
    .toBe('Reusable content preview')
  await expect(page.getByRole('img', { name: 'Synthetic image' })).toBeVisible()
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: 'Synthetic image' })
        .evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      page.getByRole('img', { name: 'Synthetic image' }).evaluate((element) => {
        const { width, height } = element.getBoundingClientRect()
        return width / height
      }),
    )
    .toBeCloseTo(4 / 3, 2)
  await expect
    .poll(() =>
      page.locator('video').evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThanOrEqual(1)
  await expect(page.locator('video')).toHaveAttribute('controls', '')
  await expect(page.locator('video')).not.toHaveAttribute('autoplay')
  await expect
    .poll(() =>
      page
        .locator('video')
        .evaluate((element) => (element as HTMLVideoElement).textTracks[0]?.cues?.length),
    )
    .toBe(1)
  for (const theme of ['light', 'dark'])
    for (const width of [320, 768, 1440]) {
      await page.evaluate((theme) => {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(theme)
      }, theme)
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      )
      await page.screenshot({
        path: `/private/tmp/taxful-website-media-${theme}-${width}.png`,
        fullPage: false,
      })
    }
})
