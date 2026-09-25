export const teamRoles = ['owner', 'admin', 'reviewer', 'member'] as const
export type TeamRole = (typeof teamRoles)[number]
export const permissions = {
  files: teamRoles,
  drafts: teamRoles,
  approve: ['owner', 'admin', 'reviewer'],
  directory: ['owner', 'admin'],
  settings: ['owner', 'admin'],
  team: ['owner', 'admin'],
  billing: ['owner'],
  audit: ['owner', 'admin'],
} as const
export type Permission = keyof typeof permissions
export function hasPermission(role: string, permission: Permission) {
  return (permissions[permission] as readonly string[]).includes(role)
}
export function canManageTeamRole(actor: string, target: string) {
  return (
    (teamRoles as readonly string[]).includes(target) &&
    target !== 'owner' &&
    (actor === 'owner' || (actor === 'admin' && ['member', 'reviewer'].includes(target)))
  )
}
