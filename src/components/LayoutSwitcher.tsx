import { usePlan, type Layout } from '../store'
import { LayoutLeftIcon, LayoutRightIcon, LayoutTopIcon } from './icons'

const OPTIONS: { id: Layout; label: string; Icon: typeof LayoutLeftIcon }[] = [
  { id: 'sidebar-left', label: 'Requirements on left', Icon: LayoutLeftIcon },
  { id: 'top', label: 'Requirements on top', Icon: LayoutTopIcon },
  { id: 'sidebar-right', label: 'Requirements on right', Icon: LayoutRightIcon },
]

export function LayoutSwitcher() {
  const layout = usePlan((s) => s.layout)
  const setLayout = usePlan((s) => s.setLayout)

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = layout === id
        return (
          <button
            key={id}
            onClick={() => setLayout(id)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={
              'grid h-7 w-8 place-items-center rounded-full transition ' +
              (active
                ? 'bg-accent text-accent-fg'
                : 'text-muted hover:text-fg')
            }
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        )
      })}
    </div>
  )
}
