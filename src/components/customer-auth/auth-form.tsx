'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { customerAuth } from '@/lib/customer-auth/client'
import { customerReturnPath } from '@/lib/customer-auth/navigation'

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset' | 'verify'
export const inputClass =
  'w-full rounded-2xl border border-border bg-background/60 px-4 py-3.5 text-base text-foreground outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/15'
export const buttonClass =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/85 disabled:cursor-wait disabled:opacity-60'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const router = useRouter()
  const query = useSearchParams()
  const token = query.get('token') || ''
  const next = customerReturnPath(query.get('next'), locale)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verificationFailed, setVerificationFailed] = useState(false)
  const options = { headers: { 'x-taxful-locale': locale } }

  function report(code?: string, status?: number) {
    setError(
      status === 429
        ? t('rateLimited')
        : code === 'EMAIL_NOT_VERIFIED'
          ? t('unverified')
          : mode === 'login'
            ? t('invalidCredentials')
            : mode === 'reset'
              ? t('invalidReset')
              : mode === 'verify'
                ? t('invalidVerify')
                : t('genericError'),
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setSuccess('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    if ((mode === 'signup' || mode === 'reset') && password !== data.get('confirmPassword')) {
      setError(t('passwordMismatch'))
      setPending(false)
      return
    }
    try {
      if (mode === 'login') {
        const result = await customerAuth.signIn.email(
          { email, password, rememberMe: data.get('remember') === 'on' },
          options,
        )
        if (result.error) report(result.error.code, result.error.status)
        else {
          router.replace(next)
          router.refresh()
        }
      } else if (mode === 'signup') {
        const result = await customerAuth.signUp.email(
          {
            name: String(data.get('name')).trim(),
            email,
            password,
            locale,
            callbackURL: `/${locale}/login?next=${encodeURIComponent(next)}`,
          },
          options,
        )
        if (result.error) report(result.error.code, result.error.status)
        else if (result.data.token) {
          router.replace(next)
          router.refresh()
        } else router.push(`/${locale}/verify-email?next=${encodeURIComponent(next)}`)
      } else if (mode === 'forgot') {
        const result = await customerAuth.requestPasswordReset(
          { email, redirectTo: `/${locale}/reset-password` },
          options,
        )
        if (result.error) report(result.error.code, result.error.status)
        else setSuccess(t('resetSent'))
      } else if (mode === 'reset') {
        const result = await customerAuth.resetPassword({ token, newPassword: password }, options)
        if (result.error) report(result.error.code, result.error.status)
        else {
          setSuccess(t('resetDone'))
          window.history.replaceState(null, '', `/${locale}/reset-password`)
        }
      } else if (token && !verificationFailed) {
        const result = await customerAuth.verifyEmail({ query: { token }, fetchOptions: options })
        if (result.error) {
          report(result.error.code, result.error.status)
          setVerificationFailed(true)
        } else {
          setSuccess(t('verifyDone'))
          window.history.replaceState(null, '', `/${locale}/verify-email`)
        }
      } else {
        const result = await customerAuth.sendVerificationEmail(
          { email, callbackURL: `/${locale}/login?next=${encodeURIComponent(next)}` },
          options,
        )
        if (result.error) report(result.error.code, result.error.status)
        else setSuccess(t('resendDone'))
      }
    } catch {
      setError(t('genericError'))
    } finally {
      setPending(false)
    }
  }

  const title = {
    login: 'loginTitle',
    signup: 'signupTitle',
    forgot: 'forgotTitle',
    reset: 'resetTitle',
    verify: 'verifyTitle',
  } as const
  const intro = {
    login: 'loginIntro',
    signup: 'signupIntro',
    forgot: 'forgotIntro',
    reset: 'resetIntro',
    verify: token ? 'verifyReady' : 'verifyIntro',
  } as const
  const action = {
    login: 'login',
    signup: 'signup',
    forgot: 'sendReset',
    reset: 'resetAction',
    verify: token && !verificationFailed ? 'verifyAction' : 'resend',
  } as const
  const done = success === t('resetDone') || success === t('verifyDone')
  const badReset = mode === 'reset' && (!token || query.has('error')) && !done
  const emailField =
    ['login', 'signup', 'forgot'].includes(mode) ||
    (mode === 'verify' && (!token || verificationFailed))
  const passwordField = ['login', 'signup', 'reset'].includes(mode)
  const nextQuery = `?next=${encodeURIComponent(next)}`

  return (
    <section className="mx-auto max-w-md">
      <div className="relative justify-center text-center">
        <h1 className="text-4xl leading-tight font-medium tracking-[-0.045em] sm:text-5xl">
          {t(title[mode])}
        </h1>
        <p className="mt-2.5 leading-relaxed text-muted-foreground">{t(intro[mode])}</p>
      </div>
      <div className="mt-8 rounded-[1.75rem] border border-border bg-surface p-6 shadow-nav sm:p-8">
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-error/25 bg-error/5 p-3 text-sm text-error"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="mb-5 rounded-xl bg-primary/10 p-3 text-sm leading-relaxed text-brand-ink"
          >
            {success}
          </p>
        )}
        {badReset && (
          <p role="alert" className="text-sm text-error">
            {t('invalidReset')}
          </p>
        )}
        {!done && !badReset && (
          <form onSubmit={submit} className="space-y-5">
            {mode === 'signup' && (
              <label className="block space-y-2 text-sm font-medium">
                {t('name')}
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={150}
                  className={inputClass}
                />
              </label>
            )}
            {emailField && (
              <label className="block space-y-2 text-sm font-medium">
                {t('email')}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className={inputClass}
                />
              </label>
            )}
            {passwordField && (
              <div>
                <label className="block space-y-2 text-sm font-medium">
                  {t('password')}
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'login' ? 1 : 15}
                    maxLength={128}
                    aria-describedby={mode !== 'login' ? 'password-help' : undefined}
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="mt-2 text-xs font-medium text-brand-ink underline underline-offset-4"
                >
                  {t(showPassword ? 'hidePassword' : 'showPassword')}
                </button>
                {mode !== 'login' && (
                  <p
                    id="password-help"
                    className="mt-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    {t('passwordHelp')}
                  </p>
                )}
              </div>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <label className="block space-y-2 text-sm font-medium">
                {t('confirmPassword')}
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={15}
                  maxLength={128}
                  className={inputClass}
                />
              </label>
            )}
            {mode === 'login' && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2">
                  <input name="remember" type="checkbox" className="size-4 accent-primary" />
                  {t('remember')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-brand-ink underline underline-offset-4"
                >
                  {t('forgotLink')}
                </Link>
              </div>
            )}
            <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
              {pending ? t('working') : t(action[mode])}
            </button>
          </form>
        )}
        {mode === 'login' && error === t('unverified') && (
          <Link
            href={`/verify-email${nextQuery}`}
            className="mt-4 block text-sm text-brand-ink underline"
          >
            {t('resend')}
          </Link>
        )}
        {badReset && (
          <Link href="/forgot-password" className="mt-5 inline-block text-brand-ink underline">
            {t('sendReset')}
          </Link>
        )}
        {(done || !['login', 'signup'].includes(mode)) && (
          <Link
            href={`/login${nextQuery}`}
            className="mt-5 block text-center text-sm text-brand-ink underline underline-offset-4"
          >
            {t('backLogin')}
          </Link>
        )}
      </div>
      {['login', 'signup'].includes(mode) && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t(mode === 'login' ? 'noAccount' : 'haveAccount')}{' '}
          <Link
            href={`${mode === 'login' ? '/signup' : '/login'}${nextQuery}`}
            className="font-semibold text-brand-ink underline underline-offset-4"
          >
            {t(mode === 'login' ? 'signup' : 'login')}
          </Link>
        </p>
      )}
    </section>
  )
}
