import type { CollectionConfig } from 'payload'
import {
  isManager,
  isSuperAdmin,
  managerOnly,
  managerOrSelf,
  updateStaff,
  deleteStaff,
} from '../access/cms-users'
import { cmsEditor } from '../access/cms-editor'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'role', 'updatedAt'],
  },
  auth: true,
  access: {
    admin: cmsEditor,
    create: managerOnly,
    read: managerOrSelf,
    update: updateStaff,
    delete: deleteStaff,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
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
