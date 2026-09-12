'use client'

import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { customerAuth } from '@/lib/customer-auth/client'

export function CustomerAccountLink({ loginLabel }: { loginLabel: string }) {
  const { data } = customerAuth.useSession()
  const locale = useLocale()
  return (
    <Link
      href={data?.user ? '/portal' : '/login'}
      className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
    >
      {data?.user ? (locale === 'de' ? 'Mein Konto' : 'My account') : loginLabel}
    </Link>
  )
}
