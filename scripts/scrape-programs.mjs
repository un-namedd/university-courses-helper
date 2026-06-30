// Scrapes EVERY UoG undergraduate program into the planner's generic requirement
// model and writes one JSON per program to public/programs/<id>.json plus a
// lightweight public/programs-index.json for the picker.
//
// Run with:  npm run scrape:programs   (run `npm run scrape` first for courses.json)
//
// Parsing is best-effort across ~60 very different program layouts: we extract
// named core courses, work terms, subject/level elective rules, Areas of
// Emphasis, and the Credit Summary totals. Free electives absorb the remainder
// so each program's total always matches the calendar's "Total Credits". The
// Computer Science program is curated for guaranteed accuracy (it is the seed).

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { CALENDAR, download, pdfToLines, tryDownload } from './lib/pdf.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_DIR = join(ROOT, 'public')
const PROGRAMS_DIR = join(PUBLIC_DIR, 'programs')
const CACHE_DIR = join(ROOT, '.cache', 'pdf')
const INDEX_PDF = `${CALENDAR}/programs-majors-minors/programs-majors-minors.pdf`

const COURSE_ROW = /^([A-Z]{2,5}\*\d{4})\b\s*(.*)$/
const SEM_RE = /^Semester\s+(\d+)\b/i
const CREDIT_END = /(\d+\.\d{2})\s*$/

let COURSES = {}
const creditsFor = (code) =>
  typeof COURSES[code]?.credits === 'number' ? COURSES[code].credits : 0.5
const sumCredits = (codes) => codes.reduce((t, c) => t + creditsFor(c), 0)
const round2 = (n) => Math.round(n * 100) / 100

// ----------------------------------------------------------------------------
// Discovery
// ----------------------------------------------------------------------------

async function discoverPrograms() {
  const data = await download(INDEX_PDF, join(CACHE_DIR, 'programs-index.pdf'))
  const text = (await pdfToLines(data)).join(' ').replace(/\s+/g, ' ')
  const slugs = new Set()
  for (const m of text.matchAll(/programs-majors-minors\/\s*([a-z0-9-]{3,})\s*\//g)) {
    slugs.add(m[1])
  }
  slugs.delete('programs-majors-minors')
  return [...slugs].sort()
}

function slugToName(slug) {
  // Drop a trailing subject-code segment, e.g. "computer-science-cs" -> "computer science".
  const parts = slug.split('-')
  if (parts.length > 1 && /^[a-z]{2,6}$/.test(parts[parts.length - 1])) parts.pop()
  return parts
    .join(' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

// ----------------------------------------------------------------------------
// Generic program parsing
//
// Programs come in two layouts:
//  - Schedule layout (B.Comm, many B.Sc): "Semester N" tables with course rows
//    and "Select X credits from the following:" choose-lists.
//  - Major-requirements layout (most B.A./B.Sc majors): no semesters, just
//    "Code Title Credits" tables + "Select X from" groups + rule lines like
//    "1.00 credits from ENGL 4000 level courses".
// We parse both into the same generic RequirementGroup model and emit a separate
// "<slug>-coop" variant whenever a co-op stream (COOP* courses) is detected.
// ----------------------------------------------------------------------------

const COOP_SCAFFOLD = [
  { id: 'y1f', label: 'Year 1 Fall', season: 'Fall' },
  { id: 'y1w', label: 'Year 1 Winter', season: 'Winter' },
  { id: 'y2f', label: 'Year 2 Fall', season: 'Fall' },
  { id: 'y2w', label: 'Year 2 Winter', season: 'Winter' },
  { id: 'y2s', label: 'Year 2 Summer', season: 'Summer' },
  { id: 'y3f', label: 'Year 3 Fall', season: 'Fall' },
  { id: 'y3w', label: 'Year 3 Winter', season: 'Winter' },
  { id: 'y3s', label: 'Year 3 Summer', season: 'Summer' },
  { id: 'y4f', label: 'Year 4 Fall', season: 'Fall' },
  { id: 'y4w', label: 'Year 4 Winter', season: 'Winter' },
  { id: 'y4s', label: 'Year 4 Summer', season: 'Summer' },
  { id: 'y5f', label: 'Year 5 Fall', season: 'Fall' },
  { id: 'y5w', label: 'Year 5 Winter', season: 'Winter' },
]

const semScaffold = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    label: `Semester ${i + 1}`,
    season: (i + 1) % 2 === 1 ? 'Fall' : 'Winter',
  }))

/** A "Select X credits from the following:" choose-list header -> credits, or null. */
function selectHeader(line) {
  let m = line.match(/(?:Select\s+)?(\d+\.\d{2})\s+credits?\s+from\s+the following/i)
  if (m) return parseFloat(m[1])
  m = line.match(/^Select\s+(\d+\.\d{2})\s+credits?\s+from\b/i)
  if (m) return parseFloat(m[1])
  return null
}

/** Classify a rule line into {subject?, minLevel?, maxLevel?, credits}, or null. */
function parseRuleLine(line) {
  // "A maximum ... may be counted" is a cap, not a requirement.
  if (/^A maximum/i.test(line)) return null
  if (selectHeader(line) != null) return null
  const credM = line.match(/(\d+\.\d{2})/)
  if (!credM) return null
  const credits = parseFloat(credM[1])
  const orAbove = /or above/i.test(line)

  // subject + level (several phrasings)
  let m =
    line.match(/\bin\s+([A-Z]{2,5})\b.*?at the\s+(\d)000[\s-]*level/i) ||
    line.match(/\b([A-Z]{2,5})\s+electives?\b.*?at the\s+(\d)000[\s-]*level/i) ||
    line.match(/\bfrom\s+([A-Z]{2,5})\b[^.]*?(\d)000[\s-]*level/i)
  if (m) {
    const level = parseInt(m[2], 10) * 1000
    return {
      subject: m[1],
      minLevel: level,
      maxLevel: orAbove ? undefined : level + 999,
      credits,
    }
  }
  // "X credits from any other SUBJ ... courses" (subject, any level)
  m = line.match(/from\s+any other\s+([A-Z]{2,5})/i)
  if (m) return { subject: m[1], credits }
  // level only
  m = line.match(/at the\s+(\d)000[\s-]*level/i)
  if (m) {
    const level = parseInt(m[1], 10) * 1000
    return { minLevel: level, maxLevel: orAbove ? undefined : level + 999, credits }
  }
  return null
}

/** A heading that introduces a reference menu of acceptable elective courses
 *  (not required core), e.g. "History Electives Lists". */
function isMenuHeading(line) {
  return /Electives Lists\b|acceptable courses below|list of acceptable courses/i.test(
    line,
  )
}

function isTitleLike(line) {
  return (
    line.length >= 2 &&
    line.length <= 48 &&
    !/[.:]$/.test(line) &&
    !COURSE_ROW.test(line) &&
    !/^\d/.test(line) &&
    !/\d\.\d/.test(line) &&
    !/^(Code Title Credits|Select|Semester|Year|Total Credits|Credit Summary|Recommended Program Sequence|Schedule of Studies|Major Requirements|Minor Requirements|Areas? of Emphasis|Co-op)/i.test(line)
  )
}

function parseProgram(slug, lines) {
  const degIdx = lines.findIndex((l) => /degree:\s*/i.test(l))
  // The degree name can wrap to the next line, so join one extra line first.
  const degreeText =
    degIdx >= 0 ? `${lines[degIdx]} ${lines[degIdx + 1] ?? ''}` : ''
  const degree = degreeText
    ? degreeText
        .replace(/.*degree:\s*/i, '')
        .split(/\s*\(|\s+https?:|\.|:/)[0]
        .replace(/[.\s]+$/, '')
        .trim()
    : ''

  const majorCore = new Set() // named courses from a "Major Requirements" table
  const schedCore = new Set() // named courses from a sample/required schedule
  const workTerms = new Set()
  let majorRuleBased = false // major reqs expressed as rules (schedule is sample)
  const schedule = [] // { sem, code } fixed (non-choice) rows only
  const namedSelects = [] // { credits, label, options:Set }
  const rules = []
  const aoes = [] // { name, named:Set, selectFrom:[{credits,label,options:[]}] }
  const totals = []
  let summaryAoe = 0
  let majorFloor = 0
  let hasCoopSection = false

  let section = 'pre'
  let currentSem = 0
  let curSelect = null // active choose-list (schedule or major section)
  let inNamedTable = false
  let menuMode = false // inside a reference list of acceptable electives
  let currentAoe = null
  let aoeSelect = null
  const recent = []
  const titleBefore = () => [...recent].reverse().find(isTitleLike)

  for (const line of lines) {
    // Section transitions (most specific first). The Minor section is ignored.
    if (/^Minor Requirements/i.test(line)) {
      section = 'minor'
      curSelect = null
      inNamedTable = false
      menuMode = false
    } else if (/^Co-op Requirements|Academic and Co-op Work Term Schedule/i.test(line)) {
      section = 'coop'
      hasCoopSection = true
      curSelect = null
      inNamedTable = false
      menuMode = false
    } else if (/^Areas? of Emphasis/i.test(line)) {
      section = 'aoe'
      currentAoe = null
      aoeSelect = null
      menuMode = false
    } else if (/^Credit Summary/i.test(line)) {
      section = 'summary'
      menuMode = false
    } else if (SEM_RE.test(line) || /Recommended Program Sequence|Schedule of Studies/i.test(line)) {
      if (section !== 'minor') {
        section = 'schedule'
        const sm = line.match(SEM_RE)
        if (sm) currentSem = parseInt(sm[1], 10)
        curSelect = null
        menuMode = false
      }
    } else if (/^(Major Requirements|Honours (Major|Requirements)|General (Major|Requirements)|Major \()/i.test(line)) {
      if (section !== 'minor') {
        section = 'major'
        curSelect = null
        inNamedTable = false
        menuMode = false
      }
    }

    if (section === 'minor') {
      recent.push(line)
      if (recent.length > 8) recent.shift()
      continue
    }

    const row = line.match(COURSE_ROW)
    if (row && row[1].startsWith('COOP*')) workTerms.add(row[1])

    if (section === 'schedule' || section === 'major' || section === 'coop') {
      if (isMenuHeading(line)) menuMode = true
      const selC = selectHeader(line)
      if (selC != null) {
        const label = titleBefore() || `Select ${selC.toFixed(2)} credits`
        curSelect = { credits: selC, label, options: new Set() }
        namedSelects.push(curSelect)
        inNamedTable = false
        menuMode = false
      } else if (/^Code Title Credits/i.test(line)) {
        inNamedTable = true
        curSelect = null
      } else if (row) {
        const code = row[1]
        if (!code.startsWith('COOP*')) {
          if (curSelect) curSelect.options.add(code)
          // Reference menus list acceptable electives, not required core.
          else if (!menuMode) {
            if (section === 'major') {
              majorCore.add(code)
            } else {
              schedCore.add(code)
              schedule.push({ sem: currentSem, code })
            }
          }
        }
      } else {
        const rule = parseRuleLine(line)
        if (rule) {
          rules.push(rule)
          curSelect = null
          if (section === 'major') majorRuleBased = true
        }
        const fl = line.match(/A minimum of\s+(\d+\.\d{2})\s+\S+\s+credits/i)
        if (fl) {
          majorFloor = Math.max(majorFloor, parseFloat(fl[1]))
          if (section === 'major') majorRuleBased = true
        }
      }
    } else if (section === 'aoe') {
      const selC = selectHeader(line)
      if (selC != null) {
        aoeSelect = { credits: selC, label: `Select ${selC.toFixed(2)} credits`, options: [] }
        if (currentAoe) currentAoe.selectFrom.push(aoeSelect)
      } else if (row) {
        const code = row[1]
        if (aoeSelect) aoeSelect.options.push(code)
        else if (currentAoe) currentAoe.named.add(code)
      } else if (/^Code Title Credits/i.test(line)) {
        const name = titleBefore()
        if (name) {
          currentAoe = { name, named: new Set(), selectFrom: [] }
          aoeSelect = null
          aoes.push(currentAoe)
        }
      }
    } else if (section === 'summary') {
      const aoeM = line.match(/Area of Emphasis\s+(\d+\.\d{2})/i)
      if (aoeM) summaryAoe = parseFloat(aoeM[1])
      for (const tm of line.matchAll(/Total Credits\s+(\d+(?:\.\d+)?)/gi)) {
        totals.push(parseFloat(tm[1]))
      }
      const pm = line.match(/\((\d+(?:\.\d+)?)\s+Total Credits\)/i)
      if (pm) totals.push(parseFloat(pm[1]))
    }

    recent.push(line)
    if (recent.length > 8) recent.shift()
  }

  // --- Aggregate ---
  // When the major section is rule-based, the schedule is just a sample path, so
  // only its rules/floors count; otherwise the schedule courses are the core.
  const core = majorRuleBased
    ? [...majorCore]
    : [...new Set([...majorCore, ...schedCore])]
  const work = [...workTerms]
  const coreCredits = round2(sumCredits(core))
  const workCredits = round2(sumCredits(work))

  // Dedupe choose-lists by their option signature (programs repeat co-op blocks).
  const selectSeen = new Set()
  const selectGroups = []
  for (const s of namedSelects) {
    const opts = [...s.options]
    if (opts.length === 0) continue
    const key = opts.slice().sort().join(',')
    if (selectSeen.has(key)) continue
    selectSeen.add(key)
    selectGroups.push({ credits: s.credits, label: s.label, options: opts })
  }
  const selectCredits = round2(selectGroups.reduce((t, s) => t + s.credits, 0))

  // Aggregate rules by (subject, level range); take the larger of duplicates so
  // a repeated co-op block doesn't double a requirement.
  const ruleMap = new Map()
  for (const r of rules) {
    const key = `${r.subject ?? 'ANY'}|${r.minLevel ?? 0}|${r.maxLevel ?? 0}`
    const prev = ruleMap.get(key)
    if (prev) prev.credits = Math.max(prev.credits, r.credits)
    else ruleMap.set(key, { ...r })
  }
  const ruleList = [...ruleMap.values()]
  const ruleCredits = round2(ruleList.reduce((t, r) => t + r.credits, 0))

  const areasOfEmphasis = aoes
    .filter((a) => a.named.size > 0 || a.selectFrom.length > 0)
    .map((a, i) => ({
      id: `aoe-${i}`,
      name: a.name,
      named: [...a.named],
      selectFrom: a.selectFrom.filter((s) => s.options.length > 0),
      credits: summaryAoe || 4.0,
    }))
  const aoeCredits = areasOfEmphasis.length ? summaryAoe || 4.0 : 0

  const known = round2(coreCredits + selectCredits + ruleCredits + aoeCredits)
  const uniqTotals = [...new Set(totals)].sort((a, b) => a - b)
  let regularTotal =
    uniqTotals[0] ?? (/(Bachelor|Honours)/i.test(degree) ? 20.0 : known)
  if (regularTotal < known) regularTotal = known

  const emitCoop = work.length > 0
  let coopTotal =
    uniqTotals.length > 1
      ? uniqTotals[uniqTotals.length - 1]
      : round2(regularTotal + (workCredits || 2.0))
  const coopKnown = round2(known + workCredits)
  if (coopTotal < coopKnown) coopTotal = coopKnown

  function buildGroups(includeWork) {
    const g = []
    if (core.length) {
      g.push({
        id: 'core',
        name: 'Required Core Courses',
        description: 'Required courses for the major.',
        priority: 10,
        requiredCredits: coreCredits,
        named: core,
        selectFrom: [],
      })
    }
    if (includeWork && work.length) {
      g.push({
        id: 'workTerm',
        name: 'Co-op Work Terms',
        description: 'Required co-op work terms.',
        priority: 15,
        requiredCredits: workCredits,
        named: work,
        selectFrom: [],
      })
    }
    selectGroups.forEach((s, i) =>
      g.push({
        id: `select-${i}`,
        name: s.label,
        description: 'Choose courses from this list.',
        priority: 22,
        requiredCredits: s.credits,
        named: [],
        selectFrom: [s],
      }),
    )
    ruleList.forEach((r, i) => {
      const subjLabel = r.subject ? `${r.subject} ` : ''
      const lvlLabel = r.minLevel
        ? r.maxLevel
          ? ` (${r.minLevel} level)`
          : ` (${r.minLevel}+ level)`
        : ''
      g.push({
        id: `rule-${i}`,
        name: `${subjLabel}Electives${lvlLabel}`.trim(),
        description: 'Restricted electives by subject/level.',
        priority: r.maxLevel ? 28 : 30,
        requiredCredits: r.credits,
        named: [],
        selectFrom: [],
        match: {
          subjects: r.subject ? [r.subject] : undefined,
          minLevel: r.minLevel,
          maxLevel: r.maxLevel,
        },
      })
    })
    const total = includeWork ? coopTotal : regularTotal
    const knownAll = round2(known + (includeWork ? workCredits : 0))
    const free = round2(Math.max(0, total - knownAll))
    if (free > 0) {
      g.push({
        id: 'free',
        name: 'Free Electives',
        description: 'Any university courses.',
        priority: 40,
        requiredCredits: free,
        named: [],
        selectFrom: [],
        match: { anyCourse: true },
      })
    }
    return g
  }

  // Recommended sequence + default terms from the detected semesters.
  const semNums = [...new Set(schedule.map((s) => s.sem).filter((n) => n > 0))].sort(
    (a, b) => a - b,
  )
  const regularTerms = semNums.length
    ? semNums.map((n) => ({
        id: `s${n}`,
        label: `Semester ${n}`,
        season: n % 2 === 1 ? 'Fall' : 'Winter',
      }))
    : semScaffold(8)
  const seqMap = new Map()
  for (const { sem, code } of schedule) {
    if (sem <= 0) continue
    if (!seqMap.has(sem)) seqMap.set(sem, [])
    if (!seqMap.get(sem).includes(code)) seqMap.get(sem).push(code)
  }
  const recommendedSequence = [...seqMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sem, codes]) => ({ termId: `s${sem}`, codes }))

  const hasRequirements =
    core.length > 0 || selectGroups.length > 0 || ruleList.length > 0
  const warnings = []
  if (!hasRequirements && areasOfEmphasis.length === 0) {
    warnings.push('No requirements detected for this program.')
  }
  if (majorFloor && !uniqTotals.length) {
    warnings.push(`Total estimated; major floor is ${majorFloor} credits.`)
  }

  const source = `${CALENDAR}/programs-majors-minors/${slug}/${slug}.pdf`
  const generatedAt = new Date().toISOString()
  const name = slugToName(slug)
  const baseWarn = warnings.length ? warnings : undefined

  const regular = {
    id: slug,
    name,
    degree,
    totalCredits: regularTotal,
    groups: buildGroups(false),
    areasOfEmphasis,
    aoeCredits,
    recommendedSequence,
    defaultTerms: regularTerms,
    source,
    generatedAt,
    parseWarnings: baseWarn,
    empty: !hasRequirements && areasOfEmphasis.length === 0,
  }

  const out = [regular]
  if (emitCoop) {
    out.push({
      id: `${slug}-coop`,
      name: `${name} (Co-op)`,
      degree,
      totalCredits: coopTotal,
      groups: buildGroups(true),
      areasOfEmphasis,
      aoeCredits,
      recommendedSequence: [],
      defaultTerms: COOP_SCAFFOLD.map((t) => ({ ...t })),
      source,
      generatedAt,
      parseWarnings: baseWarn,
      empty: !hasRequirements && areasOfEmphasis.length === 0,
    })
  }
  return out
}

// ----------------------------------------------------------------------------
// Curated Computer Science (regular + co-op) for guaranteed accuracy
// ----------------------------------------------------------------------------

function csAreas() {
  return [
    {
      id: 'cybersecurity',
      name: 'Cybersecurity',
      description:
        'Protecting computer systems and networks from cyber threats: security risks, cryptography, and secure system design.',
      named: ['CIS*3210', 'CIS*3530', 'CIS*4010', 'CIS*4510', 'CIS*4520', 'MATH*3130', 'PHIL*2120'],
      selectFrom: [
        { credits: 0.5, label: 'Cybersecurity Elective', options: ['HIST*1150', 'HIST*1250', 'HIST*2040', 'HIST*2220'] },
      ],
      credits: 4.0,
    },
    {
      id: 'data-science',
      name: 'Data Science',
      description:
        'Analysis and interpretation of large data sets: data analysis, visualization, and machine learning.',
      named: ['CIS*3130', 'CIS*3530', 'CIS*4020', 'CIS*4780', 'MATH*1210', 'STAT*2050', 'STAT*3210', 'STAT*3240'],
      selectFrom: [],
      credits: 4.0,
    },
    {
      id: 'ux',
      name: 'User Experience (UX)',
      description:
        'User-centered design: research user needs and design, build, and test interactive prototypes.',
      named: ['CIS*1050', 'CIS*2170', 'CIS*4300', 'STAT*2050'],
      selectFrom: [
        { credits: 0.5, label: 'UX Technical Elective', options: ['CIS*3530', 'CIS*3700', 'CIS*4020', 'CIS*4030', 'CIS*4820'] },
        {
          credits: 1.5,
          label: 'UX Breadth Elective',
          options: [
            'ANTH*1150', 'ANTH*2180', 'ANTH*2230', 'ANTH*2660', 'CTS*1000', 'CTS*2010', 'CTS*3010',
            'CTS*3020', 'HROB*2090', 'ONEH*1000', 'PSYC*1000', 'PSYC*2390', 'PSYC*2450', 'PSYC*2650',
            'PSYC*3800', 'SOAN*2120', 'SOAN*2290', 'SOAN*3040', 'SOC*1100', 'SOC*2280', 'SOC*2390',
            'SOC*3410', 'SXGN*1000', 'SXGN*1010',
          ],
        },
      ],
      credits: 4.0,
    },
    {
      id: 'ai',
      name: 'Artificial Intelligence (AI)',
      description:
        'Designing systems that learn, reason, and solve problems: machine learning, neural networks, and AI ethics.',
      named: ['CIS*3090', 'CIS*3700', 'CIS*4020', 'CIS*4720', 'CIS*4780', 'MATH*1210', 'PHIL*3370', 'STAT*2050'],
      selectFrom: [],
      credits: 4.0,
    },
  ]
}

function csElectiveGroups() {
  return [
    {
      id: 'cis4000',
      name: 'CIS Electives (4000 level)',
      description: 'CIS courses at the 4000 level, beyond named major and AoE courses.',
      priority: 28,
      requiredCredits: 1.5,
      named: [],
      selectFrom: [],
      match: { subjects: ['CIS'], minLevel: 4000 },
    },
    {
      id: 'cis3000',
      name: 'CIS Electives (3000+ level)',
      description: 'CIS courses at the 3000 level or above, beyond named major and AoE courses.',
      priority: 30,
      requiredCredits: 2.0,
      named: [],
      selectFrom: [],
      match: { subjects: ['CIS'], minLevel: 3000 },
    },
  ]
}

function csCore() {
  return [
    'CIS*1300', 'CIS*1910', 'MATH*1200',
    'CIS*2500', 'CIS*2910', 'MATH*1160',
    'CIS*2030', 'CIS*2430', 'CIS*2520',
    'CIS*2750', 'CIS*3110', 'CIS*3490',
    'CIS*3150', 'CIS*3750', 'STAT*2040',
    'CIS*3760', 'CIS*4650',
  ]
}

function curatedCS() {
  const core = csCore()
  const coreGroup = {
    id: 'core',
    name: 'Required Core Courses',
    description: 'Required core courses for the B.Comp CS major.',
    priority: 10,
    requiredCredits: round2(sumCredits(core)),
    named: core,
    selectFrom: [],
  }
  const free = {
    id: 'free',
    name: 'Free Electives',
    description: 'Any university courses, tracked separately from your AoE.',
    priority: 40,
    requiredCredits: 4.0,
    named: [],
    selectFrom: [],
    match: { anyCourse: true },
  }
  const source = `${CALENDAR}/programs-majors-minors/computer-science-cs/computer-science-cs.pdf`
  const generatedAt = new Date().toISOString()

  // Regular (8 semesters, 20.0 credits).
  const regularTerms = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    id: `s${n}`,
    label: `Semester ${n}`,
    season: n % 2 === 1 ? 'Fall' : 'Winter',
  }))
  const regularSeq = [
    ['CIS*1300', 'CIS*1910', 'MATH*1200'],
    ['CIS*2500', 'CIS*2910', 'MATH*1160'],
    ['CIS*2030', 'CIS*2430', 'CIS*2520'],
    ['CIS*2750', 'CIS*3110', 'CIS*3490'],
    ['CIS*3150', 'CIS*3750', 'STAT*2040'],
    ['CIS*3760'],
    [],
    ['CIS*4650'],
  ].map((codes, i) => ({ termId: `s${i + 1}`, codes }))

  const regular = {
    id: 'computer-science-cs',
    name: 'Computer Science',
    degree: 'Bachelor of Computing',
    totalCredits: 20.0,
    groups: [coreGroup, ...csElectiveGroups(), free],
    areasOfEmphasis: csAreas(),
    aoeCredits: 4.0,
    recommendedSequence: regularSeq,
    defaultTerms: regularTerms,
    source,
    generatedAt,
  }

  // Co-op (5 years incl. 5 work terms, 22.5 credits).
  const work = ['COOP*1100', 'COOP*1000', 'COOP*2000', 'COOP*3000', 'COOP*4000', 'COOP*5000']
  const coopTerms = [
    { id: 'y1f', label: 'Year 1 Fall', season: 'Fall' },
    { id: 'y1w', label: 'Year 1 Winter', season: 'Winter' },
    { id: 'y2f', label: 'Year 2 Fall', season: 'Fall' },
    { id: 'y2w', label: 'Year 2 Winter', season: 'Winter' },
    { id: 'y2s', label: 'Year 2 Summer', season: 'Summer' },
    { id: 'y3f', label: 'Year 3 Fall', season: 'Fall' },
    { id: 'y3w', label: 'Year 3 Winter', season: 'Winter' },
    { id: 'y3s', label: 'Year 3 Summer', season: 'Summer' },
    { id: 'y4f', label: 'Year 4 Fall', season: 'Fall' },
    { id: 'y4w', label: 'Year 4 Winter', season: 'Winter' },
    { id: 'y4s', label: 'Year 4 Summer', season: 'Summer' },
    { id: 'y5f', label: 'Year 5 Fall', season: 'Fall' },
    { id: 'y5w', label: 'Year 5 Winter', season: 'Winter' },
  ]
  const coopSeq = {
    y1f: ['CIS*1300', 'CIS*1910', 'MATH*1200'],
    y1w: ['CIS*2500', 'CIS*2910', 'MATH*1160', 'COOP*1100'],
    y2f: ['CIS*2030', 'CIS*2430', 'CIS*2520'],
    y2w: ['COOP*1000'],
    y2s: ['CIS*2750', 'CIS*3110', 'CIS*3490', 'STAT*2040'],
    y3f: ['CIS*3150', 'CIS*3750'],
    y3w: ['CIS*3760'],
    y3s: ['COOP*2000'],
    y4f: ['COOP*3000'],
    y4w: ['COOP*4000'],
    y4s: ['COOP*5000'],
    y5f: [],
    y5w: ['CIS*4650'],
  }
  const workGroup = {
    id: 'workTerm',
    name: 'Co-op Work Terms',
    description: 'Required co-op work terms.',
    priority: 15,
    requiredCredits: round2(sumCredits(work)),
    named: work,
    selectFrom: [],
  }
  const coop = {
    id: 'computer-science-cs-coop',
    name: 'Computer Science (Co-op)',
    degree: 'Bachelor of Computing',
    totalCredits: 22.5,
    groups: [coreGroup, workGroup, ...csElectiveGroups(), free],
    areasOfEmphasis: csAreas(),
    aoeCredits: 4.0,
    recommendedSequence: coopTerms.map((t) => ({ termId: t.id, codes: coopSeq[t.id] ?? [] })),
    defaultTerms: coopTerms,
    source,
    generatedAt,
  }

  return [regular, coop]
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  await mkdir(PROGRAMS_DIR, { recursive: true })
  // Clear stale program files so dropped/renamed programs don't linger.
  for (const f of await readdir(PROGRAMS_DIR)) {
    if (f.endsWith('.json')) await rm(join(PROGRAMS_DIR, f))
  }

  try {
    COURSES = JSON.parse(await readFile(join(PUBLIC_DIR, 'courses.json'), 'utf8'))
  } catch {
    console.warn('  ! public/courses.json not found - run `npm run scrape` first. Using 0.50 credit defaults.')
  }

  console.log('Discovering programs...')
  const slugs = await discoverPrograms()
  console.log(`  found ${slugs.length} program slugs`)

  const programs = []
  for (const slug of slugs) {
    const url = `${CALENDAR}/programs-majors-minors/${slug}/${slug}.pdf`
    const data = await tryDownload(url, join(CACHE_DIR, `program-${slug}.pdf`))
    if (!data) continue
    try {
      if (slug === 'computer-science-cs') {
        programs.push(...curatedCS())
      } else {
        const lines = await pdfToLines(data)
        programs.push(...parseProgram(slug, lines))
      }
    } catch (err) {
      console.warn(`  ! failed to parse ${slug}: ${err.message}`)
    }
  }

  // Write one file per program (skipping programs with no parseable
  // requirements) + a small index for the picker.
  const index = []
  let dropped = 0
  for (const p of programs) {
    const { empty, ...prog } = p
    if (empty) {
      dropped++
      continue
    }
    await writeFile(join(PROGRAMS_DIR, `${prog.id}.json`), JSON.stringify(prog))
    index.push({ id: prog.id, name: prog.name, degree: prog.degree })
  }
  index.sort((a, b) => a.name.localeCompare(b.name))
  await writeFile(join(PUBLIC_DIR, 'programs-index.json'), JSON.stringify(index))

  console.log(`\nDone. ${index.length} programs -> public/programs/*.json (dropped ${dropped} empty)`)
  console.log(`Index (${index.length}) -> public/programs-index.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
