import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BucketId, PlacedCourse } from '../types'
import type { Warning } from '../lib/validate'
import type { GroupMeta, PinOption } from '../App'
import { creditsFor } from '../lib/program'
import { round } from '../lib/format'
import { usePlan } from '../store'
import { EXTRA_COLOR } from './bucketMeta'
import { COURSE_PIN_EXPAND_PX } from './courseCardExpand'
import { CloseIcon, WarnIcon } from './icons'

interface Props {
  pc: PlacedCourse
  bucket: BucketId | 'extra'
  warnings: Warning[]
  groupMeta: Record<string, GroupMeta>
  pinOptions: PinOption[]
  onPinHoverChange?: (open: boolean) => void
}

/** Stop dnd-kit from starting a drag when interacting with a control. */
const stop = (e: React.PointerEvent) => e.stopPropagation()

function canFinePointerHover() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

export function CourseCard({
  pc,
  bucket,
  warnings,
  groupMeta,
  pinOptions,
  onPinHoverChange,
}: Props) {
  const removeCourse = usePlan((s) => s.removeCourse)
  const setPin = usePlan((s) => s.setPin)
  const setOpenCourse = usePlan((s) => s.setOpenCourse)

  const [pinOpen, setPinOpen] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pc.id, data: { type: 'placed', termId: pc.termId } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const label = pc.custom ? pc.customTitle ?? pc.code : pc.code
  const credits = pc.custom ? pc.customCredits ?? 0.5 : creditsFor(pc.code)
  const meta = groupMeta[bucket] ?? { label: 'Extra', chip: EXTRA_COLOR.chip }
  const hasWarn = warnings.length > 0

  const borderRest = hasWarn ? 'border-amber-400/60' : 'border-line'
  const borderHover = hasWarn ? 'border-amber-400' : 'border-accent/50'

  function setPinExpanded(open: boolean) {
    setPinOpen(open)
    onPinHoverChange?.(open)
  }

  function clearHoverTimer() {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  useEffect(() => {
    if (isDragging) setPinExpanded(false)
    return () => clearHoverTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

  function onCardPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.target as HTMLElement
    if (el.closest('button, select, [data-course-pin]')) {
      listeners?.onPointerDown?.(e)
      return
    }
    clearHoverTimer()
    setPinExpanded(false)
    listeners?.onPointerDown?.(e)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={
        'group/card relative touch-none active:cursor-grabbing ' +
        (isDragging ? 'z-30 cursor-grabbing opacity-60 ' : 'cursor-grab') +
        (pinOpen ? ' z-20' : '')
      }
      onPointerDown={onCardPointerDown}
      onMouseEnter={() => {
        if (!canFinePointerHover()) return
        clearHoverTimer()
        hoverTimerRef.current = setTimeout(() => setPinExpanded(true), 180)
      }}
      onMouseLeave={() => {
        if (!canFinePointerHover()) return
        clearHoverTimer()
        setPinExpanded(false)
      }}
    >
      <div
        className={
          'rounded-2xl border bg-surface px-3.5 py-3 shadow-sm ' +
          borderRest +
          (pinOpen ? ' rounded-b-none border-b-transparent ' + borderHover : '')
        }
      >
        <div className="flex items-center gap-2">
          {pc.custom ? (
            <span className="min-w-0 flex-1 truncate font-semibold tracking-wide text-fg">
              {label}
            </span>
          ) : (
            <button
              onPointerDown={stop}
              onClick={() => setOpenCourse(pc.code)}
              className="shrink-0 font-semibold tracking-wide text-fg transition hover:text-accent"
            >
              {pc.code}
            </button>
          )}

          {!pc.custom && <span className="min-w-0 flex-1" />}

          <span
            className={
              'min-w-0 max-w-[45%] shrink truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ' +
              meta.chip
            }
            title={meta.label}
          >
            {meta.label}
          </span>
          <span className="shrink-0 text-xs text-faint">{round(credits)} cr</span>

          <button
            onPointerDown={stop}
            onClick={() => removeCourse(pc.id)}
            className={
              'shrink-0 text-faint transition hover:text-rose-500 ' +
              (pinOpen ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100')
            }
            aria-label="Remove course"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {hasWarn && (
          <ul className="mt-2.5 space-y-1">
            {warnings.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-300"
              >
                <WarnIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pinOpen && (
        <div
          data-course-pin
          className={
            'absolute inset-x-0 top-full z-10 -mt-px flex items-center gap-1.5 rounded-b-2xl border border-t-0 bg-surface px-3.5 ' +
            borderRest +
            ' ' +
            borderHover
          }
          style={{ height: COURSE_PIN_EXPAND_PX }}
          onPointerDown={stop}
        >
          <span className="text-[10px] uppercase tracking-wider text-faint">
            count as
          </span>
          <select
            value={pc.pin ?? ''}
            onPointerDown={stop}
            onChange={(e) =>
              setPin(pc.id, (e.target.value || undefined) as BucketId | undefined)
            }
            className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted outline-none focus:border-accent/60"
          >
            <option value="">auto</option>
            {pinOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
