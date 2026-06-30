interface IconProps {
  className?: string
}

export function GripIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5" cy="3" r="1.4" />
      <circle cx="11" cy="3" r="1.4" />
      <circle cx="5" cy="8" r="1.4" />
      <circle cx="11" cy="8" r="1.4" />
      <circle cx="5" cy="13" r="1.4" />
      <circle cx="11" cy="13" r="1.4" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h14M8 5V3.5A1.5 1.5 0 019.5 2h1A1.5 1.5 0 0112 3.5V5m2 0v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5" />
      <path d="M8.5 9v5M11.5 9v5" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M10 4v12M4 10h12" />
    </svg>
  )
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M10 5C8.5 3.8 6 3.5 3.5 4v11C6 14.5 8.5 14.8 10 16c1.5-1.2 4-1.5 6.5-1V4C14 3.5 11.5 3.8 10 5z" />
      <path d="M10 5v11" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8h14M7 3v3M13 3v3" />
    </svg>
  )
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M16 4l-1.4 1.4M5.4 14.6L4 16" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M16 11.5A6.5 6.5 0 018.5 4a5 5 0 00-1 .1 6 6 0 108.4 8.4 6.6 6.6 0 01.1-1z" />
    </svg>
  )
}

export function LayoutLeftIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M8 3.5v13" />
      <rect x="3.8" y="5" width="2.6" height="2" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LayoutRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M12 3.5v13" />
      <rect x="13.6" y="5" width="2.6" height="2" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LayoutTopIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M2.5 8h15" />
      <rect x="4" y="5" width="3" height="1.4" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WarnIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2l8.5 15H1.5L10 2z" opacity="0.18" />
      <path d="M10 2l8.5 15H1.5L10 2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 8v4" stroke="#0b0b0f" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.3" r="0.9" fill="#0b0b0f" />
    </svg>
  )
}

export function SaveIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M4 3.5h9l3.5 3.5V16a1 1 0 01-1 1H5a1 1 0 01-1-1V4.5a1 1 0 011-1z" />
      <path d="M7 3.5v4h6V3.5M7 16h6" />
    </svg>
  )
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M3 6.5A1.5 1.5 0 014.5 5H8l1.5 2h6A1.5 1.5 0 0117 8.5v6A1.5 1.5 0 0115.5 16h-11A1.5 1.5 0 013 14.5v-8z" />
    </svg>
  )
}
