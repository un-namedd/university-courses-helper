import { useState } from 'react'
import type { BucketProgress } from '../lib/allocate'
import type { PlacedCourse } from '../types'
import { round } from '../lib/format'
import { usePlan } from '../store'
import { ProgressBar, CreditTag } from './ProgressBar'
import { ReqCourseChip } from './ReqCourseChip'
import { colorForIndex } from './bucketMeta'
import { ChevronIcon } from './icons'

interface Props {
  buckets: BucketProgress[]
  takenCodes: Set<string>
  placedById: Map<string, PlacedCourse>
  variant?: 'sidebar' | 'top'
}

export function RequirementsPanel({
  buckets,
  takenCodes,
  placedById,
  variant = 'sidebar',
}: Props) {
  if (variant === 'top') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {buckets.map((b, i) => {
          const meta = colorForIndex(i)
          return (
            <div key={b.id} className="panel p-4">
              <div className="flex items-center gap-2">
                <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + meta.bar} />
                <h3 className="truncate text-sm font-semibold text-fg">{b.name}</h3>
              </div>
              <div className="mt-3">
                <ProgressBar
                  earned={b.earnedCredits}
                  required={b.requiredCredits}
                  barClass={meta.bar}
                  size="sm"
                />
              </div>
              <div className="mt-2">
                <CreditTag
                  earned={b.earnedCredits}
                  required={b.requiredCredits}
                  accent={meta.text}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {buckets.map((b, i) => (
        <BucketSection
          key={b.id}
          bucket={b}
          index={i}
          takenCodes={takenCodes}
          placedById={placedById}
        />
      ))}
    </div>
  )
}

function BucketSection({
  bucket,
  index,
  takenCodes,
  placedById,
}: {
  bucket: BucketProgress
  index: number
  takenCodes: Set<string>
  placedById: Map<string, PlacedCourse>
}) {
  const [open, setOpen] = useState(true)
  const setOpenCourse = usePlan((s) => s.setOpenCourse)
  const meta = colorForIndex(index)

  const countingCodes = bucket.courseIds
    .map((id) => placedById.get(id)?.code)
    .filter((c): c is string => Boolean(c))

  // Match-based groups (subject/level electives, free electives) have no fixed
  // course list, so show the courses currently counted toward them instead.
  const hasMatch = Boolean(bucket.match)

  return (
    <section className="panel overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 pt-5"
      >
        <span className={'h-3 w-3 shrink-0 rounded-full ' + meta.bar} />
        <h3 className="flex-1 text-left text-[15px] font-semibold text-fg">
          {bucket.name}
        </h3>
        <CreditTag
          earned={bucket.earnedCredits}
          required={bucket.requiredCredits}
          accent={meta.text}
        />
        <ChevronIcon
          className={
            'h-4 w-4 shrink-0 text-faint transition-transform ' +
            (open ? 'rotate-180' : '')
          }
        />
      </button>

      <div className="px-5 pb-5 pt-3">
        <ProgressBar
          earned={bucket.earnedCredits}
          required={bucket.requiredCredits}
          barClass={meta.bar}
        />

        {open && (
          <div className="mt-4 space-y-4">
            <p className="text-xs leading-relaxed text-muted">{bucket.description}</p>

            {bucket.named.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {bucket.named.map((code) => (
                  <ReqCourseChip
                    key={code}
                    code={code}
                    context={bucket.id}
                    taken={takenCodes.has(code)}
                  />
                ))}
              </div>
            )}

            {bucket.selectFrom.map((group, gi) => (
              <div key={gi} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-fg">
                    {round(group.credits)} credits from:
                  </span>
                  <span className="text-[11px] text-faint">{group.label}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {group.options.map((code) => (
                    <ReqCourseChip
                      key={code}
                      code={code}
                      context={`${bucket.id}-${gi}`}
                      taken={takenCodes.has(code)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMatch && (
              <div>
                {countingCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {countingCodes.map((code, i) => (
                      <button
                        key={`${code}-${i}`}
                        onClick={() => setOpenCourse(code)}
                        className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg transition hover:text-accent"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-faint">
                    No courses counted yet. Add courses in the planner and they
                    will be allocated here automatically.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
