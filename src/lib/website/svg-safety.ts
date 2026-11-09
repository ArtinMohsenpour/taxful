import { readFile } from 'node:fs/promises'

// Media declares no mimeTypes, so Payload's built-in SVG scan never runs. Public SVGs
// render through <img> (no scripts) and Payload serves them with script-src 'none';
// this upload check additionally rejects active or embedded content.
const dangerousPatterns = [
  /<script[\s>/]/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /<foreignObject[\s>/]/i,
  /<(iframe|object|embed|handler)[\s>/]/i,
  /@import/i,
  /<!ENTITY/i,
  /<!DOCTYPE[^>]*\[/i,
  /<\?xml-stylesheet/i,
]

export type UploadedFile = {
  name?: string
  mimetype?: string
  data?: Buffer
  tempFilePath?: string
}

export function looksLikeSvg(file: UploadedFile, content?: string) {
  if (file.mimetype === 'image/svg+xml' || /\.svgz?$/i.test(file.name ?? '')) return true
  return Boolean(
    content && /^\s*(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(content),
  )
}

export function isSafeSvg(content: string) {
  return !dangerousPatterns.some((pattern) => pattern.test(content))
}

async function fileContent(file: UploadedFile) {
  if (file.data?.length) return file.data.toString('utf8')
  return file.tempFilePath ? (await readFile(file.tempFilePath)).toString('utf8') : ''
}

// Returns an editor-facing error, or null when the upload is not an unsafe SVG.
export async function svgUploadError(file: UploadedFile): Promise<string | null> {
  const head = file.data?.subarray(0, 512).toString('utf8')
  if (!looksLikeSvg(file, head)) return null
  if (/\.svgz$/i.test(file.name ?? '')) return 'Compressed SVG (.svgz) files are not supported.'
  return isSafeSvg(await fileContent(file))
    ? null
    : 'This SVG contains scripts or embedded content. Export a plain SVG and upload it again.'
}
