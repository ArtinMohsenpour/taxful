import type { ReactNode, SVGProps } from 'react'
import type { SocialPlatform } from '@/lib/footer/social'

// Simplified outline glyphs drawn for Taxful: one stroke style, inheriting currentColor.
const socialPaths: Record<SocialPlatform, ReactNode> = {
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <path d="M8 10.75V16.5M8 7.6v.01M12 16.5v-5.75M12 13.25a2.5 2.5 0 0 1 5 0v3.25" />
    </>
  ),
  xing: <path d="M6.25 7.25 8.5 11l-3 4.75M17.75 3l-6.25 10.75 4.25 7.25" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.25 6.75v.01" />
    </>
  ),
  facebook: (
    <path d="M16.5 3H14a4.5 4.5 0 0 0-4.5 4.5V10H7v3.5h2.5V21H13v-7.5h2.75l.75-3.5H13V7.5a1 1 0 0 1 1-1h2.5Z" />
  ),
  x: <path d="M4 4h4.5L20 20h-4.5ZM4 20l6.75-6.75M13.25 10.75 20 4" />,
  youtube: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4.5" />
      <path d="M10.25 9.25v5.5L15 12Z" />
    </>
  ),
  tiktok: <path d="M9 11.5a4.25 4.25 0 1 0 4.25 4.25V3.5A4.75 4.75 0 0 0 18 8.25" />,
  mastodon: (
    <>
      <path d="M20 12.5v-3C20 5.6 17.5 4 12 4S4 5.6 4 9.5v3c0 4.6 2.4 6 5.8 6.4 1.9.2 3.7 0 5.2-.4v-2c-1.5.4-3.3.6-5 .4" />
      <path d="M8.5 13.5v-3a1.75 1.75 0 0 1 3.5 0v1.75m0-1.75a1.75 1.75 0 0 1 3.5 0v3" />
    </>
  ),
  github: (
    <>
      <path d="M14.5 21v-3.25a3.75 3.75 0 0 0-.9-2.75c2.9-.3 5.65-1.45 5.65-6.1 0-1.2-.4-2.3-1.15-3.2.25-1 .2-2.05-.15-3 0 0-1-.3-3.15 1.15a10.8 10.8 0 0 0-5.6 0C7.05 2.4 6.05 2.7 6.05 2.7c-.35.95-.4 2-.15 3A4.9 4.9 0 0 0 4.75 8.9c0 4.65 2.75 5.8 5.65 6.1a3.75 3.75 0 0 0-.9 2.75V21" />
      <path d="M9.5 18.25c-3.25 1-3.75-1.5-5.25-1.75" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18" />
    </>
  ),
}

const iconProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export function SocialIcon({ platform, ...props }: { platform: string } & SVGProps<SVGSVGElement>) {
  const paths = socialPaths[platform as SocialPlatform] ?? socialPaths.website
  return (
    <svg {...iconProps} {...props}>
      {paths}
    </svg>
  )
}

const uiPaths = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7.5 8 5.5 8-5.5" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h2.25l1.5 4-2 1.5a11 11 0 0 0 6.75 6.75l1.5-2 4 1.5v2.25a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />
  ),
  location: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-11a6.5 6.5 0 0 1 13 0c0 5.6-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </>
  ),
  external: <path d="M8 16 16 8M9.5 8H16v6.5" />,
}

export function UiIcon({
  name,
  ...props
}: { name: keyof typeof uiPaths } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      {uiPaths[name]}
    </svg>
  )
}
