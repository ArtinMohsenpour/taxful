import type { WebsiteForm } from '@/lib/website/types'

export function WebsiteFormField({
  field,
  prefix,
  invalid,
}: {
  field: WebsiteForm['fields'][number]
  prefix: string
  invalid: boolean
}) {
  const id = `${prefix}-${field.key}`
  const shared = {
    id,
    name: field.key,
    required: field.required || false,
    'aria-invalid': invalid || undefined,
    'aria-describedby': field.help ? `${id}-help` : undefined,
  }
  const className =
    'min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary'
  return (
    <div>
      {field.type === 'checkbox' ? (
        <label
          htmlFor={id}
          className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
        >
          <input {...shared} type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" />{' '}
          <span>
            {field.label}
            {field.required ? ' *' : ''}
          </span>
        </label>
      ) : (
        <>
          <label htmlFor={id} className="mb-2 block text-sm font-medium">
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          {field.type === 'textarea' ? (
            <textarea {...shared} rows={5} maxLength={5000} className={`${className} resize-y`} />
          ) : field.type === 'select' ? (
            <select {...shared} className={className} defaultValue="">
              <option value="">—</option>
              {field.options?.map((option) => (
                <option key={option.id || option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              {...shared}
              type={field.type === 'email' ? 'email' : 'text'}
              autoComplete={field.type === 'email' ? 'email' : 'off'}
              maxLength={field.type === 'email' ? 254 : 300}
              className={className}
            />
          )}
        </>
      )}
      {field.help && (
        <p id={`${id}-help`} className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {field.help}
        </p>
      )}
    </div>
  )
}
