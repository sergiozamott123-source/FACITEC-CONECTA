import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Archive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'
import { orientadorService, bolsistaService, documentoAcervoService } from '@/lib/db'
import { listarCiclos } from '@/lib/relatorioMensal'
import { arquivarContratoOrientador, arquivarTermoAdesao, arquivarRecursoDocumento, arquivarRelatorioMensal, jaArquivado } from '@/lib/acervoArquivamento'
import { ArquivarBotao } from '@/components/acervo/ArquivarBotao'
import { useAcervoEdicao } from './useAcervoEdicao'
import { AcervoEdicaoHeader } from './AcervoEdicaoHeader'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/common/Toast'

const TIPO_RECURSO_DOC = { recurso_interposto: 'Recurso interposto', resposta_recurso: 'Resposta ao recurso' }
const STATUS_DECIDIDO = ['deferido', 'indeferido']

async function nomesBolsistasDoRelatorio(relatorio) {
  const ids = (relatorio.frequencia_bolsistas ?? []).map((f) => f.bolsista_id)
  if (!ids.length) return {}
  const { data } = await supabase.from('bolsista').select('id, nome_completo').in('id', ids)
  return Object.fromEntries((data ?? []).map((b) => [b.id, b.nome_completo]))
}

export function AcervoDocumentosDisponiveis() {
  const { edicaoId } = useParams()
  const { edicao, loading: loadingEdicao, error: erroEdicao } = useAcervoEdicao(edicaoId)

  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [arquivandoId, setArquivandoId] = useState(null)
  const [lote, setLote] = useState(null) // { atual, total }
  const { toast, showToast } = useToast()

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: orientadores },
        { data: bolsistas },
        { data: relatorios },
        { data: recursos },
        { data: docsExistentes },
        ciclos,
      ] = await Promise.all([
        orientadorService.list(edicaoId),
        bolsistaService.list(edicaoId),
        supabase
          .from('relatorio_mensal')
          .select('*, orientador:orientador_id(id, nome_completo), projeto:projeto_id(id, titulo)')
          .eq('edicao_id', edicaoId)
          .eq('status', 'enviado'),
        supabase
          .from('recurso')
          .select('id, status, orientador:orientador_id(id, nome_completo), recurso_documento(id, tipo, nome_arquivo, url)')
          .eq('edicao_id', edicaoId)
          .in('status', STATUS_DECIDIDO),
        documentoAcervoService.listPorEdicao(edicaoId),
        listarCiclos(edicaoId),
      ])

      const ciclosPorId = Object.fromEntries((ciclos ?? []).map((c) => [c.id, c]))
      const docs = docsExistentes ?? []
      const lista = []

      for (const o of orientadores ?? []) {
        if (o.contrato_url && !jaArquivado(docs, 'orientador', o.id, 'contrato')) {
          lista.push({
            id: `contrato-${o.id}`,
            tipo: 'Contrato',
            nome: o.nome_completo,
            arquivar: () => arquivarContratoOrientador(o, edicaoId),
          })
        }
      }

      for (const b of bolsistas ?? []) {
        if (b.termo_adesao_url && !jaArquivado(docs, 'bolsista', b.id, 'termo_adesao')) {
          lista.push({
            id: `termo-${b.id}`,
            tipo: 'Termo de adesão',
            nome: b.nome_completo,
            arquivar: () => arquivarTermoAdesao(b, edicaoId),
          })
        }
      }

      for (const r of relatorios ?? []) {
        if (!jaArquivado(docs, 'orientador', r.orientador_id, 'relatorio_mensal')) {
          const ciclo = ciclosPorId[r.ciclo_id] ?? null
          lista.push({
            id: `relatorio-${r.id}`,
            tipo: 'Relatório mensal',
            nome: `${r.orientador?.nome_completo ?? '—'}${ciclo ? ` — ciclo ${ciclo.numero_ciclo}` : ''}`,
            arquivar: async () => {
              const nomesBolsistas = await nomesBolsistasDoRelatorio(r)
              await arquivarRelatorioMensal({
                relatorio: r,
                edicaoId,
                ciclo,
                orientador: r.orientador,
                projetoTitulo: r.projeto?.titulo,
                nomesBolsistas,
              })
            },
          })
        }
      }

      for (const rec of recursos ?? []) {
        if (!rec.orientador?.id) continue
        for (const doc of rec.recurso_documento ?? []) {
          if (!jaArquivado(docs, 'orientador', rec.orientador.id, doc.tipo)) {
            lista.push({
              id: `recurso-doc-${doc.id}`,
              tipo: TIPO_RECURSO_DOC[doc.tipo] ?? doc.tipo,
              nome: rec.orientador.nome_completo,
              arquivar: () => arquivarRecursoDocumento(doc, edicaoId, rec.orientador.id),
            })
          }
        }
      }

      setItens(lista)
    } catch (err) {
      setError(err.message ?? 'Erro ao carregar documentos disponíveis.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId])

  useEffect(() => { carregar() }, [carregar])

  async function handleArquivarItem(item) {
    setArquivandoId(item.id)
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, erro: null } : i)))
    try {
      await item.arquivar()
      setItens((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      const motivo = err.message || 'Erro ao arquivar documento.'
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, erro: motivo } : i)))
      showToast(motivo, 'err')
    } finally {
      setArquivandoId(null)
    }
  }

  // Cada item da lista é tentado uma única vez por clique em "Arquivar todos" —
  // não há retry automático. Um item que falhar permanece na lista com o
  // motivo do erro anexado (item.erro), visível na linha; para tentar de novo
  // é preciso um clique manual (aqui ou no botão individual da linha).
  async function handleArquivarTodos() {
    const pendentes = [...itens]
    setLote({ atual: 0, total: pendentes.length })
    let falhas = 0
    for (let i = 0; i < pendentes.length; i++) {
      const item = pendentes[i]
      setArquivandoId(item.id)
      try {
        await item.arquivar()
        setItens((prev) => prev.filter((x) => x.id !== item.id))
      } catch (err) {
        falhas++
        const motivo = err.message || 'Erro ao arquivar documento.'
        setItens((prev) => prev.map((x) => (x.id === item.id ? { ...x, erro: motivo } : x)))
      }
      setLote({ atual: i + 1, total: pendentes.length })
    }
    setArquivandoId(null)
    setLote(null)
    showToast(
      falhas > 0 ? `Concluído com ${falhas} erro(s). Veja o motivo nos itens restantes na lista.` : 'Todos os documentos disponíveis foram arquivados.',
      falhas > 0 ? 'err' : 'ok'
    )
  }

  if (loadingEdicao || loading) return <LoadingState />
  if (erroEdicao) return <ErrorAlert message={erroEdicao} />
  if (error) return <ErrorAlert message={error} />
  if (!edicao) return <EmptyState message="Edição não encontrada." />

  return (
    <div className="space-y-6">
      <AcervoEdicaoHeader edicao={edicao} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {itens.length === 0 ? 'Nenhum documento pendente de arquivamento.' : `${itens.length} documento${itens.length !== 1 ? 's' : ''} disponível${itens.length !== 1 ? 'is' : ''} para arquivar`}
        </p>
        {itens.length > 0 && (
          <Button size="sm" disabled={!!lote} onClick={handleArquivarTodos}>
            {lote ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Archive className="w-4 h-4 mr-1.5" />}
            {lote ? `Arquivando ${lote.atual} de ${lote.total}…` : 'Arquivar todos os disponíveis'}
          </Button>
        )}
      </div>

      {itens.length === 0 ? (
        <EmptyState message="Tudo o que já pode ser arquivado nesta edição já está no Acervo." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Nome</th>
                <th className="text-left font-medium px-4 py-2.5">Tipo</th>
                <th className="text-left font-medium px-4 py-2.5 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {item.nome}
                    {item.erro && (
                      <p className="text-xs font-normal text-destructive mt-0.5">{item.erro}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.tipo}</td>
                  <td className="px-4 py-2.5">
                    <ArquivarBotao
                      arquivado={false}
                      loading={arquivandoId === item.id}
                      onClick={() => handleArquivarItem(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}
