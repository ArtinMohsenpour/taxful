import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import sharp from 'sharp'
import config from '../src/payload.config'
import { EXAMPLE_BLOCK_PREFIX, homeExampleSections } from '../src/lib/website/examples/home-content'
import { createExampleVideo } from './website-examples/create-video'

// Explicit development content command, never part of a production migration.
const host = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3000').hostname
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(host))
  throw new Error('Home examples are only available in local development.')

const payload = await getPayload({ config })
try {
  const findAsset = async (filename: string) =>
    (
      await payload.find({
        collection: 'media',
        overrideAccess: true,
        depth: 0,
        limit: 1,
        where: { filename: { equals: filename } },
      })
    ).docs[0]
  const imageName = 'taxful-home-example.png'
  const videoName = 'taxful-home-example.webm'
  let image = await findAsset(imageName)
  if (!image) {
    const data = await sharp(await readFile('public/examples/invoice-workflow.svg'))
      .png()
      .toBuffer()
    image = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Invoice and review illustration' },
      file: { name: imageName, mimetype: 'image/png', data, size: data.length },
    })
  }
  let video = await findAsset(videoName)
  if (!video) {
    const data = await createExampleVideo()
    video = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: 'Silent three-step invoice workflow illustration' },
      file: { name: videoName, mimetype: 'video/webm', data, size: data.length },
    })
  }
  const form = (
    await payload.find({
      collection: 'website-forms',
      overrideAccess: false,
      depth: 0,
      limit: 1,
      where: { name: { equals: 'Contact' } },
    })
  ).docs[0]
  if (!form) throw new Error('Publish and enable the Contact form before adding examples.')

  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('A database transaction is required')
  try {
    for (const locale of ['de', 'en'] as const) {
      const home = await payload.findGlobal({
        slug: 'home',
        locale,
        draft: true,
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
        req: { transactionID },
      })
      // Reruns leave both user-authored sections and edited examples untouched.
      if (home.sections?.some((section) => section.blockName?.startsWith(EXAMPLE_BLOCK_PREFIX))) {
        console.log(`${locale}: existing home examples preserved`)
        continue
      }
      await payload.updateGlobal({
        slug: 'home',
        locale,
        overrideAccess: true,
        req: { transactionID },
        draft: home._status !== 'published',
        data: {
          sections: [
            ...(home.sections || []),
            ...homeExampleSections(locale, { image: image.id, video: video.id, form: form.id }),
          ],
          _status: home._status || 'draft',
        },
      })
      console.log(`${locale}: added four example sections (${home._status || 'draft'})`)
    }
    await payload.db.commitTransaction(transactionID)
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
} finally {
  await payload.destroy()
}
process.exit(0)
