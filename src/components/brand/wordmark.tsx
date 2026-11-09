// Default Taxful branding, used when no logo has been uploaded in the CMS.
export function TaxfulWordmark() {
  return (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-[0.9rem] bg-primary text-xl font-semibold text-primary-foreground"
      >
        t.
      </span>
      <span className="text-[1.65rem] font-semibold tracking-[-0.065em] text-foreground">
        taxful<span className="text-brand-ink">.</span>
      </span>
    </>
  )
}
