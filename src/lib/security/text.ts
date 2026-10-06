// XML 1.0 characters, plus controls that can hide/reorder invoice identifiers.
// Reject rather than silently rewriting source or approved financial data.
const unsafeCharacters =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF\uFFFE\uFFFF]|\p{Cs}/u

export function safeDocumentText(value: string) {
  return !unsafeCharacters.test(value)
}

export function unsafeTextFields(value: unknown, path = ''): string[] {
  if (typeof value === 'string') return safeDocumentText(value) ? [] : [path]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    unsafeTextFields(child, path ? `${path}.${key}` : key),
  )
}

export function safeFilename(value: string) {
  return (
    Array.from(value.normalize('NFC'))
      .map((character) =>
        !safeDocumentText(character) || /[\t\r\n/\\]/.test(character) ? '_' : character,
      )
      .slice(0, 180)
      .join('') || 'document'
  )
}
