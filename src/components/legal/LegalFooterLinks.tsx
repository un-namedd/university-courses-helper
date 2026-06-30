import { Link } from 'react-router-dom'

const links = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/legal-notice', label: 'Legal notice' },
] as const

export function LegalFooterLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-faint ' + className}
    >
      {links.map((l) => (
        <Link key={l.href} to={l.href} className="transition hover:text-accent">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
