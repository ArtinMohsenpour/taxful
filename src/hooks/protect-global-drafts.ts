import { Forbidden, type GlobalBeforeOperationHook } from 'payload'
import { cmsEditor } from '@/access/cms-editor'

export const protectGlobalDrafts: GlobalBeforeOperationHook = ({
  args,
  operation,
  overrideAccess,
  req,
}) => {
  const read = args as { draft?: boolean; data?: unknown } | undefined
  if (
    operation === 'read' &&
    !overrideAccess &&
    !cmsEditor({ req }) &&
    (read?.draft || read?.data)
  ) {
    throw new Forbidden(req.t)
  }
  return args
}
