'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, type FormEvent } from 'react'
import { useTranslation } from '@payloadcms/ui'
const copy = {
  en: {
    title: 'Staff sign in',
    intro: 'A password and authenticator are required for staff access.',
    email: 'Email',
    password: 'Password',
    login: 'Continue',
    setup: 'Set up your authenticator',
    setupHint: 'Scan this QR code in your authenticator app, then enter its six-digit code.',
    manual: 'Manual setup key',
    code: 'Authenticator code or recovery code',
    verify: 'Verify',
    save: 'Save these single-use recovery codes somewhere safe. They are shown only once.',
    done: 'I saved my recovery codes — open admin',
    error: 'Sign-in could not be completed. Check your details or sign in again.',
    invalidCode:
      'Invalid or already used code. Use a new authenticator code or an unused recovery code.',
    rateLimited: 'Too many attempts. Wait 15 minutes before trying again.',
    signin: 'Sign in again',
    forgot: 'Forgot password?',
  },
  de: {
    title: 'Anmeldung für Mitarbeitende',
    intro: 'Für den Zugang sind ein Passwort und ein Authenticator erforderlich.',
    email: 'E-Mail',
    password: 'Passwort',
    login: 'Weiter',
    setup: 'Authenticator einrichten',
    setupHint:
      'Scannen Sie diesen QR-Code in Ihrer Authenticator-App und geben Sie den sechsstelligen Code ein.',
    manual: 'Manueller Einrichtungsschlüssel',
    code: 'Authenticator- oder Wiederherstellungscode',
    verify: 'Bestätigen',
    save: 'Bewahren Sie diese einmaligen Wiederherstellungscodes sicher auf. Sie werden nur einmal angezeigt.',
    done: 'Codes gespeichert — Verwaltung öffnen',
    error: 'Anmeldung nicht möglich. Prüfen Sie Ihre Angaben oder melden Sie sich erneut an.',
    invalidCode:
      'Ungültiger oder bereits verwendeter Code. Verwenden Sie einen neuen Authenticator-Code oder einen unbenutzten Wiederherstellungscode.',
    rateLimited: 'Zu viele Versuche. Bitte warten Sie 15 Minuten.',
    signin: 'Erneut anmelden',
    forgot: 'Passwort vergessen?',
  },
}
export default function StaffLogin() {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState<'de' | 'en'>(i18n.language === 'de' ? 'de' : 'en')
  const t = copy[language]
  const [stage, setStage] = useState<'login' | 'enroll' | 'verify' | 'recovery'>('login')
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null)
  const [codes, setCodes] = useState<string[]>([]),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false)
  function openAdmin() {
    // A full document load refreshes Payload's auth provider after the separate MFA gate.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/admin')
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      if (stage === 'login') {
        const login = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
        })
        if (!login.ok) throw new Error(login.status === 429 ? 'rateLimited' : 'error')
        const status = await fetch('/api/staff-mfa', { cache: 'no-store' })
        if (!status.ok) throw new Error('error')
        const state = (await status.json()) as { state: 'enroll' | 'verify' }
        if (state.state === 'enroll') {
          const response = await fetch('/api/staff-mfa', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'enroll' }),
          })
          if (!response.ok) throw new Error('error')
          setSetup(await response.json())
        }
        setStage(state.state)
      } else {
        const response = await fetch('/api/staff-mfa', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'verify', code: data.get('code') }),
        })
        const result = (await response.json()) as { error?: string; codes?: string[] }
        if (!response.ok) throw new Error(result.error || 'error')
        setSetup(null)
        if (result.codes) {
          setCodes(result.codes)
          setStage('recovery')
        } else openAdmin()
      }
    } catch (e) {
      const key = e instanceof Error ? e.message : ''
      setError(
        key === 'invalidCode' ? t.invalidCode : key === 'rateLimited' ? t.rateLimited : t.error,
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <main style={{ maxWidth: 460, margin: '64px auto', padding: 24 }}>
      <label>
        {language === 'de' ? 'Sprache' : 'Language'}
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value === 'de' ? 'de' : 'en')}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      {error && <p role="alert">{error}</p>}
      {stage === 'recovery' ? (
        <>
          <p>{t.save}</p>
          <ul>
            {codes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
          <button type="button" onClick={openAdmin}>
            {t.done}
          </button>
        </>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {stage === 'login' ? (
            <>
              <label>
                {t.email}
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  style={{ display: 'block', width: '100%' }}
                />
              </label>
              <label>
                {t.password}
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  style={{ display: 'block', width: '100%' }}
                />
              </label>
            </>
          ) : (
            <>
              {setup && (
                <>
                  <h2>{t.setup}</h2>
                  <p>{t.setupHint}</p>
                  {/* Local QR contains the enrollment secret; never load a remote image. */}
                  <Image unoptimized src={setup.qr} alt={t.setup} width={240} height={240} />
                  <label>
                    {t.manual}
                    <code style={{ display: 'block', overflowWrap: 'anywhere' }}>
                      {setup.secret}
                    </code>
                  </label>
                </>
              )}
              <label>
                {t.code}
                <input
                  name="code"
                  autoComplete="one-time-code"
                  maxLength={32}
                  required
                  style={{ display: 'block', width: '100%' }}
                />
              </label>
            </>
          )}
          <button disabled={pending} type="submit">
            {stage === 'login' ? t.login : t.verify}
          </button>
        </form>
      )}
      {stage === 'login' ? (
        <p>
          <Link href="/admin/forgot">{t.forgot}</Link>
        </p>
      ) : (
        stage !== 'recovery' && (
          <p>
            <button
              type="button"
              onClick={() => {
                setStage('login')
                setSetup(null)
                setError('')
              }}
            >
              {t.signin}
            </button>
          </p>
        )
      )}
    </main>
  )
}
