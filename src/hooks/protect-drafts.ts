import {
  Forbidden,
  type CollectionBeforeOperationHook,
  type GlobalBeforeOperationHook,
  type PayloadRequest,
} from 'payload'
import { cmsEditor } from '@/access/cms-editor'

// Draft content (and Live Preview data) is editorial work in progress; only
// CMS editors may request it. Shared by globals and collections.
export function rejectPublicDraftRead({
  args,
  operation,
  overrideAccess,
  req,
}: {
  args?: unknown
  operation: string
  overrideAccess?: boolean
  req: PayloadRequest
}) {
  const read = args as { draft?: boolean; data?: unknown } | undefined
  if (
    operation === 'read' &&
    !overrideAccess &&
    !cmsEditor({ req }) &&
    (read?.draft || read?.data)
  ) {
    throw new Forbidden(req.t)
  }
}

export const protectGlobalDrafts: GlobalBeforeOperationHook = (hookArgs) => {
  rejectPublicDraftRead(hookArgs)
  return hookArgs.args
}

export const protectCollectionDrafts: CollectionBeforeOperationHook = (hookArgs) => {
  rejectPublicDraftRead(hookArgs)
  return hookArgs.args
}
