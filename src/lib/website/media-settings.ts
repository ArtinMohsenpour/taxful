export const PUBLIC_MEDIA_MAX_BYTES = 50 * 1024 * 1024
// Leave room for multipart boundaries and editorial metadata above the file cap.
export const PUBLIC_MEDIA_REQUEST_MAX_BYTES = PUBLIC_MEDIA_MAX_BYTES + 1024 * 1024

// Payload computes upload URLs from filename in its afterRead hook. Selecting
// url without filename returns null, even when the file exists on disk.
export const publicMediaSelection = {
  alt: true,
  filename: true,
  url: true,
  width: true,
  height: true,
  mimeType: true,
} as const
