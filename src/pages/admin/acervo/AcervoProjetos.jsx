import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { projetoService, bolsistaService, orientadorService, documentoAcervoService } from '@/lib/db'
import { useAcervoEdicao } from './useAcervoEdicao'
import { AcervoEdicaoHeader } from './AcervoEdicaoHeader'
import { DocumentosCell } from './DocumentosCell'
import { ImportarPlanilhaModal } from './ImportarPlanilhaModal'

const CAMPOS_IMPORTACAO_PROJETO = [
  { key: 'titulo', label: 'Título do projeto' },
  { key: 'area_conhecimento', label: 'Área de conhecimento' },
  { key: 'orientador_nome', label: 'Orientador(a)' },
]

// Valores aceitos pela constraint bolsista_tipo_check no banco — 'titular' é
// disparado o mais comum na base real (72 de 83 registros), por isso é o
// padrão ao adicionar um novo bolsista.
const TIPOS_BOLSISTA = [
  { value: 'titular', label: 'Titular' },
  { value: 'bolsista', label: 'Bolsista' },
  { value: 'voluntario', label: 'Voluntário' },
]

const EMPTY_BOLSISTA = () => ({ key: crypto.randomUUID(), nome_completo: '', tipo: 'titular' })

const EMPTY_FORM = {
  modoOrientador: 'novo',
  orientador_id_existente: '',
  orientador_nome: '',
  orientador_email: '',
  titulo: '',
  area_conhecimento: '',
  bolsistas: [EMPTY_BOLSISTA()],
}

// Reaproveitado também por AcervoInscritos.jsx (statusValor="inscrito") —
// mesmo cadastro leve de projeto/orientador/bolsistas, só muda o status
// gravado no projeto. IMPORTANTE: status é restrito pela constraint
// projeto_status_check no banco (valores aceitos: rascunho, inscrito,
// em_avaliacao, avaliado, selecionado, reserva, nao_selecionado, cancelado)
// — 'legado' não existe nessa lista, por isso usamos 'selecionado' (um
// projeto legado é, por definição, um projeto que foi selecionado/executado
// na sua edição histórica).
export function CadastroProjetoLegadoModal({
  open, onClose, onCreated, orientadoresExistentes, edicaoId,
  statusValor = 'selecionado', titulo = 'Cadastrar projeto legado',
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Progresso do salvamento em etapas (orientador -> projeto -> bolsistas).
  // Guarda o que já foi gravado com sucesso, para que um retry após erro
  // (ex: constraint de tipo de bolsista) NÃO recrie orientador/projeto
  // duplicados — só retoma do ponto que faltou.
  const [progresso, setProgresso] = useState({ orientadorId: null, projetoId: null, bolsistasCriados: [] })

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setError(null)
      setProgresso({ orientadorId: null, projetoId: null, bolsistasCriados: [] })
    }
  }, [open])

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
      let orientadorId = progresso.orientadorId
      if (!orientadorId) {
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
        setProgresso((p) => ({ ...p, orientadorId }))
      }

      let projetoId = progresso.projetoId
      if (!projetoId) {
        const projeto = await projetoService.create({
          titulo: form.titulo.trim(),
          area_conhecimento: form.area_conhecimento.trim() || null,
          edicao_id: edicaoId,
          orientador_id: orientadorId,
          status: statusValor,
        })
        projetoId = projeto.id
        setProgresso((p) => ({ ...p, projetoId }))
      }

      for (const b of form.bolsistas) {
        if (!b.nome_completo.trim()) continue
        if (progresso.bolsistasCriados.includes(b.key)) continue
        await bolsistaService.create({
          nome_completo: b.nome_completo.trim(),
          tipo: b.tipo.trim() || null,
          projeto_id: projetoId,
          orientador_id: orientadorId,
          status: 'ativo',
        })
        setProgresso((p) => ({ ...p, bolsistasCriados: [...p.bolsistasCriados, b.key] }))
      }

      setForm(EMPTY_FORM)
      setProgresso({ orientadorId: null, projetoId: null, bolsistasCriados: [] })
      onCreated()
    } catch (err) {
      setError(err.message ?? 'Erro ao cadastrar projeto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={titulo} size="lg">
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
                <Select
                  value={b.tipo}
                  onChange={(e) => setBolsista(b.key, 'tipo', e.target.value)}
                  className="w-48"
                >
                  {TIPOS_BOLSISTA.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
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

export function AcervoProjetos() {
  const { edicaoId } = useParams()
  const { edicao, loading: loadingEdicao, error: erroEdicao } = useAcervoEdicao(edicaoId)

  const [projetos, setProjetos] = useState([])
  const [orientadores, setOrientadores] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [projetoParaExcluir, setProjetoParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function handleExcluir() {
    if (!projetoParaExcluir) return
    setExcluindo(true)
    try {
      // bolsista.projeto_id não tem ON DELETE CASCADE — apaga os bolsistas
      // vinculados primeiro, senão o delete do projeto falha por referência.
      const { data: bolsistasDoProjeto } = await bolsistaService.list(edicaoId)
      const vinculados = (bolsistasDoProjeto ?? []).filter((b) => b.projeto_id === projetoParaExcluir.id)
      for (const b of vinculados) {
        await bolsistaService.remove(b.id)
      }
      await projetoService.remove(projetoParaExcluir.id)
      setProjetoParaExcluir(null)
      carregar()
    } catch (err) {
      setError(err.message ?? 'Erro ao excluir projeto.')
    } finally {
      setExcluindo(false)
    }
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projetosRes, orientadoresRes, docsRes] = await Promise.all([
        projetoService.list(edicaoId),
        orientadorService.listAll(),
        documentoAcervoService.listPorEdicao(edicaoId),
      ])
      setProjetos(projetosRes.data)
      setOrientadores(orientadoresRes.data)
      setDocs(docsRes.data)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar projetos.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  const recarregarDocs = useCallback(async () => {
    const { data } = await documentoAcervoService.listPorEdicao(edicaoId)
    setDocs(data)
  }, [edicaoId])

  const projetosSelecionados = useMemo(
    () => projetos.filter((p) => p.status !== 'inscrito'),
    [projetos]
  )
  const docsPorProjeto = useCallback(
    (projetoId) => docs.filter((d) => d.entidade_tipo === 'projeto' && d.entidade_id === projetoId),
    [docs]
  )

  if (loadingEdicao || loading) return <LoadingState />
  if (erroEdicao) return <ErrorAlert message={erroEdicao} />
  if (error) return <ErrorAlert message={error} />
  if (!edicao) return <EmptyState message="Edição não encontrada." />

  return (
    <div className="space-y-6">
      <AcervoEdicaoHeader
        edicao={edicao}
        acaoLabel="Novo projeto legado"
        acaoIcon={Plus}
        onAcao={() => setModalAberto(true)}
        acaoSecundariaLabel="Importar planilha"
        acaoSecundariaIcon={Upload}
        onAcaoSecundaria={() => setModalImportarAberto(true)}
      />

      {projetosSelecionados.length === 0 ? (
        <EmptyState message="Nenhum projeto cadastrado nesta edição ainda." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Título</th>
                <th className="text-left font-medium px-4 py-2.5">Orientador</th>
                <th className="text-left font-medium px-4 py-2.5">Documentos</th>
                <th className="text-left font-medium px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {projetosSelecionados.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-medium text-foreground">{p.titulo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.orientador?.nome_completo ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <DocumentosCell
                      edicaoId={edicaoId}
                      entidadeTipo="projeto"
                      entidadeId={p.id}
                      docs={docsPorProjeto(p.id)}
                      label="Anexar documento do projeto"
                      onChange={recarregarDocs}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setProjetoParaExcluir(p)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                      aria-label="Excluir projeto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CadastroProjetoLegadoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onCreated={() => { setModalAberto(false); carregar() }}
        orientadoresExistentes={orientadores}
        edicaoId={edicaoId}
      />

      <ConfirmDialog
        open={!!projetoParaExcluir}
        onClose={() => setProjetoParaExcluir(null)}
        onConfirm={handleExcluir}
        loading={excluindo}
        message={`Excluir o projeto "${projetoParaExcluir?.titulo ?? ''}"? Os bolsistas vinculados a ele também serão removidos. Esta ação não pode ser desfeita.`}
      />

      <ImportarPlanilhaModal
        open={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        entidade="projeto"
        tituloEntidade="Projetos"
        campos={CAMPOS_IMPORTACAO_PROJETO}
        onConfirmar={async (linhasAprovadas) => {
          // Cache local (não o state) para o "já existe?" enxergar orientadores
          // criados nas linhas anteriores DESTA MESMA importação — se só
          // checássemos o state `orientadores`, duas linhas seguidas do mesmo
          // orientador criariam ele duplicado (o state só atualiza depois do
          // fim do loop).
          const cache = [...orientadores]
          for (const l of linhasAprovadas) {
            if (!l.titulo?.trim()) continue
            const nomeLimpo = (l.orientador_nome ?? '').trim()
            let orientadorId = null
            if (nomeLimpo) {
              const existente = cache.find(
                (o) => o.nome_completo.trim().toLowerCase() === nomeLimpo.toLowerCase()
              )
              if (existente) {
                orientadorId = existente.id
              } else {
                const novo = await orientadorService.create({ nome_completo: nomeLimpo, edicao_id: edicaoId })
                cache.push(novo)
                orientadorId = novo.id
              }
            }
            await projetoService.create({
              titulo: l.titulo.trim(),
              area_conhecimento: l.area_conhecimento?.trim() || null,
              edicao_id: edicaoId,
              orientador_id: orientadorId,
              status: 'selecionado',
            })
          }
          setOrientadores(cache)
          await carregar()
        }}
      />
    </div>
  )
}
