/**
 * components/ArticleCard.jsx
 * One article inside a cluster's detail list: headline (links to the
 * original), source, published time, and summary if we have one.
 */

import { formatDateTime } from "@/lib/formatTime";

export default function ArticleCard({ article, sourceColor }) {
  return (
    <article className="rounded-lg border border-gridline bg-surface p-4 transition-shadow hover:shadow-sm">
      <div className="mb-1.5 flex items-center gap-2 text-xs">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${sourceColor.dot}`} />
        <span className={`font-medium ${sourceColor.text}`}>{article.source}</span>
        <span className="text-muted">·</span>
        <time className="text-muted" dateTime={article.publishedAt}>
          {formatDateTime(article.publishedAt)}
        </time>
      </div>

      <h4 className="mb-1 font-medium leading-snug text-ink">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent-strong hover:underline"
        >
          {article.title}
        </a>
      </h4>

      {article.summary && (
        <p className="line-clamp-2 text-sm text-ink-secondary">{article.summary}</p>
      )}
    </article>
  );
}
