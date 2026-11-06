import { useId, useState, type InputHTMLAttributes } from 'react'
import type { StaffLoginText } from './copy'
import styles from './login.module.css'

type StaffIconName = 'mail' | 'lock' | 'shield' | 'eye' | 'eye-off' | 'arrow' | 'chevron' | 'check'

export function StaffIcon({ name }: { name: StaffIconName }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'mail' && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m4 7 8 6 8-6" />
        </>
      )}
      {name === 'lock' && (
        <>
          <rect x="5" y="10" width="14" height="11" rx="3" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </>
      )}
      {name === 'shield' && (
        <>
          <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
      {(name === 'eye' || name === 'eye-off') && (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
          {name === 'eye-off' && <path d="m3 3 18 18" />}
        </>
      )}
      {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
      {name === 'chevron' && <path d="m6 9 6 6 6-6" />}
      {name === 'check' && <path d="m5 12 4 4L19 6" />}
    </svg>
  )
}

export function StaffField({
  label,
  icon,
  text,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon: 'mail' | 'lock' | 'shield'
  text?: StaffLoginText
}) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const password = props.type === 'password'
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        <span className={styles.fieldIcon}>
          <StaffIcon name={icon} />
        </span>
        <input
          {...props}
          id={id}
          type={password && showPassword ? 'text' : props.type}
          className={`${styles.input} ${password ? styles.passwordInput : ''}`}
        />
        {password && text && (
          <button
            type="button"
            disabled={props.disabled}
            className={styles.passwordToggle}
            aria-label={showPassword ? text.hidePassword : text.showPassword}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
          >
            <StaffIcon name={showPassword ? 'eye-off' : 'eye'} />
          </button>
        )}
      </div>
    </div>
  )
}
