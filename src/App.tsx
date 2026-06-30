import { useEffect, useMemo, useState } from 'react'
import { pauseSmoothScroll, resumeSmoothScroll } from './components/SmoothScroll'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { usePlan } from './store'
import { allocate } from './lib/allocate'
import { validatePlan } from './lib/validate'
import { getProgram, titleFor } from './lib/program'
import { loadCourses } from './lib/courseData'
import { Header } from './components/Header'
import { RequirementsPanel } from './components/RequirementsPanel'
import { Planner } from './components/Planner'
import { CourseDialog } from './components/CourseDialog'
import { LegalFooterLinks } from './components/legal/LegalFooterLinks'
import { colorForIndex, shortLabel } from './components/bucketMeta'

export interface GroupMeta {
  label: string
  chip: string
}
export interface PinOption {
  id: string
  label: string
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const initProgram = usePlan((s) => s.initProgram)

  useEffect(() => {
    loadCourses()
      .then(() => initProgram())
      .then(() => setReady(true))
      .catch((e) => setLoadError(String(e?.message ?? e)))
  }, [initProgram])

  const placed = usePlan((s) => s.placed)
  const terms = usePlan((s) => s.terms)
  const aoeId = usePlan((s) => s.aoeId)
  const programId = usePlan((s) => s.programId)
  const layout = usePlan((s) => s.layout)
  const addCourse = usePlan((s) => s.addCourse)
  const moveCourse = usePlan((s) => s.moveCourse)

  const [activeLabel, setActiveLabel] = useState<string | null>(null)

  const allocation = useMemo(() => {
    const program = getProgram()
    if (!ready || !program) {
      return { byCourse: {}, buckets: [], totalEarned: 0, totalRequired: 0 }
    }
    return allocate(program, placed, aoeId)
    // programId drives the active program; recompute when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, aoeId, programId, ready])
  const warnings = useMemo(() => validatePlan(placed, terms), [placed, terms])
  const takenCodes = useMemo(
    () => new Set(placed.map((p) => p.code)),
    [placed],
  )
  const placedById = useMemo(
    () => new Map(placed.map((p) => [p.id, p])),
    [placed],
  )

  // Per-group badge label + color for course cards and the pin dropdown.
  const groupMeta = useMemo(() => {
    const map: Record<string, { label: string; chip: string }> = {}
    allocation.buckets.forEach((b, i) => {
      map[b.id] = { label: shortLabel(b.name), chip: colorForIndex(i).chip }
    })
    return map
  }, [allocation.buckets])

  const pinOptions = useMemo(
    () => allocation.buckets.map((b) => ({ id: b.id, label: shortLabel(b.name) })),
    [allocation.buckets],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function onDragStart(event: DragStartEvent) {
    pauseSmoothScroll()
    const data = event.active.data.current
    if (data?.type === 'req') setActiveLabel(data.code)
    else {
      const pc = placedById.get(String(event.active.id))
      setActiveLabel(pc ? (pc.custom ? pc.customTitle ?? pc.code : pc.code) : null)
    }
  }

  function onDragEnd(event: DragEndEvent) {
    resumeSmoothScroll()
    setActiveLabel(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    let targetTermId: string | null = null
    let beforeId: string | null = null

    if (overData?.type === 'term') {
      targetTermId = overData.termId
    } else if (overData?.type === 'placed') {
      const overPc = placedById.get(String(over.id))
      if (overPc) {
        targetTermId = overPc.termId
        beforeId = overPc.id
      }
    }

    if (!targetTermId) return

    if (activeData?.type === 'req') {
      addCourse(activeData.code, targetTermId, beforeId)
    } else if (activeData?.type === 'placed') {
      if (String(active.id) === beforeId) return
      moveCourse(String(active.id), targetTermId, beforeId)
    }
  }

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Couldn’t load the course catalog</p>
          <p className="mt-2 text-sm opacity-70">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="flex items-center gap-3 text-sm opacity-70">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading course catalog…
        </div>
      </div>
    )
  }

  const isTop = layout === 'top'
  const isRight = layout === 'sidebar-right'

  const requirements = (
    <RequirementsPanel
      buckets={allocation.buckets}
      takenCodes={takenCodes}
      placedById={placedById}
      variant={isTop ? 'top' : 'sidebar'}
    />
  )

  const planner = (
    <Planner
      byCourse={allocation.byCourse}
      warnings={warnings}
      groupMeta={groupMeta}
      pinOptions={pinOptions}
    />
  )

  return (
    <div className="min-h-screen">
      <Header
        totalEarned={allocation.totalEarned}
        totalRequired={allocation.totalRequired}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          resumeSmoothScroll()
          setActiveLabel(null)
        }}
      >
        {isTop ? (
          <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 sm:px-6 sm:py-7">
            <section>{requirements}</section>
            <section>{planner}</section>
          </main>
        ) : (
          <main
            className={
              'mx-auto grid max-w-[1500px] grid-cols-1 gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-7 lg:gap-7 ' +
              (isRight
                ? 'lg:grid-cols-[1fr_minmax(340px,400px)]'
                : 'lg:grid-cols-[minmax(340px,400px)_1fr]')
            }
          >
            <aside
              className={
                'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 ' +
                (isRight ? 'lg:order-2' : '')
              }
            >
              {requirements}
            </aside>
            <section className={isRight ? 'lg:order-1' : ''}>{planner}</section>
          </main>
        )}

        <DragOverlay>
          {activeLabel ? (
            <div className="rounded-2xl border border-accent/60 bg-surface px-3.5 py-2.5 text-sm font-semibold text-accent shadow-xl">
              {activeLabel}
              <span className="ml-2 text-xs font-normal text-muted">
                {titleFor(activeLabel)}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CourseDialog />

      <footer className="border-t border-line py-6">
        <LegalFooterLinks />
      </footer>
    </div>
  )
}
