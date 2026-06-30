export const COOKIE_CONSENT_KEY = 'voktera-cookie-consent'

export type CookieConsentLevel = 'acknowledged'

export function readCookieConsent(): CookieConsentLevel | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
  return raw === 'acknowledged' ? 'acknowledged' : null
}

export function writeCookieConsent(level: CookieConsentLevel): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, level)
}

export function clearCookieConsent(): void {
  localStorage.removeItem(COOKIE_CONSENT_KEY)
}
