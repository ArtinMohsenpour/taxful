import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('services', searchParams)
}

export default function ServicesPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="services" {...props} />
}
