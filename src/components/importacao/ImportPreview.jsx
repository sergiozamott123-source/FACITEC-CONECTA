import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 50

export function ImportPreview({ rows, displayCols, onImport, onCancel, importing }) {
  const valid = rows.filter(r => !r._skip)
  const invalid = rows.filter(r => r._skip)
  const preview = rows.slice(0, PREVIEW_LIMIT)

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="font-medium text-emerald-700">{valid.length} válidos</span>
        </div>
        {invalid.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="font-medium text-destructive">{invalid.length} com erro</span>
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {rows.length > PREVIEW_LIMIT ? `Exibindo ${PREVIEW_LIMIT} de ${rows.length} linhas` : `${rows.length} linhas`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium w-8">#</th>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium w-20">Status</th>
              {displayCols.map(col => (
                <th key={col} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-t border-border',
                  row._skip ? 'bg-red-50/50' : i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                )}
              >
                <td className="px-3 py-1.5 text-muted-foreground">{row._rowNum ?? i + 2}</td>
                <td className="px-3 py-1.5">
                  {row._skip ? (
                    <div className="flex items-start gap-1">
                      <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      <span className="text-destructive text-[10px] leading-tight">{row._errors?.[0]}</span>
                    </div>
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </td>
                {displayCols.map(col => (
                  <td key={col} className="px-3 py-1.5 max-w-[180px] truncate text-foreground">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invalid.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {invalid.length} linha(s) com erro serão ignoradas. Apenas {valid.length} registros válidos serão importados.
          </span>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={importing}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onImport} disabled={importing || valid.length === 0}>
          {importing ? 'Importando…' : `Importar ${valid.length} registro(s)`}
        </Button>
      </div>
    </div>
  )
}
