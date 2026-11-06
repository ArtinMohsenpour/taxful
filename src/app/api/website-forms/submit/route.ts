import { getPayload } from 'payload'
import config from '@payload-config'
import { boundedBody, json } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
import { enforceSecurityRate } from '@/lib/security/rate-limit'
import { submissionSchema } from '@/lib/website/forms/validation'
import { submitWebsiteForm } from '@/lib/website/forms/submit'
import { websiteOrigin } from '@/lib/website/metadata'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    if (
      request.headers.get('origin') !== websiteOrigin() ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      throw new DocumentError('forbidden', 403)
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new DocumentError('invalidRequest', 415)
    await enforceSecurityRate(request, 'website-form', 10, 900)
    const input = submissionSchema.safeParse(
      JSON.parse((await boundedBody(request, 32768)).toString()),
    )
    if (!input.success) throw new DocumentError('invalidRequest')
    if (input.data.website) return json({ accepted: true })
    const payload = await getPayload({ config })
    const result = await submitWebsiteForm(payload, input.data)
    return json(result, result.accepted ? 200 : 400)
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'invalidRequest' }, 400)
    if (error instanceof DocumentError) return json({ error: error.code }, error.status)
    // Do not expose/log visitor messages or internal provider errors.
    return json({ error: 'unavailable' }, 503)
  }
}
