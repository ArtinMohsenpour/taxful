import nodemailer from 'nodemailer'

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
  kind: 'verify' | 'reset' | 'invite',
  locale: 'de' | 'en',
) {
  const host = process.env.CUSTOMER_SMTP_HOST
  const from = process.env.CUSTOMER_EMAIL_FROM
  if (!host || !from) throw new Error('Customer email delivery is not configured')
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
  await transport.sendMail({
    from,
    to,
    subject: `${subject} · Taxful`,
    text: `${intro}\n\n${url}\n\n${copy[locale].ignore}`,
    html: `<html lang="${locale}"><body><h1>Taxful</h1><p>${intro}</p><p><a href="${escapeHTML(url)}">${action}</a></p><p>${copy[locale].ignore}</p></body></html>`,
  })
}
