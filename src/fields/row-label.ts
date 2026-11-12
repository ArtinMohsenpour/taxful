// Array rows labelled by their first filled field (e.g. a button label) instead of "Item 01".
export const rowLabel = (fields: string[], fallback: string, options?: Record<string, string>) => ({
  path: '/components/admin/row-label',
  clientProps: { fields, fallback, options },
})
