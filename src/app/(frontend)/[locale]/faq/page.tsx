import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('faq', searchParams)
}

export default function FAQPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="faq" {...props} />
}
