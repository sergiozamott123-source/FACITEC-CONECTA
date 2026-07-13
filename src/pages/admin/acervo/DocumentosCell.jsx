import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { AnexarDocumento } from '@/components/acervo/AnexarDocumento'
import { ListaDocumentos } from '@/components/acervo/ListaDocumentos'

// Célula "Documentos" reaproveitada nas 4 tabelas do Acervo (Projetos,
// Orientadores, Bolsistas, Inscritos): mostra a contagem (ou "—") e expande,
// na própria célula, a lista + o upload — substitui o accordion único que
// existia antes por projeto.
export function DocumentosCell({ edicaoId, entidadeTipo, entidadeId, docs, label, onChange }) {
  const [expandido, setExpandido] = useState(false)

  if (docs.length === 0 && !expandido) {
    return (
      <button
        type="button"
        onClick={() => setExpandido(true)}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        — <span className="underline">anexar</span>
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="text-xs font-medium text-blue-700 inline-flex items-center gap-1"
      >
        {expandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <FileText className="w-3.5 h-3.5" />
        {docs.length === 0 ? 'Anexar' : `${docs.length} documento${docs.length !== 1 ? 's' : ''}`}
      </button>

      {expandido && (
        <div className="mt-2 space-y-2 max-w-sm">
          <ListaDocumentos documentos={docs} onChange={onChange} />
          <AnexarDocumento
            edicaoId={edicaoId}
            entidadeTipo={entidadeTipo}
            entidadeId={entidadeId}
            onUploaded={onChange}
            label={label ?? 'Anexar documento'}
          />
        </div>
      )}
    </div>
  )
}
