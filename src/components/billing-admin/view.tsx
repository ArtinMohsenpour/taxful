import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { notFound } from 'next/navigation'
import { isSuperAdmin } from '@/access/cms-users'
import { BillingAdminPanel } from './panel'
export default async function BillingAdminView(props: AdminViewServerProps) {
  const { req } = props.initPageResult
  if (!isSuperAdmin(req.user)) notFound()
  const current = await req.payload.findByID({
    collection: 'users',
    id: req.user!.id,
    user: req.user,
    overrideAccess: false,
    depth: 0,
    req,
  })
  if (current.role !== 'super-admin') notFound()
  return (
    <DefaultTemplate
      {...props}
      i18n={req.i18n}
      payload={req.payload}
      permissions={props.initPageResult.permissions}
      user={req.user!}
      visibleEntities={props.initPageResult.visibleEntities}
    >
      <BillingAdminPanel />
    </DefaultTemplate>
  )
}
