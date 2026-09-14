import { z } from 'zod'
import type { DocumentRecord } from './schema'

const text = z.string().trim().max(300)
export const companyProfileSchema = z
  .object({
    companyName: text.min(1),
    address: text,
    postalCode: z.string().trim().max(30),
    city: text,
    country: z
      .string()
      .trim()
      .regex(/^$|^[A-Z]{2}$/),
    vatId: z
      .string()
      .trim()
      .regex(/^$|^[A-Z]{2}[A-Z0-9]{2,14}$/),
    taxNumber: text,
    name: text,
    email: z.union([z.literal(''), z.email().max(300)]),
    phone: text,
  })
  .strict()
export type CompanyInvoiceProfile = z.infer<typeof companyProfileSchema>
export const blankCompanyProfile: CompanyInvoiceProfile = {
  companyName: '',
  address: '',
  postalCode: '',
  city: '',
  country: 'DE',
  vatId: '',
  taxNumber: '',
  name: '',
  email: '',
  phone: '',
}
export function matchingCompanySide(
  data: DocumentRecord,
  profile: CompanyInvoiceProfile,
): 'issuer' | 'recipient' | null {
  const normalize = (value: string) => value.replace(/\s/g, '').toUpperCase()
  const matches = (['issuer', 'recipient'] as const).filter(
    (side) =>
      !(
        profile.vatId &&
        data[side].vatId &&
        normalize(profile.vatId) !== normalize(data[side].vatId)
      ) &&
      ((profile.vatId && normalize(profile.vatId) === normalize(data[side].vatId)) ||
        (side === 'issuer' &&
          profile.taxNumber &&
          normalize(profile.taxNumber) === normalize(data.issuer.taxNumber))),
  )
  return matches.length === 1 ? matches[0] : null
}
export function fillCompanyDetails(
  data: DocumentRecord,
  profile: CompanyInvoiceProfile,
  side: 'issuer' | 'recipient',
) {
  const party = { ...data[side] },
    filled: string[] = []
  for (const key of Object.keys(profile) as (keyof CompanyInvoiceProfile)[]) {
    // A buyer's domestic tax number/contact phone is not used by these exports.
    if (side === 'recipient' && ['taxNumber', 'name', 'phone'].includes(key)) continue
    if (!party[key].trim() && profile[key]) {
      party[key] = profile[key]
      filled.push(side + '.' + key)
    }
  }
  return { data: { ...data, [side]: party }, filled }
}
