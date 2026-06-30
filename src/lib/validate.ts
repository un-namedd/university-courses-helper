import type { PlacedCourse, ProgramTerm } from '../types'
import { getCourse } from './program'

export type WarningType = 'prereq' | 'offering'

export interface Warning {
  type: WarningType
  message: string
}

/**
 * Validate every placed course against (a) its prerequisites being satisfied by
 * courses scheduled in strictly earlier terms, and (b) the term's season being a
 * valid offering semester for the course.
 *
 * Returns a map of placed-course instance id -> warnings.
 */
export function validatePlan(
  placed: PlacedCourse[],
  terms: ProgramTerm[],
): Record<string, Warning[]> {
  const termIndex = new Map(terms.map((t, i) => [t.id, i]))
  const termById = new Map(terms.map((t) => [t.id, t]))

  // Codes completed by the end of each term index (cumulative, strictly-before use).
  const codesByTermIndex: Set<string>[] = terms.map(() => new Set<string>())
  for (const pc of placed) {
    if (!pc.termId) continue
    const idx = termIndex.get(pc.termId)
    if (idx === undefined) continue
    codesByTermIndex[idx].add(pc.code)
  }

  function completedBefore(idx: number): Set<string> {
    const acc = new Set<string>()
    for (let i = 0; i < idx; i++) {
      for (const c of codesByTermIndex[i]) acc.add(c)
    }
    return acc
  }

  const result: Record<string, Warning[]> = {}

  for (const pc of placed) {
    if (!pc.termId || pc.custom) continue
    const course = getCourse(pc.code)
    if (!course) continue
    const idx = termIndex.get(pc.termId)
    if (idx === undefined) continue

    const warnings: Warning[] = []

    // Prerequisites: each AND-group needs at least one alternative completed earlier.
    const before = completedBefore(idx)
    const unmet: string[] = []
    for (const group of course.prerequisites.groups) {
      if (group.length === 0) continue
      const satisfied = group.some((code) => before.has(code))
      if (!satisfied) {
        unmet.push(group.length > 1 ? `(${group.join(' or ')})` : group[0])
      }
    }
    if (unmet.length > 0) {
      warnings.push({
        type: 'prereq',
        message: `Missing prerequisite: ${unmet.join(', ')}`,
      })
    }

    // Offering season check.
    const term = termById.get(pc.termId)
    if (term && course.offerings.length > 0 && !course.offerings.includes(term.season)) {
      warnings.push({
        type: 'offering',
        message: `Not offered in ${term.season} (offered: ${course.offerings.join(', ')})`,
      })
    }

    if (warnings.length > 0) result[pc.id] = warnings
  }

  return result
}
