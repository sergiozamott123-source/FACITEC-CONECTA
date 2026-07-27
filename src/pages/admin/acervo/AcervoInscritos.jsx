import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { projetoService, orientadorService, documentoAcervoService } from '@/lib/db'
import { useAcervoEdicao } from './useAcervoEdicao'
import { AcervoEdicaoHeader } from './AcervoEdicaoHeader'
import { DocumentosCell } from './DocumentosCell'
import { CadastroProjetoLegadoModal, StatusProjetoBadge } from './AcervoProjetos'

// Mesmo conjunto de status que a tela viva de Inscritos (src/pages/admin/Inscritos.jsx)
// já considera "se inscreveu" numa edição — reaproveitado aqui para o modo de dados reais.
const STATUS_INSCRITO_REAL = ['inscrito', 'reserva', 'selecionado']

// Inscritos = projetos da edição que não foram selecionados. Reaproveita o
// mesmo cadastro leve de AcervoProjetos.jsx, só gravando
// projeto.status = 'inscrito' em vez de 'legado'.
export function AcervoInscritos() {
  const { edicaoId } = useParams()
  const { edicao, loading: loadingEdicao, error: erroEdicao } = useAcervoEdicao(edicaoId)

  const [projetos, setProjetos] = useState([])
  const [orientadores, setOrientadores] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [dadosReais, setDadosReais] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projetosRes, orientadoresRes, docsRes, real] = await Promise.all([
        projetoService.list(edicaoId),
        orientadorService.listAll(),
        documentoAcervoService.listPorEdicao(edicaoId),
        projetoService.existeDadoReal(edicaoId),
      ])
      setProjetos(projetosRes.data)
      setOrientadores(orientadoresRes.data)
      setDocs(docsRes.data)
      setDadosReais(real)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar inscritos.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  const recarregarDocs = useCallback(async () => {
    const { data } = await documentoAcervoService.listPorEdicao(edicaoId)
    setDocs(data)
  }, [edicaoId])

  const inscritos = useMemo(
    () => (dadosReais ? projetos.filter((p) => STATUS_INSCRITO_REAL.includes(p.status)) : projetos.filter((p) => p.status === 'inscrito')),
    [projetos, dadosReais]
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
        acaoLabel={dadosReais ? undefined : 'Novo inscrito legado'}
        acaoIcon={Plus}
        onAcao={() => setModalAberto(true)}
      />

      {inscritos.length === 0 ? (
        <EmptyState message="Nenhum inscrito cadastrado nesta edição ainda." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Título</th>
                {dadosReais && <th className="text-left font-medium px-4 py-2.5">Status</th>}
                <th className="text-left font-medium px-4 py-2.5">Orientador</th>
                <th className="text-left font-medium px-4 py-2.5">Documentos</th>
              </tr>
            </thead>
            <tbody>
              {inscritos.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-medium text-foreground">{p.titulo}</td>
                  {dadosReais && (
                    <td className="px-4 py-2.5"><StatusProjetoBadge status={p.status} /></td>
                  )}
                  <td className="px-4 py-2.5 text-muted-foreground">{p.orientador?.nome_completo ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <DocumentosCell
                      edicaoId={edicaoId}
                      entidadeTipo="projeto"
                      entidadeId={p.id}
                      docs={docsPorProjeto(p.id)}
                      label="Anexar documento do inscrito"
                      onChange={recarregarDocs}
                    />
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
        statusValor="inscrito"
        titulo="Cadastrar inscrito legado"
      />
    </div>
  )
}
