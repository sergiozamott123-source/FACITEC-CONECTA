import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { documentoAcervoService } from '@/lib/db'
import { Select } from '@/components/common/FormField'

const BUCKET = 'acervo'
const ACEITOS = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.doc,.docx,.xls,.xlsx,.ppt,.pptx'

const CATEGORIAS = [
  { value: 'foto', label: 'Foto' },
  { value: 'video', label: 'Vídeo' },
  { value: 'pdf', label: 'PDF' },
  { value: 'planilha', label: 'Planilha' },
  { value: 'documento', label: 'Documento' },
  { value: 'outro', label: 'Outro' },
]

function categoriaPorExtensao(nome) {
  const ext = (nome.split('.').pop() ?? '').toLowerCase()
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'foto'
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video'
  if (ext === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'planilha'
  if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'documento'
  return 'outro'
}

// Upload + cadastro de um documento em documento_acervo, pendurado em qualquer
// entidade (edição, projeto, orientador ou bolsista). `entidadeId` fica null
// quando entidadeTipo === 'edicao'.
export function AnexarDocumento({ edicaoId, entidadeTipo, entidadeId = null, onUploaded, label = 'Anexar documento' }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [categoria, setCategoria] = useState('outro')
  const [descricao, setDescricao] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function handlePick(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setCategoria(categoriaPorExtensao(f.name))
    setError(null)
  }

  function cancelar() {
    setFile(null)
    setDescricao('')
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleEnviar() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const path = `${edicaoId}/${entidadeTipo}/${entidadeId ?? 'geral'}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const doc = await documentoAcervoService.create({
        edicao_id: edicaoId,
        entidade_tipo: entidadeTipo,
        entidade_id: entidadeId,
        categoria,
        nome_arquivo: file.name,
        url: publicUrl,
        descricao: descricao || null,
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
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
