import type { CourseMap, Program, ProgramSummary } from '../types'

// The full UoG catalog is large, so it is served as a static asset and fetched
// once at startup rather than bundled into the JS. Lookups read this in-memory map.
let COURSES: CourseMap = {}
let CODES: string[] = []
let loaded = false

const BASE = import.meta.env.BASE_URL

export async function loadCourses(): Promise<void> {
  if (loaded) return
  const res = await fetch(`${BASE}courses.json`)
  if (!res.ok) throw new Error(`Failed to load courses.json (${res.status})`)
  COURSES = (await res.json()) as CourseMap
  CODES = Object.keys(COURSES).sort()
  loaded = true
}

let PROGRAMS_INDEX: ProgramSummary[] | null = null

export async function loadProgramsIndex(): Promise<ProgramSummary[]> {
  if (PROGRAMS_INDEX) return PROGRAMS_INDEX
  const res = await fetch(`${BASE}programs-index.json`)
  if (!res.ok) throw new Error(`Failed to load programs-index.json (${res.status})`)
  PROGRAMS_INDEX = (await res.json()) as ProgramSummary[]
  return PROGRAMS_INDEX
}

const programCache = new Map<string, Program>()

export async function loadProgram(id: string): Promise<Program> {
  const cached = programCache.get(id)
  if (cached) return cached
  const res = await fetch(`${BASE}programs/${id}.json`)
  if (!res.ok) throw new Error(`Failed to load program ${id} (${res.status})`)
  const program = (await res.json()) as Program
  programCache.set(id, program)
  return program
}

export function isLoaded(): boolean {
  return loaded
}

export function getCourses(): CourseMap {
  return COURSES
}

export function getCodes(): string[] {
  return CODES
}
