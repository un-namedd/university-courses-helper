import { getProgram } from '../lib/program'
import { usePlan } from '../store'
import { round } from '../lib/format'
import { ThemeToggle } from './ThemeToggle'
import { LayoutSwitcher } from './LayoutSwitcher'
import { ProgramPicker } from './ProgramPicker'
import { AccountMenu } from './AccountMenu'

interface Props {
  totalEarned: number
  totalRequired: number
}

export function Header({ totalEarned, totalRequired }: Props) {
  const programId = usePlan((s) => s.programId)
  const aoeId = usePlan((s) => s.aoeId)
  const setAoe = usePlan((s) => s.setAoe)
  const resetEmpty = usePlan((s) => s.resetEmpty)
  const resetRecommended = usePlan((s) => s.resetRecommended)

  // programId subscription keeps this in sync with the active program.
  void programId
  const program = getProgram()
  const areas = program?.areasOfEmphasis ?? []
  const pct =
    totalRequired > 0 ? Math.round((totalEarned / totalRequired) * 100) : 0

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-lg font-bold text-accent-fg">
            G
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-fg">
              Degree Planner
            </h1>
            <p className="text-xs text-muted">
              University of Guelph{program?.degree ? ` · ${program.degree}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Program
            </label>
            <ProgramPicker />
          </div>

          {areas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Area of Emphasis
              </label>
              <select
                value={aoeId ?? ''}
                onChange={(e) => setAoe(e.target.value || null)}
                className="min-w-[210px] rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent/60"
              >
                <option value="">— None —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-fg">
              {round(totalEarned)}{' '}
              <span className="text-faint">/ {round(totalRequired)} cr</span>
            </div>
            <div className="text-[11px] text-muted">{pct}% planned</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetRecommended}
              className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-medium text-fg transition hover:border-accent/60"
            >
              Recommended
            </button>
            <button
              onClick={resetEmpty}
              className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-medium text-fg transition hover:border-accent/60"
            >
              Clear
            </button>
          </div>

          <LayoutSwitcher />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
