import { documentContext, checkOrigin } from '@/lib/documents/access'
import {
  getCompanyProfile,
  saveCompanyProfile,
  canManageCompany,
} from '@/lib/documents/company-profile'
import { boundedBody, json, failure } from '@/lib/documents/http'
import { DocumentError } from '@/lib/documents/config'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const context = await documentContext(request.headers)
    return json({
      organizationId: context.organizationId,
      profile: await getCompanyProfile(context),
      canEdit: canManageCompany(context.role),
    })
  } catch (error) {
    return failure(error)
  }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request)
    const context = await documentContext(request.headers)
    const input = JSON.parse((await boundedBody(request, 10000)).toString())
    if (input.organizationId !== context.organizationId) throw new DocumentError('conflict', 409)
    return json(await saveCompanyProfile(context, { data: input.data, revision: input.revision }))
  } catch (error) {
    return failure(error)
  }
}
