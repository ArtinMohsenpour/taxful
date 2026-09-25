export type IconName =
  | 'billing'
  | 'overview'
  | 'converter'
  | 'files'
  | 'team'
  | 'profile'
  | 'security'
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
      className={`inline-block size-5 shrink-0 bg-current ${className}`}
      style={{
        mask: `url("/icons/${name}.svg") center / contain no-repeat`,
        WebkitMask: `url("/icons/${name}.svg") center / contain no-repeat`,
      }}
    />
  )
}
