import { useEffect } from 'react'
import { usePlan } from '../store'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle() {
  const theme = usePlan((s) => s.theme)
  const toggleTheme = usePlan((s) => s.toggleTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle color theme"
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted transition hover:border-line-strong hover:text-accent"
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  )
}
