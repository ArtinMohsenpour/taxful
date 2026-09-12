import { getLocale, getTranslations } from 'next-intl/server'
import { requireCustomer } from '@/lib/customer-auth/session'
import { ProfileForm } from '@/components/customer-auth/profile-form'

export default async function ProfilePage() {
  const session = await requireCustomer(await getLocale())
  const t = await getTranslations('Auth')
  return (
    <div>
      <h1 className="mb-3 text-3xl font-medium tracking-tight">{t('profile')}</h1>
      <p className="mb-8 text-muted-foreground">{t('profileIntro')}</p>
      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <ProfileForm
          firstName={session.user.firstName}
          lastName={session.user.lastName}
          email={session.user.email}
        />
      </section>
    </div>
  )
}
