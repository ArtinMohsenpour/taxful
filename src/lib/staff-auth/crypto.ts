import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function newTotpSecret() {
  const bytes = randomBytes(20)
  let bits = 0,
    value = 0,
    out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  return out
}
export function totp(secret: string, counter: number) {
  let bits = 0,
    value = 0
  const decoded: number[] = []
  for (const char of secret) {
    const n = alphabet.indexOf(char)
    if (n < 0) throw new Error('Invalid authenticator secret')
    value = (value << 5) | n
    bits += 5
    if (bits >= 8) {
      decoded.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const h = createHmac('sha1', Buffer.from(decoded)).update(message).digest()
  const offset = h[19] & 15
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
}
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
function key() {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('Staff encryption is not configured')
  return createHash('sha256')
    .update('taxful-staff-mfa\0' + secret)
    .digest()
}
export function seal(value: string, userId: number) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(String(userId)))
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
}
export function unseal(value: string, userId: number) {
  const bytes = Buffer.from(value, 'base64'),
    cipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12))
  cipher.setAAD(Buffer.from(String(userId)))
  cipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8')
}
export function staffDigest(value: string) {
  return createHmac('sha256', key()).update(value).digest('hex')
}
