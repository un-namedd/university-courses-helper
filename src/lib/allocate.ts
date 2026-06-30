import type {
  BucketId,
  GroupMatch,
  PlacedCourse,
  Program,
  RequirementGroup,
} from '../types'
import { courseLevel, courseSubject, creditsFor } from './program'

export interface BucketProgress extends RequirementGroup {
  earnedCredits: number
  /** Instance ids of placed courses allocated to this group. */
  courseIds: string[]
}

export interface Allocation {
  /** placed-course instance id -> group it was counted toward, or 'extra'. */
  byCourse: Record<string, BucketId | 'extra'>
  buckets: BucketProgress[]
  totalEarned: number
  totalRequired: number
}

/** Build the active requirement groups, injecting the selected Area of Emphasis. */
export function buildGroups(
  program: Program,
  aoeId: string | null,
): RequirementGroup[] {
  const groups = [...program.groups]

  if (program.areasOfEmphasis.length > 0) {
    const aoe = aoeId
      ? program.areasOfEmphasis.find((a) => a.id === aoeId) ?? null
      : null
    groups.push({
      id: 'aoe',
      name: aoe ? aoe.name : 'Area of Emphasis',
      description: aoe
        ? aoe.description ?? `Required courses for ${aoe.name}.`
        : 'Choose an Area of Emphasis to see its required courses.',
      priority: 20,
      requiredCredits: aoe ? aoe.credits : program.aoeCredits ?? 0,
      named: aoe ? aoe.named : [],
      selectFrom: aoe ? aoe.selectFrom : [],
    })
  }

  return groups.sort((a, b) => a.priority - b.priority)
}

function matchesRule(m: GroupMatch, code: string): boolean {
  if (m.anyCourse) return true
  if (m.subjects && m.subjects.length && !m.subjects.includes(courseSubject(code)))
    return false
  const lvl = courseLevel(code)
  if (m.minLevel && lvl < m.minLevel) return false
  if (m.maxLevel && lvl > m.maxLevel) return false
  // Require at least one real constraint so an empty rule never swallows courses.
  return Boolean(m.subjects?.length || m.minLevel || m.maxLevel)
}

interface BucketRuntime {
  def: RequirementGroup
  readonly earned: number
  courseIds: string[]
  /** Returns credits accepted, or null if the course doesn't fit this group. */
  tryAssign: (code: string, cr: number) => number | null
}

function makeRuntime(def: RequirementGroup): BucketRuntime {
  const courseIds: string[] = []
  const namedRemaining = new Set(def.named)
  const sel = def.selectFrom.map((g) => ({
    remaining: g.credits,
    options: new Set(g.options),
  }))
  let earned = 0

  const tryAssign = (code: string, cr: number): number | null => {
    if (namedRemaining.has(code)) {
      namedRemaining.delete(code)
      earned += cr
      return cr
    }
    for (const g of sel) {
      if (g.remaining > 0 && g.options.has(code)) {
        g.remaining -= cr
        earned += cr
        return cr
      }
    }
    if (def.match && earned < def.requiredCredits && matchesRule(def.match, code)) {
      earned += cr
      return cr
    }
    return null
  }

  return {
    def,
    get earned() {
      return earned
    },
    courseIds,
    tryAssign,
  }
}

function creditsOf(pc: PlacedCourse): number {
  if (pc.custom) return pc.customCredits ?? 0.5
  return creditsFor(pc.code)
}

/**
 * Greedy most-specific allocation. Each placed course is counted toward the
 * highest-priority (lowest number) requirement group it still qualifies for.
 * This guarantees an AoE-required course counts toward the AoE (never stolen by
 * free electives), a leftover subject/level course counts toward its elective
 * group, and everything else falls through to free electives - no double
 * counting, nothing missing.
 */
export function allocate(
  program: Program,
  placed: PlacedCourse[],
  aoeId: string | null,
): Allocation {
  const defs = buildGroups(program, aoeId)
  const runtimes = new Map<string, BucketRuntime>()
  for (const def of defs) runtimes.set(def.id, makeRuntime(def))
  const order = defs.map((d) => d.id)

  // Deterministic processing order: by term order, then code.
  const termOrder = new Map(program.defaultTerms.map((t, i) => [t.id, i]))
  const ordered = [...placed].sort((a, b) => {
    const ta = a.termId ? termOrder.get(a.termId) ?? 999 : 1000
    const tb = b.termId ? termOrder.get(b.termId) ?? 999 : 1000
    if (ta !== tb) return ta - tb
    return a.code.localeCompare(b.code)
  })

  const byCourse: Record<string, BucketId | 'extra'> = {}

  for (const pc of ordered) {
    const code = pc.code
    const cr = creditsOf(pc)
    let assigned: BucketId | 'extra' = 'extra'

    if (pc.pin) {
      const rt = runtimes.get(pc.pin)
      if (rt && rt.tryAssign(code, cr) !== null) {
        rt.courseIds.push(pc.id)
        byCourse[pc.id] = pc.pin
        continue
      }
    }

    for (const id of order) {
      const rt = runtimes.get(id)!
      if (rt.tryAssign(code, cr) !== null) {
        rt.courseIds.push(pc.id)
        assigned = id
        break
      }
    }
    byCourse[pc.id] = assigned
  }

  const buckets: BucketProgress[] = defs.map((def) => {
    const rt = runtimes.get(def.id)!
    return { ...def, earnedCredits: rt.earned, courseIds: rt.courseIds }
  })

  const totalEarned = buckets.reduce((t, b) => t + b.earnedCredits, 0)
  const totalRequired = buckets.reduce((t, b) => t + b.requiredCredits, 0)

  return { byCourse, buckets, totalEarned, totalRequired }
}
