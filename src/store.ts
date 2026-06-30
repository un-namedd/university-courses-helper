import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BucketId, PlacedCourse, Program, ProgramTerm, Season } from './types'
import { getProgram, setActiveProgram } from './lib/program'
import { loadProgram } from './lib/courseData'

const DEFAULT_PROGRAM = 'computer-science-cs-coop'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/** Seed placed courses from a program's recommended sequence. */
function seededPlaced(program: Program): PlacedCourse[] {
  const out: PlacedCourse[] = []
  for (const { termId, codes } of program.recommendedSequence) {
    for (const code of codes) out.push({ id: uid(), code, termId })
  }
  return out
}

const cloneTerms = (terms: ProgramTerm[]): ProgramTerm[] =>
  terms.map((t) => ({ ...t }))

export type Theme = 'light' | 'dark'
export type Layout = 'sidebar-left' | 'sidebar-right' | 'top'

export interface PlanState {
  programId: string
  aoeId: string | null
  terms: ProgramTerm[]
  placed: PlacedCourse[]

  theme: Theme
  layout: Layout
  openCourse: string | null

  /** Load the persisted program and seed a plan on first run. */
  initProgram: () => Promise<void>
  /** Switch to a different program (resets the plan to its recommended sequence). */
  setProgram: (id: string) => Promise<void>

  /** Current editor state for cloud saving. */
  exportState: () => { programId: string; aoeId: string | null; terms: ProgramTerm[]; placed: PlacedCourse[] }
  /** Load a saved/shared plan into the editor (ensures the program is active). */
  applyCloudPlan: (
    programId: string,
    aoeId: string | null,
    terms: ProgramTerm[],
    placed: PlacedCourse[],
  ) => Promise<void>

  setAoe: (id: string | null) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLayout: (layout: Layout) => void
  setOpenCourse: (code: string | null) => void

  addCourse: (code: string, termId: string, beforeId?: string | null) => void
  addCustom: (termId: string, title: string, credits: number) => void
  removeCourse: (id: string) => void
  moveCourse: (
    activeId: string,
    targetTermId: string,
    beforeId?: string | null,
  ) => void
  setPin: (id: string, bucket: BucketId | undefined) => void

  addTerm: () => void
  removeTerm: (id: string) => void
  renameTerm: (id: string, label: string) => void
  setTermSeason: (id: string, season: Season) => void

  resetEmpty: () => void
  resetRecommended: () => void
}

export const usePlan = create<PlanState>()(
  persist(
    (set, get) => ({
      programId: DEFAULT_PROGRAM,
      aoeId: 'cybersecurity',
      terms: [],
      placed: [],

      theme: 'dark',
      layout: 'sidebar-left',
      openCourse: null,

      initProgram: async () => {
        const program = await loadProgram(get().programId)
        setActiveProgram(program)
        // Seed only on a fresh plan; keep a returning user's saved layout/courses.
        if (get().terms.length === 0) {
          set({
            terms: cloneTerms(program.defaultTerms),
            placed: seededPlaced(program),
          })
        }
      },

      setProgram: async (id) => {
        const program = await loadProgram(id)
        setActiveProgram(program)
        set({
          programId: id,
          aoeId: program.areasOfEmphasis[0]?.id ?? null,
          terms: cloneTerms(program.defaultTerms),
          placed: seededPlaced(program),
        })
      },

      exportState: () => {
        const s = get()
        return {
          programId: s.programId,
          aoeId: s.aoeId,
          terms: s.terms,
          placed: s.placed,
        }
      },

      applyCloudPlan: async (programId, aoeId, terms, placed) => {
        const program = await loadProgram(programId)
        setActiveProgram(program)
        set({ programId, aoeId, terms: cloneTerms(terms), placed: [...placed] })
      },

      setAoe: (id) => set({ aoeId: id }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setLayout: (layout) => set({ layout }),
      setOpenCourse: (code) => set({ openCourse: code }),

      addCourse: (code, termId, beforeId = null) =>
        set((state) => {
          const arr = [...state.placed]
          const item: PlacedCourse = { id: uid(), code, termId }
          insert(arr, item, termId, beforeId)
          return { placed: arr }
        }),

      addCustom: (termId, title, credits) =>
        set((state) => {
          const arr = [...state.placed]
          const item: PlacedCourse = {
            id: uid(),
            code: title.toUpperCase().slice(0, 12) || 'ELECTIVE',
            termId,
            custom: true,
            customTitle: title,
            customCredits: credits,
          }
          insert(arr, item, termId, null)
          return { placed: arr }
        }),

      removeCourse: (id) =>
        set((state) => ({ placed: state.placed.filter((p) => p.id !== id) })),

      moveCourse: (activeId, targetTermId, beforeId = null) =>
        set((state) => {
          const arr = [...state.placed]
          const fromIdx = arr.findIndex((p) => p.id === activeId)
          if (fromIdx < 0) return {}
          const [orig] = arr.splice(fromIdx, 1)
          const item = { ...orig, termId: targetTermId }
          insert(arr, item, targetTermId, beforeId)
          return { placed: arr }
        }),

      setPin: (id, bucket) =>
        set((state) => ({
          placed: state.placed.map((p) =>
            p.id === id ? { ...p, pin: bucket } : p,
          ),
        })),

      addTerm: () =>
        set((state) => {
          const n = state.terms.length + 1
          return {
            terms: [
              ...state.terms,
              { id: uid(), label: `Term ${n}`, season: 'Fall' as Season },
            ],
          }
        }),

      removeTerm: (id) =>
        set((state) => ({
          terms: state.terms.filter((t) => t.id !== id),
          // Drop courses in the deleted term so they free up and can be re-added.
          placed: state.placed.filter((p) => p.termId !== id),
        })),

      renameTerm: (id, label) =>
        set((state) => ({
          terms: state.terms.map((t) => (t.id === id ? { ...t, label } : t)),
        })),

      setTermSeason: (id, season) =>
        set((state) => ({
          terms: state.terms.map((t) => (t.id === id ? { ...t, season } : t)),
        })),

      resetEmpty: () => {
        const program = getProgram()
        if (!program) return set({ placed: [] })
        set({ terms: cloneTerms(program.defaultTerms), placed: [] })
      },

      resetRecommended: () => {
        const program = getProgram()
        if (!program) return
        set({
          terms: cloneTerms(program.defaultTerms),
          placed: seededPlaced(program),
        })
      },
    }),
    {
      name: 'uog-degree-planner',
      partialize: (s) => ({
        programId: s.programId,
        aoeId: s.aoeId,
        terms: s.terms,
        placed: s.placed,
        theme: s.theme,
        layout: s.layout,
      }),
    },
  ),
)

/** Insert `item` into the flat array at the position implied by the target term. */
function insert(
  arr: PlacedCourse[],
  item: PlacedCourse,
  termId: string,
  beforeId: string | null,
) {
  if (beforeId) {
    const idx = arr.findIndex((p) => p.id === beforeId)
    arr.splice(idx < 0 ? arr.length : idx, 0, item)
    return
  }
  let last = -1
  arr.forEach((p, i) => {
    if (p.termId === termId) last = i
  })
  arr.splice(last + 1, 0, item)
}
