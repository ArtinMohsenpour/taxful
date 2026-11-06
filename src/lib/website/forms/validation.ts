import { z } from 'zod'
import type { WebsiteForm } from '../types'
import { websitePages } from '../catalog'

export const submissionSchema = z
  .object({
    formId: z.number().int().positive(),
    reference: z.uuid(),
    page: z.enum(websitePages.map(({ slug }) => slug)),
    locale: z.enum(['de', 'en']),
    website: z.string().max(300).default(''),
    answers: z.record(z.string().max(50), z.union([z.string().max(5000), z.boolean()])),
  })
  .strict()
export type WebsiteSubmissionInput = z.infer<typeof submissionSchema>

export function validateAnswers(form: WebsiteForm, input: WebsiteSubmissionInput['answers']) {
  const answers: Record<string, string | boolean> = {}
  const errors: string[] = []
  const fields = form.fields || []
  if (Object.keys(input).some((key) => !fields.some((field) => field.key === key)))
    errors.push('_form')
  for (const field of fields) {
    const raw = input[field.key]
    if (field.type === 'checkbox') {
      if ((raw !== undefined && typeof raw !== 'boolean') || (field.required && raw !== true))
        errors.push(field.key)
      answers[field.key] = raw === true
      continue
    }
    if (raw !== undefined && typeof raw !== 'string') {
      errors.push(field.key)
      continue
    }
    const value = typeof raw === 'string' ? raw.trim() : ''
    const limit =
      field.type === 'textarea'
        ? 5000
        : field.type === 'email'
          ? 254
          : field.type === 'select'
            ? 80
            : 300
    if (
      (field.required && !value) ||
      value.length > limit ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    )
      errors.push(field.key)
    if (value && field.type === 'email' && !z.email().safeParse(value).success)
      errors.push(field.key)
    if (
      value &&
      field.type === 'select' &&
      !field.options?.some((option) => option.value === value)
    )
      errors.push(field.key)
    answers[field.key] = value
  }
  return { answers, errors: [...new Set(errors)] }
}
