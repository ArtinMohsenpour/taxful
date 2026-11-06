'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@payloadcms/ui'
import { staffLoginCopy, type StaffLanguage } from './copy'
import { useStaffSignIn } from './use-staff-sign-in'
import { StaffField, StaffIcon } from './login-controls'
import { AuthenticatorFields } from './authenticator-fields'
import styles from './login.module.css'

export default function StaffLogin() {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState<StaffLanguage>(i18n.language === 'de' ? 'de' : 'en')
  const t = staffLoginCopy[language]
  const { stage, setup, codes, error, pending, submit, openAdmin, restart } = useStaffSignIn()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (stage !== 'login') heading.current?.focus()
  }, [stage])
  const title =
    stage === 'login'
      ? t.title
      : stage === 'enroll'
        ? t.setup
        : stage === 'verify'
          ? t.verifyTitle
          : t.recoveryTitle
  const intro =
    stage === 'login'
      ? t.intro
      : stage === 'enroll'
        ? t.setupHint
        : stage === 'verify'
          ? t.verifyHint
          : t.save

  return (
    <div className={styles.page} lang={language}>
      <header className={styles.header}>
        <Link href={language === 'de' ? '/de' : '/en'} className={styles.brand} aria-label={t.home}>
          <span className={styles.brandMark} aria-hidden="true">
            t.
          </span>
          <span className={styles.brandName} aria-hidden="true">
            taxful<span>.</span>
          </span>
        </Link>
        <label className={styles.language}>
          <span>{t.language}</span>
          <span className={styles.selectWrap}>
            <select
              value={language}
              disabled={pending}
              onChange={(event) => setLanguage(event.target.value === 'de' ? 'de' : 'en')}
              className={styles.select}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
            <StaffIcon name="chevron" />
          </span>
        </label>
      </header>
      <main className={styles.content}>
        <section className={styles.card} aria-labelledby="staff-sign-in-heading">
          <p className={styles.eyebrow}>
            <StaffIcon name="shield" />
            {t.workspace}
          </p>
          <h1 id="staff-sign-in-heading" ref={heading} tabIndex={-1} className={styles.title}>
            {title}
          </h1>
          <p className={styles.intro}>{intro}</p>
          <ol className={styles.steps} aria-label={t.steps}>
            {[t.password, t.secondStep].map((label, index) => {
              const completed = stage === 'recovery' || (index === 0 && stage !== 'login')
              const current = !completed && index === (stage === 'login' ? 0 : 1)
              return (
                <li
                  key={index}
                  className={styles.step}
                  aria-current={current ? 'step' : undefined}
                  data-complete={completed}
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {completed ? <StaffIcon name="check" /> : index + 1}
                  </span>
                  <span>{label}</span>
                </li>
              )
            })}
          </ol>
          {error && (
            <p role="alert" className={styles.error}>
              {t[error]}
            </p>
          )}
          {stage === 'recovery' ? (
            <>
              <ul className={styles.codes}>
                {codes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.primaryButton} onClick={openAdmin}>
                {t.done}
              </button>
            </>
          ) : (
            <form
              key={stage}
              onSubmit={(event) => void submit(event)}
              className={styles.form}
              aria-busy={pending}
            >
              {stage === 'login' ? (
                <>
                  <StaffField
                    label={t.email}
                    name="email"
                    type="email"
                    icon="mail"
                    autoComplete="username"
                    maxLength={254}
                    required
                    disabled={pending}
                  />
                  <StaffField
                    label={t.password}
                    name="password"
                    type="password"
                    icon="lock"
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    disabled={pending}
                    text={t}
                  />
                </>
              ) : (
                <AuthenticatorFields setup={setup} pending={pending} text={t} />
              )}
              <button disabled={pending} type="submit" className={styles.primaryButton}>
                {pending ? t.working : stage === 'login' ? t.login : t.verify}
                <StaffIcon name="arrow" />
              </button>
            </form>
          )}
          {stage !== 'recovery' && (
            <div className={styles.cardFooter}>
              {stage === 'login' ? (
                <Link href="/admin/forgot">{t.forgot}</Link>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  className={styles.textButton}
                  onClick={restart}
                >
                  {t.signin}
                </button>
              )}
            </div>
          )}
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href={language === 'de' ? '/de' : '/en'} className={styles.backLink}>
          <StaffIcon name="arrow" />
          {t.back}
        </Link>
      </footer>
    </div>
  )
}
