import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Socket } from 'node:net'
import { scanDocument, scannerReady } from '../../src/lib/documents/scan'

test('clamd NUL reply completes without waiting for socket close; readiness and rejection are explicit', async () => {
  const sockets = new Set<Socket>()
  let verdict = 'stream: OK\0'
  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    let sent = false
    socket.on('data', (data) => {
      if (sent) return
      sent = true
      // Intentionally leave the connection open, as persistent clamd can do.
      socket.write(data.toString().startsWith('zPING') ? 'PONG\0' : verdict)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const previous = process.env.CLAMAV_PORT,
    previousHost = process.env.CLAMAV_HOST
  process.env.CLAMAV_PORT = String((server.address() as { port: number }).port)
  process.env.CLAMAV_HOST = '127.0.0.1'
  try {
    assert.equal(await scannerReady(), true)
    await Promise.race([
      scanDocument(Buffer.from('synthetic')),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error('scan waited for socket close')), 1500)
        timer.unref()
      }),
    ])
    verdict = 'stream: Synthetic-Test FOUND\0'
    await assert.rejects(scanDocument(Buffer.from('synthetic')), { message: 'unsafeFile' })
    verdict = 'stream: ERROR\0'
    await assert.rejects(scanDocument(Buffer.from('synthetic')), { message: 'scannerUnavailable' })
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    assert.equal(await scannerReady(), false)
    await assert.rejects(scanDocument(Buffer.from('synthetic')), { message: 'scannerUnavailable' })
  } finally {
    for (const socket of sockets) socket.destroy()
    if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()))
    if (previous === undefined) delete process.env.CLAMAV_PORT
    else process.env.CLAMAV_PORT = previous
    if (previousHost === undefined) delete process.env.CLAMAV_HOST
    else process.env.CLAMAV_HOST = previousHost
  }
})
