import { chromium } from '@playwright/test'

// A real, silent WebM illustration generated with the browser's native encoder.
// Used only by the development example command; no external media provider.
export async function createExampleVideo() {
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || 'chrome' })
  try {
    const page = await browser.newPage()
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 960
      canvas.height = 540
      const ctx = canvas.getContext('2d')!
      const stream = canvas.captureStream(24)
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
        videoBitsPerSecond: 1500000,
      })
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => chunks.push(event.data)
      const stopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks))
      })
      recorder.start()
      for (let frame = 0; frame < 144; frame++) {
        ctx.fillStyle = '#F7F2EB'
        ctx.fillRect(0, 0, 960, 540)
        ctx.lineWidth = 4
        ctx.strokeStyle = '#E2DBCF'
        ctx.beginPath()
        ctx.moveTo(220, 270)
        ctx.lineTo(740, 270)
        ctx.stroke()
        for (let step = 0; step < 3; step++) {
          const x = 220 + step * 260
          ctx.fillStyle = frame >= step * 48 ? '#8B9A6E' : '#EAE2D6'
          ctx.beginPath()
          ctx.arc(x, 270, 80, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#20271A'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = '600 34px sans-serif'
          ctx.fillText(`0${step + 1}`, x, 270)
        }
        ctx.fillStyle = '#52613F'
        ctx.beginPath()
        ctx.arc(220 + (frame / 143) * 520, 390, 10, 0, Math.PI * 2)
        ctx.fill()
        await new Promise((resolve) => setTimeout(resolve, 1000 / 24))
      }
      recorder.stop()
      const blob = await stopped
      stream.getTracks().forEach((track) => track.stop())
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    })
    return Buffer.from(bytes)
  } finally {
    await browser.close()
  }
}
