import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, FileText, GraduationCap, Plus, Trash2, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { AnexarDocumento } from '@/components/acervo/AnexarDocumento'
import { ListaDocumentos } from '@/components/acervo/ListaDocumentos'
import { edicaoService, projetoService, bolsistaService, orientadorService, documentoAcervoService } from '@/lib/db'
import { getProgramaByProgramaId } from '@/lib/programas'

const EMPTY_BOLSISTA = () => ({ key: crypto.randomUUID(), nome_completo: '', tipo: '' })

const EMPTY_FORM = {
  modoOrientador: 'novo',
  orientador_id_existente: '',
  orientador_nome: '',
  orientador_email: '',
  titulo: '',
  area_conhecimento: '',
  bolsistas: [EMPTY_BOLSISTA()],
}

function CadastroProjetoLegadoModal({ open, onClose, onCreated, orientadoresExistentes, edicaoId }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function setBolsista(key, campo, valor) {
    setForm((f) => ({ ...f, bolsistas: f.bolsistas.map((b) => (b.key === key ? { ...b, [campo]: valor } : b)) }))
  }
  function addBolsista() {
    setForm((f) => ({ ...f, bolsistas: [...f.bolsistas, EMPTY_BOLSISTA()] }))
  }
  function removeBolsista(key) {
    setForm((f) => ({ ...f, bolsistas: f.bolsistas.filter((b) => b.key !== key) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('Informe o título do projeto.'); return }
    if (form.modoOrientador === 'novo' && !form.orientador_nome.trim()) {
      setError('Informe o nome do orientador ou selecione um já cadastrado.')
      return
    }
    if (form.modoOrientador === 'existente' && !form.orientador_id_existente) {
      setError('Selecione um orientador.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let orientadorId
      if (form.modoOrientador === 'existente') {
        orientadorId = form.orientador_id_existente
      } else {
        const orientador = await orientadorService.create({
          nome_completo: form.orientador_nome.trim(),
          email: form.orientador_email.trim() || null,
          edicao_id: edicaoId,
        })
        orientadorId = orientador.id
      }

      const projeto = await projetoService.create({
        titulo: form.titulo.trim(),
        area_conhecimento: form.area_conhecimento.trim() || null,
        edicao_id: edicaoId,
        orientador_id: orientadorId,
        status: 'legado',
      })

      for (const b of form.bolsistas) {
        if (!b.nome_completo.trim()) continue
        await bolsistaService.create({
          nome_completo: b.nome_completo.trim(),
          tipo: b.tipo.trim() || null,
          projeto_id: projeto.id,
          orientador_id: orientadorId,
          status: 'ativo',
        })
      }

      setForm(EMPTY_FORM)
      onCreated()
    } catch (err) {
      setError(err.message ?? 'Erro ao cadastrar projeto legado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar projeto legado" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Cadastro leve para dados históricos — sem CPF, documentos ou critérios de avaliação,
          que muitas vezes não existem mais para edições antigas. Só o nome é obrigatório.
        </p>

        <FormField label="Título do projeto" required>
          <Input value={form.titulo} onChange={set('titulo')} placeholder="Título do projeto" />
        </FormField>

        <FormField label="Área de conhecimento">
          <Input value={form.area_conhecimento} onChange={set('area_conhecimento')} placeholder="ex: Ciências Biológicas" />
        </FormField>

        <div className="space-y-3 border border-border rounded-md p-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <input
                type="radio"
                checked={form.modoOrientador === 'novo'}
                onChange={() => setForm((f) => ({ ...f, modoOrientador: 'novo' }))}
              />
              Novo orientador
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <input
                type="radio"
                checked={form.modoOrientador === 'existente'}
                onChange={() => setForm((f) => ({ ...f, modoOrientador: 'existente' }))}
              />
              Orientador já cadastrado
            </label>
          </div>

          {form.modoOrientador === 'novo' ? (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nome completo" required>
                <Input value={form.orientador_nome} onChange={set('orientador_nome')} />
              </FormField>
              <FormField label="E-mail">
                <Input type="email" value={form.orientador_email} onChange={set('orientador_email')} />
              </FormField>
            </div>
          ) : (
            <FormField label="Orientador" required>
              <select
                value={form.orientador_id_existente}
                onChange={set('orientador_id_existente')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Selecione…</option>
                {orientadoresExistentes.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome_completo}</option>
                ))}
              </select>
            </FormField>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Bolsistas</label>
            <Button type="button" variant="outline" size="sm" onClick={addBolsista}>
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {form.bolsistas.map((b) => (
              <div key={b.key} className="flex items-center gap-2">
                <Input
                  placeholder="Nome completo"
                  value={b.nome_completo}
                  onChange={(e) => setBolsista(b.key, 'nome_completo', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Tipo (ex: IC, voluntário)"
                  value={b.tipo}
                  onChange={(e) => setBolsista(b.key, 'tipo', e.target.value)}
                  className="w-48"
                />
                <button
                  type="button"
                  onClick={() => removeBolsista(b.key)}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <ErrorAlert message={error} />
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ProjetoAccordion({ projeto, bolsistas, docsProjeto, docsOrientador, docsPorBolsista, edicaoId, expanded, onToggle, onDocUploaded, onDocRemoved }) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{projeto.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {projeto.orientador?.nome_completo ?? 'Sem orientador cadastrado'}
            {bolsistas.length > 0 && ` · ${bolsistas.length} bolsista(s)`}
          </p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-4 border-t border-border">
          {/* Orientador */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Orientador</h4>
            </div>
            {projeto.orientador ? (
              <div className="pl-5 space-y-2">
                <p className="text-sm text-foreground">{projeto.orientador.nome_completo}</p>
                <ListaDocumentos documentos={docsOrientador} onChange={() => onDocRemoved()} />
                <AnexarDocumento
                  edicaoId={edicaoId}
                  entidadeTipo="orientador"
                  entidadeId={projeto.orientador.id}
                  onUploaded={onDocUploaded}
                  label="Anexar documento do orientador"
                />
              </div>
            ) : (
              <p className="pl-5 text-xs text-muted-foreground italic">Nenhum orientador cadastrado.</p>
            )}
          </div>

          {/* Bolsistas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Bolsistas</h4>
            </div>
            {bolsistas.length === 0 ? (
              <p className="pl-5 text-xs text-muted-foreground italic">Nenhum bolsista cadastrado.</p>
            ) : (
              <div className="pl-5 space-y-3">
                {bolsistas.map((b) => (
                  <div key={b.id} className="space-y-1.5">
                    <p className="text-sm text-foreground">
                      {b.nome_completo}
                      {b.tipo && <span className="ml-2 text-xs text-muted-foreground">({b.tipo})</span>}
                    </p>
                    <ListaDocumentos documentos={docsPorBolsista[b.id] ?? []} onChange={() => onDocRemoved()} />
                    <AnexarDocumento
                      edicaoId={edicaoId}
                      entidadeTipo="bolsista"
                      entidadeId={b.id}
                      onUploaded={onDocUploaded}
                      label="Anexar documento do bolsista"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documentos do projeto */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Documentos do projeto</h4>
            </div>
            <div className="pl-5 space-y-2">
              <ListaDocumentos documentos={docsProjeto} onChange={() => onDocRemoved()} />
              <AnexarDocumento
                edicaoId={edicaoId}
                entidadeTipo="projeto"
                entidadeId={projeto.id}
                onUploaded={onDocUploaded}
                label="Anexar documento do projeto"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function AcervoEdicao() {
  const { edicaoId } = useParams()

  const [edicao, setEdicao] = useState(null)
  const [projetos, setProjetos] = useState([])
  const [bolsistas, setBolsistas] = useState([])
  const [orientadores, setOrientadores] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandidos, setExpandidos] = useState(() => new Set())
  const [modalProjeto, setModalProjeto] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [edicaoData, projetosRes, bolsistasRes, orientadoresRes, docsRes] = await Promise.all([
        edicaoService.get(edicaoId),
        projetoService.list(edicaoId),
        bolsistaService.list(edicaoId),
        orientadorService.listAll(),
        documentoAcervoService.listPorEdicao(edicaoId),
      ])
      setEdicao(edicaoData)
      setProjetos(projetosRes.data)
      setBolsistas(bolsistasRes.data)
      setOrientadores(orientadoresRes.data)
      setDocs(docsRes.data)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar dados do acervo.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  // Refresh leve, sem o spinner de página inteira — usado após anexar/excluir um
  // único documento, para não colapsar os acordeões de projeto já abertos.
  const recarregarDocs = useCallback(async () => {
    const { data } = await documentoAcervoService.listPorEdicao(edicaoId)
    setDocs(data)
  }, [edicaoId])

  const bolsistasPorProjeto = useMemo(() => {
    const map = {}
    for (const b of bolsistas) {
      if (!b.projeto_id) continue
      if (!map[b.projeto_id]) map[b.projeto_id] = []
      map[b.projeto_id].push(b)
    }
    return map
  }, [bolsistas])

  const docsDaEdicao = useMemo(() => docs.filter((d) => d.entidade_tipo === 'edicao'), [docs])
  const docsPorProjeto = useCallback((projetoId) => docs.filter((d) => d.entidade_tipo === 'projeto' && d.entidade_id === projetoId), [docs])
  const docsPorOrientador = useCallback((orientadorId) => docs.filter((d) => d.entidade_tipo === 'orientador' && d.entidade_id === orientadorId), [docs])
  const docsPorBolsistaDoProjeto = useCallback((idsBolsistas) => {
    const map = {}
    for (const id of idsBolsistas) {
      map[id] = docs.filter((d) => d.entidade_tipo === 'bolsista' && d.entidade_id === id)
    }
    return map
  }, [docs])

  function toggleExpandido(id) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorAlert message={error} />
  if (!edicao) return <EmptyState message="Edição não encontrada." />

  const programa = getProgramaByProgramaId(edicao.programa_id)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/acervo" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Acervo
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {programa?.nome ?? edicao.programa_id} — Edição {edicao.ano_referencia}
              </h1>
              <Badge variant="secondary">Encerrado</Badge>
            </div>
            {edicao.numero_edital && (
              <p className="text-sm text-muted-foreground mt-0.5">Edital {edicao.numero_edital}</p>
            )}
          </div>
          <Button size="sm" onClick={() => setModalProjeto(true)}>
            <Plus className="w-4 h-4" /> Novo projeto legado
          </Button>
        </div>
      </div>

      {/* Documentos gerais da edição */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">Documentos gerais da edição</h2>
        <ListaDocumentos documentos={docsDaEdicao} onChange={recarregarDocs} />
        <AnexarDocumento
          edicaoId={edicaoId}
          entidadeTipo="edicao"
          entidadeId={null}
          onUploaded={recarregarDocs}
          label="Anexar documento da edição"
        />
      </section>

      {/* Projetos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">Projetos</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {projetos.length}
          </span>
        </div>

        {projetos.length === 0 ? (
          <EmptyState message="Nenhum projeto cadastrado nesta edição ainda." />
        ) : (
          <div className="space-y-3">
            {projetos.map((p) => {
              const bolsistasDoProjeto = bolsistasPorProjeto[p.id] ?? []
              return (
                <ProjetoAccordion
                  key={p.id}
                  projeto={p}
                  bolsistas={bolsistasDoProjeto}
                  docsProjeto={docsPorProjeto(p.id)}
                  docsOrientador={p.orientador ? docsPorOrientador(p.orientador.id) : []}
                  docsPorBolsista={docsPorBolsistaDoProjeto(bolsistasDoProjeto.map((b) => b.id))}
                  edicaoId={edicaoId}
                  expanded={expandidos.has(p.id)}
                  onToggle={() => toggleExpandido(p.id)}
                  onDocUploaded={recarregarDocs}
                  onDocRemoved={recarregarDocs}
                />
              )
            })}
          </div>
        )}
      </section>

      <CadastroProjetoLegadoModal
        open={modalProjeto}
        onClose={() => setModalProjeto(false)}
        onCreated={() => { setModalProjeto(false); carregar() }}
        orientadoresExistentes={orientadores}
        edicaoId={edicaoId}
      />
    </div>
  )
}
