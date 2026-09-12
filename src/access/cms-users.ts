import type { Access, PayloadRequest, Where } from 'payload'

export const isSuperAdmin = (user: PayloadRequest['user']) =>
  user?.collection === 'users' && user.role === 'super-admin'

export const isManager = (user: PayloadRequest['user']) =>
  user?.collection === 'users' && (user.role === 'manager' || user.role === 'super-admin')

export const managerOnly: Access = ({ req, data }) =>
  isManager(req.user) && (data?.role !== 'super-admin' || isSuperAdmin(req.user))

export const updateStaff: Access = ({ req }): boolean | Where => {
  if (isSuperAdmin(req.user)) return true
  if (isManager(req.user)) return { role: { not_equals: 'super-admin' } }
  if (req.user?.collection !== 'users') return false
  return { id: { equals: req.user.id } }
}

export const deleteStaff: Access = ({ req }): boolean | Where => {
  if (!isManager(req.user)) return false
  const conditions: Where[] = [{ id: { not_equals: req.user!.id } }]
  if (!isSuperAdmin(req.user)) conditions.push({ role: { not_equals: 'super-admin' } })
  return { and: conditions }
}

export const managerOrSelf: Access = ({ req }) => {
  if (isManager(req.user)) return true
  if (req.user?.collection !== 'users') return false
  return { id: { equals: req.user.id } }
}
