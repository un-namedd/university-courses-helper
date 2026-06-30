// Shared helpers for the UoG calendar scrapers: downloading (with on-disk cache)
// and turning a PDF into column-aware lines of text.

import { dirname } from 'node:path'
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

export const CALENDAR = 'https://calendar.uoguelph.ca/undergraduate-calendar'

export const CODE_RE = /^([A-Z]{2,5})\*(\d{4})\b/
export const CREDIT_RE = /\[(\d+(?:\.\d+)?)\]/
export const COURSE_TOKEN = /[A-Z]{2,5}\*\d{4}/g

export async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

export async function download(url, cachePath) {
  if (await exists(cachePath)) {
    return new Uint8Array(await readFile(cachePath))
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, buf)
  return buf
}

/** Download but return null on any failure (e.g. 404), instead of throwing. */
export async function tryDownload(url, cachePath) {
  try {
    return await download(url, cachePath)
  } catch {
    return null
  }
}

/**
 * Convert a PDF into an ordered list of text lines. Handles the calendar's
 * frequent two-column layout by detecting an empty center gutter and grouping
 * each column's lines top-to-bottom (left column first, then right).
 */
export async function pdfToLines(data) {
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const allLines = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const width = viewport.width
    const center = width / 2
    const content = await page.getTextContent()

    const items = content.items
      .filter((it) => it.str !== undefined)
      .map((it) => {
        const x = it.transform[4]
        const y = it.transform[5]
        const w = it.width || 0
        return { str: it.str, x, y, w, xc: x + w / 2 }
      })

    const spanningCenter = items.filter(
      (it) => it.x < center - 4 && it.x + it.w > center + 4,
    ).length
    const twoColumn = spanningCenter <= 2 && items.length > 20

    const assignColumn = (it) => (twoColumn ? (it.xc < center ? 0 : 1) : 0)

    const lineMap = new Map()
    for (const it of items) {
      if (it.str.trim() === '') continue
      const col = assignColumn(it)
      const yKey = Math.round(it.y)
      const key = `${col}:${yKey}`
      let line = lineMap.get(key)
      if (!line) {
        line = { col, y: it.y, parts: [] }
        lineMap.set(key, line)
      }
      line.parts.push(it)
    }

    const lines = [...lineMap.values()].sort((a, b) => {
      if (a.col !== b.col) return a.col - b.col
      return b.y - a.y
    })

    for (const line of lines) {
      line.parts.sort((a, b) => a.x - b.x)
      let text = ''
      let prevEnd = null
      for (const part of line.parts) {
        if (prevEnd !== null && part.x - prevEnd > 1.2 && !text.endsWith(' ')) {
          text += ' '
        }
        text += part.str
        prevEnd = part.x + part.w
      }
      const cleaned = text.replace(/\s+/g, ' ').trim()
      if (cleaned) allLines.push(cleaned)
    }
  }

  return allLines
}
