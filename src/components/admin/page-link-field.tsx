'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { TextFieldClientComponent } from 'payload'
import {
  FieldDescription,
  FieldError,
  FieldLabel,
  useField,
  useLocale,
  withCondition,
} from '@payloadcms/ui'
import {
  normalizeLinkPath,
  type LinkTarget,
  type LinkTargetGroup,
} from '@/lib/website/link-targets'
import styles from './page-link-field.module.css'

// One request per locale, shared by every link field on the page. Results expire
// after a minute so new or published pages appear; failures are never kept.
const CACHE_MS = 60_000
const targetCache = new Map<string, { at: number; groups: Promise<LinkTargetGroup[]> }>()
function loadTargets(locale: string) {
  const cached = targetCache.get(locale)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.groups
  const groups = fetch(`/api/link-targets?locale=${locale === 'en' ? 'en' : 'de'}`, {
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Link targets: ${response.status}`)
      return response.json() as Promise<{ groups?: LinkTargetGroup[] }>
    })
    .then((body) => body.groups ?? [])
    .catch(() => {
      targetCache.delete(locale)
      return []
    })
  targetCache.set(locale, { at: Date.now(), groups })
  return groups
}

type Entry = LinkTarget & { group: string; groupId: string; id: string }

const matches = (entry: Entry, query: string) => {
  const needle = query.trim().toLowerCase()
  return (
    !needle ||
    entry.label.toLowerCase().includes(needle) ||
    entry.path.toLowerCase().includes(needle)
  )
}

const PageLinkFieldComponent: TextFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly,
  validate,
}) => {
  const { label, required, localized, admin } = field
  const memoizedValidate = useCallback(
    (value: unknown, options: Record<string, unknown>) =>
      typeof validate === 'function'
        ? validate(value as string, { ...options, required } as never)
        : true,
    [validate, required],
  )
  const { path, value, setValue, showError, disabled } = useField<string>({
    potentiallyStalePath: pathFromProps,
    validate: memoizedValidate,
  })
  const locale = useLocale()
  const [groups, setGroups] = useState<LinkTargetGroup[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  // -1 means nothing is highlighted, so Enter keeps what the editor typed.
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  const listId = `${id}-pages`
  const locked = readOnly || disabled

  useEffect(() => {
    let current = true
    loadTargets(locale?.code ?? 'de').then((result) => {
      if (!current) return
      setGroups(result)
      setLoaded(true)
    })
    return () => {
      current = false
    }
  }, [locale?.code])

  const entries = useMemo<Entry[]>(
    () =>
      groups.flatMap((group) =>
        group.options.map((option) => ({
          ...option,
          group: group.label,
          groupId: group.id,
          id: `${id}-${group.id}-${option.path.replace(/[^a-z0-9]+/gi, '-')}`,
        })),
      ),
    [groups, id],
  )
  // Filter only while typing; reopening a chosen page shows every option.
  const visible = useMemo(
    () => (query === null ? entries : entries.filter((entry) => matches(entry, query))),
    [entries, query],
  )
  const current = normalizeLinkPath(value)
  const selected = entries.find((entry) => entry.path === current)
  const section = (value ?? '').match(/#[^?]*$/)?.[0]

  useEffect(() => {
    if (!open) return
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])

  const openList = () => {
    if (locked) return
    setOpen(true)
    // Highlight the chosen page when browsing; nothing while a typed filter is active.
    setActive(query === null ? entries.findIndex((entry) => entry.path === current) : -1)
  }
  const choose = (entry: Entry) => {
    setValue(entry.path)
    setQuery(null)
    // Focus stays in the input: the list cancels mousedown.
    setOpen(false)
  }

  const grouped = useMemo(() => {
    const result: { id: string; label: string; items: { entry: Entry; index: number }[] }[] = []
    visible.forEach((entry, index) => {
      const last = result.at(-1)
      if (last?.id === entry.groupId) last.items.push({ entry, index })
      else result.push({ id: entry.groupId, label: entry.group, items: [{ entry, index }] })
    })
    return result
  }, [visible])

  const typed = (query ?? '').trim()
  const hint = selected ? (
    <span className={styles.hintMatch}>
      <span aria-hidden="true">✓</span> {selected.label}
      <span className={styles.hintGroup}> · {selected.group}</span>
      {section && <span className={styles.hintGroup}> · section {section}</span>}
      {selected.status === 'draft' && (
        <span className={styles.hintWarning}>
          {' '}
          — draft, visitors get “page not found” until it is published.
        </span>
      )}
    </span>
  ) : current ? (
    <span className={styles.hintCustom}>
      Custom path — not in the page list. Check that the page exists.
    </span>
  ) : null

  return (
    <div className={`field-type text ${styles.field}`}>
      <FieldLabel label={label} localized={localized} path={path} required={required} />
      <div className={`field-type__wrap ${styles.wrap}`}>
        <FieldError path={path} showError={showError} />
        <div className={styles.control} data-open={open || undefined}>
          <input
            ref={input}
            id={`field-${path.replace(/\./g, '__')}`}
            name={path}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? visible[active]?.id : undefined}
            disabled={locked}
            placeholder="Choose a page or type a path, e.g. /about"
            value={value ?? ''}
            className={styles.input}
            onFocus={openList}
            onClick={openList}
            onChange={(event) => {
              setValue(event.target.value)
              setQuery(event.target.value)
              setActive(-1)
              setOpen(true)
            }}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                setOpen(false)
                setQuery(null)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                if (!open) return openList()
                const count = visible.length
                if (!count) return
                setActive((index) =>
                  event.key === 'ArrowDown'
                    ? (index + 1) % count
                    : index <= 0
                      ? count - 1
                      : index - 1,
                )
              } else if (event.key === 'Enter' && open) {
                // Keep the form from submitting; Enter without a match keeps the typed path.
                event.preventDefault()
                if (visible[active]) choose(visible[active])
                else {
                  setOpen(false)
                  setQuery(null)
                }
              } else if (event.key === 'Escape' && open) {
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
                setQuery(null)
              }
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? 'Close page list' : 'Show page list'}
            className={styles.toggle}
            disabled={locked}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (open) setOpen(false)
              else {
                setQuery(null)
                input.current?.focus()
                openList()
              }
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
          {open && (
            <div
              ref={list}
              id={listId}
              role="listbox"
              aria-label="Pages"
              className={styles.list}
              onMouseDown={(event) => event.preventDefault()}
            >
              {!loaded && <p className={styles.empty}>Loading pages…</p>}
              {loaded &&
                grouped.map((group) => (
                  <div
                    key={group.id}
                    role="group"
                    aria-labelledby={`${id}-group-${group.id}`}
                    className={styles.group}
                  >
                    <div id={`${id}-group-${group.id}`} className={styles.groupLabel}>
                      {group.label}
                    </div>
                    {group.items.map(({ entry, index }) => (
                      <div
                        key={entry.id}
                        id={entry.id}
                        role="option"
                        aria-selected={entry.path === current}
                        data-index={index}
                        data-active={index === active || undefined}
                        className={styles.option}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => choose(entry)}
                      >
                        <span className={styles.optionText}>
                          <span className={styles.optionLabel}>{entry.label}</span>
                          <span className={styles.optionPath}>{entry.path}</span>
                        </span>
                        {entry.status === 'draft' && <span className={styles.badge}>Draft</span>}
                        {entry.path === current && (
                          <span className={styles.check} aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              {loaded && !visible.length && (
                <p className={styles.empty}>
                  No page matches “{typed}”. Press Enter to keep it as a custom path.
                </p>
              )}
              {loaded && typed && visible.length > 0 && !selected && (
                <p className={styles.footer}>
                  Press Enter to keep “{typed}” as a custom path, or choose a page.
                </p>
              )}
            </div>
          )}
        </div>
        {hint && <div className={styles.hint}>{hint}</div>}
        <FieldDescription description={admin?.description} path={path} />
      </div>
    </div>
  )
}

export default withCondition(PageLinkFieldComponent)
