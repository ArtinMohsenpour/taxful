import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('impressum', searchParams)
}

export default function ImpressumPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="impressum" {...props} />
}
