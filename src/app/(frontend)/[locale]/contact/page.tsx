import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('contact', searchParams)
}

export default function ContactPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="contact" {...props} />
}
