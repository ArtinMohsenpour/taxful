import { z } from 'zod'
import { getPayload } from 'payload'
import config from '@payload-config'
import QRCode from 'qrcode'
import { boundedBody, failure, json } from '@/lib/documents/http'
import { checkOrigin } from '@/lib/documents/access'
import { DocumentError } from '@/lib/documents/config'
import {
  staffFirstFactor,
  staffMfaState,
  beginStaffMfa,
  verifyStaffMfa,
} from '@/lib/staff-auth/service'
import { staffCookie } from '@/lib/staff-auth/strategy'
import { enforceSecurityRate } from '@/lib/security/rate-limit'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    const user = await staffFirstFactor(payload, request.headers)
    return json({ state: await staffMfaState(user.id) })
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    await enforceSecurityRate(request, 'staff-mfa', 30, 60)
    let input: unknown
    try {
      input = JSON.parse((await boundedBody(request, 2048)).toString())
    } catch (error) {
      if (error instanceof DocumentError) throw error
      throw new DocumentError('invalidRequest')
    }
    const parsed = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('enroll') }).strict(),
        z.object({ action: z.literal('verify'), code: z.string().min(1).max(32) }).strict(),
      ])
      .safeParse(input)
    if (!parsed.success) throw new DocumentError('invalidRequest')
    const body = parsed.data
    const payload = await getPayload({ config })
    const user = await staffFirstFactor(payload, request.headers)
    if (body.action === 'enroll') {
      const setup = await beginStaffMfa(user)
      return json({
        secret: setup.secret,
        qr: await QRCode.toDataURL(setup.uri, { width: 240, margin: 2 }),
      })
    }
    if (body.action !== 'verify' || typeof body.code !== 'string' || body.code.length > 32)
      throw new DocumentError('invalidRequest')
    const result = await verifyStaffMfa(user, body.code.trim())
    const response = json({ verified: true, codes: result.codes })
    const secure = new URL(process.env.BETTER_AUTH_URL!).protocol === 'https:'
    response.headers.set(
      'Set-Cookie',
      `${staffCookie}=${result.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? '; Secure' : ''}`,
    )
    return response
  } catch (error) {
    return failure(error)
  }
}
