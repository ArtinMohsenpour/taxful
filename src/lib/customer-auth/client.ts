'use client'

import { createAuthClient } from 'better-auth/react'
import {
  organizationClient,
  inferAdditionalFields,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'
import type { auth } from './auth'

export const customerAuth = createAuthClient({
  basePath: '/api/customer-auth',
  plugins: [
    organizationClient(),
    inferAdditionalFields<typeof auth>(),
    twoFactorClient(),
    passkeyClient(),
  ],
})
