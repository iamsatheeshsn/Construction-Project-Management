import type { LaravelMeta } from './helpers'

type Props = {
  meta?: LaravelMeta
  page: number
  onPageChange: (page: number) => void
}

export function Pagination({ meta, page, onPageChange }: Props) {
  if (!meta || meta.last_page <= 1) return null

  const from = meta.from ?? (meta.total === 0 ? 0 : (page - 1) * meta.per_page + 1)
  const to = meta.to ?? Math.min(page * meta.per_page, meta.total)

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {from}–{to} of {meta.total}
      </div>
      <div className="pagination-actions">
        <button type="button" className="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="muted small">
          Page {meta.current_page} / {meta.last_page}
        </span>
        <button type="button" className="ghost" disabled={page >= meta.last_page} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
