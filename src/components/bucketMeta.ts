export interface GroupColor {
  /** Accent text color (readable in both themes). */
  text: string
  /** Badge background + text tint. */
  chip: string
  /** Solid color used for progress bars / dots. */
  bar: string
}

// A stable palette assigned to requirement groups by order. The first slot uses
// the app accent so the primary "core" group always matches the brand.
const PALETTE: GroupColor[] = [
  { text: 'text-accent', chip: 'bg-accent-soft text-accent', bar: 'bg-accent' },
  { text: 'text-violet-600 dark:text-violet-300', chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', bar: 'bg-violet-500' },
  { text: 'text-sky-600 dark:text-sky-300', chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', bar: 'bg-sky-500' },
  { text: 'text-emerald-600 dark:text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
  { text: 'text-rose-600 dark:text-rose-300', chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', bar: 'bg-rose-500' },
  { text: 'text-amber-600 dark:text-amber-300', chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', bar: 'bg-amber-500' },
  { text: 'text-teal-600 dark:text-teal-300', chip: 'bg-teal-500/15 text-teal-700 dark:text-teal-300', bar: 'bg-teal-500' },
  { text: 'text-fuchsia-600 dark:text-fuchsia-300', chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', bar: 'bg-fuchsia-500' },
]

export const EXTRA_COLOR: GroupColor = {
  text: 'text-faint',
  chip: 'bg-surface-2 text-faint',
  bar: 'bg-faint',
}

export function colorForIndex(i: number): GroupColor {
  return PALETTE[i % PALETTE.length]
}

/** Short badge label for a requirement group name. */
export function shortLabel(name: string): string {
  return name.length > 16 ? name.slice(0, 15).trimEnd() + '…' : name
}
