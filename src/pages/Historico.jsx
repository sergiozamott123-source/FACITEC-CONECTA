import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, History, FileText, ExternalLink, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Input, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { relatorioMensalService, importacaoLogService, projetoService, orientadorService } from '@/lib/db'
import { useAdmin } from '@/contexts/AdminContext'

const R_STATUS = ['pendente', 'enviado', 'aprovado', 'reprovado']
const STATUS_VARIANT = { aprovado: 'success', pendente: 'warning', enviado: 'default', reprovado: 'destructive' }

const EMPTY_R = { mes_referencia: '', status: 'pendente', arquivo_url: '', projeto_id: '', orientador_id: '' }

function RelatorioForm({ value, onChange, projetos, orientadores }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Mês de Referência" required>
          <Input type="month" value={value.mes_referencia ?? ''} onChange={set('mes_referencia')} />
        </FormField>
        <FormField label="Status">
          <Select value={value.status} onChange={set('status')}>
            {R_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
      </div>
      <FormField label="Projeto">
        <Select value={value.projeto_id ?? ''} onChange={set('projeto_id')}>
          <option value="">Selecione</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo ?? `#${p.id}`}</option>)}
        </Select>
      </FormField>
      <FormField label="Orientador">
        <Select value={value.orientador_id ?? ''} onChange={set('orientador_id')}>
          <option value="">Selecione</option>
          {orientadores.map(o => <option key={o.id} value={o.id}>{o.nome_completo ?? o.email}</option>)}
        </Select>
      </FormField>
      <FormField label="URL do Arquivo">
        <Input type="url" placeholder="https://..." value={value.arquivo_url ?? ''} onChange={set('arquivo_url')} />
      </FormField>
    </div>
  )
}

export function Historico() {
  const { edicaoSelecionada } = useAdmin()
  const edicaoId = edicaoSelecionada?.id
  const [tab, setTab] = useState('relatorios')

  const fetchR = useCallback(() => relatorioMensalService.list(edicaoId), [edicaoId])
  const fetchI = useCallback(() => importacaoLogService.list(), [])
  const fetchP = useCallback(() => projetoService.list(edicaoId), [edicaoId])
  const fetchO = useCallback(() => orientadorService.listAll(), [])

  const { data: relatorios, loading: rLoading, error: rError, reload: rReload } = useTable(fetchR)
  const { data: logs, loading: iLoading, error: iError, reload: iReload } = useTable(fetchI)
  const { data: projetos } = useTable(fetchP)
  const { data: orientadores } = useTable(fetchO)

  const { saving: rSaving, crudError: rCrudErr, create: rCreate, update: rUpdate, remove: rRemove } = useCrud(relatorioMensalService)
  const { saving: iSaving, remove: iRemove } = useCrud(importacaoLogService)

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_R)
  const [confirm, setConfirm] = useState(null)

  function openCreate() { setForm(EMPTY_R); setModal({ mode: 'create' }) }
  function openEdit(item) {
    setForm({
      mes_referencia: item.mes_referencia ?? '',
      status: item.status ?? 'pendente',
      arquivo_url: item.arquivo_url ?? '',
      projeto_id: item.projeto_id ?? '',
      orientador_id: item.orientador_id ?? '',
    })
    setModal({ mode: 'edit', item })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      mes_referencia: form.mes_referencia || null,
      status: form.status,
      arquivo_url: form.arquivo_url || null,
      projeto_id: form.projeto_id || null,
      orientador_id: form.orientador_id || null,
    }
    try {
      if (modal.mode === 'create') await rCreate(payload)
      else await rUpdate(modal.item.id, payload)
      closeModal(); rReload()
    } catch { /* */ }
  }

  async function handleDelete() {
    try {
      if (confirm.type === 'relatorio') { await rRemove(confirm.id); rReload() }
      else { await iRemove(confirm.id); iReload() }
      setConfirm(null)
    } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {[['relatorios', 'Relatórios Mensais', FileText], ['logs', 'Log de Importação', Upload]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        {tab === 'relatorios' && (
          <div className="ml-auto flex items-center pb-1">
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Novo Relatório</Button>
          </div>
        )}
      </div>

      {tab === 'relatorios' && (
        <>
          <ErrorAlert message={rError} />
          <div className="flex gap-2 mb-2">
            {R_STATUS.map(s => (
              <Badge key={s} variant={STATUS_VARIANT[s]}>
                {relatorios.filter(r => r.status === s).length} {s}
              </Badge>
            ))}
          </div>
          {rLoading ? <LoadingState /> : relatorios.length === 0 ? <EmptyState message="Nenhum relatório cadastrado." /> : (
            <div className="space-y-3">
              {relatorios.map(r => (
                <Card key={r.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge>
                          {r.mes_referencia && <span className="text-sm font-medium text-foreground">{r.mes_referencia}</span>}
                        </div>
                        {r.projeto?.titulo && <p className="text-xs text-muted-foreground">{r.projeto.titulo}</p>}
                        {r.orientador?.nome_completo && (
                          <p className="text-xs text-muted-foreground">{r.orientador.nome_completo}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {r.arquivo_url && (
                          <a href={r.arquivo_url} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm({ type: 'relatorio', id: r.id })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <>
          <ErrorAlert message={iError} />
          {iLoading ? <LoadingState /> : logs.length === 0 ? <EmptyState message="Nenhum log de importação." /> : (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" />Registros de Importação</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{l.arquivo_nome ?? `Log #${l.id}`}</p>
                        <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => setConfirm({ type: 'log', id: l.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Modal open={!!modal} onClose={closeModal} title={modal?.mode === 'create' ? 'Novo Relatório Mensal' : 'Editar Relatório'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <RelatorioForm value={form} onChange={setForm} projetos={projetos} orientadores={orientadores} />
          <ErrorAlert message={rCrudErr} />
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={rSaving}>{rSaving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleDelete} loading={rSaving || iSaving} />
    </div>
  )
}
