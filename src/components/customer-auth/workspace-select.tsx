'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './icon'

export function WorkspaceSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  name,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  name?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <span
        id={id + '-label'}
        className="mb-2 block text-xs font-semibold tracking-wide text-muted-foreground"
      >
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-labelledby={id + '-label ' + id + '-value'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5 text-left text-sm font-medium transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        <span id={id + '-value'} className="truncate">
          {options.find((option) => option.value === value)?.label}
        </span>
        <Icon
          name="chevron"
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        ref={list}
        id={id}
        role="listbox"
        aria-labelledby={id + '-label'}
        inert={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
          }
          const buttons = Array.from(
            list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || [],
          )
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
            buttons[next]?.focus()
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            event.key !== ' '
          ) {
            buttons
              .find((button) =>
                button.textContent?.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()),
              )
              ?.focus()
          }
        }}
        className={`absolute inset-x-0 top-full z-40 mt-2 max-h-64 origin-top overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-nav transition-[opacity,transform,visibility] duration-200 motion-reduce:transition-none ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-2 scale-95 opacity-0'}`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            tabIndex={-1}
            onClick={() => {
              onChange(option.value)
              close()
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none ${option.value === value ? 'bg-primary/15 font-semibold text-brand-ink' : ''}`}
          >
            <span className="break-words">{option.label}</span>
            {option.value === value && <Icon name="check" className="size-4" />}
          </button>
        ))}
      </div>
    </div>
  )
}
