export function positiveEnv(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value < 1 || value > maximum)
    throw new Error('Invalid document configuration: ' + name)
  return value
}
export const documentLimits = () => ({
  maxFileBytes: positiveEnv('DOCUMENT_MAX_FILE_MB', 10, 15) * 1024 * 1024,
  maxRequestBytes: 20 * 1024 * 1024,
  maxPages: positiveEnv('DOCUMENT_MAX_PAGES', 30, 50),
  dailyLimit: positiveEnv('DOCUMENT_DAILY_LIMIT', 10, 10000),
  batchLimit: 1,
})
export function extractionReady() {
  return Boolean(process.env.GEMINI_API_KEY && process.env.DOCUMENT_AI_ENABLED === 'true')
}
export class DocumentError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code)
  }
}
