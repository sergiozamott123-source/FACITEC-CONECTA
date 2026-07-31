import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { documentoAcervoService } from '@/lib/db'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'
import { Select } from '@/components/common/FormField'

const BUCKET = 'acervo'
const ACEITOS = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx'

export const CATEGORIAS_ACERVO_ITEM = [
  { value: 'relatorio_final', label: 'Relatório final' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'anexo', label: 'Anexo' },
]

// O Supabase Storage rejeita paths com acento, espaço ou símbolos — usado só
// no path do storage; o nome_arquivo original (com acento etc) é mantido em
// documento_acervo, que é só para exibição (mesmo tratamento de acervoArquivamento.js).
function sanitizarNomeArquivo(nome) {
  return nome
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
}

// Upload + cadastro de um anexo de projeto de pesquisa em documento_acervo
// (entidade_tipo='acervo_item'). Segue o mesmo padrão de AnexarDocumentoAtaCmct.jsx,
// mas com categorias e path de storage próprios deste módulo.
export function AnexarDocumentoAcervoItem({ itemId, onUploaded, label = 'Anexar arquivo' }) {
  const { session } = useSecretaria()
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [categoria, setCategoria] = useState('relatorio_final')
  const [descricao, setDescricao] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function handlePick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
  }

  function cancelar() {
    setFile(null)
    setDescricao('')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleEnviar() {
    if (!file || !itemId) return
    setUploading(true)
    setError(null)
    try {
      const path = `acervo-item/${itemId}/${Date.now()}-${sanitizarNomeArquivo(file.name)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const doc = await documentoAcervoService.create({
        entidade_tipo: 'acervo_item',
        entidade_id: itemId,
        categoria,
        nome_arquivo: file.name,
        url: publicUrl,
        descricao: descricao || null,
        criado_por: session?.user?.id ?? null,
      })
      onUploaded?.(doc)
      cancelar()
    } catch (e) {
      setError(e.message ?? 'Erro ao enviar arquivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
      >
        <Upload className="w-3.5 h-3.5" /> {label}
      </button>
      <input ref={fileRef} type="file" accept={ACEITOS} className="hidden" onChange={handlePick} />

      {file && (
        <div className="mt-2 p-3 border border-border rounded-md bg-muted/30 space-y-2 max-w-sm">
          <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS_ACERVO_ITEM.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={cancelar} className="text-xs text-muted-foreground px-2 py-1">
              Cancelar
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={handleEnviar}
              className="text-xs font-medium bg-primary text-primary-foreground rounded px-3 py-1 disabled:opacity-50"
            >
              {uploading ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
