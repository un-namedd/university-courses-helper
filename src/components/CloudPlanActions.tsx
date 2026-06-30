import { useEffect, useRef, useState } from 'react'
import { savePlan } from '../lib/plans'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { usePlan } from '../store'
import { CloudPlansList } from './CloudPlans'
import { FolderIcon, SaveIcon } from './icons'

export function CloudPlanActions() {
  const { user } = useAuth()
  const exportState = usePlan((s) => s.exportState)
  const activeCloudPlanId = usePlan((s) => s.activeCloudPlanId)
  const activeCloudPlanName = usePlan((s) => s.activeCloudPlanName)
  const clearActiveCloudPlan = usePlan((s) => s.clearActiveCloudPlan)
  const setActiveCloudPlan = usePlan((s) => s.setActiveCloudPlan)

  const [plansOpen, setPlansOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [name, setName] = useState('My plan')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!plansOpen && !nameOpen) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setPlansOpen(false)
        setNameOpen(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [plansOpen, nameOpen])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(t)
  }, [message])

  if (!isSupabaseConfigured || !user) return null

  const isUpdate = Boolean(activeCloudPlanId)

  async function persist(planName: string, id?: string) {
    setBusy(true)
    setMessage(null)
    try {
      const s = exportState()
      const row = await savePlan({
        id,
        name: planName.trim() || 'My plan',
        programId: s.programId,
        aoeId: s.aoeId,
        state: { terms: s.terms, placed: s.placed },
      })
      setActiveCloudPlan(row.id, row.name)
      setMessage(id ? 'Plan updated.' : 'Plan saved.')
      setNameOpen(false)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  function onPrimaryClick() {
    if (activeCloudPlanId && activeCloudPlanName) {
      void persist(activeCloudPlanName, activeCloudPlanId)
      return
    }
    setName('My plan')
    setNameOpen(true)
    setPlansOpen(false)
  }

  function onSaveAsNew() {
    clearActiveCloudPlan()
    setName(activeCloudPlanName ? `${activeCloudPlanName} (copy)` : 'My plan')
    setNameOpen(true)
    setPlansOpen(false)
  }

  function onConfirmName() {
    void persist(name)
  }

  return (
    <div className="relative flex w-full flex-wrap items-center gap-2 sm:w-auto" ref={boxRef}>
      {activeCloudPlanName && (
        <span className="hidden max-w-[140px] truncate text-[11px] text-muted lg:block" title={activeCloudPlanName}>
          Editing: {activeCloudPlanName}
        </span>
      )}

      <button
        onClick={onPrimaryClick}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-50 sm:gap-2 sm:px-3.5 sm:py-2.5"
        title={isUpdate ? 'Update plan' : 'Save plan'}
      >
        <SaveIcon className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">{isUpdate ? 'Update' : 'Save'}</span>
        <span className="hidden sm:inline">
          {isUpdate ? 'Update plan' : 'Save plan'}
        </span>
      </button>

      {isUpdate && (
        <button
          onClick={onSaveAsNew}
          disabled={busy}
          className="hidden text-[11px] font-medium text-accent transition hover:underline sm:block"
        >
          Save as new
        </button>
      )}

      <button
        onClick={() => {
          setPlansOpen((o) => !o)
          setNameOpen(false)
        }}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg transition hover:border-accent/60 sm:gap-2 sm:px-3.5 sm:py-2.5"
        title="Your saved plans"
      >
        <FolderIcon className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">Plans</span>
        <span className="hidden sm:inline">Your saved plans</span>
      </button>

      {nameOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-4 shadow-xl">
          <p className="mb-2 text-sm font-semibold text-fg">Name your plan</p>
          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plan name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onConfirmName()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/60"
            />
            <button
              onClick={onConfirmName}
              disabled={busy || !name.trim()}
              className="shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {plansOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[85vw] rounded-2xl border border-line bg-surface p-4 shadow-xl">
          <p className="mb-3 text-sm font-semibold text-fg">Your saved plans</p>
          <CloudPlansList
            activePlanId={activeCloudPlanId}
            onLoad={() => setPlansOpen(false)}
          />
        </div>
      )}

      {message && (
        <span className="absolute -bottom-6 right-0 whitespace-nowrap text-[11px] text-accent">
          {message}
        </span>
      )}
    </div>
  )
}
