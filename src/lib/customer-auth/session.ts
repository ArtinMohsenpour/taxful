import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

export const getCustomerSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
)

export async function requireCustomer(locale: string) {
  const session = await getCustomerSession()
  if (!session) redirect(`/${locale}/login`)
  if (!session.user.emailVerified) redirect(`/${locale}/verify-email`)
  return session
}

// Membership is checked against the database on each request; never trust an org ID from a browser.
export async function getCustomerWorkspace(locale: string) {
  const session = await requireCustomer(locale)
  const requestHeaders = await headers()
  const organizations = await auth.api.listOrganizations({ headers: requestHeaders })
  const selected =
    organizations.find((org) => org.id === session.session.activeOrganizationId) ?? organizations[0]
  const organization = selected
    ? await auth.api.getFullOrganization({
        headers: requestHeaders,
        query: { organizationId: selected.id },
      })
    : null
  return { session, organizations, organization }
}
