import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/navbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('title'), description: t('description') }
}

export default async function HomePage() {
  const t = await getTranslations('Home')

  return (
    <div className="flex min-h-dvh flex-col pt-4 sm:pt-6">
      <Navbar />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-8 py-24 sm:px-14"
      >
        <span aria-hidden="true" className="mb-8 h-1.5 w-12 rounded-full bg-primary" />
        <h1 className="max-w-3xl text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {t('description')}
        </p>
      </main>
    </div>
  )
}
