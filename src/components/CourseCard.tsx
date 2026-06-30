import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BucketId, PlacedCourse } from '../types'
import type { Warning } from '../lib/validate'
import type { GroupMeta, PinOption } from '../App'
import { creditsFor } from '../lib/program'
import { round } from '../lib/format'
import { usePlan } from '../store'
import { EXTRA_COLOR } from './bucketMeta'
import { CloseIcon, WarnIcon } from './icons'

interface Props {
  pc: PlacedCourse
  bucket: BucketId | 'extra'
  warnings: Warning[]
  groupMeta: Record<string, GroupMeta>
  pinOptions: PinOption[]
}

/** Stop dnd-kit from starting a drag when interacting with a control. */
const stop = (e: React.PointerEvent) => e.stopPropagation()

export function CourseCard({ pc, bucket, warnings, groupMeta, pinOptions }: Props) {
  const removeCourse = usePlan((s) => s.removeCourse)
  const setPin = usePlan((s) => s.setPin)
  const setOpenCourse = usePlan((s) => s.setOpenCourse)

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={
        'group cursor-grab touch-none rounded-2xl border bg-surface px-3.5 py-3 shadow-sm transition active:cursor-grabbing ' +
        (isDragging ? 'z-10 opacity-60 ' : '') +
        (hasWarn
          ? 'border-amber-400/60'
          : 'border-line hover:border-accent/50')
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
          className={'min-w-0 max-w-[45%] shrink truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ' + meta.chip}
          title={meta.label}
        >
          {meta.label}
        </span>
        <span className="shrink-0 text-xs text-faint">{round(credits)} cr</span>

        <button
          onPointerDown={stop}
          onClick={() => removeCourse(pc.id)}
          className="shrink-0 text-faint opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
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

      <div className="mt-2 flex items-center gap-1.5 invisible group-hover:visible">
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
    </div>
  )
}
