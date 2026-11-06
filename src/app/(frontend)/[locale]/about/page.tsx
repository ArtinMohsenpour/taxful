import {
  PublicWebsitePage,
  websitePageMetadata,
  type PublicWebsitePageProps,
} from '@/components/website/public-page'

export function generateMetadata({ searchParams }: PublicWebsitePageProps) {
  return websitePageMetadata('about', searchParams)
}

export default function AboutPage(props: PublicWebsitePageProps) {
  return <PublicWebsitePage slug="about" {...props} />
}
