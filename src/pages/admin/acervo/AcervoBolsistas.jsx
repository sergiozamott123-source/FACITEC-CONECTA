import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Select, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { bolsistaService, projetoService, documentoAcervoService } from '@/lib/db'
import { useAcervoEdicao } from './useAcervoEdicao'
import { AcervoEdicaoHeader } from './AcervoEdicaoHeader'
import { DocumentosCell } from './DocumentosCell'
import { ImportarPlanilhaModal } from './ImportarPlanilhaModal'

const CAMPOS_IMPORTACAO_BOLSISTA = [
  { key: 'nome_completo', label: 'Nome completo' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'projeto_titulo', label: 'Projeto' },
]

function normalizarTitulo(s) {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// bolsista.projeto_id é obrigatório no banco — diferente do fluxo de
// Projetos (onde criamos o orientador na hora se não existir), aqui NÃO dá
// pra inventar um projeto. Por isso o match é só contra projetos já
// cadastrados nesta edição; o que não achar fica de fora, com aviso.
function encontrarProjetoPorTitulo(tituloBusca, projetos) {
  const alvo = normalizarTitulo(tituloBusca)
  if (!alvo) return null
  const exato = projetos.find((p) => normalizarTitulo(p.titulo) === alvo)
  if (exato) return exato
  return projetos.find(
    (p) => normalizarTitulo(p.titulo).includes(alvo) || alvo.includes(normalizarTitulo(p.titulo))
  ) ?? null
}

// Mesmos valores aceitos pela constraint bolsista_tipo_check no banco,
// usados também no cadastro de bolsista dentro do modal de projeto
// (AcervoProjetos.jsx) — 'titular' é o mais comum na base real.
const TIPOS_BOLSISTA = [
  { value: 'titular', label: 'Titular' },
  { value: 'bolsista', label: 'Bolsista' },
  { value: 'voluntario', label: 'Voluntário' },
]

const EMPTY_FORM = { nome_completo: '', tipo: 'titular', projeto_id: '' }

function CadastroBolsistaLegadoModal({ open, onClose, onCreated, projetos }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome_completo.trim()) { setError('Informe o nome do bolsista.'); return }
    if (!form.projeto_id) { setError('Selecione o projeto.'); return }
    setSaving(true)
    setError(null)
    try {
      const projeto = projetos.find((p) => p.id === form.projeto_id)
      await bolsistaService.create({
        nome_completo: form.nome_completo.trim(),
        tipo: form.tipo.trim() || null,
        projeto_id: form.projeto_id,
        orientador_id: projeto?.orientador?.id ?? null,
        status: 'ativo',
      })
      setForm(EMPTY_FORM)
      onCreated()
    } catch (err) {
      setError(err.message ?? 'Erro ao cadastrar bolsista.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar bolsista legado" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Cadastro leve para dados históricos — nome e projeto são obrigatórios.
        </p>
        <FormField label="Nome completo" required>
          <Input value={form.nome_completo} onChange={set('nome_completo')} />
        </FormField>
        <FormField label="Tipo">
          <Select value={form.tipo} onChange={set('tipo')}>
            {TIPOS_BOLSISTA.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Projeto" required>
          <select
            value={form.projeto_id}
            onChange={set('projeto_id')}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Selecione…</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo}</option>
            ))}
          </select>
        </FormField>
        <ErrorAlert message={error} />
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AcervoBolsistas() {
  const { edicaoId } = useParams()
  const { edicao, loading: loadingEdicao, error: erroEdicao } = useAcervoEdicao(edicaoId)

  const [bolsistas, setBolsistas] = useState([])
  const [projetos, setProjetos] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [bolsistaParaExcluir, setBolsistaParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  async function handleExcluir() {
    if (!bolsistaParaExcluir) return
    setExcluindo(true)
    try {
      await bolsistaService.remove(bolsistaParaExcluir.id)
      setBolsistaParaExcluir(null)
      await carregar()
    } catch (err) {
      setError(err.message ?? 'Erro ao excluir bolsista.')
    } finally {
      setExcluindo(false)
    }
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bolsistasRes, projetosRes, docsRes] = await Promise.all([
        bolsistaService.list(edicaoId),
        projetoService.list(edicaoId),
        documentoAcervoService.listPorEdicao(edicaoId),
      ])
      setBolsistas(bolsistasRes.data)
      setProjetos(projetosRes.data)
      setDocs(docsRes.data)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar bolsistas.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  const recarregarDocs = useCallback(async () => {
    const { data } = await documentoAcervoService.listPorEdicao(edicaoId)
    setDocs(data)
  }, [edicaoId])

  const docsPorBolsista = useCallback(
    (bolsistaId) => docs.filter((d) => d.entidade_tipo === 'bolsista' && d.entidade_id === bolsistaId),
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
        acaoLabel="Novo bolsista legado"
        acaoIcon={Plus}
        onAcao={() => setModalAberto(true)}
        acaoSecundariaLabel="Importar planilha"
        acaoSecundariaIcon={Upload}
        onAcaoSecundaria={() => setModalImportarAberto(true)}
      />

      {bolsistas.length === 0 ? (
        <EmptyState message="Nenhum bolsista cadastrado nesta edição ainda." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Nome</th>
                <th className="text-left font-medium px-4 py-2.5">Tipo</th>
                <th className="text-left font-medium px-4 py-2.5">Projeto</th>
                <th className="text-left font-medium px-4 py-2.5">Documentos</th>
                <th className="text-left font-medium px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {bolsistas.map((b) => (
                <tr key={b.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-medium text-foreground">{b.nome_completo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{b.tipo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{b.projeto?.titulo ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <DocumentosCell
                      edicaoId={edicaoId}
                      entidadeTipo="bolsista"
                      entidadeId={b.id}
                      docs={docsPorBolsista(b.id)}
                      label="Anexar documento do bolsista"
                      onChange={recarregarDocs}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setBolsistaParaExcluir(b)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                      aria-label="Excluir bolsista"
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

      <CadastroBolsistaLegadoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onCreated={() => { setModalAberto(false); carregar() }}
        projetos={projetos}
      />

      <ConfirmDialog
        open={!!bolsistaParaExcluir}
        onClose={() => setBolsistaParaExcluir(null)}
        onConfirm={handleExcluir}
        loading={excluindo}
        message={`Excluir o bolsista "${bolsistaParaExcluir?.nome_completo ?? ''}"? Esta ação não pode ser desfeita.`}
      />

      <ImportarPlanilhaModal
        open={modalImportarAberto}
        onClose={() => setModalImportarAberto(false)}
        entidade="bolsista"
        tituloEntidade="Bolsistas"
        campos={CAMPOS_IMPORTACAO_BOLSISTA}
        onConfirmar={async (linhasAprovadas) => {
          const semProjeto = []
          for (const l of linhasAprovadas) {
            if (!l.nome_completo?.trim()) continue
            const projeto = encontrarProjetoPorTitulo(l.projeto_titulo, projetos)
            if (!projeto) {
              semProjeto.push(`${l.nome_completo.trim()} (projeto "${l.projeto_titulo || '—'}" não encontrado)`)
              continue
            }
            const tipoValido = TIPOS_BOLSISTA.some((t) => t.value === l.tipo) ? l.tipo : 'titular'
            await bolsistaService.create({
              nome_completo: l.nome_completo.trim(),
              tipo: tipoValido,
              projeto_id: projeto.id,
              orientador_id: projeto.orientador?.id ?? null,
              status: 'ativo',
            })
          }
          await carregar()
          if (semProjeto.length > 0) {
            window.alert(
              `${semProjeto.length} bolsista(s) NÃO foram salvos porque não encontramos o projeto correspondente já cadastrado nesta edição:\n\n${semProjeto.join('\n')}\n\nCadastre esses projetos primeiro (aba Projetos) e importe esses bolsistas de novo.`
            )
          }
        }}
      />
    </div>
  )
}
