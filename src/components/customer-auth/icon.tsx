export type IconName =
  | 'billing'
  | 'overview'
  | 'converter'
  | 'files'
  | 'outgoing-invoices'
  | 'incoming-invoices'
  | 'team'
  | 'profile'
  | 'security'
  | 'passkey'
  | 'recovery-codes'
  | 'logout'
  | 'company'
  | 'chevron'
  | 'check'
  | 'arrow'
  | 'menu'
  | 'preview'
  | 'trash'
  | 'close'
  | 'download'
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${/(^|\s)size-/.test(className) ? '' : 'size-5'} ${className}`}
      style={{
        mask: `url("/icons/${name}.svg") center / contain no-repeat`,
        WebkitMask: `url("/icons/${name}.svg") center / contain no-repeat`,
      }}
    />
  )
}
