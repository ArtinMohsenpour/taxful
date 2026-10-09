import { APIError, type CollectionConfig } from 'payload'
import { enforceSecurityRate } from '../lib/security/rate-limit'
import { DocumentError } from '../lib/documents/config'
import { requireSafePassword } from '../lib/security/password-screening'
import {
  isManager,
  isSuperAdmin,
  managerOnly,
  managerOrSelf,
  updateStaff,
  deleteStaff,
} from '../access/cms-users'
import { cmsEditor } from '../access/cms-editor'

async function checkStaffPassword(password: unknown) {
  if (typeof password === 'string') {
    if (password.length < 15 || password.length > 128)
      throw new APIError(
        'Use a password between 15 and 128 characters. / Verwenden Sie 15 bis 128 Zeichen.',
        400,
      )
    try {
      await requireSafePassword(password)
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'body' in error
          ? (error.body as { code?: string })?.code
          : ''
      throw new APIError(
        code === 'PASSWORD_BREACHED'
          ? 'This password appeared in a breach. Choose another. / Dieses Passwort ist aus einem Datenleck bekannt. Wählen Sie ein anderes.'
          : 'Password safety checking is unavailable. Try again later. / Die Passwortprüfung ist nicht verfügbar. Versuchen Sie es später erneut.',
        code === 'PASSWORD_BREACHED' ? 400 : 503,
      )
    }
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'role', 'updatedAt'],
  },
  auth: { useSessions: true, maxLoginAttempts: 5, lockTime: 15 * 60 * 1000 },
  access: {
    admin: cmsEditor,
    create: managerOnly,
    read: managerOrSelf,
    update: updateStaff,
    delete: deleteStaff,
  },
  hooks: {
    afterOperation: [
      ({ operation, result, req }) => {
        if (
          (operation === 'login' || operation === 'resetPassword') &&
          req.payloadAPI !== 'local'
        ) {
          // GraphQL shares req across serial mutations. Password verification must
          // not authorize a later mutation in the same request before MFA.
          req.user = null
          if (result.user) {
            const { id, email } = result.user
            result.user = { id, email, collection: 'users' } as typeof result.user
          }
        }
        return result
      },
    ],
    beforeOperation: [
      async ({ operation, args, req }) => {
        // Per-operation accounting also covers multiple GraphQL mutations in one request.
        if (
          req.payloadAPI !== 'local' &&
          ['login', 'forgotPassword', 'resetPassword'].includes(operation)
        ) {
          try {
            await enforceSecurityRate(
              new Request('http://internal.invalid', { headers: req.headers }),
              'staff-auth-operation',
              10,
              60,
            )
          } catch (error) {
            throw new APIError(
              'Please try again later. / Bitte versuchen Sie es später erneut.',
              error instanceof DocumentError ? error.status : 503,
            )
          }
        }
        if (operation === 'resetPassword') await checkStaffPassword(args.data.password)
        return args
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        await checkStaffPassword(data.password)
        // Payload's first-user setup bypasses collection access on a fresh installation.
        if (operation === 'create' && !req.user) {
          const { totalDocs } = await req.payload.count({
            collection: 'users',
            req,
            overrideAccess: true,
          })
          if (totalDocs === 0) data.role = 'super-admin'
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          label: 'First name',
          type: 'text',
          maxLength: 100,
          admin: { width: '50%' },
        },
        {
          name: 'lastName',
          label: 'Last name',
          type: 'text',
          maxLength: 100,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'content-editor',
      access: {
        update: ({ req, id, data }) =>
          isManager(req.user) &&
          String(id) !== String(req.user?.id) &&
          (data?.role !== 'super-admin' || isSuperAdmin(req.user)),
      },
      admin: {
        description:
          'Super admins own the system and control owner access. Managers manage staff and content. Editors manage content and their own profile. You cannot change your own role.',
      },
      options: [
        { label: 'Super admin (Owner)', value: 'super-admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'Content editor', value: 'content-editor' },
      ],
    },
    {
      name: 'image',
      label: 'Profile image',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { contains: 'image/' } },
      admin: { description: 'Optional profile photo. Images in Media are public website assets.' },
    },
    {
      name: 'phoneNumber',
      type: 'text',
      maxLength: 40,
      admin: { description: 'Optional. Include the country code, e.g. +49.' },
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text' },
        { name: 'addressLine2', label: 'Address line 2', type: 'text' },
        { name: 'postalCode', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text' },
      ],
    },
  ],
}
