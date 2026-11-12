import { readFile } from 'node:fs/promises'
import { fileTypeFromBuffer } from 'file-type'

// Media files are public and served from this origin, so only inert website asset
// types are accepted. Payload's own restriction list checks names, not contents,
// and lets XML and similar documents through (see docs/website-builder.md).

export type UploadedFile = {
  name?: string
  mimetype?: string
  data?: Buffer
  tempFilePath?: string
}

// Extension -> file-type results the content must match. SVG and WebVTT are text and
// are checked separately.
const binaryTypes: Record<string, readonly string[]> = {
  jpg: ['jpg'],
  jpeg: ['jpg'],
  png: ['png'],
  webp: ['webp'],
  avif: ['avif'],
  gif: ['gif'],
  mp4: ['mp4', 'm4v'],
  webm: ['webm'],
}
const textTypes = new Set(['svg', 'vtt'])

// A plain file name: no path, query or fragment characters, ending in an allowed type.
const fileName = /^[^\\/?#%\u0000-\u001f]+\.([a-z\d]+)$/i

export const MEDIA_TYPE_MESSAGE =
  'Upload a JPEG, PNG, WebP, AVIF or GIF image, an SVG logo, an MP4 or WebM video, or a WebVTT caption file.'

// SVG is a document format. Uploads are checked here; responses are additionally
// sandboxed (mediaResponseHeaders) and the website renders SVG only through <img>.
// Element names may carry a namespace prefix, e.g. <x:script>.
const element = (names: string) => new RegExp(`<(?:[\\w.-]+:)?(?:${names})[\\s>/]`, 'i')
const dangerousSvgPatterns = [
  element('script|foreignObject|iframe|object|embed|handler'),
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
  /@import/i,
  /<!ENTITY/i,
  /<!DOCTYPE[^>]*\[/i,
  /<\?xml-stylesheet/i,
]

export function isSvgDocument(content: string) {
  return /^﻿?\s*(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>[]*>\s*)?<(?:[\w.-]+:)?svg[\s>]/i.test(
    content,
  )
}

export function isSafeSvg(content: string) {
  return !dangerousSvgPatterns.some((pattern) => pattern.test(content))
}

async function fileBytes(file: UploadedFile) {
  if (file.data?.length) return file.data
  return file.tempFilePath ? readFile(file.tempFilePath) : Buffer.alloc(0)
}

function svgError(data: Buffer): string | null {
  // UTF-16 or NUL bytes would hide markup from the UTF-8 pattern check.
  if (data[0] === 0xff || data[0] === 0xfe || data.includes(0))
    return 'SVG files must be UTF-8 encoded.'
  const content = data.toString('utf8')
  if (!isSvgDocument(content)) return 'This file is not an SVG image.'
  return isSafeSvg(content)
    ? null
    : 'This SVG contains scripts or embedded content. Export a plain SVG and upload it again.'
}

// Returns an editor-facing error, or null when the upload is an allowed asset.
export async function mediaUploadError(file: UploadedFile): Promise<string | null> {
  const extension = file.name?.match(fileName)?.[1]?.toLowerCase()
  if (!extension || !(extension in binaryTypes || textTypes.has(extension)))
    return MEDIA_TYPE_MESSAGE
  const data = await fileBytes(file)
  if (extension === 'svg') return svgError(data)
  if (extension === 'vtt')
    return /^﻿?WEBVTT(?:[ \t\r\n]|$)/.test(data.subarray(0, 64).toString('utf8'))
      ? null
      : 'Caption files must be WebVTT and start with “WEBVTT”.'
  const detected = await fileTypeFromBuffer(data)
  return detected && binaryTypes[extension].includes(detected.ext)
    ? null
    : `The file content does not match its .${extension} extension.`
}

// Shown in place; anything else (for example files stored before this policy) downloads.
const inlineTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
])

// Every file response is sandboxed: even if an active file were stored, opening it
// cannot run script with this origin's cookies. Images and video still embed normally.
export function mediaResponseHeaders({ headers }: { headers: Headers }) {
  headers.set(
    'Content-Security-Policy',
    "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'",
  )
  headers.set('X-Content-Type-Options', 'nosniff')
  const type = headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() ?? ''
  if (!inlineTypes.has(type)) headers.set('Content-Disposition', 'attachment')
  return headers
}
