import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, FileSignature, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Input, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { contratoService, termoAdesaoService, projetoService, orientadorService, bolsistaService } from '@/lib/db'

const C_STATUS = ['pendente', 'aguardando_assinatura', 'assinado', 'cancelado']
const T_TIPO = ['adesao', 'compromisso', 'confidencialidade', 'outro']
const T_STATUS = ['pendente', 'assinado', 'cancelado']

const STATUS_VARIANT = {
  assinado: 'success', pendente: 'warning',
  aguardando_assinatura: 'warning', cancelado: 'destructive',
}

const EMPTY_C = { status: 'pendente', projeto_id: '', orientador_id: '', numero_processo: '' }
const EMPTY_T = { tipo: 'adesao', status: 'pendente', projeto_id: '', bolsista_id: '' }

function ContratoForm({ value, onChange, projetos, orientadores }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
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
      <FormField label="Número do Processo">
        <Input placeholder="Ex: 2025/001234" value={value.numero_processo ?? ''} onChange={set('numero_processo')} />
      </FormField>
      <FormField label="Status">
        <Select value={value.status} onChange={set('status')}>
          {C_STATUS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </FormField>
    </div>
  )
}

function TermoForm({ value, onChange, projetos, bolsistas }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <FormField label="Projeto">
        <Select value={value.projeto_id ?? ''} onChange={set('projeto_id')}>
          <option value="">Selecione</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo ?? `#${p.id}`}</option>)}
        </Select>
      </FormField>
      <FormField label="Bolsista">
        <Select value={value.bolsista_id ?? ''} onChange={set('bolsista_id')}>
          <option value="">Selecione</option>
          {bolsistas.map(b => <option key={b.id} value={b.id}>{b.nome_completo ?? b.email}</option>)}
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tipo">
          <Select value={value.tipo} onChange={set('tipo')}>
            {T_TIPO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={value.status} onChange={set('status')}>
            {T_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
      </div>
    </div>
  )
}

export function Contratos() {
  const [tab, setTab] = useState('contratos')

  const fetchC = useCallback(() => contratoService.list(), [])
  const fetchT = useCallback(() => termoAdesaoService.list(), [])
  const fetchP = useCallback(() => projetoService.listAll(), [])
  const fetchO = useCallback(() => orientadorService.listAll(), [])
  const fetchB = useCallback(() => bolsistaService.listAll(), [])

  const { data: contratos, loading: cLoading, error: cError, reload: cReload } = useTable(fetchC)
  const { data: termos, loading: tLoading, error: tError, reload: tReload } = useTable(fetchT)
  const { data: projetos } = useTable(fetchP)
  const { data: orientadores } = useTable(fetchO)
  const { data: bolsistas } = useTable(fetchB)

  const { saving: cSaving, crudError: cCrudErr, create: cCreate, update: cUpdate, remove: cRemove } = useCrud(contratoService)
  const { saving: tSaving, crudError: tCrudErr, create: tCreate, update: tUpdate, remove: tRemove } = useCrud(termoAdesaoService)

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [confirm, setConfirm] = useState(null)

  function openCreate(type) { setForm(type === 'contrato' ? EMPTY_C : EMPTY_T); setModal({ mode: 'create', type }) }
  function openEdit(type, item) {
    setForm(type === 'contrato'
      ? { status: item.status, projeto_id: item.projeto_id ?? '', orientador_id: item.orientador_id ?? '', numero_processo: item.numero_processo ?? '' }
      : { tipo: item.tipo, status: item.status, projeto_id: item.projeto_id ?? '', bolsista_id: item.bolsista_id ?? '' }
    )
    setModal({ mode: 'edit', type, item })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    const isC = modal.type === 'contrato'
    const payload = isC
      ? { status: form.status, projeto_id: form.projeto_id || null, orientador_id: form.orientador_id || null, numero_processo: form.numero_processo || null }
      : { tipo: form.tipo, status: form.status, projeto_id: form.projeto_id || null, bolsista_id: form.bolsista_id || null }
    try {
      if (modal.mode === 'create') isC ? await cCreate(payload) : await tCreate(payload)
      else isC ? await cUpdate(modal.item.id, payload) : await tUpdate(modal.item.id, payload)
      closeModal(); isC ? cReload() : tReload()
    } catch { /* */ }
  }

  async function handleDelete() {
    try {
      if (confirm.type === 'contrato') { await cRemove(confirm.id); cReload() }
      else { await tRemove(confirm.id); tReload() }
      setConfirm(null)
    } catch { /* */ }
  }

  const saving = cSaving || tSaving
  const crudError = cCrudErr || tCrudErr
  const isC = tab === 'contratos'

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[['contratos', 'Contratos', FileSignature], ['termos', 'Termos de Adesão', FileText]].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        <div className="ml-auto flex items-center pb-1">
          <Button size="sm" onClick={() => openCreate(isC ? 'contrato' : 'termo')}>
            <Plus className="w-4 h-4" />{isC ? 'Novo Contrato' : 'Novo Termo'}
          </Button>
        </div>
      </div>

      {tab === 'contratos' && (
        <>
          <ErrorAlert message={cError} />
          {cLoading ? <LoadingState /> : contratos.length === 0 ? <EmptyState message="Nenhum contrato cadastrado." /> : (
            <div className="space-y-3">
              {contratos.map(c => (
                <Card key={c.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={STATUS_VARIANT[c.status] ?? 'secondary'}>{c.status?.replace(/_/g, ' ')}</Badge>
                          {c.numero_processo && <span className="text-xs font-mono text-muted-foreground">{c.numero_processo}</span>}
                        </div>
                        {c.projeto?.titulo && <p className="text-sm font-medium text-foreground">{c.projeto.titulo}</p>}
                        {c.orientador?.nome_completo && <p className="text-xs text-muted-foreground">{c.orientador.nome_completo}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit('contrato', c)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm({ type: 'contrato', id: c.id })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'termos' && (
        <>
          <ErrorAlert message={tError} />
          {tLoading ? <LoadingState /> : termos.length === 0 ? <EmptyState message="Nenhum termo cadastrado." /> : (
            <div className="space-y-3">
              {termos.map(t => (
                <Card key={t.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>{t.status}</Badge>
                          <Badge variant="outline">{t.tipo}</Badge>
                        </div>
                        {t.projeto?.titulo && <p className="text-sm font-medium text-foreground">{t.projeto.titulo}</p>}
                        {t.bolsista?.nome_completo && <p className="text-xs text-muted-foreground">{t.bolsista.nome_completo}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit('termo', t)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm({ type: 'termo', id: t.id })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={!!modal} onClose={closeModal}
        title={modal?.mode === 'create' ? (modal?.type === 'contrato' ? 'Novo Contrato' : 'Novo Termo') : (modal?.type === 'contrato' ? 'Editar Contrato' : 'Editar Termo')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modal?.type === 'contrato'
            ? <ContratoForm value={form} onChange={setForm} projetos={projetos} orientadores={orientadores} />
            : <TermoForm value={form} onChange={setForm} projetos={projetos} bolsistas={bolsistas} />
          }
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
