import { createHash } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { DocumentError } from '@/lib/documents/config'
import { readWebsitePage } from '../read'
import type { WebsiteSection } from '../types'
import { validateAnswers, type WebsiteSubmissionInput } from './validation'

function hasForm(sections: WebsiteSection[] | null | undefined, formId: number) {
  return sections?.some((section) => {
    const columns = [
      section.column1,
      ...('column2' in section ? [section.column2] : []),
      ...('column3' in section ? [section.column3] : []),
    ]
    return columns.some((column) =>
      column?.content?.some(
        (item) =>
          item.type === 'form' &&
          (typeof item.form === 'object' ? item.form?.id : item.form) === formId,
      ),
    )
  })
}

export async function submitWebsiteForm(
  payload: Payload,
  input: WebsiteSubmissionInput,
  req?: Partial<PayloadRequest>,
) {
  const page = await readWebsitePage(payload, input.page, input.locale, false, undefined, req)
  if (page._status !== 'published' || !hasForm(page.sections, input.formId))
    throw new DocumentError('notFound', 404)
  const form = await payload.findByID({
    collection: 'website-forms',
    id: input.formId,
    locale: input.locale,
    fallbackLocale: 'de',
    depth: 0,
    overrideAccess: false,
    req,
  })
  if (!form.enabled || form._status !== 'published') throw new DocumentError('notFound', 404)
  const validated = validateAnswers(form, input.answers)
  if (validated.errors.length) return { accepted: false as const, fields: validated.errors }
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([input.formId, input.page, input.locale, validated.answers]))
    .digest('hex')
  // This is the only public write path. Direct REST/GraphQL creation is denied.
  // The server has already checked the published page, form and every field.
  const existing = await payload.find({
    collection: 'form-submissions',
    where: { reference: { equals: input.reference } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.docs[0]) {
    if (existing.docs[0].fingerprint !== fingerprint) throw new DocumentError('invalidRequest', 409)
    return { accepted: true as const }
  }
  await payload.create({
    collection: 'form-submissions',
    overrideAccess: true,
    req,
    data: {
      reference: input.reference,
      fingerprint,
      form: form.id,
      sourcePage: input.page,
      locale: input.locale,
      answers: form.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: validated.answers[field.key],
      })),
      status: 'new',
    },
  })
  return { accepted: true as const }
}
