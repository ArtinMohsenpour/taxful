import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { organization } from 'better-auth/plugins'
import { ownerAc, adminAc, memberAc } from 'better-auth/plugins/organization/access'
import { after } from 'next/server'
import { customerPool } from './database'
import { emailLocale, sendCustomerEmail } from './email'
import { customerReturnPath } from './navigation'
import { trackSessionActivity } from './session-activity'

const baseURL = process.env.BETTER_AUTH_URL
function customerName(input: object) {
  const user = input as { firstName?: unknown; lastName?: unknown }
  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : ''
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : ''
  if (!firstName || !lastName || firstName.length > 75 || lastName.length > 75)
    throw new APIError('BAD_REQUEST', {
      message: 'First and last name are required (up to 75 characters each).',
    })
  return { firstName, lastName, name: `${firstName} ${lastName}` }
}
if (!baseURL || !process.env.BETTER_AUTH_SECRET)
  throw new Error('Run pnpm customer:setup to configure customer authentication')

export const auth = betterAuth({
  appName: 'Taxful',
  baseURL,
  basePath: '/api/customer-auth',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [new URL(baseURL).origin],
  database: customerPool,
  user: {
    modelName: 'customer_users',
    additionalFields: {
      locale: { type: 'string', defaultValue: 'de', required: false },
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: true },
    },
  },
  databaseHooks: {
    user: {
      create: { before: async (user) => ({ data: { ...user, ...customerName(user) } }) },
      update: {
        before: async (user) => {
          if ('firstName' in user || 'lastName' in user)
            return { data: { ...user, ...customerName(user) } }
          if ('name' in user)
            throw new APIError('BAD_REQUEST', { message: 'Update first and last name together.' })
          return { data: user }
        },
      },
    },
  },
  account: { modelName: 'customer_accounts', accountLinking: { enabled: false } },
  verification: { modelName: 'customer_verifications' },
  session: {
    modelName: 'customer_sessions',
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 30,
    freshAge: 60 * 30,
    cookieCache: { enabled: false },
  },
  hooks: { before: trackSessionActivity },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 15,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    sendResetPassword: async ({ user, url }, request) => {
      await sendCustomerEmail(user.email, url, 'reset', emailLocale(request))
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }, request) => {
      // A confirmation page prevents mail scanners from consuming the link on GET.
      const original = new URL(url)
      const locale = emailLocale(request)
      const verificationPage = new URL(`/${locale}/verify-email`, baseURL)
      verificationPage.searchParams.set('token', original.searchParams.get('token') || '')
      const callback = new URL(
        original.searchParams.get('callbackURL') || `/${locale}/login`,
        baseURL,
      )
      verificationPage.searchParams.set(
        'next',
        customerReturnPath(callback.searchParams.get('next'), locale),
      )
      await sendCustomerEmail(user.email, verificationPage.href, 'verify', locale)
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'customer_rate_limits',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 3 },
      '/send-verification-email': { window: 60, max: 3 },
    },
  },
  advanced: {
    cookiePrefix: 'taxful-customer',
    useSecureCookies: new URL(baseURL).protocol === 'https:',
    defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
    backgroundTasks: {
      handler: (task) =>
        after(async () => {
          try {
            await task
          } catch {
            console.error('Customer email delivery failed; check SMTP configuration.')
          }
        }),
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: (user) => user.emailVerified,
      organizationLimit: 10,
      membershipLimit: 100,
      requireEmailVerificationOnInvitation: true,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      disableOrganizationDeletion: true,
      roles: { owner: ownerAc, admin: adminAc, member: memberAc, reviewer: memberAc },
      schema: {
        organization: { modelName: 'organizations' },
        member: { modelName: 'organization_memberships' },
        invitation: { modelName: 'organization_invitations' },
      },
      sendInvitationEmail: async ({ email, id }, request) => {
        const locale = emailLocale(request)
        const url = new URL(`/${locale}/accept-invitation`, baseURL)
        url.searchParams.set('id', id)
        await sendCustomerEmail(email, url.href, 'invite', locale)
      },
    }),
  ],
})
