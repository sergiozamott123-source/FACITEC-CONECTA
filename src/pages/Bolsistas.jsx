import { useState, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, GraduationCap, User, Search, ChevronDown, FolderKanban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Input, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable, useCrud } from '@/hooks/useTable'
import { bolsistaService, orientadorService, projetoService } from '@/lib/db'

const TIPO_OPTS = ['IC', 'mestrado', 'doutorado', 'pos_doutorado']
const MODAL_OPTS = ['presencial', 'remoto', 'hibrido']
const STATUS_OPTS = ['ativo', 'inativo', 'suspenso', 'encerrado']
const STATUS_VARIANT = { ativo: 'success', inativo: 'secondary', suspenso: 'warning', encerrado: 'secondary' }

const EMPTY_B = { nome_completo: '', email: '', cpf: '', telefone: '', rg: '', tipo: 'IC', modalidade: 'presencial', status: 'ativo', projeto_id: '', orientador_id: '' }
const EMPTY_O = { nome_completo: '', email: '', cpf: '', telefone: '', instituicao: '' }

function BolsistaForm({ value, onChange, projetos, orientadores }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <FormField label="Nome Completo" required>
        <Input placeholder="Nome do bolsista" value={value.nome_completo ?? ''} onChange={set('nome_completo')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="E-mail"><Input type="email" placeholder="email@..." value={value.email ?? ''} onChange={set('email')} /></FormField>
        <FormField label="CPF"><Input placeholder="000.000.000-00" value={value.cpf ?? ''} onChange={set('cpf')} /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Telefone"><Input placeholder="(27) 99999-9999" value={value.telefone ?? ''} onChange={set('telefone')} /></FormField>
        <FormField label="RG"><Input placeholder="000.000.000" value={value.rg ?? ''} onChange={set('rg')} /></FormField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Tipo">
          <Select value={value.tipo} onChange={set('tipo')}>
            {TIPO_OPTS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </Select>
        </FormField>
        <FormField label="Modalidade">
          <Select value={value.modalidade} onChange={set('modalidade')}>
            {MODAL_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={value.status} onChange={set('status')}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
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
    </div>
  )
}

function OrientadorForm({ value, onChange }) {
  const set = k => e => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <FormField label="Nome Completo" required>
        <Input placeholder="Nome do orientador" value={value.nome_completo ?? ''} onChange={set('nome_completo')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="E-mail"><Input type="email" placeholder="email@..." value={value.email ?? ''} onChange={set('email')} /></FormField>
        <FormField label="CPF"><Input placeholder="000.000.000-00" value={value.cpf ?? ''} onChange={set('cpf')} /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Telefone"><Input placeholder="(27) 99999-9999" value={value.telefone ?? ''} onChange={set('telefone')} /></FormField>
        <FormField label="Instituição"><Input placeholder="Ex: UFES" value={value.instituicao ?? ''} onChange={set('instituicao')} /></FormField>
      </div>
    </div>
  )
}

function groupBolsistasPorOrientador(bolsistas) {
  const map = new Map()
  for (const b of bolsistas) {
    const key = b.orientador_id ?? 'sem-orientador'
    if (!map.has(key)) {
      map.set(key, {
        key,
        orientadorNome: b.orientador?.nome_completo ?? 'Sem orientador',
        projetoTitulo: b.projeto?.titulo ?? null,
        bolsistas: [],
      })
    }
    const grupo = map.get(key)
    grupo.bolsistas.push(b)
    if (!grupo.projetoTitulo && b.projeto?.titulo) grupo.projetoTitulo = b.projeto.titulo
  }

  const grupos = Array.from(map.values())
  grupos.forEach((g) => {
    g.bolsistas.sort((a, b) => (a.nome_completo ?? '').localeCompare(b.nome_completo ?? '', 'pt-BR'))
  })
  grupos.sort((a, b) => {
    if (a.key === 'sem-orientador') return 1
    if (b.key === 'sem-orientador') return -1
    return a.orientadorNome.localeCompare(b.orientadorNome, 'pt-BR')
  })
  return grupos
}

function GrupoOrientadorCard({ grupo, expanded, onToggle, onEdit, onDelete }) {
  const qtd = grupo.bolsistas.length
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 shrink-0">
            <User className="w-5 h-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{grupo.orientadorNome}</p>
            {grupo.projetoTitulo && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <FolderKanban className="w-3 h-3 shrink-0" />
                <span className="truncate">{grupo.projetoTitulo}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="text-xs">{qtd} {qtd === 1 ? 'bolsista' : 'bolsistas'}</Badge>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {grupo.bolsistas.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-4 px-4 py-3 pl-[4.25rem]">
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{b.nome_completo ?? '—'}</span>
                    <Badge variant="outline" className="text-xs">{b.tipo?.toUpperCase()}</Badge>
                    <Badge variant={STATUS_VARIANT[b.status] ?? 'secondary'} className="text-xs">{b.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.email ?? ''} {b.cpf ? `· CPF: ${b.cpf}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(b)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(b.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function Bolsistas() {
  const [tab, setTab] = useState('bolsistas')
  const [query, setQuery] = useState('')

  const fetchB = useCallback(() => bolsistaService.list(), [])
  const fetchO = useCallback(() => orientadorService.list(), [])
  const fetchP = useCallback(() => projetoService.listAll(), [])
  const fetchOAll = useCallback(() => orientadorService.listAll(), [])

  const { data: bolsistas, loading: bLoading, error: bError, reload: bReload } = useTable(fetchB)
  const { data: orientadores, loading: oLoading, error: oError, reload: oReload } = useTable(fetchO)
  const { data: projetos } = useTable(fetchP)
  const { data: orientadoresList } = useTable(fetchOAll)

  const { saving: bSaving, crudError: bCrudErr, create: bCreate, update: bUpdate, remove: bRemove } = useCrud(bolsistaService)
  const { saving: oSaving, crudError: oCrudErr, create: oCreate, update: oUpdate, remove: oRemove } = useCrud(orientadorService)

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [expandedGrupos, setExpandedGrupos] = useState(() => new Set())

  function toggleGrupo(key) {
    setExpandedGrupos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openCreate(type) { setForm(type === 'bolsista' ? EMPTY_B : EMPTY_O); setModal({ mode: 'create', type }) }
  function openEdit(type, item) {
    setForm(type === 'bolsista'
      ? { nome_completo: item.nome_completo ?? '', email: item.email ?? '', cpf: item.cpf ?? '', telefone: item.telefone ?? '', rg: item.rg ?? '', tipo: item.tipo ?? 'IC', modalidade: item.modalidade ?? 'presencial', status: item.status ?? 'ativo', projeto_id: item.projeto_id ?? '', orientador_id: item.orientador_id ?? '' }
      : { nome_completo: item.nome_completo ?? '', email: item.email ?? '', cpf: item.cpf ?? '', telefone: item.telefone ?? '', instituicao: item.instituicao ?? '' }
    )
    setModal({ mode: 'edit', type, item })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    const isB = modal.type === 'bolsista'
    const payload = isB
      ? { nome_completo: form.nome_completo || null, email: form.email || null, cpf: form.cpf || null, telefone: form.telefone || null, rg: form.rg || null, tipo: form.tipo, modalidade: form.modalidade, status: form.status, projeto_id: form.projeto_id || null, orientador_id: form.orientador_id || null }
      : { nome_completo: form.nome_completo || null, email: form.email || null, cpf: form.cpf || null, telefone: form.telefone || null, instituicao: form.instituicao || null }
    try {
      if (modal.mode === 'create') isB ? await bCreate(payload) : await oCreate(payload)
      else isB ? await bUpdate(modal.item.id, payload) : await oUpdate(modal.item.id, payload)
      closeModal(); isB ? bReload() : oReload()
    } catch { /* */ }
  }

  async function handleDelete() {
    try {
      if (confirm.type === 'bolsista') { await bRemove(confirm.id); bReload() }
      else { await oRemove(confirm.id); oReload() }
      setConfirm(null)
    } catch { /* */ }
  }

  const saving = bSaving || oSaving
  const crudError = bCrudErr || oCrudErr
  const isB = tab === 'bolsistas'

  const filterFn = (item) => {
    const q = query.toLowerCase()
    return !q || (item.nome_completo ?? '').toLowerCase().includes(q) || (item.email ?? '').toLowerCase().includes(q)
  }

  const filteredB = bolsistas.filter(filterFn)
  const filteredO = orientadores.filter(filterFn)
  const buscando = query.trim() !== ''
  const gruposB = useMemo(() => groupBolsistasPorOrientador(filteredB), [filteredB])

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-border">
        {[['bolsistas', 'Bolsistas', GraduationCap], ['orientadores', 'Orientadores', User]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className="h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring w-44" />
          </div>
          <Button size="sm" onClick={() => openCreate(isB ? 'bolsista' : 'orientador')}>
            <Plus className="w-4 h-4" />{isB ? 'Novo Bolsista' : 'Novo Orientador'}
          </Button>
        </div>
      </div>

      {tab === 'bolsistas' && (
        <>
          <ErrorAlert message={bError} />
          {bLoading ? <LoadingState /> : gruposB.length === 0 ? <EmptyState message="Nenhum bolsista encontrado." /> : (
            <div className="space-y-3">
              {gruposB.map((grupo) => (
                <GrupoOrientadorCard
                  key={grupo.key}
                  grupo={grupo}
                  expanded={buscando || expandedGrupos.has(grupo.key)}
                  onToggle={() => toggleGrupo(grupo.key)}
                  onEdit={(b) => openEdit('bolsista', b)}
                  onDelete={(id) => setConfirm({ type: 'bolsista', id })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orientadores' && (
        <>
          <ErrorAlert message={oError} />
          {oLoading ? <LoadingState /> : filteredO.length === 0 ? <EmptyState message="Nenhum orientador encontrado." /> : (
            <div className="space-y-3">
              {filteredO.map(o => (
                <Card key={o.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 shrink-0">
                          <User className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-medium text-sm text-foreground">{o.nome_completo ?? '—'}</span>
                          <p className="text-xs text-muted-foreground">{o.email ?? ''} {o.cpf ? `· CPF: ${o.cpf}` : ''}</p>
                          {o.instituicao && <p className="text-xs text-muted-foreground">{o.instituicao}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit('orientador', o)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm({ type: 'orientador', id: o.id })}><Trash2 className="w-4 h-4" /></Button>
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
        title={`${modal?.mode === 'create' ? 'Novo' : 'Editar'} ${modal?.type === 'bolsista' ? 'Bolsista' : 'Orientador'}`}
        size={isB ? 'lg' : 'md'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modal?.type === 'bolsista'
            ? <BolsistaForm value={form} onChange={setForm} projetos={projetos} orientadores={orientadoresList} />
            : <OrientadorForm value={form} onChange={setForm} />
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
