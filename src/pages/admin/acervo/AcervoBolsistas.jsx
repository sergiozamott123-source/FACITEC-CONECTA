import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { bolsistaService, projetoService, documentoAcervoService } from '@/lib/db'
import { useAcervoEdicao } from './useAcervoEdicao'
import { AcervoEdicaoHeader } from './AcervoEdicaoHeader'
import { DocumentosCell } from './DocumentosCell'

const EMPTY_FORM = { nome_completo: '', tipo: '', projeto_id: '' }

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
          <Input value={form.tipo} onChange={set('tipo')} placeholder="ex: IC, voluntário" />
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
    </div>
  )
}
