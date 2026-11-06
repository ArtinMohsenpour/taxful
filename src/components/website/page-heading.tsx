export function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string | null
  title?: string | null
  subtitle?: string | null
}) {
  if (![eyebrow, title, subtitle].some((value) => value?.trim())) return null
  return (
    <header className="mx-auto max-w-3xl py-14 text-center sm:py-20">
      {eyebrow?.trim() && (
        <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-brand-ink uppercase">
          {eyebrow}
        </p>
      )}
      {title?.trim() && (
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {title}
        </h1>
      )}
      {subtitle?.trim() && (
        <p
          className={`${title || eyebrow ? 'mt-5' : ''} text-lg leading-relaxed text-pretty text-muted-foreground`}
        >
          {subtitle}
        </p>
      )}
    </header>
  )
}
