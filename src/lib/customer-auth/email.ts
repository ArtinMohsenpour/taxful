import nodemailer from 'nodemailer'
import { reserveCustomerEmail } from './email-limits'
import { customerPool } from './database'

export function emailLocale(request?: Request) {
  return request?.headers.get('x-taxful-locale') === 'en' ? 'en' : 'de'
}

const copy = {
  de: {
    verify: [
      'E-Mail-Adresse bestätigen',
      'Bestätigen Sie Ihre E-Mail-Adresse, um Ihr Taxful-Konto zu aktivieren.',
      'E-Mail bestätigen',
    ],
    reset: [
      'Passwort zurücksetzen',
      'Sie können über diesen Link ein neues Passwort festlegen. Er ist 30 Minuten gültig.',
      'Passwort zurücksetzen',
    ],
    invite: [
      'Einladung zu Taxful',
      'Sie wurden zu einem Unternehmensbereich bei Taxful eingeladen. Melden Sie sich mit dieser E-Mail-Adresse an, um beizutreten.',
      'Einladung ansehen',
    ],
    security: [
      'Sicherheitsänderung an Ihrem Konto',
      'Eine Authentifizierungsmethode oder Wiederherstellungscodes wurden geändert oder verwendet. Prüfen Sie Ihre Sicherheitsaktivitäten. Falls Sie dies nicht waren, sichern Sie Ihr Konto sofort und wenden Sie sich an den Support.',
      'Sicherheit prüfen',
    ],
    passwordChanged: [
      'Ihr Passwort wurde geändert',
      'Das Passwort Ihres Taxful-Kontos wurde geändert. Andere Sitzungen wurden abgemeldet. Falls Sie dies nicht waren, setzen Sie Ihr Passwort sofort zurück und wenden Sie sich an den Support.',
      'Konto sichern',
    ],
    passwordReset: [
      'Ihr Passwort wurde zurückgesetzt',
      'Das Passwort Ihres Taxful-Kontos wurde zurückgesetzt. Alle bisherigen Sitzungen wurden abgemeldet. Falls Sie dies nicht waren, sichern Sie Ihr Konto sofort und wenden Sie sich an den Support.',
      'Konto sichern',
    ],
    ignore: 'Falls Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.',
  },
  en: {
    verify: [
      'Verify your email address',
      'Confirm your email address to activate your Taxful account.',
      'Verify email',
    ],
    reset: [
      'Reset your password',
      'Use this link to choose a new password. It expires in 30 minutes.',
      'Reset password',
    ],
    invite: [
      'You’re invited to Taxful',
      'You have been invited to a company workspace on Taxful. Sign in with this email address to join.',
      'View invitation',
    ],
    security: [
      'Account security change',
      'An authentication method or recovery codes were changed or used. Review your security activity. If this was not you, secure your account immediately and contact support.',
      'Review security',
    ],
    passwordChanged: [
      'Your password was changed',
      'Your Taxful password was changed and other sessions were signed out. If this was not you, reset your password immediately and contact support.',
      'Secure your account',
    ],
    passwordReset: [
      'Your password was reset',
      'Your Taxful password was reset and all previous sessions were signed out. If this was not you, secure your account immediately and contact support.',
      'Secure your account',
    ],
    ignore: 'If you were not expecting this email, you can safely ignore it.',
  },
} as const

const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )

export async function sendCustomerEmail(
  to: string,
  url: string,
  kind: 'verify' | 'reset' | 'invite' | 'security' | 'passwordChanged' | 'passwordReset',
  locale: 'de' | 'en',
) {
  const host = process.env.CUSTOMER_SMTP_HOST
  const from = process.env.CUSTOMER_EMAIL_FROM
  if (!host || !from) throw new Error('Customer email delivery is not configured')
  // Return the same outward result for suppressed sends; never reveal account existence.
  if ((kind === 'verify' || kind === 'reset') && !(await reserveCustomerEmail(to, kind))) return
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.CUSTOMER_SMTP_PORT || 587),
    secure: process.env.CUSTOMER_SMTP_SECURE === 'true',
    requireTLS: process.env.NODE_ENV === 'production' && !['localhost', '127.0.0.1'].includes(host),
    auth: process.env.CUSTOMER_SMTP_USER
      ? { user: process.env.CUSTOMER_SMTP_USER, pass: process.env.CUSTOMER_SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  })
  const [subject, intro, action] = copy[locale][kind]
  const footer = ['security', 'passwordChanged', 'passwordReset'].includes(kind)
    ? ''
    : copy[locale].ignore
  await transport.sendMail({
    from,
    to,
    subject: `${subject} · Taxful`,
    text: `${intro}\n\n${url}\n\n${footer}`,
    html: `<html lang="${locale}"><body><h1>Taxful</h1><p>${intro}</p><p><a href="${escapeHTML(url)}">${action}</a></p><p>${footer}</p></body></html>`,
  })
}

export async function notifyPasswordSecurity(
  userId: string,
  event: 'passwordChanged' | 'passwordReset',
) {
  // Notification outages must never skip session revocation or report a successful
  // password change as failed. Neither the message nor audit contains credentials.
  try {
    await customerPool.query(
      'INSERT INTO customer_auth.security_events(user_id,event) VALUES($1,$2)',
      [userId, event],
    )
    const result = await customerPool.query<{ email: string; locale: string }>(
      'SELECT email,locale FROM customer_auth.customer_users WHERE id=$1',
      [userId],
    )
    if (!result.rows[0]) return
    const locale = result.rows[0].locale === 'en' ? 'en' : 'de'
    await sendCustomerEmail(
      result.rows[0].email,
      new URL(`/${locale}/forgot-password`, process.env.BETTER_AUTH_URL).href,
      event,
      locale,
    )
  } catch {
    console.error('Password security notification failed; check audit and SMTP health.')
  }
}
