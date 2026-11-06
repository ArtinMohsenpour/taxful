import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('privacy', searchParams)
}

export default function PrivacyPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="privacy" {...props} />
}
