import { applyLegalTemplate } from './site-config'
import cookiesRaw from '../../content/legal/cookies.md?raw'
import legalNoticeRaw from '../../content/legal/legal-notice.md?raw'
import privacyRaw from '../../content/legal/privacy.md?raw'
import termsRaw from '../../content/legal/terms.md?raw'

export type LegalDocId = 'privacy' | 'terms' | 'cookies' | 'legal-notice'

const sources: Record<LegalDocId, string> = {
  privacy: privacyRaw,
  terms: termsRaw,
  cookies: cookiesRaw,
  'legal-notice': legalNoticeRaw,
}

export const legalDocTitles: Record<LegalDocId, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookie Policy',
  'legal-notice': 'Legal Notice',
}

export function loadLegalDocument(id: LegalDocId): string {
  return applyLegalTemplate(sources[id])
}
