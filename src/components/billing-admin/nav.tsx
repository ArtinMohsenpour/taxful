import type { ServerProps } from 'payload'
import { isSuperAdmin } from '@/access/cms-users'
import Link from 'next/link'
export default function BillingAdminNav({ user }: ServerProps) {
  if (!isSuperAdmin(user || null)) return null
  return (
    <div style={{ padding: '16px 0' }}>
      <Link href="/admin/billing">Customers & billing</Link>
    </div>
  )
}
