import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('how-it-works', searchParams)
}

export default function HowItWorksPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="how-it-works" {...props} />
}
