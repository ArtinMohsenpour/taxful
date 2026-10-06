'use client'

import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { customerAuth } from '@/lib/customer-auth/client'

export function CustomerAccountLink({
  loginLabel,
  initialAuthenticated = false,
}: {
  loginLabel: string
  initialAuthenticated?: boolean
}) {
  const { data, isPending } = customerAuth.useSession()
  const locale = useLocale()
  const authenticated = !!data?.user || (isPending && initialAuthenticated)
  return (
    <Link
      href={authenticated ? '/portal' : '/login'}
      className="min-w-32 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
    >
      {authenticated ? (locale === 'de' ? 'Mein Konto' : 'My account') : loginLabel}
    </Link>
  )
}
