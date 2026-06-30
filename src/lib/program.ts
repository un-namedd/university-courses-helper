import type { Course, Program } from '../types'
import { getCodes, getCourses } from './courseData'

// The active program is selected at runtime and loaded from public/programs/<id>.json.
let ACTIVE: Program | null = null

export function setActiveProgram(p: Program): void {
  ACTIVE = p
}

export function getProgram(): Program | null {
  return ACTIVE
}

export function getCourse(code: string): Course | undefined {
  return getCourses()[code]
}

/** Subject prefix, e.g. "CIS*3530" -> "CIS". */
export function courseSubject(code: string): string {
  const i = code.indexOf('*')
  return i > 0 ? code.slice(0, i) : code
}

/** Numeric course number, e.g. "CIS*3530" -> 3530. */
export function courseNumber(code: string): number {
  const m = code.match(/\*(\d{4})/)
  return m ? parseInt(m[1], 10) : 0
}

/** Course level rounded down to the thousand, e.g. 3530 -> 3000. */
export function courseLevel(code: string): number {
  return Math.floor(courseNumber(code) / 1000) * 1000
}

export function isCis(code: string): boolean {
  return code.startsWith('CIS*')
}

/** Credits for a placed catalog course, with a sensible default. */
export function creditsFor(code: string): number {
  return getCourse(code)?.credits ?? 0.5
}

export function titleFor(code: string): string {
  return getCourse(code)?.title ?? code
}

/** All catalog codes, sorted, for the "add course" search. */
export function allCodes(): string[] {
  return getCodes()
}
