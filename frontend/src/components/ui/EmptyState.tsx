interface EmptyStateProps {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="glass-panel rounded-2xl p-8 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
    </div>
  )
}
