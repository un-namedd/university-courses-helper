import type { BucketId, PlacedCourse } from '../types'
import type { Warning } from '../lib/validate'
import type { GroupMeta, PinOption } from '../App'
import { usePlan } from '../store'
import { TermColumn } from './TermColumn'
import { PlusIcon } from './icons'

interface Props {
  byCourse: Record<string, BucketId | 'extra'>
  warnings: Record<string, Warning[]>
  groupMeta: Record<string, GroupMeta>
  pinOptions: PinOption[]
}

export function Planner({ byCourse, warnings, groupMeta, pinOptions }: Props) {
  const terms = usePlan((s) => s.terms)
  const placed = usePlan((s) => s.placed)
  const addTerm = usePlan((s) => s.addTerm)

  const byTerm = new Map<string, PlacedCourse[]>()
  for (const t of terms) byTerm.set(t.id, [])
  for (const pc of placed) {
    if (pc.termId && byTerm.has(pc.termId)) byTerm.get(pc.termId)!.push(pc)
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
      {terms.map((term) => (
        <TermColumn
          key={term.id}
          term={term}
          courses={byTerm.get(term.id) ?? []}
          byCourse={byCourse}
          warnings={warnings}
          groupMeta={groupMeta}
          pinOptions={pinOptions}
        />
      ))}

      <button
        onClick={addTerm}
        className="flex min-h-[140px] items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-medium text-muted transition hover:border-accent/60 hover:text-accent"
      >
        <PlusIcon className="h-4 w-4" /> Add Term
      </button>
    </div>
  )
}
