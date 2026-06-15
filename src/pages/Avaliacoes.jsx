import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { avaliacaoService, avaliadorService, projetoService } from '@/lib/db'

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
