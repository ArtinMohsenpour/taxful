import type { PayloadRequest } from 'payload'

// Users is currently the CMS-only auth collection. Revisit when client auth is introduced.
export const cmsEditor = ({ req }: { req: PayloadRequest }) =>
  req.user?.collection === 'users' &&
  ['super-admin', 'manager', 'content-editor'].includes(req.user.role)
