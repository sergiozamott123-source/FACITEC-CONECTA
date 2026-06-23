import { useRef, useState, useCallback } from 'react'
import { Download, Loader2, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { avaliacaoService, avaliadorService, projetoService } from '@/lib/db'
import { supabase } from '@/lib/supabase'

const STATUS_OPTS = ['pendente', 'em_andamento', 'concluida', 'recurso']
const STATUS_VARIANT = {
  pendente: 'warning', em_andamento: 'default', concluida: 'success', recurso: 'destructive',
}

const EMPTY = { status: 'pendente', projeto_id: '', avaliador_id: '', parecer: '' }

function AvaliacaoForm({ value, onChange, projetos, avaliadores }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <FormField label="Projeto" required>
        <Select value={value.projeto_id} onChange={set('projeto_id')}>
          <option value="">Selecione o projeto</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo ?? `Projeto #${p.id}`}</option>)}
        </Select>
      </FormField>
      <FormField label="Avaliador" required>
        <Select value={value.avaliador_id} onChange={set('avaliador_id')}>
          <option value="">Selecione o avaliador</option>
          {avaliadores.map(a => <option key={a.id} value={a.id}>{a.nome ?? a.email}</option>)}
        </Select>
      </FormField>
      <FormField label="Status" required>
        <Select value={value.status} onChange={set('status')}>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </Select>
      </FormField>
      <FormField label="Parecer">
        <Textarea placeholder="Descreva o parecer da avaliação..." value={value.parecer ?? ''} onChange={set('parecer')} rows={4} />
      </FormField>
    </div>
  )
}

function ExtratoRow({ av, onUpload, uploading }) {
  const inputRef = useRef(null)
  const url = av.avaliador?.extrato_url

  function nomeArquivo(u) {
    if (!u) return ''
    try { return decodeURIComponent(u.split('/').pop()) } catch { return u.split('/').pop() }
  }

  return (
    <div className="mt-2 pt-2 border-t border-border">
      {url ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="truncate max-w-[180px]">{nomeArquivo(url)}</span>
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Anexar novo
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 rounded px-2.5 py-1 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Enviando…' : 'Anexar extrato'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onUpload(av, file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function Avaliacoes() {
  const fetch = useCallback(() => avaliacaoService.list(), [])
  const fetchProjetos = useCallback(() => projetoService.listAll(), [])
  const fetchAvaliadores = useCallback(() => avaliadorService.listAll(), [])

  const { data, loading, error, reload } = useTable(fetch)
  const { data: projetos } = useTable(fetchProjetos)
  const { data: avaliadores } = useTable(fetchAvaliadores)
  const { saving, crudError, create, update, remove } = useCrud(avaliacaoService)

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirm, setConfirm] = useState(null)
  const [uploading, setUploading] = useState({})
  const [uploadError, setUploadError] = useState(null)

  function openCreate() { setForm(EMPTY); setModal({ mode: 'create' }) }
  function openEdit(item) {
    setForm({
      status: item.status,
      projeto_id: item.projeto_id ?? '',
      avaliador_id: item.avaliador_id ?? '',
      parecer: item.parecer ?? '',
    })
    setModal({ mode: 'edit', item })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      status: form.status,
      projeto_id: form.projeto_id || null,
      avaliador_id: form.avaliador_id || null,
      parecer: form.parecer || null,
    }
    try {
      if (modal.mode === 'create') await create(payload)
      else await update(modal.item.id, payload)
      closeModal(); reload()
    } catch { /* crudError shown */ }
  }

  async function handleDelete() {
    try { await remove(confirm); setConfirm(null); reload() } catch { /* */ }
  }

  async function handleUploadExtrato(av, file) {
    const avaliadorId = av.avaliador_id
    const edicaoId = av.projeto?.edicao_id
    if (!avaliadorId) return

    setUploadError(null)
    setUploading(prev => ({ ...prev, [avaliadorId]: true }))
    try {
      const path = edicaoId
        ? `extratos/${edicaoId}/${avaliadorId}/extrato_assinado.pdf`
        : `extratos/${avaliadorId}/extrato_assinado.pdf`

      const { error: upErr } = await supabase.storage
        .from('inscricoes')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (upErr) throw new Error(upErr.message)

      const { data: { publicUrl } } = supabase.storage.from('inscricoes').getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from('avaliador')
        .update({ extrato_url: publicUrl })
        .eq('id', avaliadorId)
      if (dbErr) throw new Error(dbErr.message)

      reload()
    } catch (err) {
      setUploadError(`Erro ao enviar extrato: ${err.message}`)
    } finally {
      setUploading(prev => ({ ...prev, [avaliadorId]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant="warning">{data.filter(a => a.status === 'pendente').length} pendentes</Badge>
          <Badge variant="success">{data.filter(a => a.status === 'concluida').length} concluídas</Badge>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Nova Avaliação</Button>
      </div>

      <ErrorAlert message={error} />
      <ErrorAlert message={uploadError} />

      {loading ? <LoadingState /> : data.length === 0 ? <EmptyState message="Nenhuma avaliação cadastrada." /> : (
        <div className="space-y-3">
          {data.map((av) => (
            <Card key={av.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANT[av.status] ?? 'secondary'}>{av.status?.replace('_', ' ')}</Badge>
                      {av.projeto?.titulo && (
                        <span className="text-sm font-medium text-foreground truncate">{av.projeto.titulo}</span>
                      )}
                    </div>
                    {av.avaliador?.nome && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="w-3 h-3" /> {av.avaliador.nome}
                      </p>
                    )}
                    {av.parecer && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{av.parecer}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(av.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {av.avaliador_id && (
                      <ExtratoRow
                        av={av}
                        onUpload={handleUploadExtrato}
                        uploading={!!uploading[av.avaliador_id]}
                      />
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(av)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm(av.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modal?.mode === 'create' ? 'Nova Avaliação' : 'Editar Avaliação'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AvaliacaoForm value={form} onChange={setForm} projetos={projetos} avaliadores={avaliadores} />
          <ErrorAlert message={crudError} />
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={saving} />
    </div>
  )
}
