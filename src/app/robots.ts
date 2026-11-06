import type { MetadataRoute } from 'next'
import { websiteOrigin } from '@/lib/website/metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/*/portal',
        '/*/login',
        '/*/signup',
        '/*/reset-password',
        '/*/forgot-password',
        '/*/verify-email',
        '/*/accept-invitation',
        '/*?preview=',
      ],
    },
    sitemap: `${websiteOrigin()}/sitemap.xml`,
  }
}
