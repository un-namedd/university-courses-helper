import { getProgram } from '../lib/program'
import { usePlan } from '../store'
import { round } from '../lib/format'
import { ThemeToggle } from './ThemeToggle'
import { LayoutSwitcher } from './LayoutSwitcher'
import { ProgramPicker } from './ProgramPicker'
import { AccountMenu } from './AccountMenu'
import { CloudPlanActions } from './CloudPlanActions'

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

  const credits = (
    <>
      <div className="text-sm font-semibold text-fg">
        {round(totalEarned)}{' '}
        <span className="text-faint">/ {round(totalRequired)} cr</span>
      </div>
      <div className="text-[11px] text-muted">{pct}% planned</div>
    </>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1500px] space-y-3 px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-base font-bold text-accent-fg sm:h-10 sm:w-10 sm:text-lg">
              G
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight text-fg sm:text-lg">
                Degree Planner
              </h1>
              <p className="truncate text-[11px] text-muted sm:text-xs">
                <span className="sm:hidden">U of G</span>
                <span className="hidden sm:inline">University of Guelph</span>
                {program?.degree ? (
                  <>
                    <span className="hidden sm:inline"> · </span>
                    <span className="sm:hidden"> · </span>
                    <span className="hidden md:inline">{program.degree}</span>
                    <span className="md:hidden">
                      {program.degree.replace(/^Bachelor of /i, '')}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>

        <div className="sm:hidden">{credits}</div>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-5 sm:gap-y-3">
          <div className="flex min-w-0 flex-col gap-1.5 sm:min-w-[200px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Program
            </label>
            <ProgramPicker />
          </div>

          {areas.length > 0 && (
            <div className="flex min-w-0 flex-col gap-1.5 sm:min-w-[200px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Area of Emphasis
              </label>
              <select
                value={aoeId ?? ''}
                onChange={(e) => setAoe(e.target.value || null)}
                className="w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none focus:border-accent/60 sm:min-w-[210px] sm:px-3.5"
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

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <CloudPlanActions />

          <div className="flex flex-1 flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={resetRecommended}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-fg transition hover:border-accent/60 sm:px-3.5 sm:py-2.5"
            >
              Recommended
            </button>
            <button
              onClick={resetEmpty}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-fg transition hover:border-accent/60 sm:px-3.5 sm:py-2.5"
            >
              Clear
            </button>
            <LayoutSwitcher />
          </div>

          <div className="hidden shrink-0 text-right sm:block">{credits}</div>
        </div>
      </div>
    </header>
  )
}
