import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Preferences } from '@/components/preferences'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('title'), description: t('description') }
}

export default async function HomePage() {
  const t = await getTranslations('Home')

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-border pb-6">
        <span className="text-2xl font-semibold tracking-tight text-primary">Taxful</span>
        <Preferences />
      </header>
      <main className="flex flex-1 flex-col justify-center py-20">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {t('description')}
        </p>
      </main>
    </div>
  )
}
