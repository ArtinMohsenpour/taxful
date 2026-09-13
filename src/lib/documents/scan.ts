import { createConnection } from 'node:net'
import { DocumentError } from './config'

// clamd INSTREAM: scan before opening the document with any parser.
export async function scanDocument(bytes: Buffer) {
  return new Promise<void>((resolve, reject) => {
    const socket = createConnection({
      host: process.env.CLAMAV_HOST || '127.0.0.1',
      port: Number(process.env.CLAMAV_PORT || 3310),
    })
    let response = ''
    socket.setTimeout(45000)
    socket.on('timeout', () => socket.destroy(new DocumentError('scannerUnavailable', 503)))
    socket.on('error', () => reject(new DocumentError('scannerUnavailable', 503)))
    socket.on('data', (chunk) => {
      response += chunk.toString()
      if (response.length > 4096) socket.destroy(new DocumentError('scannerUnavailable', 503))
    })
    socket.on('end', () => {
      if (response.includes('FOUND')) reject(new DocumentError('unsafeFile'))
      else if (/^stream: OK[\u0000\r\n]*$/.test(response)) resolve()
      else reject(new DocumentError('scannerUnavailable', 503))
    })
    socket.on('connect', async () => {
      try {
        socket.write('zINSTREAM\0')
        for (let offset = 0; offset < bytes.length; offset += 65536) {
          const chunk = bytes.subarray(offset, offset + 65536)
          const length = Buffer.alloc(4)
          length.writeUInt32BE(chunk.length)
          socket.write(length)
          if (!socket.write(chunk))
            await new Promise<void>((done, fail) => {
              const onDrain = () => {
                socket.off('error', onError)
                done()
              }
              const onError = (error: Error) => {
                socket.off('drain', onDrain)
                fail(error)
              }
              socket.once('drain', onDrain)
              socket.once('error', onError)
            })
        }
        socket.write(Buffer.alloc(4))
      } catch {
        socket.destroy(new DocumentError('scannerUnavailable', 503))
      }
    })
  })
}
