import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('terms', searchParams)
}

export default function TermsPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="terms" {...props} />
}
