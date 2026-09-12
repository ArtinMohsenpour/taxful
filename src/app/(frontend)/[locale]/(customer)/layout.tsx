import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages()
  return (
    <NextIntlClientProvider messages={{ Auth: messages.Auth, Preferences: messages.Preferences }}>
      <div className="min-h-dvh pt-3 sm:pt-6">
        <Navbar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-10 sm:py-16"
        >
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  )
}
