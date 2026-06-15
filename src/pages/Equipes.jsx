import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Users, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Input, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { projetoService, orientadorService, edicaoService } from '@/lib/db'

const STATUS_OPTS = ['submetido', 'em_avaliacao', 'aprovado', 'reprovado', 'cancelado']
const STATUS_VARIANT = {
  aprovado: 'success', reprovado: 'destructive', submetido: 'secondary',
  em_avaliacao: 'warning', cancelado: 'secondary',
}

const EMPTY = { titulo: '', status: 'submetido', area_conhecimento: '', palavras_chave: '', resumo: '', edicao_id: '', orientador_id: '' }

function ProjetoForm({ value, onChange, edicoes, orientadores }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <FormField label="Título" required>
        <Input placeholder="Título do projeto" value={value.titulo ?? ''} onChange={set('titulo')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Edição">
          <Select value={value.edicao_id ?? ''} onChange={set('edicao_id')}>
            <option value="">Selecione</option>
            {edicoes.map(e => <option key={e.id} value={e.id}>Edição #{e.id} – {e.status}</option>)}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={value.status ?? 'submetido'} onChange={set('status')}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </Select>
        </FormField>
      </div>
      <FormField label="Orientador">
        <Select value={value.orientador_id ?? ''} onChange={set('orientador_id')}>
          <option value="">Selecione o orientador</option>
          {orientadores.map(o => <option key={o.id} value={o.id}>{o.nome_completo ?? o.email}</option>)}
        </Select>
      </FormField>
      <FormField label="Área do Conhecimento">
        <Input placeholder="Ex: Tecnologia da Informação" value={value.area_conhecimento ?? ''} onChange={set('area_conhecimento')} />
      </FormField>
      <FormField label="Palavras-chave">
        <Input placeholder="Ex: IA, saúde, dados" value={value.palavras_chave ?? ''} onChange={set('palavras_chave')} />
      </FormField>
      <FormField label="Resumo">
        <Textarea placeholder="Resumo do projeto..." value={value.resumo ?? ''} onChange={set('resumo')} rows={3} />
      </FormField>
    </div>
  )
}

export function Equipes() {
  const fetchProjetos = useCallback(() => projetoService.list(), [])
  const fetchOrientadores = useCallback(() => orientadorService.listAll(), [])
  const fetchEdicoes = useCallback(() => edicaoService.list(), [])

  const { data, loading, error, reload } = useTable(fetchProjetos)
  const { data: orientadores } = useTable(fetchOrientadores)
  const { data: edicoes } = useTable(fetchEdicoes)
  const { saving, crudError, create, update, remove } = useCrud(projetoService)

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [confirm, setConfirm] = useState(null)

  function openCreate() { setForm(EMPTY); setModal({ mode: 'create' }) }
  function openEdit(item) {
    setForm({
      titulo: item.titulo ?? '',
      status: item.status ?? 'submetido',
      area_conhecimento: item.area_conhecimento ?? '',
      palavras_chave: item.palavras_chave ?? '',
      resumo: item.resumo ?? '',
      edicao_id: item.edicao_id ?? '',
      orientador_id: item.orientador_id ?? '',
    })
    setModal({ mode: 'edit', item })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      titulo: form.titulo || null,
      status: form.status,
      area_conhecimento: form.area_conhecimento || null,
      palavras_chave: form.palavras_chave || null,
      resumo: form.resumo || null,
      edicao_id: form.edicao_id || null,
      orientador_id: form.orientador_id || null,
    }
    try {
      if (modal.mode === 'create') await create(payload)
      else await update(modal.item.id, payload)
      closeModal(); reload()
    } catch { /* */ }
  }

  async function handleDelete() {
    try { await remove(confirm); setConfirm(null); reload() } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} projeto(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Novo Projeto</Button>
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : data.length === 0 ? <EmptyState message="Nenhum projeto cadastrado." /> : (
        <div className="space-y-4">
          {data.map((proj) => (
            <Card key={proj.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">{proj.titulo ?? `Projeto #${proj.id}`}</CardTitle>
                    {proj.orientador?.nome_completo && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" />{proj.orientador.nome_completo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={STATUS_VARIANT[proj.status] ?? 'secondary'}>{proj.status?.replace('_', ' ')}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(proj)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirm(proj.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {proj.area_conhecimento && (
                  <Badge variant="outline" className="text-xs">{proj.area_conhecimento}</Badge>
                )}
                {proj.palavras_chave && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="w-3 h-3" />{proj.palavras_chave}
                  </div>
                )}
                {proj.resumo && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{proj.resumo}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modal?.mode === 'create' ? 'Novo Projeto' : 'Editar Projeto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProjetoForm value={form} onChange={setForm} edicoes={edicoes} orientadores={orientadores} />
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
