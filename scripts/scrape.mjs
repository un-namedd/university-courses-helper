// One-time data scraper for the UoG degree planner.
//
// Downloads the official 2026-2027 calendar PDFs and parses them into:
//   public/courses.json            (full catalog of EVERY UoG course)
//   src/data/program-cs-coop.json  (program structure + requirement buckets + AoE definitions)
//
// Run with:  npm run scrape
//
// Notes:
// - A client-only app cannot scrape live (CORS), so this is a build-time step.
// - The whole catalog is large, so courses.json is written to public/ and fetched
//   at runtime as a static asset (not bundled into JS).
// - The raw prerequisite string is always kept as a fallback alongside a best-effort
//   structured parse.
// - The program *requirement bucket* model (the split into Major / AoE / CIS-elective /
//   Free-elective that fixes the official planner's double-counting) is the user's desired
//   interpretation, so it is applied as a small curated overlay on top of the scraped data.

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import {
  CALENDAR,
  CODE_RE,
  CREDIT_RE,
  download,
  pdfToLines,
  tryDownload,
} from './lib/pdf.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')
const CACHE_DIR = join(ROOT, '.cache', 'pdf')

const INDEX_PDF = `${CALENDAR}/course-descriptions/course-descriptions.pdf`

/** Parse the course-descriptions index PDF into the list of subject slugs. */
async function discoverSubjects() {
  const data = await download(INDEX_PDF, join(CACHE_DIR, 'index.pdf'))
  const text = (await pdfToLines(data)).join(' ').replace(/\s+/g, ' ')
  const slugs = new Set()
  // Primary: extract from the /course-descriptions/<slug>/ links.
  for (const m of text.matchAll(/course-descriptions\/\s*([a-z]{2,8})\s*\//g)) {
    slugs.add(m[1])
  }
  // Fallback: lowercased subject codes shown as "(CODE)".
  for (const m of text.matchAll(/\(([A-Z]{2,6})\)/g)) {
    slugs.add(m[1].toLowerCase())
  }
  slugs.delete('course') // guard against accidental capture
  return [...slugs].sort()
}

// ----------------------------------------------------------------------------
// Course catalog parsing
// ----------------------------------------------------------------------------

const LABELS = [
  'Prerequisite(s):',
  'Co-requisite(s):',
  'Corequisite(s):',
  'Equate(s):',
  'Restriction(s):',
  'Offering(s):',
  'Department(s):',
  'Location(s):',
]

function isLabel(line) {
  return LABELS.some((l) => line.startsWith(l))
}

function normalizeOfferings(headerText) {
  // The offering term phrase sits between the title and the schedule "(" / credit
  // "[". Titles in this catalog never contain season words, so scan the region
  // starting at the first season word and ending at the first "(" or "[".
  const start = headerText.search(/\b(?:Fall|Winter|Summer)\b/)
  if (start < 0) return []
  let region = headerText.slice(start)
  const cut = region.search(/[([]/)
  if (cut >= 0) region = region.slice(0, cut)
  const terms = []
  if (/\bFall\b/.test(region)) terms.push('Fall')
  if (/\bWinter\b/.test(region)) terms.push('Winter')
  if (/\bSummer\b/.test(region)) terms.push('Summer')
  return terms
}

function stripHeaderToTitle(headerText, code) {
  // headerText looks like: "Title Offering (LEC: ...) [0.50]".
  // The title always precedes the offering term, the schedule block "(", and the
  // credit "[", and (in this catalog) never contains a season word. So cut the
  // title at the earliest of those markers.
  let t = headerText.replace(code, '').trim()
  const markers = []
  const season = t.match(/\b(?:Fall|Winter|Summer|Unspecified)\b/)
  if (season) markers.push(season.index)
  const paren = t.indexOf('(')
  if (paren >= 0) markers.push(paren)
  const bracket = t.indexOf('[')
  if (bracket >= 0) markers.push(bracket)
  if (markers.length) t = t.slice(0, Math.min(...markers))
  return t.replace(/[\s,]+$/, '').replace(/\s+/g, ' ').trim()
}

const COURSE_TOKEN = /[A-Z]{2,5}\*\d{4}/g

function uniqueCodes(s) {
  return [...new Set(s.match(COURSE_TOKEN) || [])]
}

/** Split on top-level commas, respecting () and [] nesting. */
function splitTopLevel(s) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) out.push(cur)
  return out
}

/** True if an OR/"N of" segment also offers a non-course alternative we can't verify. */
function hasNonCodeAlternative(seg) {
  const leftover = seg
    .replace(COURSE_TOKEN, ' ')
    .replace(/\b\d+(?:\.\d+)?\s+of\b/gi, ' ')
    .replace(/\b(?:or|and)\b/gi, ' ')
    .replace(/[()[\].,;:]/g, ' ')
  return /[A-Za-z]{3,}/.test(leftover)
}

function segmentGroups(seg) {
  const codes = uniqueCodes(seg)
  if (codes.length === 0) return []
  const orish = /\bor\b/i.test(seg) || /\bof\b/i.test(seg)
  if (orish) {
    if (hasNonCodeAlternative(seg)) return [] // unverifiable alternative -> skip
    return [codes] // single OR group
  }
  if (codes.length > 1 && /\band\b/i.test(seg)) {
    return codes.map((c) => [c]) // each separately required
  }
  return [[codes[0]]]
}

/**
 * Best-effort CNF: AND of groups, each group an OR of course codes. The raw text
 * is always preserved separately. This parser is conservative - when a
 * requirement allows a non-course alternative (e.g. "2.00 credits", a high-school
 * course), the group is dropped so the planner does not raise false warnings.
 */
function parsePrereqStructure(raw) {
  if (!raw || !COURSE_TOKEN.test(raw)) return []
  COURSE_TOKEN.lastIndex = 0

  let groups = []
  if (/^\s*[([]?\s*\d+(?:\.\d+)?\s+of\b/i.test(raw)) {
    // Whole requirement is an "N of <list>" -> one OR group.
    groups = segmentGroups(raw)
  } else {
    for (const seg of splitTopLevel(raw)) {
      groups.push(...segmentGroups(seg))
    }
  }

  const seen = new Set()
  const out = []
  for (const g of groups) {
    const key = [...g].sort().join('|')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(g)
  }
  return out
}

// A line that begins with a course code is only a *real* course header if a
// credit marker "[d.dd]" follows within a few lines before any field label or
// another code. This avoids treating wrapped prerequisite continuations (e.g. a
// line that is just "COOP*1000") as new courses.
function isCourseStart(lines, idx) {
  if (!CODE_RE.test(lines[idx])) return false
  let acc = ''
  for (let t = idx; t < Math.min(idx + 4, lines.length); t++) {
    if (t > idx && (isLabel(lines[t]) || CODE_RE.test(lines[t]))) return false
    acc += ' ' + lines[t]
    if (CREDIT_RE.test(acc)) return true
  }
  return false
}

function parseCourses(lines) {
  // Accept every real course header in the subject PDF. We do not filter by the
  // URL slug because some subjects use a code that differs from the slug
  // (e.g. slug "ieaf" but code "IAEF").
  const courses = []
  let i = 0
  while (i < lines.length) {
    const codeMatch = lines[i].match(CODE_RE)
    if (!codeMatch || !isCourseStart(lines, i)) {
      i++
      continue
    }
    const code = `${codeMatch[1]}*${codeMatch[2]}`

    // Accumulate header lines until we hit a credit marker "[d.dd]".
    let header = lines[i]
    let j = i
    while (!CREDIT_RE.test(header) && j + 1 < lines.length) {
      j++
      header += ' ' + lines[j]
    }
    const creditMatch = header.match(CREDIT_RE)
    const credits = creditMatch ? parseFloat(creditMatch[1]) : 0
    const title = stripHeaderToTitle(header, code)
    const offerings = normalizeOfferings(header)

    // Collect body lines until the next real course header.
    let k = j + 1
    const body = []
    while (k < lines.length && !isCourseStart(lines, k)) {
      body.push(lines[k])
      k++
    }

    // Body lines before the first label are the course description; labelled
    // fields (prereq, restriction, department, location) follow.
    const fields = {}
    const descLines = []
    let current = null
    for (const b of body) {
      const found = LABELS.find((l) => b.startsWith(l))
      if (found) {
        current = found
        fields[found] = b.slice(found.length).trim()
      } else if (current) {
        fields[current] += ' ' + b
      } else {
        descLines.push(b)
      }
    }

    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()

    courses.push({
      code,
      dept: codeMatch[1],
      title,
      credits,
      offerings,
      description: clean(descLines.join(' ')),
      prerequisites: {
        raw: clean(fields['Prerequisite(s):']),
        groups: parsePrereqStructure(clean(fields['Prerequisite(s):'])),
      },
      restriction: clean(fields['Restriction(s):']),
      department: clean(fields['Department(s):']),
      location: clean(fields['Location(s):']),
    })

    i = k
  }
  return courses
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true })

  console.log('Discovering subjects...')
  const subjects = await discoverSubjects()
  console.log(`  found ${subjects.length} subject slugs`)

  console.log('Scraping all course catalogs...')
  const courses = {}
  let count = 0
  let ok = 0
  for (const slug of subjects) {
    const url = `${CALENDAR}/course-descriptions/${slug}/${slug}.pdf`
    const data = await tryDownload(url, join(CACHE_DIR, `${slug}.pdf`))
    if (!data) continue
    ok++
    try {
      const lines = await pdfToLines(data)
      const parsed = parseCourses(lines)
      for (const c of parsed) courses[c.code] = c
      count += parsed.length
    } catch (err) {
      console.warn(`  ! failed to parse ${slug}: ${err.message}`)
    }
  }
  console.log(`  ${ok}/${subjects.length} subjects downloaded, ${count} courses parsed`)

  // Catalog is large -> served as a static asset, minified.
  await writeFile(join(PUBLIC_DIR, 'courses.json'), JSON.stringify(courses))

  console.log(`\nDone. ${Object.keys(courses).length} courses -> public/courses.json`)
  console.log('Programs -> run `npm run scrape:programs`')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
