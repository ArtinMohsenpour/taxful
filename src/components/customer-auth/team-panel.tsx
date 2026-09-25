'use client'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { TeamSnapshot } from '@/lib/customer-auth/team'
import {
  canManageTeamRole,
  hasPermission,
  permissions,
  teamRoles,
  type TeamRole,
  type Permission,
} from '@/lib/customer-auth/permissions'
import { WorkspaceSelect } from './workspace-select'
import { buttonClass, inputClass } from './auth-form'
import { teamRequest } from './team-request'

const card = 'rounded-3xl border border-border bg-surface p-5 sm:p-7'
const secondary =
  'rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50'
type Confirmation = {
  action: 'role' | 'remove' | 'cancel'
  id: string
  name: string
  expectedRole?: Exclude<TeamRole, 'owner'>
}
export function TeamPanel({
  initial,
  organizationId,
  userId,
}: {
  initial: TeamSnapshot
  organizationId: string
  userId: string
}) {
  const t = useTranslations('Team'),
    locale = useLocale(),
    router = useRouter()
  const [data, setData] = useState(initial),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [inviteRole, setInviteRole] = useState('member'),
    [nextRole, setNextRole] = useState('member'),
    [confirm, setConfirm] = useState<Confirmation | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(),
    [past, setPast] = useState<(string | undefined)[]>([])
  const confirmationRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (confirm) {
      confirmationRef.current?.focus()
      confirmationRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [confirm])
  const manage = hasPermission(data.role, 'team')
  const roleOptions = (
    data.role === 'owner' ? ['member', 'reviewer', 'admin'] : ['member', 'reviewer']
  ).map((value) => ({ value, label: t(value as TeamRole) }))
  const date = (value: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    )
  const showError = (value: unknown) =>
    setError(
      value instanceof Error && t.has(value.message as Parameters<typeof t.has>[0])
        ? value.message
        : 'genericError',
    )
  async function load(before: string | undefined) {
    const response = await fetch(
      `/api/team${before ? '?before=' + encodeURIComponent(before) : ''}`,
      { cache: 'no-store' },
    )
    if (!response.ok) throw new Error((await response.json()).error)
    setData(await response.json())
  }
  useEffect(() => {
    if (pending || confirm) return
    let active = true
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const response = await fetch(
          `/api/team${cursor ? '?before=' + encodeURIComponent(cursor) : ''}`,
          { cache: 'no-store' },
        )
        if (response.ok && active) setData(await response.json())
      } catch {
        /* Keep existing view; mutations always recheck authorization. */
      }
    }
    const timer = window.setInterval(() => void refresh(), 30000)
    window.addEventListener('focus', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [pending, confirm, cursor])
  async function act(body: object) {
    setPending(true)
    setError('')
    setMessage('')
    try {
      const result = await teamRequest({ ...body, organizationId })
      setMessage(result.deliveryFailed ? 'deliveryWarning' : 'saved')
      setConfirm(null)
      setCursor(undefined)
      setPast([])
      await load(undefined)
      router.refresh()
      return true
    } catch (e) {
      showError(e)
      return false
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('intro')}</p>
        </div>
        <button
          className={secondary}
          disabled={pending}
          onClick={() => void load(cursor).catch(showError)}
        >
          {t('refresh')}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-2xl border border-error/30 bg-error/5 p-4 text-error">
          {t(error as Parameters<typeof t>[0])}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-2xl bg-primary/15 p-4">
          {t(message as Parameters<typeof t>[0])}
        </p>
      )}
      <section className={`${card} space-y-3`}>
        <p className="text-lg font-semibold">{t('seats', data.seats)}</p>
        <div
          role="progressbar"
          aria-label={t('seats', data.seats)}
          aria-valuenow={Math.min(data.seats.used, data.seats.limit)}
          aria-valuemax={data.seats.limit}
          aria-valuemin={0}
          className="h-2 overflow-hidden rounded-full bg-accent"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.min(100, (data.seats.used / data.seats.limit) * 100)}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{t('seatHelp')}</p>
        <p className="text-sm text-muted-foreground">{t(manage ? 'ownerHelp' : 'readonly')}</p>
      </section>
      {confirm && (
        <section
          ref={confirmationRef}
          tabIndex={-1}
          role="alertdialog"
          aria-labelledby="team-confirm-title"
          className={`${card} ring-2 ring-primary/40`}
        >
          <h2 id="team-confirm-title" className="font-semibold">
            {t(
              confirm.action === 'remove'
                ? 'confirmRemove'
                : confirm.action === 'role'
                  ? 'confirmRole'
                  : 'confirmRevoke',
              { name: confirm.name },
            )}
          </h2>
          {confirm.action === 'role' && (
            <div className="mt-4 max-w-xs">
              <WorkspaceSelect
                label={t('role')}
                value={nextRole}
                onChange={setNextRole}
                disabled={pending}
                options={roleOptions}
              />
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className={buttonClass}
              disabled={pending}
              onClick={() =>
                void act(
                  confirm.action === 'cancel'
                    ? { action: 'cancel', invitationId: confirm.id, locale }
                    : {
                        action: confirm.action,
                        memberId: confirm.id,
                        expectedRole: confirm.expectedRole,
                        ...(confirm.action === 'role' ? { role: nextRole } : {}),
                      },
                )
              }
            >
              {t(pending ? 'working' : 'confirm')}
            </button>
            <button className={secondary} disabled={pending} onClick={() => setConfirm(null)}>
              {t('cancel')}
            </button>
          </div>
        </section>
      )}
      <section className={card}>
        <h2 className="text-xl font-semibold">
          {t('members')}{' '}
          <span className="ml-2 text-sm text-muted-foreground">{data.members.length}</span>
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {data.members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-medium wrap-anywhere">
                  {member.name}{' '}
                  {member.userId === userId && (
                    <span className="ml-2 text-xs text-muted-foreground">{t('you')}</span>
                  )}
                </p>
                <p className="text-sm wrap-anywhere text-muted-foreground">{member.email}</p>
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs text-brand-ink">
                  {t(member.role)}
                </span>
              </div>
              {member.userId !== userId && canManageTeamRole(data.role, member.role) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={secondary}
                    disabled={pending}
                    onClick={() => {
                      setNextRole(member.role)
                      setConfirm({
                        action: 'role',
                        id: member.id,
                        name: member.name,
                        expectedRole: member.role as Exclude<TeamRole, 'owner'>,
                      })
                    }}
                  >
                    {t('change')}
                  </button>
                  <button
                    className={`${secondary} text-error`}
                    disabled={pending}
                    onClick={() =>
                      setConfirm({
                        action: 'remove',
                        id: member.id,
                        name: member.name,
                        expectedRole: member.role as Exclude<TeamRole, 'owner'>,
                      })
                    }
                  >
                    {t('remove')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      {manage && (
        <section className={card}>
          <h2 className="text-xl font-semibold">{t('invite')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('inviteHelp')}</p>
          <form
            className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)_auto] md:items-end"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = event.currentTarget
              const email = String(new FormData(form).get('email'))
              if (await act({ action: 'invite', email, role: inviteRole, locale })) {
                form.reset()
                setInviteRole('member')
              }
            }}
          >
            <label>
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                {t('email')}
              </span>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                disabled={pending}
                className={inputClass}
              />
            </label>
            <WorkspaceSelect
              label={t('role')}
              value={inviteRole}
              onChange={setInviteRole}
              options={roleOptions}
              disabled={pending}
            />
            <button
              className={buttonClass}
              disabled={pending || data.seats.used >= data.seats.limit}
            >
              {t(pending ? 'working' : 'send')}
            </button>
          </form>
          {data.seats.used >= data.seats.limit && (
            <p className="mt-3 text-sm text-muted-foreground">{t('teamLimit')}</p>
          )}
          <h3 className="mt-8 border-t border-border pt-6 font-semibold">{t('invitations')}</h3>
          {!data.invitations.length && (
            <p className="mt-3 text-sm text-muted-foreground">{t('emptyInvites')}</p>
          )}
          <ul className="mt-3 divide-y divide-border">
            {data.invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium wrap-anywhere">{invite.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(invite.role as TeamRole)} ·{' '}
                    {invite.expired ? t('expired') : t('expires', { date: date(invite.expiresAt) })}
                  </p>
                  <p
                    className={`mt-1 text-xs ${invite.delivery_status === 'failed' ? 'text-error' : 'text-muted-foreground'}`}
                  >
                    {t(
                      invite.delivery_status === 'sent'
                        ? 'deliverySent'
                        : invite.delivery_status === 'failed'
                          ? 'deliveryFailed'
                          : invite.delivery_status === 'sending'
                            ? 'deliverySending'
                            : 'deliveryUnknown',
                    )}
                  </p>
                </div>
                {canManageTeamRole(data.role, invite.role) && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={secondary}
                      disabled={pending}
                      onClick={() =>
                        void act({ action: 'resend', invitationId: invite.id, locale })
                      }
                    >
                      {t('resend')}
                    </button>
                    <button
                      className={secondary}
                      disabled={pending}
                      onClick={() =>
                        setConfirm({ action: 'cancel', id: invite.id, name: invite.email })
                      }
                    >
                      {t('revoke')}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <details className={card}>
        <summary className="cursor-pointer text-xl font-semibold">{t('matrix')}</summary>
        <p className="mt-4 text-sm text-muted-foreground">{t('matrixIntro')}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">{t('role')}</th>
                {teamRoles.map((role) => (
                  <th key={role} className="p-3">
                    {t(role)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(permissions) as Permission[]).map((permission) => (
                <tr key={permission} className="border-t border-border">
                  <th scope="row" className="min-w-48 p-3 font-medium">
                    {t(permission)}
                  </th>
                  {teamRoles.map((role) => (
                    <td key={role} className="p-3">
                      <span
                        aria-label={t(hasPermission(role, permission) ? 'yes' : 'no')}
                        className={
                          hasPermission(role, permission)
                            ? 'text-brand-ink'
                            : 'text-muted-foreground'
                        }
                      >
                        {hasPermission(role, permission) ? '✓' : '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('readDirectory')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('deleteHelp')}</p>
      </details>
      {manage && (
        <section className={card}>
          <h2 className="text-xl font-semibold">{t('history')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('historyHelp')}</p>
          <ul className="mt-4 divide-y divide-border">
            {data.events.map((event) => (
              <li key={event.id} className="py-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{t(event.event as Parameters<typeof t>[0])}</p>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={new Date(event.created_at).toISOString()}
                  >
                    {date(event.created_at)}
                  </time>
                </div>
                <p className="mt-1 text-sm wrap-anywhere">
                  {event.target_label}
                  {event.details.from && event.details.to
                    ? ` · ${t(event.details.from)} → ${t(event.details.to)}`
                    : ''}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{event.actor || t('system')}</p>
              </li>
            ))}
          </ul>
          {!data.events.length && (
            <p className="mt-4 text-sm text-muted-foreground">{t('emptyHistory')}</p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              className={secondary}
              disabled={!past.length || pending}
              onClick={async () => {
                const before = past[past.length - 1]
                try {
                  await load(before)
                  setCursor(before)
                  setPast(past.slice(0, -1))
                } catch (e) {
                  showError(e)
                }
              }}
            >
              {t('previous')}
            </button>
            <button
              className={secondary}
              disabled={!data.nextCursor || pending}
              onClick={async () => {
                if (data.nextCursor)
                  try {
                    await load(data.nextCursor)
                    setPast([...past, cursor])
                    setCursor(data.nextCursor)
                  } catch (e) {
                    showError(e)
                  }
              }}
            >
              {t('next')}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
