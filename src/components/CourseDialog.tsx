import { useEffect } from 'react'
import { usePlan } from '../store'
import { getCourse } from '../lib/program'
import { round } from '../lib/format'
import { CloseIcon } from './icons'

export function CourseDialog() {
  const code = usePlan((s) => s.openCourse)
  const setOpenCourse = usePlan((s) => s.setOpenCourse)

  useEffect(() => {
    if (!code) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCourse(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [code, setOpenCourse])

  if (!code) return null
  const course = getCourse(code)
  const close = () => setOpenCourse(null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={`${code} details`}
    >
      <div
        className="panel my-auto w-full max-w-2xl p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-xl font-bold tracking-wide text-accent">{code}</h2>
              {course && (
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {round(course.credits)} credits
                </span>
              )}
            </div>
            <p className="mt-1 text-lg font-semibold text-fg">
              {course?.title ?? 'Course not found in catalog'}
            </p>
          </div>
          <button
            onClick={close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!course ? (
          <p className="mt-4 text-sm text-muted">
            No catalog entry is available for this course code.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {course.offerings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {course.offerings.map((o) => (
                  <span
                    key={o}
                    className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}

            {course.description && (
              <Field label="Description">
                <p className="leading-relaxed">{course.description}</p>
              </Field>
            )}

            {course.prerequisites.raw && (
              <Field label="Prerequisites">
                <p className="leading-relaxed">{course.prerequisites.raw}</p>
                {course.prerequisites.groups.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {course.prerequisites.groups.map((g, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-muted"
                      >
                        {g.join(' or ')}
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            )}

            {course.restriction && (
              <Field label="Restrictions">
                <p className="leading-relaxed">{course.restriction}</p>
              </Field>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {course.department && (
                <Field label="Department">
                  <p>{course.department}</p>
                </Field>
              )}
              {course.location && (
                <Field label="Location">
                  <p>{course.location}</p>
                </Field>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </h3>
      <div className="text-sm text-fg">{children}</div>
    </div>
  )
}
