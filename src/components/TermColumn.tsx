import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BucketId, PlacedCourse, ProgramTerm, Season } from '../types'
import type { Warning } from '../lib/validate'
import type { GroupMeta, PinOption } from '../App'
import { creditsFor } from '../lib/program'
import { round } from '../lib/format'
import { usePlan } from '../store'
import { CourseCard } from './CourseCard'
import { COURSE_PIN_EXPAND_PX } from './courseCardExpand'
import { AddCourseButton } from './AddCourseButton'
import { CalendarIcon, TrashIcon } from './icons'

const SEASONS: Season[] = ['Fall', 'Winter', 'Summer']

interface Props {
  term: ProgramTerm
  courses: PlacedCourse[]
  byCourse: Record<string, BucketId | 'extra'>
  warnings: Record<string, Warning[]>
  groupMeta: Record<string, GroupMeta>
  pinOptions: PinOption[]
}

export function TermColumn({
  term,
  courses,
  byCourse,
  warnings,
  groupMeta,
  pinOptions,
}: Props) {
  const renameTerm = usePlan((s) => s.renameTerm)
  const setTermSeason = usePlan((s) => s.setTermSeason)
  const removeTerm = usePlan((s) => s.removeTerm)

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)
  const expandedIndex =
    expandedCourseId !== null
      ? courses.findIndex((c) => c.id === expandedCourseId)
      : -1

  const { setNodeRef, isOver } = useDroppable({
    id: `term:${term.id}`,
    data: { type: 'term', termId: term.id },
  })

  const planned = courses.reduce(
    (t, c) => t + (c.custom ? c.customCredits ?? 0.5 : creditsFor(c.code)),
    0,
  )

  return (
    <div
      className={
        'panel flex h-full min-h-0 flex-col p-3 sm:p-4 ' +
        (isOver ? 'ring-2 ring-accent/60' : '')
      }
    >
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <CalendarIcon className="h-4 w-4 shrink-0 text-accent" />
        <input
          value={term.label}
          onChange={(e) => renameTerm(term.id, e.target.value)}
          className="min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold text-fg outline-none focus:bg-surface-2 focus:px-1.5 focus:py-0.5"
        />
        <select
          value={term.season}
          onChange={(e) => setTermSeason(term.id, e.target.value as Season)}
          className="rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[11px] text-muted outline-none focus:border-accent/60"
        >
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => removeTerm(term.id)}
          className="shrink-0 text-faint transition hover:text-rose-500"
          aria-label="Delete term"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[48px] flex-1 flex-col"
      >
        <div className="flex flex-col gap-2.5">
          <SortableContext
            items={courses.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {courses.map((c, i) => {
              const shiftDown = expandedIndex >= 0 && i > expandedIndex
              return (
                <div
                  key={c.id}
                  style={{
                    transform: shiftDown
                      ? `translateY(${COURSE_PIN_EXPAND_PX}px)`
                      : undefined,
                  }}
                >
                  <CourseCard
                    pc={c}
                    bucket={byCourse[c.id] ?? 'extra'}
                    warnings={warnings[c.id] ?? []}
                    groupMeta={groupMeta}
                    pinOptions={pinOptions}
                    onPinHoverChange={(open) =>
                      setExpandedCourseId(open ? c.id : null)
                    }
                  />
                </div>
              )
            })}
          </SortableContext>

          {courses.length === 0 && (
            <p className="rounded-xl border border-dashed border-line py-4 text-center text-xs text-faint">
              Drag courses here
            </p>
          )}
        </div>

        {courses.length > 0 && (
          <div
            className="mt-auto shrink-0"
            style={{ height: COURSE_PIN_EXPAND_PX }}
            aria-hidden
          />
        )}
      </div>

      <div className="shrink-0 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">
            {round(planned)} planned cr
          </span>
        </div>
        <div className="mt-2.5">
          <AddCourseButton termId={term.id} />
        </div>
      </div>
    </div>
  )
}
