import { Download, ExternalLink, FileText, Trash2 } from 'lucide-react'
import { documentoAcervoService } from '@/lib/db'

const CATEGORIA_LABEL = {
  foto: 'Foto', video: 'Vídeo', pdf: 'PDF', planilha: 'Planilha', documento: 'Documento', outro: 'Outro',
}

// Lista compacta de documento_acervo já anexados, com ações de visualizar,
// baixar e excluir. Reaproveitada em qualquer nível (edição/projeto/orientador/bolsista).
export function ListaDocumentos({ documentos, onChange }) {
  if (!documentos || documentos.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum documento anexado.</p>
  }

  async function handleExcluir(id) {
    await documentoAcervoService.remove(id)
    onChange?.(id)
  }

  return (
    <div className="divide-y divide-border rounded-md border">
      {documentos.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 px-3 py-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{doc.nome_arquivo}</p>
            <p className="text-[10px] text-muted-foreground">
              {CATEGORIA_LABEL[doc.categoria] ?? doc.categoria}
              {doc.descricao ? ` · ${doc.descricao}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Ver
            </a>
            <a
              href={doc.url}
              download
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <Download className="w-3 h-3" /> Baixar
            </a>
            <button
              type="button"
              onClick={() => handleExcluir(doc.id)}
              className="inline-flex items-center gap-1 text-xs text-destructive/70 hover:text-destructive px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
