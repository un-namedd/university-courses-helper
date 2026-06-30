import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { PlanRow } from '../lib/plans'
import { loadSharedPlan } from '../lib/plans'
import { loadCourses, loadProgram } from '../lib/courseData'
import { creditsFor, getProgram, setActiveProgram, titleFor } from '../lib/program'
import { allocate } from '../lib/allocate'
import { round } from '../lib/format'
import { ProgressBar } from '../components/ProgressBar'
import { LegalFooterLinks } from '../components/legal/LegalFooterLinks'
import { colorForIndex, EXTRA_COLOR, shortLabel } from '../components/bucketMeta'

type Status = 'loading' | 'ready' | 'notfound' | 'error'

export function SharedPlanView() {
  const { shareId } = useParams<{ shareId: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [row, setRow] = useState<PlanRow | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    async function run() {
      try {
        await loadCourses()
        const found = shareId ? await loadSharedPlan(shareId) : null
        if (!active) return
        if (!found) {
          setStatus('notfound')
          return
        }
        const program = await loadProgram(found.program_id)
        setActiveProgram(program)
        if (!active) return
        setRow(found)
        setStatus('ready')
      } catch (e) {
        if (!active) return
        setMessage(e instanceof Error ? e.message : 'Could not load this plan.')
        setStatus('error')
      }
    }
    run()
    return () => {
      active = false
    }
  }, [shareId])

  const program = getProgram()
  const allocation = useMemo(() => {
    if (status !== 'ready' || !row || !program) return null
    return allocate(program, row.state.placed, row.aoe_id)
  }, [status, row, program])

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="flex items-center gap-3 text-sm opacity-70">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading shared plan…
        </div>
      </div>
    )
  }

  if (status !== 'ready' || !row || !allocation || !program) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-fg">
            {status === 'notfound' ? 'Plan not found' : 'Something went wrong'}
          </p>
          <p className="mt-2 text-sm text-muted">
            {status === 'notfound'
              ? 'This share link is invalid or the plan is no longer public.'
              : message}
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            Open the planner
          </Link>
        </div>
      </div>
    )
  }

  const badgeFor = (bucketId: string) => {
    const i = allocation.buckets.findIndex((b) => b.id === bucketId)
    if (i < 0) return { label: 'Extra', chip: EXTRA_COLOR.chip }
    return { label: shortLabel(allocation.buckets[i].name), chip: colorForIndex(i).chip }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-6 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-lg font-bold text-accent-fg">
            G
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-fg">{row.name}</h1>
            <p className="text-xs text-muted">
              {program.name}
              {program.degree ? ` · ${program.degree}` : ''} · read-only
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-fg">
                {round(allocation.totalEarned)}{' '}
                <span className="text-faint">/ {round(allocation.totalRequired)} cr</span>
              </div>
            </div>
            <Link
              to="/"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong"
            >
              Make your own
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 px-6 py-7 lg:grid-cols-[minmax(340px,400px)_1fr] lg:gap-7">
        <aside className="space-y-4">
          {allocation.buckets.map((b, i) => {
            const meta = colorForIndex(i)
            return (
              <div key={b.id} className="panel p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={'text-sm font-semibold ' + meta.text}>{b.name}</span>
                  <span className="text-xs text-muted">
                    {round(b.earnedCredits)} / {round(b.requiredCredits)}
                  </span>
                </div>
                <ProgressBar
                  earned={b.earnedCredits}
                  required={b.requiredCredits}
                  barClass={meta.bar}
                />
              </div>
            )
          })}
        </aside>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {row.state.terms.map((term) => {
            const courses = row.state.placed.filter((p) => p.termId === term.id)
            const termCredits = courses.reduce(
              (t, c) => t + (c.custom ? c.customCredits ?? 0.5 : creditsFor(c.code)),
              0,
            )
            return (
              <div key={term.id} className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-fg">{term.label}</h3>
                  <span className="text-xs text-muted">{round(termCredits)} cr</span>
                </div>
                <div className="space-y-2">
                  {courses.map((c) => {
                    const badge = badgeFor(allocation.byCourse[c.id] ?? 'extra')
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-fg">
                            {c.custom ? c.customTitle ?? c.code : c.code}
                          </span>
                          <span className="block truncate text-[11px] text-faint">
                            {c.custom ? 'Custom' : titleFor(c.code)}
                          </span>
                        </div>
                        <span
                          className={'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ' + badge.chip}
                        >
                          {badge.label}
                        </span>
                      </div>
                    )
                  })}
                  {courses.length === 0 && (
                    <p className="py-2 text-center text-xs text-faint">No courses</p>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      </main>

      <footer className="border-t border-line py-6">
        <LegalFooterLinks />
      </footer>
    </div>
  )
}
