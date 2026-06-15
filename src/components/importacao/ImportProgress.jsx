export function ImportProgress({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-foreground">{label ?? 'Importando dados…'}</p>
      <div className="w-full max-w-sm space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{current} de {total}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
