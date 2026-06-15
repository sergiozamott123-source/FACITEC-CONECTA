import { CheckCircle2, XCircle, AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function ImportReport({ report, onReset }) {
  if (!report) return null
  const { total, success, skipped = 0, errors = [] } = report
  const allOk = errors.length === 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-foreground', bg: 'bg-muted/60' },
          { label: 'Importados', value: success, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Ignorados', value: skipped, color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Erros', value: errors.length, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(c => (
          <div key={c.label} className={`rounded-lg p-4 ${c.bg} text-center`}>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-md px-4 py-3 ${allOk ? 'bg-emerald-50 border border-emerald-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        {allOk
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
        }
        <p className="text-sm font-medium">
          {allOk
            ? `Importação concluída com sucesso! ${success} registro(s) inserido(s).`
            : `Importação concluída com ${errors.length} erro(s). ${success} registro(s) importado(s).`
          }
        </p>
      </div>

      {/* Error details */}
      {errors.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Detalhes dos erros:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b last:border-0 border-border">
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-foreground">Linha {e.row}: {e.label}</span>
                    <span className="text-muted-foreground ml-1">— {e.error}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4" /> Nova Importação
        </Button>
      </div>
    </div>
  )
}
