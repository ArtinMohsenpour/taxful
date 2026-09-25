'use client'
import { useState } from 'react'
import { planIds } from '@/lib/billing/plans'

export function GiftForm({
  organizationId,
  hasPeriod,
  onSave,
}: {
  organizationId: string
  hasPeriod: boolean
  onSave: (value: object) => void
}) {
  const [mode, setMode] = useState('days')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        onSave({
          action: 'grant',
          id: organizationId,
          plan: values.get('plan'),
          expiryMode: mode,
          ...(mode === 'days' ? { days: Number(values.get('days')) } : {}),
          ...(mode === 'date'
            ? { expiresAt: new Date(String(values.get('expiresAt'))).toISOString() }
            : {}),
          reason: values.get('reason'),
        })
      }}
    >
      <h3>Gift temporary access</h3>
      <div className="fields">
        <label>
          Complimentary plan
          <select name="plan" defaultValue="professional">
            {planIds
              .filter((id) => id !== 'free')
              .map((id) => (
                <option key={id}>{id}</option>
              ))}
          </select>
        </label>
        <label>
          Gift expires
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="days">After a number of days</option>
            <option value="period" disabled={!hasPeriod}>
              At the current subscription period end
            </option>
            <option value="date">On a specific date and time</option>
          </select>
        </label>
        {mode === 'days' && (
          <label>
            Days from today
            <input name="days" type="number" min="1" max="365" defaultValue="30" required />
          </label>
        )}
        {mode === 'date' && (
          <label>
            Expiry (your local time)
            <input name="expiresAt" type="datetime-local" required />
          </label>
        )}
      </div>
      <p>
        The existing subscription and its charges continue. When this gift ends, access returns to
        the valid paid plan, or Free if no paid access remains.
      </p>
      <label>
        Reason for change
        <input name="reason" minLength={5} maxLength={500} required />
      </label>
      <button>Grant access</button>
    </form>
  )
}
