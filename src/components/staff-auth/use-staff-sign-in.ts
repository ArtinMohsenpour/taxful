'use client'

import { useState, type FormEvent } from 'react'

export type StaffSignInStage = 'login' | 'enroll' | 'verify' | 'recovery'

export function useStaffSignIn() {
  const [stage, setStage] = useState<StaffSignInStage>('login')
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null)
  const [codes, setCodes] = useState<string[]>([])
  const [error, setError] = useState<'invalidCode' | 'rateLimited' | 'error' | null>(null)
  const [pending, setPending] = useState(false)

  function openAdmin() {
    // Refresh Payload's auth provider after the separate MFA gate.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/admin')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
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
    } catch (error) {
      const key = error instanceof Error ? error.message : ''
      setError(
        key === 'invalidCode' ? 'invalidCode' : key === 'rateLimited' ? 'rateLimited' : 'error',
      )
    } finally {
      setPending(false)
    }
  }

  return {
    stage,
    setup,
    codes,
    error,
    pending,
    submit,
    openAdmin,
    restart: () => {
      setStage('login')
      setSetup(null)
      setError(null)
    },
  }
}
