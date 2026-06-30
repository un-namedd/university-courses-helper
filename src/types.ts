export type Season = 'Fall' | 'Winter' | 'Summer'

export interface PrereqInfo {
  /** Original prerequisite text from the calendar, always preserved. */
  raw: string
  /** Best-effort CNF: AND of groups, each group an OR of course codes. */
  groups: string[][]
}

export interface Course {
  code: string
  dept: string
  title: string
  credits: number
  offerings: Season[]
  description: string
  prerequisites: PrereqInfo
  restriction: string
  department: string
  location: string
}

export type CourseMap = Record<string, Course>

/** "Select X credits from: <options>" */
export interface SelectFromGroup {
  credits: number
  label: string
  options: string[]
}

/** Rule-based elective matcher, e.g. "1.00 credits in CIS at the 3000 level or above". */
export interface GroupMatch {
  /** Allowed subject prefixes (e.g. ["CIS"]). Empty/undefined = any subject. */
  subjects?: string[]
  minLevel?: number
  maxLevel?: number
  /** Free elective: any university course counts. */
  anyCourse?: boolean
}

/**
 * One requirement category shown as a progress bar. A program is just a list of
 * these. A group can require specific named courses, choose-from lists, and/or a
 * rule-based elective allowance - any combination.
 */
export interface RequirementGroup {
  id: string
  name: string
  description?: string
  /** Lower = more specific; courses are allocated to the lowest-priority match first. */
  priority: number
  requiredCredits: number
  named: string[]
  selectFrom: SelectFromGroup[]
  match?: GroupMatch
}

export interface AreaOfEmphasis {
  id: string
  name: string
  description?: string
  named: string[]
  selectFrom: SelectFromGroup[]
  credits: number
}

export interface ProgramTerm {
  id: string
  label: string
  season: Season
}

export interface RecommendedSemester {
  termId: string
  codes: string[]
}

export interface Program {
  id: string
  name: string
  degree: string
  totalCredits: number
  /** Fixed requirement groups (core, named electives, rule electives, free, work terms). */
  groups: RequirementGroup[]
  /** Selectable Areas of Emphasis; the chosen one becomes an extra group. */
  areasOfEmphasis: AreaOfEmphasis[]
  /** Credit Summary "Area of Emphasis" target, used when AoEs exist. */
  aoeCredits?: number
  /** Recommended course sequence used to seed a new plan. */
  recommendedSequence: RecommendedSemester[]
  defaultTerms: ProgramTerm[]
  source: string
  generatedAt: string
  /** Non-fatal notes from best-effort scraping. */
  parseWarnings?: string[]
}

/** Lightweight entry for the program picker. */
export interface ProgramSummary {
  id: string
  name: string
  degree: string
}

/**
 * Requirement-group id a placed course is counted toward. Dynamic per program;
 * `extra` means it counted toward nothing.
 */
export type BucketId = string

/** A course the user has placed into a term. */
export interface PlacedCourse {
  /** Unique instance id (allows custom electives + duplicates). */
  id: string
  code: string
  /** Term id this course currently lives in, or null while dragging/unscheduled. */
  termId: string | null
  /** Optional manual override pinning this course to a specific group id. */
  pin?: BucketId
  /** True for user-created courses not found in the scraped catalog. */
  custom?: boolean
  /** Title/credits for custom courses (catalog courses look these up by code). */
  customTitle?: string
  customCredits?: number
}
