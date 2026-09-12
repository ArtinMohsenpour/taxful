'use client'

import { createAuthClient } from 'better-auth/react'
import { organizationClient, inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from './auth'

export const customerAuth = createAuthClient({
  basePath: '/api/customer-auth',
  plugins: [organizationClient(), inferAdditionalFields<typeof auth>()],
})
