import { useDraggable } from '@dnd-kit/core'
import { creditsFor, titleFor } from '../lib/program'
import { round } from '../lib/format'
import { usePlan } from '../store'

interface Props {
  code: string
  context: string
  taken: boolean
}

export function ReqCourseChip({ code, context, taken }: Props) {
  const setOpenCourse = usePlan((s) => s.setOpenCourse)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `req:${context}:${code}`,
    data: { type: 'req', code },
    disabled: taken,
  })

  return (
    <div
      ref={setNodeRef}
      {...(taken ? {} : listeners)}
      {...attributes}
      title={titleFor(code)}
      className={
        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ' +
        (taken
          ? 'border-line/60 bg-surface-2/60 text-faint'
          : 'cursor-grab touch-none border-line bg-surface-2 text-fg hover:border-accent/60 active:cursor-grabbing') +
        (isDragging ? ' opacity-40' : '')
      }
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpenCourse(code)}
        className={
          'font-semibold tracking-wide transition ' +
          (taken ? 'text-faint hover:text-muted' : 'text-fg hover:text-accent')
        }
      >
        {code}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-faint">
        {titleFor(code)}
      </span>
      {taken ? (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent">
          added
        </span>
      ) : (
        <span className="shrink-0 text-xs text-faint">
          {round(creditsFor(code))} cr
        </span>
      )}
    </div>
  )
}
