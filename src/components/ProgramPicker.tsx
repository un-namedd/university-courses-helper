import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProgramSummary } from '../types'
import { loadProgramsIndex } from '../lib/courseData'
import { usePlan } from '../store'
import { ChevronIcon } from './icons'

export function ProgramPicker() {
  const programId = usePlan((s) => s.programId)
  const setProgram = usePlan((s) => s.setProgram)

  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProgramsIndex().then(setPrograms).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const current = programs.find((p) => p.id === programId)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return programs
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.degree.toLowerCase().includes(q),
    )
  }, [programs, query])

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => {
          setOpen((o) => !o)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-sm text-fg outline-none transition hover:border-accent/60 sm:min-w-[230px] sm:w-auto"
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {current ? current.name : 'Select a program…'}
        </span>
        <ChevronIcon className="h-4 w-4 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-[320px] max-w-[80vw] rounded-2xl border border-line bg-surface p-2 shadow-xl">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs…"
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/60"
          />
          <div className="mt-2 max-h-72 space-y-0.5 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProgram(p.id)
                  setOpen(false)
                  setQuery('')
                }}
                className={
                  'flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-elevated ' +
                  (p.id === programId ? 'bg-accent-soft' : '')
                }
              >
                <span className="text-sm font-medium text-fg">{p.name}</span>
                {p.degree && (
                  <span className="text-xs text-faint">{p.degree}</span>
                )}
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-2 text-xs text-faint">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
