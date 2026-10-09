import type { SVGProps } from 'react'

export function TaxfulMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect width="64" height="64" rx="20" className="fill-primary" />
      <path
        d="M23 15h8v11h9v8h-9v9c0 4 2 6 6 6h3v8h-4c-9 0-13-5-13-14v-9h-7v-8h7V15Z"
        transform="translate(0 -4)"
        className="fill-primary-foreground"
      />
      <circle cx="48" cy="49" r="4" className="fill-primary-foreground" />
    </svg>
  )
}
