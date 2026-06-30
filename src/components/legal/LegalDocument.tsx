import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { legalSiteConfig } from '../../lib/legal/site-config'

export function LegalDocument({
  title,
  markdown,
  canonicalPath,
}: {
  title: string
  markdown: string
  canonicalPath: string
}) {
  return (
    <article className="legal-prose mx-auto max-w-2xl px-6 pb-16 pt-8">
      <header className="mb-8 space-y-3 border-b border-line pb-6">
        <Link to="/" className="text-xs text-accent hover:underline">
          ← Back to planner
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        <p className="text-xs text-faint">
          Canonical copy:{' '}
          <a
            href={`${legalSiteConfig.websiteUrl}${canonicalPath}`}
            className="text-accent hover:underline"
          >
            {legalSiteConfig.websiteUrl.replace(/^https?:\/\//, '')}
            {canonicalPath}
          </a>
        </p>
      </header>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  )
}
