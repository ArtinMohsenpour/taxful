'use client'
import { useTranslations } from 'next-intl'
export type ProcessingHealth = { online: boolean; scannerReady: boolean }
export function ProcessingNotice({ health }: { health?: ProcessingHealth }) {
  const t = useTranslations('Documents')
  if (!health || (health.online && health.scannerReady)) return null
  return (
    <p
      role="status"
      className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm leading-relaxed text-foreground"
    >
      {t(health.online ? 'scannerOffline' : 'workerOffline')}
    </p>
  )
}
