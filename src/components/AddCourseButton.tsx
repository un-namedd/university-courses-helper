import { useMemo, useRef, useState } from 'react'
import { allCodes, creditsFor, titleFor } from '../lib/program'
import { usePlan } from '../store'
import { PlusIcon } from './icons'

export function AddCourseButton({ termId }: { termId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [customCredits, setCustomCredits] = useState('0.5')
  const addCourse = usePlan((s) => s.addCourse)
  const addCustom = usePlan((s) => s.addCustom)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const codes = allCodes()
    const raw = query.trim().toLowerCase()
    if (!raw) return codes.slice(0, 8)
    // Match codes ignoring the "*" and spaces, so "stat 2040" finds "STAT*2040".
    const compact = raw.replace(/[^a-z0-9]/g, '')
    return codes
      .filter(
        (c) =>
          c.toLowerCase().replace(/[^a-z0-9]/g, '').includes(compact) ||
          titleFor(c).toLowerCase().includes(raw),
      )
      .slice(0, 12)
  }, [query])

  function add(code: string) {
    addCourse(code, termId)
    setQuery('')
    setOpen(false)
  }

  function addCustomCourse() {
    const title = customTitle.trim()
    const credits = parseFloat(customCredits) || 0.5
    if (!title) return
    addCustom(termId, title, credits)
    setCustomTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-medium text-muted transition hover:border-accent/60 hover:text-accent"
      >
        <PlusIcon className="h-4 w-4" /> Add Course
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-2.5">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search code or title…"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/60"
      />

      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {results.map((code) => (
          <button
            key={code}
            onClick={() => add(code)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg transition hover:bg-elevated"
          >
            <span className="font-semibold text-accent">{code}</span>
            <span className="truncate text-xs text-faint">{titleFor(code)}</span>
            <span className="ml-auto shrink-0 text-xs text-faint">
              {creditsFor(code)} cr
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-faint">No matches.</p>
        )}
      </div>

      <div className="mt-2.5 border-t border-line pt-2.5">
        <p className="mb-1.5 text-[10px] uppercase tracking-wider text-faint">
          Or add a custom elective
        </p>
        <div className="flex gap-1.5">
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Course name"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/60"
          />
          <input
            value={customCredits}
            onChange={(e) => setCustomCredits(e.target.value)}
            inputMode="decimal"
            className="w-14 rounded-lg border border-line bg-surface px-2 py-2 text-sm text-fg outline-none focus:border-accent/60"
          />
          <button
            onClick={addCustomCourse}
            className="shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
          >
            Add
          </button>
        </div>
      </div>

      <button
        onClick={() => setOpen(false)}
        className="mt-2 w-full rounded-lg py-1.5 text-xs text-muted transition hover:text-fg"
      >
        Cancel
      </button>
    </div>
  )
}
