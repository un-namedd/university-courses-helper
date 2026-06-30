import { LegalDocument } from '../components/legal/LegalDocument'
import { LegalFooterLinks } from '../components/legal/LegalFooterLinks'
import {
  legalDocTitles,
  loadLegalDocument,
  type LegalDocId,
} from '../lib/legal/load-legal-doc'

const paths: Record<LegalDocId, string> = {
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  'legal-notice': '/legal-notice',
}

export function LegalPage({ id }: { id: LegalDocId }) {
  return (
    <div className="min-h-screen bg-bg">
      <LegalDocument
        title={legalDocTitles[id]}
        markdown={loadLegalDocument(id)}
        canonicalPath={paths[id]}
      />
      <LegalFooterLinks className="pb-10" />
    </div>
  )
}
