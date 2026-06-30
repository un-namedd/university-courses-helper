import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  readCookieConsent,
  writeCookieConsent,
} from '../../lib/legal/cookie-consent'

export function CookieConsentBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(readCookieConsent() == null)
  }, [])

  if (!show) return null

  return createPortal(
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 p-4 shadow-lg backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
        <p className="text-sm text-fg">
          We use cookies and local storage to sign you in, remember your theme,
          and store your planner. We do not use analytics or advertising cookies.
        </p>
        <p className="text-xs text-faint">
          See our{' '}
          <Link to="/cookies" className="text-accent underline">
            Cookie Policy
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              writeCookieConsent('acknowledged')
              setShow(false)
            }}
            className="min-h-[40px] rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
