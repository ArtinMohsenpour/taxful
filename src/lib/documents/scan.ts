import { createConnection } from 'node:net'
import { DocumentError } from './config'

// clamd terminates replies with NUL; do not wait for the peer to close its socket.
function request(command: string, bytes?: Buffer, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: process.env.CLAMAV_HOST || '127.0.0.1',
      port: Number(process.env.CLAMAV_PORT || 3310),
    })
    let response = '',
      settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      socket.destroy()
      if (error) reject(error)
      else resolve(response.replace(/[\0\r\n]+$/, ''))
    }
    const unavailable = () => finish(new DocumentError('scannerUnavailable', 503))
    // Absolute deadline covers both connection setup and slow trickles of data.
    const deadline = setTimeout(unavailable, timeoutMs)
    socket.on('error', unavailable)
    socket.on('close', () => {
      if (!settled) unavailable()
    })
    socket.on('end', () => finish())
    socket.on('data', (chunk) => {
      response += chunk.toString()
      if (response.length > 4096) return unavailable()
      if (/[\0\n]/.test(response)) finish()
    })
    socket.on('connect', async () => {
      try {
        socket.write(command + '\0')
        if (bytes) {
          for (let offset = 0; offset < bytes.length && !settled; offset += 65536) {
            const chunk = bytes.subarray(offset, offset + 65536),
              length = Buffer.alloc(4)
            length.writeUInt32BE(chunk.length)
            socket.write(length)
            if (!socket.write(chunk))
              await new Promise<void>((done, fail) => {
                const cleanup = () => {
                  socket.off('drain', drain)
                  socket.off('close', closed)
                }
                const drain = () => {
                  cleanup()
                  done()
                }
                const closed = () => {
                  cleanup()
                  fail(new Error('closed'))
                }
                socket.once('drain', drain)
                socket.once('close', closed)
              })
          }
          if (!settled) socket.write(Buffer.alloc(4))
        }
      } catch {
        unavailable()
      }
    })
  })
}
export async function scannerReady() {
  try {
    return (await request('zPING', undefined, 1500)) === 'PONG'
  } catch {
    return false
  }
}
export async function scanDocument(bytes: Buffer) {
  const response = await request('zINSTREAM', bytes)
  if (response.endsWith(' FOUND')) throw new DocumentError('unsafeFile')
  if (response !== 'stream: OK') throw new DocumentError('scannerUnavailable', 503)
}
