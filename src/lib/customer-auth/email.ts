import nodemailer from 'nodemailer'
import { reserveCustomerEmail } from './email-limits'

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

export function securityMailTransport() {
  const host = process.env.CUSTOMER_SMTP_HOST
  if (!host) throw new Error('Security email delivery is not configured')
  return nodemailer.createTransport({
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
}

export async function sendCustomerEmail(
  to: string,
  url: string,
  kind: 'verify' | 'reset' | 'invite' | 'security' | 'passwordChanged' | 'passwordReset',
  locale: 'de' | 'en',
  messageId?: string,
) {
  const from = process.env.CUSTOMER_EMAIL_FROM
  if (!from) throw new Error('Security email sender is not configured')
  if ((kind === 'verify' || kind === 'reset') && !(await reserveCustomerEmail(to, kind))) return
  const transport = securityMailTransport()
  const [subject, intro, action] = copy[locale][kind]
  const footer = ['security', 'passwordChanged', 'passwordReset'].includes(kind)
    ? ''
    : copy[locale].ignore
  await transport.sendMail({
    from,
    to,
    messageId,
    subject: `${subject} · Taxful`,
    text: `${intro}\n\n${url}\n\n${footer}`,
    html: `<html lang="${locale}"><body><h1>Taxful</h1><p>${intro}</p><p><a href="${escapeHTML(url)}">${action}</a></p><p>${footer}</p></body></html>`,
  })
}
