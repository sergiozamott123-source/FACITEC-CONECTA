import { Archive, CheckCircle2, Loader2 } from 'lucide-react'

// Botão "Arquivar no Acervo" reaproveitado em todos os pontos de origem
// (contrato, termo de adesão, relatório mensal, documento de recurso) — cada
// chamador decide o que "arquivado" e "onClick" significam.
export function ArquivarBotao({ arquivado, loading, onClick }) {
  if (arquivado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
        <CheckCircle2 className="w-3 h-3" /> Já arquivado
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 border border-blue-200 rounded-md px-2 py-1 hover:bg-blue-50 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
      {loading ? 'Arquivando…' : 'Arquivar no Acervo'}
    </button>
  )
}
