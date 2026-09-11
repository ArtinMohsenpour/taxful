import type { Access } from 'payload'

// Users is currently the CMS-only auth collection. Revisit when client auth is introduced.
export const cmsEditor: Access = ({ req }) => req.user?.collection === 'users'
