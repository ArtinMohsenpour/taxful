// Stored values are stable identifiers; names are brand names and stay untranslated.
export const socialPlatforms = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'xing', label: 'XING' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'mastodon', label: 'Mastodon' },
  { value: 'github', label: 'GitHub' },
  { value: 'website', label: 'Website' },
] as const

export type SocialPlatform = (typeof socialPlatforms)[number]['value']

export function socialPlatformName(value: string | null | undefined) {
  return socialPlatforms.find((platform) => platform.value === value)?.label ?? 'Website'
}
