import { z } from 'zod'
import { DocumentError } from './config'
import { sha256 } from './storage'
import { validateXRechnung } from './xrechnung'
import { zugferdIssues } from './validation-report'
import type { StructuredInvoice } from './structured-invoice'
export type InputValidation = {
  valid: boolean
  format: string
  profile: string
  validator: string
  issues: { code: string; message: string }[]
}
const resultSchema = z.object({
  valid: z.boolean(),
  pdfValid: z.boolean(),
  report: z.string().max(2_000_000),
  inputSha256: z.string(),
  xmlSha256: z.string(),
  validator: z.string().max(200),
})
export async function validateImportedInvoice(
  invoice: StructuredInvoice,
  original: Buffer,
  mime: string,
): Promise<InputValidation> {
  let valid: boolean,
    validator: string,
    issues: { code: string; message: string }[] = []
  if (mime === 'application/xml' && invoice.format.startsWith('xrechnung')) {
    const report = await validateXRechnung(invoice.xml)
    ;({ valid, validator, issues } = report)
  } else {
    const endpoint = process.env.ZUGFERD_SERVICE_URL || 'http://127.0.0.1:8087'
    let response: Response
    try {
      response = await fetch(endpoint.replace(/\/$/, '') + '/validate-import', {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: new Uint8Array(original),
        redirect: 'error',
        signal: AbortSignal.timeout(60000),
      })
    } catch {
      throw new DocumentError('validatorUnavailable', 503)
    }
    if (!response.ok || !response.body) throw new DocumentError('validatorUnavailable', 503)
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 3_000_000) {
        await reader.cancel()
        throw new DocumentError('validatorUnavailable', 503)
      }
      chunks.push(value)
    }
    let body: unknown
    try {
      body = JSON.parse(Buffer.concat(chunks).toString())
    } catch {
      throw new DocumentError('validatorUnavailable', 503)
    }
    const parsed = resultSchema.safeParse(body)
    if (
      !parsed.success ||
      parsed.data.inputSha256 !== sha256(original) ||
      parsed.data.xmlSha256 !== invoice.xmlSha256
    )
      throw new DocumentError('validatorUnavailable', 503)
    ;({ valid, validator } = parsed.data)
    issues = zugferdIssues(parsed.data.report)
    if (!parsed.data.pdfValid) issues.unshift({ code: 'pdfContainer', message: 'inputPdfInvalid' })
    if (!valid && !issues.length)
      issues.push({ code: 'validation', message: 'inputInvoiceInvalid' })
    if (invoice.format.startsWith('xrechnung')) {
      const xrechnung = await validateXRechnung(invoice.xml)
      valid = valid && xrechnung.valid
      issues.push(...xrechnung.issues)
      validator += ' + ' + xrechnung.validator
    }
  }
  return {
    valid,
    validator,
    issues: issues.slice(0, 40),
    format: invoice.format,
    profile: invoice.profile,
  }
}
