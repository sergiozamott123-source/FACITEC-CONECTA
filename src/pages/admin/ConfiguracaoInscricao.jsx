import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, Input, Textarea, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'

const TIPO_OPTS = [
  { value: 'texto_curto', label: 'Texto curto' },
  { value: 'texto_longo', label: 'Texto longo' },
  { value: 'arquivo', label: 'Upload de arquivo' },
]
const TIPO_VARIANT = { texto_curto: 'default', texto_longo: 'secondary', arquivo: 'warning' }

const CAMPOS_FIXOS = [
  'Nome completo',
  'E-mail',
  'Endereço (rua, bairro, cidade)',
  'Telefone',
  'Escola',
  'Telefone da escola',
  'E-mail da escola',
  'Qualificação / formação',
  'Título do projeto',
  'Projeto inédito? (Sim/Não) — se Não: campo de novidades + nº de edições anteriores',
  'PDF do projeto (upload)',
]

const EMPTY_CAMPO = {
  pergunta: '', descricao_hint: '', tipo: 'texto_longo', obrigatorio: true,
  ordem: 1, tem_condicional: false, campo_pai_id: '', valor_condicional: '',
}
const EMPTY_EIXO = { nome: '', descricao: '', ordem: 1 }

export function ConfiguracaoInscricao() {
  const [activeTab, setActiveTab] = useState('perguntas')
  const [edicao, setEdicao] = useState(null)
  const [loadingEdicao, setLoadingEdicao] = useState(true)

  useEffect(() => {
    async function fetchEdicao() {
      const { data: edicaoData, error } = await supabase
        .from('edicao')
        .select('*')
        .eq('status', 'ativo')
        .order('ano_referencia', { ascending: false })
        .limit(1)
        .single()
      console.log('edicaoId carregado:', edicaoData?.id, '| erro:', error?.message ?? null)
      setEdicao(edicaoData ?? null)
      setLoadingEdicao(false)
    }
    fetchEdicao()
  }, [])

  const TABS = [
    { id: 'perguntas', label: 'Perguntas dissertativas' },
    { id: 'eixos', label: 'Eixos temáticos' },
    { id: 'fixos', label: 'Campos fixos' },
    { id: 'prazos', label: 'Prazos' },
  ]

  if (loadingEdicao) return <LoadingState />
  if (!edicao) {
    return <EmptyState message="Nenhuma edição ativa ou planejada. Crie uma edição em 'Edições' primeiro." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Configuração da Ficha de Inscrição</h2>
          <p className="text-sm text-muted-foreground">Edição: {edicao.codigo_facitec ?? edicao.ano_referencia}</p>
        </div>
        <Badge variant={edicao.status === 'ativo' ? 'success' : 'default'}>{edicao.status}</Badge>
      </div>

      <div className="flex border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'perguntas' && <AbaPerguntas edicaoId={edicao.id} />}
      {activeTab === 'eixos'    && <AbaEixos edicaoId={edicao.id} />}
      {activeTab === 'fixos'    && <AbaCamposFixos />}
      {activeTab === 'prazos'   && <AbaPrazos edicao={edicao} onUpdate={setEdicao} />}
    </div>
  )
}

// ── Aba 1: Perguntas ──────────────────────────────────────────────────────

function AbaPerguntas({ edicaoId }) {
  const [campos, setCampos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_CAMPO)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirm, setConfirm]   = useState(null)

  useEffect(() => { if (edicaoId) load() }, [edicaoId])

  async function load() {
    if (!edicaoId) return
    console.log('[AbaPerguntas] load() chamado com edicaoId:', edicaoId)
    setLoading(true)
    const { data, error: err } = await supabase
      .from('campo_inscricao')
      .select('*')
      .eq('edicao_id', edicaoId)
      .order('ordem', { ascending: true })
    console.log('[campo_inscricao] resultado:', { data, err })
    if (err) setError(err.message)
    else setCampos(data ?? [])
    setLoading(false)
  }

  function nextOrdem() {
    return campos.length > 0 ? Math.max(...campos.map(c => c.ordem ?? 0)) + 1 : 1
  }

  function openCreate() {
    setForm({ ...EMPTY_CAMPO, ordem: nextOrdem() })
    setSaveError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(campo) {
    setForm({
      pergunta: campo.pergunta ?? '',
      descricao_hint: campo.descricao_hint ?? '',
      tipo: campo.tipo ?? 'texto_longo',
      obrigatorio: campo.obrigatorio ?? true,
      ordem: campo.ordem ?? 1,
      tem_condicional: !!campo.campo_pai_id,
      campo_pai_id: campo.campo_pai_id ?? '',
      valor_condicional: campo.valor_condicional ?? '',
    })
    setSaveError(null)
    setModal({ mode: 'edit', item: campo })
  }

  async function handleDuplicate(campo) {
    setSaving(true)
    await supabase.from('campo_inscricao').insert({
      edicao_id: edicaoId,
      pergunta: campo.pergunta + ' (cópia)',
      descricao_hint: campo.descricao_hint,
      tipo: campo.tipo,
      obrigatorio: campo.obrigatorio,
      ordem: nextOrdem(),
      campo_pai_id: campo.campo_pai_id,
      valor_condicional: campo.valor_condicional,
    })
    setSaving(false)
    load()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const payload = {
      edicao_id: edicaoId,
      pergunta: form.pergunta,
      descricao_hint: form.descricao_hint || null,
      tipo: form.tipo,
      obrigatorio: form.obrigatorio,
      ordem: Number(form.ordem) || 1,
      campo_pai_id: form.tem_condicional && form.campo_pai_id ? form.campo_pai_id : null,
      valor_condicional: form.tem_condicional && form.valor_condicional ? form.valor_condicional : null,
    }
    let err
    if (modal.mode === 'create') {
      ;({ error: err } = await supabase.from('campo_inscricao').insert(payload))
    } else {
      ;({ error: err } = await supabase.from('campo_inscricao').update(payload).eq('id', modal.item.id))
    }
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    setModal(null)
    setForm(EMPTY_CAMPO)
    await load()
  }

  async function handleDelete() {
    await supabase.from('campo_inscricao').delete().eq('id', confirm)
    setConfirm(null)
    load()
  }

  const paiOpts = campos.filter(c => modal?.mode !== 'edit' || c.id !== modal?.item?.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{campos.length} pergunta(s)</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />Nova pergunta
        </Button>
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : campos.length === 0
        ? <EmptyState message="Nenhuma pergunta configurada ainda." />
        : (
          <div className="space-y-2">
            {campos.map(c => (
              <Card key={c.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-none flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0 mt-0.5">
                      {c.ordem}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{c.pergunta}</span>
                        <Badge variant={TIPO_VARIANT[c.tipo] ?? 'default'} className="text-xs">
                          {TIPO_OPTS.find(t => t.value === c.tipo)?.label ?? c.tipo}
                        </Badge>
                        {c.obrigatorio && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                        {c.campo_pai_id && <Badge variant="outline" className="text-xs">Condicional</Badge>}
                      </div>
                      {c.descricao_hint && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.descricao_hint}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDuplicate(c)} title="Duplicar" disabled={saving}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirm(c.id)}
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Nova pergunta' : 'Editar pergunta'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Pergunta" required>
            <Textarea
              value={form.pergunta}
              onChange={e => setForm(f => ({ ...f, pergunta: e.target.value }))}
              placeholder="Ex: Descreva a metodologia do seu projeto..."
              rows={2}
              required
            />
          </FormField>
          <FormField label="Dica / hint">
            <Input
              value={form.descricao_hint}
              onChange={e => setForm(f => ({ ...f, descricao_hint: e.target.value }))}
              placeholder="Orientação opcional para o candidato"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo" required>
              <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Ordem">
              <Input
                type="number"
                min="1"
                value={form.ordem}
                onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="obrig"
              checked={form.obrigatorio}
              onChange={e => setForm(f => ({ ...f, obrigatorio: e.target.checked }))}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <label htmlFor="obrig" className="text-sm font-medium text-foreground cursor-pointer">
              Campo obrigatório
            </label>
          </div>
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cond"
                checked={form.tem_condicional}
                onChange={e => setForm(f => ({ ...f, tem_condicional: e.target.checked }))}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <label htmlFor="cond" className="text-sm font-medium text-foreground cursor-pointer">
                Este campo só aparece se…
              </label>
            </div>
            {form.tem_condicional && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <FormField label="Campo pai">
                  <Select
                    value={form.campo_pai_id}
                    onChange={e => setForm(f => ({ ...f, campo_pai_id: e.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    {paiOpts.map(c => <option key={c.id} value={c.id}>{c.pergunta}</option>)}
                  </Select>
                </FormField>
                <FormField label="Valor esperado">
                  <Input
                    value={form.valor_condicional}
                    onChange={e => setForm(f => ({ ...f, valor_condicional: e.target.value }))}
                    placeholder="Ex: sim"
                  />
                </FormField>
              </div>
            )}
          </div>
          <ErrorAlert message={saveError} />
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        message="Remover esta pergunta da ficha de inscrição?"
      />
    </div>
  )
}

// ── Aba 2: Eixos temáticos ────────────────────────────────────────────────

function AbaEixos({ edicaoId }) {
  const [eixos, setEixos]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_EIXO)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirm, setConfirm]   = useState(null)

  useEffect(() => { if (edicaoId) load() }, [edicaoId])

  async function load() {
    if (!edicaoId) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('eixo_tematico')
      .select('*')
      .eq('edicao_id', edicaoId)
      .order('ordem', { ascending: true })
    if (err) setError(err.message)
    else setEixos(data ?? [])
    setLoading(false)
  }

  function nextOrdem() {
    return eixos.length > 0 ? Math.max(...eixos.map(e => e.ordem ?? 0)) + 1 : 1
  }

  function openCreate() {
    setForm({ ...EMPTY_EIXO, ordem: nextOrdem() })
    setSaveError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(eixo) {
    setForm({ nome: eixo.nome ?? '', descricao: eixo.descricao ?? '', ordem: eixo.ordem ?? 1 })
    setSaveError(null)
    setModal({ mode: 'edit', item: eixo })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const payload = {
      edicao_id: edicaoId,
      nome: form.nome,
      descricao: form.descricao || null,
      ordem: Number(form.ordem) || 1,
    }
    let err
    if (modal.mode === 'create') {
      ;({ error: err } = await supabase.from('eixo_tematico').insert(payload))
    } else {
      ;({ error: err } = await supabase.from('eixo_tematico').update(payload).eq('id', modal.item.id))
    }
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    setModal(null)
    load()
  }

  async function handleDelete() {
    await supabase.from('eixo_tematico').delete().eq('id', confirm)
    setConfirm(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{eixos.length} eixo(s)</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />Adicionar eixo
        </Button>
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : eixos.length === 0
        ? <EmptyState message="Nenhum eixo temático configurado ainda." />
        : (
          <div className="space-y-2">
            {eixos.map(e => (
              <Card key={e.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-none flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0 mt-0.5">
                      {e.ordem}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{e.nome}</p>
                      {e.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.descricao}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirm(e.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Novo eixo temático' : 'Editar eixo temático'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nome" required>
            <Input
              value={form.nome}
              onChange={ev => setForm(f => ({ ...f, nome: ev.target.value }))}
              placeholder="Ex: Ciências Biológicas"
              required
            />
          </FormField>
          <FormField label="Descrição">
            <Textarea
              value={form.descricao}
              onChange={ev => setForm(f => ({ ...f, descricao: ev.target.value }))}
              placeholder="Descrição do eixo temático..."
              rows={3}
            />
          </FormField>
          <FormField label="Ordem">
            <Input
              type="number"
              min="1"
              value={form.ordem}
              onChange={ev => setForm(f => ({ ...f, ordem: ev.target.value }))}
            />
          </FormField>
          <ErrorAlert message={saveError} />
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        message="Remover este eixo temático?"
      />
    </div>
  )
}

// ── Aba 3: Campos fixos ───────────────────────────────────────────────────

function AbaCamposFixos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Campos fixos da ficha</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Estes campos aparecem em todas as fichas e não podem ser removidos ou reordenados.
        </p>
        <ol className="space-y-2.5">
          {CAMPOS_FIXOS.map((campo, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold mt-0.5 shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-foreground">{campo}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

// ── Aba 4: Prazos ─────────────────────────────────────────────────────────

function AbaPrazos({ edicao, onUpdate }) {
  const [form, setForm] = useState({
    data_inicio: edicao.data_inicio ?? '',
    data_termino: edicao.data_termino ?? '',
    prazo_recurso_fim: edicao.prazo_recurso_fim ?? '',
  })
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedOk, setSavedOk]   = useState(false)

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setSavedOk(false) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSavedOk(false)
    const { data, error: err } = await supabase
      .from('edicao')
      .update({
        data_inicio: form.data_inicio || null,
        data_termino: form.data_termino || null,
        prazo_recurso_fim: form.prazo_recurso_fim || null,
      })
      .eq('id', edicao.id)
      .select()
      .single()
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    setSavedOk(true)
    onUpdate(data)
  }

  async function handleToggle() {
    setToggling(true)
    setSaveError(null)
    const novoStatus = edicao.status === 'ativo' ? 'planejado' : 'ativo'
    const { data, error: err } = await supabase
      .from('edicao')
      .update({ status: novoStatus })
      .eq('id', edicao.id)
      .select()
      .single()
    setToggling(false)
    if (err) { setSaveError(err.message); return }
    onUpdate(data)
  }

  return (
    <div className="space-y-6 max-w-md">
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="Início das inscrições">
          <Input type="date" value={form.data_inicio} onChange={set('data_inicio')} />
        </FormField>
        <FormField label="Término das inscrições">
          <Input type="date" value={form.data_termino} onChange={set('data_termino')} />
        </FormField>
        <FormField label="Prazo final para recursos">
          <Input type="date" value={form.prazo_recurso_fim} onChange={set('prazo_recurso_fim')} />
        </FormField>
        <ErrorAlert message={saveError} />
        {savedOk && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Prazos salvos com sucesso.
          </div>
        )}
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          {saving ? 'Salvando…' : 'Salvar prazos'}
        </Button>
      </form>

      <div className="border-t border-border pt-6 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Status das inscrições</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            Situação atual:
            <Badge variant={edicao.status === 'ativo' ? 'success' : 'default'}>{edicao.status}</Badge>
          </p>
        </div>
        <Button
          variant={edicao.status === 'ativo' ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={toggling}
          className={edicao.status === 'ativo' ? 'border-destructive text-destructive hover:bg-destructive/10' : ''}
        >
          {toggling && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          {edicao.status === 'ativo' ? 'Fechar inscrições' : 'Abrir inscrições'}
        </Button>
      </div>
    </div>
  )
}
