import { round } from '../lib/format'

interface Props {
  earned: number
  required: number
  /** Tailwind bg-* class for the fill. Defaults to the accent color. */
  barClass?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({ earned, required, barClass = 'bg-accent', size = 'md' }: Props) {
  const pct = required > 0 ? Math.min(100, (earned / required) * 100) : 0
  const complete = required > 0 && earned >= required
  return (
    <div
      className={
        'w-full overflow-hidden rounded-full bg-surface-2 ' +
        (size === 'sm' ? 'h-1.5' : 'h-2.5')
      }
    >
      <div
        className={
          'h-full rounded-full transition-all duration-500 ' +
          barClass +
          (complete ? ' opacity-100' : ' opacity-90')
        }
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function CreditTag({
  earned,
  required,
  accent = 'text-accent',
  className = 'text-sm',
}: {
  earned: number
  required: number
  accent?: string
  className?: string
}) {
  return (
    <span className={'shrink-0 font-semibold tabular-nums ' + className}>
      <span className={accent}>{round(earned)}</span>
      <span className="text-faint"> / {round(required)} cr</span>
    </span>
  )
}
