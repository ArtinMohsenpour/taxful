'use client'
import { useEffect, useState, type FormEvent } from 'react'
import type { adminBillingDetails, adminSnapshot } from '@/lib/billing/admin'
import { blankCompanyProfile } from '@/lib/documents/company-profile-schema'
import type { Plan } from '@/lib/billing/plans'
import './style.scss'
import { GiftForm } from './gift-form'
type Snapshot = Awaited<ReturnType<typeof adminSnapshot>>
type BillingDetails = Awaited<ReturnType<typeof adminBillingDetails>>
const errors: Record<string, string> = {
  billingUnavailable: 'Configure the Stripe test key before publishing paid plans or discounts.',
  conflict: 'This record changed. Refresh and try again.',
  invalidRequest: 'Check the values and include a reason (at least five characters).',
  forbidden: 'Super-admin access is required.',
}
export function BillingAdminPanel() {
  const [data, setData] = useState<Snapshot | null>(null),
    [tab, setTab] = useState('plans'),
    [query, setQuery] = useState(''),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false),
    [billingDetails, setBillingDetails] = useState<
      Record<string, BillingDetails | 'loading' | 'error'>
    >({})
  async function load(q = query, page = offset) {
    const response = await fetch(`/api/billing-admin?q=${encodeURIComponent(q)}&offset=${page}`, {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('forbidden')
    setData(await response.json())
  }
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/billing-admin', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true)
          setMessage('Unable to load billing administration.')
        }
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (tab !== 'companies' || busy) return
    const controller = new AbortController()
    let pending = false
    const refresh = async () => {
      if (pending || document.visibilityState !== 'visible') return
      pending = true
      try {
        const response = await fetch(
          `/api/billing-admin?q=${encodeURIComponent(query)}&offset=${offset}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        )
        if (!response.ok) return
        const snapshot: Snapshot = await response.json()
        if (controller.signal.aborted) return
        // Refresh billing labels without resetting unsaved customer/company forms.
        setData(
          (current) =>
            current && {
              ...current,
              organizations: current.organizations.map((org) => {
                const fresh = snapshot.organizations.find((entry) => entry.id === org.id)
                return fresh
                  ? {
                      ...org,
                      status: fresh.status,
                      plan_id: fresh.plan_id,
                      effective_plan: fresh.effective_plan,
                      provider_subscription_id: fresh.provider_subscription_id,
                      current_period_end: fresh.current_period_end,
                      cancel_at_period_end: fresh.cancel_at_period_end,
                      grant_plan: fresh.grant_plan,
                      grant_expires: fresh.grant_expires,
                    }
                  : org
              }),
            },
        )
      } catch {
        /* A transient refresh failure must not discard an admin edit. */
      } finally {
        pending = false
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15000)
    window.addEventListener('focus', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [tab, busy, query, offset])
  async function act(body: object) {
    setBusy(true)
    setMessage('')
    setFailed(false)
    try {
      const response = await fetch('/api/billing-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      await load()
      setMessage('Saved. The action is recorded in the audit log.')
    } catch (error) {
      setFailed(true)
      setMessage(
        errors[error instanceof Error ? error.message : ''] ||
          'The operation failed. No successful change has been confirmed.',
      )
    } finally {
      setBusy(false)
    }
  }
  const submit = (event: FormEvent<HTMLFormElement>, base: object) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    void act({ ...base, ...values })
  }
  async function loadBillingDetails(organizationId: string) {
    if (billingDetails[organizationId]) return
    setBillingDetails((current) => ({ ...current, [organizationId]: 'loading' }))
    try {
      const response = await fetch(
        `/api/billing-admin?organizationId=${encodeURIComponent(organizationId)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) throw new Error()
      const result: { billingDetails: BillingDetails } = await response.json()
      setBillingDetails((current) => ({
        ...current,
        [organizationId]: result.billingDetails,
      }))
    } catch {
      setBillingDetails((current) => ({ ...current, [organizationId]: 'error' }))
    }
  }
  return (
    <div className="taxful-billing-admin">
      <header>
        <p className="eyebrow">TAXFUL · SUPER ADMIN</p>
        <h1>Customers & billing</h1>
        <p>
          Manage company plans, customer accounts and test billing. Every change requires an audit
          reason.
        </p>
      </header>
      <div className="notice">
        Stripe test mode only. Prices are monthly EUR amounts excluding applicable VAT. Existing
        subscriptions keep their original price; allowance changes apply immediately. Passwords are
        never visible.
      </div>
      <nav aria-label="Billing administration">
        {['plans', 'customers', 'companies', 'discounts', 'audit'].map((item) => (
          <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      {message && (
        <p role={failed ? 'alert' : 'status'} className={failed ? 'notice error' : 'notice'}>
          {message}
        </p>
      )}
      {!data ? (
        <p>Loading…</p>
      ) : (
        <fieldset disabled={busy}>
          {(tab === 'customers' || tab === 'companies') && (
            <form
              className="search"
              onSubmit={(event) => {
                event.preventDefault()
                setOffset(0)
                void load(query, 0).catch(() => setMessage('Search failed.'))
              }}
            >
              <label>
                Search {tab}
                <input
                  value={query}
                  maxLength={100}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button>Search</button>
            </form>
          )}
          {tab === 'plans' && (
            <div className="plans">
              {data.plans.map((plan) => (
                <PlanForm key={`${plan.id}-${plan.revision}`} plan={plan} save={act} />
              ))}
            </div>
          )}
          {tab === 'customers' &&
            data.customers.map((user) => (
              <details key={user.id}>
                <summary>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>{' '}
                  · {user.email} {user.suspended ? '· Suspended' : ''}
                </summary>
                <p>
                  Email {user.emailVerified ? 'verified' : 'not verified'} · ID: {user.id}
                </p>
                <form onSubmit={(event) => submit(event, { action: 'customer', id: user.id })}>
                  <div className="fields">
                    <label>
                      First name
                      <input
                        name="firstName"
                        defaultValue={user.firstName}
                        required
                        maxLength={75}
                      />
                    </label>
                    <label>
                      Last name
                      <input name="lastName" defaultValue={user.lastName} required maxLength={75} />
                    </label>
                  </div>
                  <Reason />
                  <button>Save profile</button>
                </form>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const form = new FormData(event.currentTarget)
                    void act({
                      action: form.get('operation'),
                      id: user.id,
                      reason: form.get('reason'),
                    })
                  }}
                >
                  <label>
                    Account action
                    <select name="operation">
                      <option value="reset">Send password reset & revoke sessions</option>
                      <option value="revoke">Sign out all sessions</option>
                      <option value={user.suspended ? 'restore' : 'suspend'}>
                        {user.suspended ? 'Restore account' : 'Suspend account & revoke sessions'}
                      </option>
                    </select>
                  </label>
                  <Reason />
                  <button>Apply account action</button>
                </form>
              </details>
            ))}
          {tab === 'companies' &&
            data.organizations.map((org) => (
              <details
                key={org.id}
                onToggle={(event) => {
                  if (event.currentTarget.open) void loadBillingDetails(org.id)
                }}
              >
                <summary>
                  <strong>{org.name}</strong> · Access: {org.effective_plan} · {org.members} members
                </summary>
                <p>
                  Subscription: {org.plan_id || 'free'} · {org.status || 'free'} · ID: {org.id}
                </p>
                {org.memberships?.map((member: { email: string; role: string }) => (
                  <p key={member.email}>
                    {member.email} · {member.role}
                  </p>
                ))}
                <p>
                  Complimentary access: {org.grant_plan || 'none'}{' '}
                  {org.grant_expires && `until ${new Date(org.grant_expires).toLocaleDateString()}`}
                </p>
                <section className="billing-details" aria-label="Stripe billing details">
                  <h3>Billing and payment details</h3>
                  {billingDetails[org.id] === 'loading' && <p>Loading secure billing details…</p>}
                  {billingDetails[org.id] === 'error' && (
                    <p className="notice error">Unable to load Stripe billing details.</p>
                  )}
                  {billingDetails[org.id] === null && (
                    <p>This company has not created a Stripe billing customer yet.</p>
                  )}
                  {billingDetails[org.id] &&
                    !['loading', 'error'].includes(billingDetails[org.id] as string) &&
                    (() => {
                      const details = billingDetails[org.id] as Exclude<BillingDetails, null>
                      const address = details.address
                      return (
                        <>
                          <dl>
                            <div>
                              <dt>Billing name</dt>
                              <dd>{details.name || 'Not provided'}</dd>
                            </div>
                            <div>
                              <dt>Billing email</dt>
                              <dd>{details.email || 'Not provided'}</dd>
                            </div>
                            <div>
                              <dt>Billing address</dt>
                              <dd>
                                {address
                                  ? [
                                      address.line1,
                                      address.line2,
                                      [address.postal_code, address.city].filter(Boolean).join(' '),
                                      address.country,
                                    ]
                                      .filter(Boolean)
                                      .join(', ')
                                  : 'Not provided'}
                              </dd>
                            </div>
                          </dl>
                          <h4>Saved payment methods</h4>
                          {!details.paymentMethods.length ? (
                            <p>No saved payment methods.</p>
                          ) : (
                            <ul className="payment-methods">
                              {details.paymentMethods.map((method) => (
                                <li key={method.id}>
                                  <strong>{method.brand.toUpperCase()}</strong> •••• {method.last4}{' '}
                                  · expires {String(method.expMonth).padStart(2, '0')}/
                                  {method.expYear}
                                  {method.isDefault ? ' · Default' : ''}
                                  {method.country ? ` · ${method.country}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="safe-data-note">
                            For security, Stripe provides Taxful only masked payment details. Full
                            card numbers and bank credentials are never stored here.
                          </p>
                        </>
                      )
                    })()}
                </section>
                {org.provider_subscription_id &&
                  ['active', 'trialing', 'past_due'].includes(org.status) && (
                    <form
                      onSubmit={(event) =>
                        submit(event, {
                          action: org.cancel_at_period_end
                            ? 'resumeSubscription'
                            : 'cancelSubscription',
                          id: org.id,
                        })
                      }
                    >
                      <p>
                        Changes the paid subscription in Stripe. Cancellation takes effect at the
                        current period end.
                      </p>
                      <Reason />
                      <button>
                        {org.cancel_at_period_end
                          ? 'Undo scheduled cancellation'
                          : 'Cancel at period end'}
                      </button>
                      <p>
                        <a
                          href={`https://dashboard.stripe.com/test/subscriptions/${encodeURIComponent(org.provider_subscription_id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open subscription in Stripe
                        </a>
                      </p>
                    </form>
                  )}
                <GiftForm
                  organizationId={org.id}
                  hasPeriod={Boolean(
                    org.current_period_end && new Date(org.current_period_end) > new Date(),
                  )}
                  onSave={(value) => void act(value)}
                />
                {org.grant_plan && (
                  <form onSubmit={(event) => submit(event, { action: 'removeGrant', id: org.id })}>
                    <Reason />
                    <button>Remove grant</button>
                  </form>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const values = Object.fromEntries(new FormData(event.currentTarget))
                    const { reason, ...profile } = values
                    void act({ action: 'company', id: org.id, data: profile, reason })
                  }}
                >
                  <h3>Company invoice details</h3>
                  <div className="fields">
                    {Object.keys(blankCompanyProfile).map((key) => (
                      <label key={key}>
                        {key}
                        <input
                          name={key}
                          defaultValue={
                            org.profile?.[key] ??
                            blankCompanyProfile[key as keyof typeof blankCompanyProfile]
                          }
                          required={key === 'companyName'}
                          maxLength={300}
                        />
                      </label>
                    ))}
                  </div>
                  <Reason />
                  <button>Save company details</button>
                </form>
              </details>
            ))}
          {tab === 'discounts' && (
            <>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const values = new FormData(event.currentTarget)
                  void act({
                    action: 'discount',
                    code: values.get('code'),
                    percent: Number(values.get('percent')),
                    maxRedemptions: Number(values.get('maxRedemptions')),
                    days: Number(values.get('days')),
                    reason: values.get('reason'),
                  })
                }}
              >
                <h2>Create promotion code</h2>
                <p>
                  Percentage discount on the first subscription invoice only. Stripe enforces expiry
                  and redemption limits.
                </p>
                <div className="fields">
                  <label>
                    Code
                    <input name="code" required pattern="[A-Z0-9_-]{3,40}" />
                  </label>
                  <label>
                    Discount %<input name="percent" type="number" min="1" max="100" required />
                  </label>
                  <label>
                    Maximum redemptions
                    <input
                      name="maxRedemptions"
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue="100"
                      required
                    />
                  </label>
                  <label>
                    Expires in days
                    <input name="days" type="number" min="1" max="365" defaultValue="30" required />
                  </label>
                </div>
                <Reason />
                <button>Create test discount</button>
              </form>
              {data.discounts.map((discount) => (
                <details key={discount.id}>
                  <summary>
                    {discount.code} · {discount.percent_off}% ·{' '}
                    {!discount.provider_promotion_id
                      ? 'Pending — retry with the same code and values'
                      : discount.active
                        ? 'Active'
                        : 'Disabled'}
                  </summary>
                  <p>
                    Expires {new Date(discount.expires_at).toLocaleDateString()} · Maximum{' '}
                    {discount.max_redemptions} redemptions
                  </p>
                  {discount.active && (
                    <form
                      onSubmit={(event) =>
                        submit(event, { action: 'disableDiscount', id: discount.id })
                      }
                    >
                      <Reason />
                      <button>Disable code</button>
                    </form>
                  )}
                </details>
              ))}
            </>
          )}
          {tab === 'audit' && (
            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.audit.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                      <td>{entry.staff_id}</td>
                      <td>{entry.action}</td>
                      <td>{entry.target_id}</td>
                      <td>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(tab === 'customers' || tab === 'companies') && (
            <div className="search">
              <button
                disabled={!offset}
                onClick={() => {
                  const next = Math.max(0, offset - 50)
                  setOffset(next)
                  void load(query, next)
                }}
              >
                Previous
              </button>
              <span>Page {offset / 50 + 1}</span>
              <button
                disabled={(tab === 'customers' ? data.customers : data.organizations).length < 50}
                onClick={() => {
                  const next = offset + 50
                  setOffset(next)
                  void load(query, next)
                }}
              >
                Next
              </button>
            </div>
          )}
        </fieldset>
      )}
    </div>
  )
}
function Reason() {
  return (
    <label>
      Reason for change
      <input
        name="reason"
        required
        minLength={5}
        maxLength={500}
        placeholder="Describe why this change is needed"
      />
    </label>
  )
}
function PlanForm({ plan, save }: { plan: Plan; save: (body: object) => Promise<void> }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        void save({
          action: 'plan',
          id: plan.id,
          revision: plan.revision,
          monthly_documents: Number(values.get('monthly_documents')),
          daily_uploads: Number(values.get('daily_uploads')),
          batch_uploads: Number(values.get('batch_uploads')),
          team_members: Number(values.get('team_members')),
          storage_gb: Number(values.get('storage_gb')),
          monthly_price_cents: Math.round(Number(values.get('price')) * 100),
          published: values.get('published') === 'on',
          reason: values.get('reason'),
        })
      }}
    >
      <h2>{plan.id[0].toUpperCase() + plan.id.slice(1)}</h2>
      <div className="fields">
        {(
          [
            ['monthly_documents', 'Documents / month', 100000],
            ['daily_uploads', 'Uploads / day', 10000],
            ['batch_uploads', 'Files / batch', 5],
            ['team_members', 'Team seats', 100],
          ] as const
        ).map(([name, label, max]) => (
          <label key={name}>
            {label}
            <input name={name} type="number" min="1" max={max} defaultValue={plan[name]} required />
          </label>
        ))}
        <label>
          Storage (GB)
          <input
            name="storage_gb"
            type="number"
            step="0.01"
            min="0.1"
            max="1000"
            defaultValue={Math.round((Number(plan.storage_bytes) / 1024 ** 3) * 100) / 100}
            required
          />
        </label>
        <label>
          Monthly price (EUR, excl. VAT)
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            max="10000"
            defaultValue={plan.monthly_price_cents / 100}
            readOnly={plan.id === 'free'}
            required
          />
        </label>
      </div>
      <label className="checkbox">
        <input name="published" type="checkbox" defaultChecked={plan.published} /> Publish price /
        enable test checkout
      </label>
      <Reason />
      <button>Save plan</button>
    </form>
  )
}
