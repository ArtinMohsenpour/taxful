import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/navbar'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('title'), description: t('description') }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const preview = (await searchParams).preview === 'true'
  const t = await getTranslations('Home')

  return (
    <div className="relative isolate flex min-h-dvh flex-col pt-3 sm:pt-6">
      <Navbar preview={preview} />
      <main
        id="main"
        tabIndex={-1}
        className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-3 pt-20 pb-24 sm:px-6 sm:py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute top-16 -right-20 size-72 rounded-full bg-primary/10 blur-3xl sm:right-0 sm:size-96" />
          <div className="absolute right-8 bottom-12 size-40 rounded-full border border-primary/10 sm:size-60" />
          <div className="absolute right-14 bottom-18 size-28 rounded-full border border-primary/10 sm:size-48" />
        </div>
        <p className="mb-7 flex items-center gap-2.5 text-xs font-medium tracking-wide text-brand-ink sm:text-sm">
          <span aria-hidden="true" className="h-px w-6 bg-primary" />
          {t('eyebrow')}
        </p>
        <h1 className="max-w-3xl text-[clamp(2.75rem,12vw,4rem)] leading-[1.08] font-medium tracking-[-0.055em] text-balance sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-relaxed">
          {t('description')}
        </p>
      </main>
    </div>
  )
}
