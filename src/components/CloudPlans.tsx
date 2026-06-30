import { useEffect, useState } from 'react'
import {
  deletePlan,
  listMyPlans,
  savePlan,
  sharePlan,
  type PlanRow,
} from '../lib/plans'
import { usePlan } from '../store'

export function CloudPlans({ onDone }: { onDone: () => void }) {
  const exportState = usePlan((s) => s.exportState)
  const applyCloudPlan = usePlan((s) => s.applyCloudPlan)

  const [plans, setPlans] = useState<PlanRow[]>([])
  const [name, setName] = useState('My plan')
  const [busy, setBusy] = useState(false)
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

  async function onSave() {
    setBusy(true)
    setError(null)
    try {
      const s = exportState()
      await savePlan({
        name: name.trim() || 'My plan',
        programId: s.programId,
        aoeId: s.aoeId,
        state: { terms: s.terms, placed: s.placed },
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  async function onLoad(row: PlanRow) {
    await applyCloudPlan(row.program_id, row.aoe_id, row.state.terms, row.state.placed)
    onDone()
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
    await refresh()
  }

  return (
    <div className="space-y-3 border-y border-line py-3">
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Plan name"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/60"
        />
        <button
          onClick={onSave}
          disabled={busy}
          className="shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-50"
        >
          Save
        </button>
      </div>

      {plans.length > 0 && (
        <div className="max-h-56 space-y-1.5 overflow-y-auto">
          {plans.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-2"
            >
              <button
                onClick={() => onLoad(p)}
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
      )}

      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
