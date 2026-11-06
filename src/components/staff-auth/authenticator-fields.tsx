import Image from 'next/image'
import { useState } from 'react'
import type { StaffLoginText } from './copy'
import { StaffField } from './login-controls'
import styles from './login.module.css'

export function AuthenticatorFields({
  setup,
  pending,
  text,
}: {
  setup: { secret: string; qr: string } | null
  pending: boolean
  text: StaffLoginText
}) {
  const [recovery, setRecovery] = useState(false)
  return (
    <>
      {setup && (
        <div className={styles.enrollment}>
          {/* Local QR contains the enrollment secret; never load a remote image. */}
          <div className={styles.qr}>
            <Image unoptimized src={setup.qr} alt={text.setup} width={200} height={200} />
          </div>
          <details className={styles.manual}>
            <summary>{text.manual}</summary>
            <code>{setup.secret}</code>
          </details>
        </div>
      )}
      {recovery && <p className={styles.recoveryHint}>{text.recoveryHint}</p>}
      <StaffField
        key={String(recovery)}
        name="code"
        icon="shield"
        label={recovery ? text.recoveryCode : text.code}
        autoComplete="one-time-code"
        inputMode={recovery ? 'text' : 'numeric'}
        pattern={recovery ? undefined : '[0-9]{6}'}
        maxLength={recovery ? 32 : 6}
        required
        disabled={pending}
      />
      {!setup && (
        <button
          type="button"
          disabled={pending}
          className={styles.textButton}
          onClick={() => setRecovery(!recovery)}
        >
          {recovery ? text.useApp : text.useRecovery}
        </button>
      )}
    </>
  )
}
