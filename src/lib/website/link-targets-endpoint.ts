import type { Endpoint } from 'payload'
import { cmsEditor } from '../../access/cms-editor'
import { listLinkTargets } from './link-targets'

// GET /api/link-targets?locale=de — page choices for the CMS link picker.
// Lists draft titles too, so only CMS editors may call it.
export const linkTargetsEndpoint: Endpoint = {
  path: '/link-targets',
  method: 'get',
  handler: async (req) => {
    const headers = { 'Cache-Control': 'private, no-store' }
    if (!cmsEditor({ req })) return Response.json({ error: 'forbidden' }, { status: 403, headers })
    const locale = req.searchParams.get('locale') === 'en' ? 'en' : 'de'
    return Response.json(
      { groups: await listLinkTargets(req.payload, { locale, req }) },
      { headers },
    )
  },
}
