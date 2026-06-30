import { useEffect, useState } from 'react'
import {
  deletePlan,
  listMyPlans,
  sharePlan,
  type PlanRow,
} from '../lib/plans'
import { usePlan } from '../store'

interface Props {
  onLoad?: () => void
  activePlanId?: string | null
}

export function CloudPlansList({ onLoad, activePlanId }: Props) {
  const applyCloudPlan = usePlan((s) => s.applyCloudPlan)
  const clearActiveCloudPlan = usePlan((s) => s.clearActiveCloudPlan)

  const [plans, setPlans] = useState<PlanRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function refresh() {
    try {
      setPlans(await listMyPlans())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load plans.')
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onLoadPlan(row: PlanRow) {
    await applyCloudPlan(
      row.program_id,
      row.aoe_id,
      row.state.terms,
      row.state.placed,
      { id: row.id, name: row.name },
    )
    onLoad?.()
  }

  async function onShare(row: PlanRow) {
    try {
      const shareId = await sharePlan(row)
      const url = `${window.location.origin}/p/${shareId}`
      await navigator.clipboard.writeText(url).catch(() => {})
      setCopied(row.id)
      setTimeout(() => setCopied(null), 2000)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share failed.')
    }
  }

  async function onDelete(row: PlanRow) {
    await deletePlan(row.id)
    if (row.id === activePlanId) clearActiveCloudPlan()
    await refresh()
  }

  if (plans.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-muted">No saved plans yet.</p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {plans.map((p) => (
          <div
            key={p.id}
            className={
              'flex items-center gap-2 rounded-lg border px-2.5 py-2 ' +
              (p.id === activePlanId
                ? 'border-accent/60 bg-accent-soft'
                : 'border-line bg-surface-2')
            }
          >
            <button
              onClick={() => onLoadPlan(p)}
              className="min-w-0 flex-1 text-left"
              title="Load this plan"
            >
              <span className="block truncate text-sm font-medium text-fg">
                {p.name}
              </span>
              <span className="block truncate text-[11px] text-faint">
                {p.program_id}
              </span>
            </button>
            <button
              onClick={() => onShare(p)}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent-soft"
              title="Copy a public read-only link"
            >
              {copied === p.id ? 'Copied!' : p.is_public ? 'Link' : 'Share'}
            </button>
            <button
              onClick={() => onDelete(p)}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-faint transition hover:text-rose-500"
              title="Delete"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
