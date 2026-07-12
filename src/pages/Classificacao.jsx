import { useState, useEffect, useCallback } from 'react'
import { Trophy, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable } from '@/hooks/useTable'
import { edicaoService } from '@/lib/db'
import { useAdmin } from '@/contexts/AdminContext'
import { computarRanking, CONSENSO_VARIANT } from '@/lib/classificacaoRanking'
import { gerarPrefixoCodigo } from '@/lib/programas'
import { ClassificacaoDetalhe } from './ClassificacaoDetalhe'

const STATUS_SELECAO_LABEL = { selecionado: 'Selecionado', reserva: 'Reserva' }
const STATUS_SELECAO_VARIANT = { selecionado: 'success', reserva: 'warning' }

function fmt(n) {
  if (n === null || n === undefined) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

function posLabel(pos) {
  return `${pos}°`
}

function posClassName(pos) {
  if (pos === 1) return 'text-yellow-500 font-extrabold text-xl w-10 text-center shrink-0'
  if (pos === 2) return 'text-slate-400 font-extrabold text-xl w-10 text-center shrink-0'
  if (pos === 3) return 'text-amber-600 font-extrabold text-xl w-10 text-center shrink-0'
  return 'text-muted-foreground font-semibold text-sm w-10 text-center shrink-0'
}

export function Classificacao() {
  const { programaSelecionado } = useAdmin()
  const fetchEdicoes = useCallback(() => edicaoService.list(programaSelecionado), [programaSelecionado])
  const { data: edicoes, loading: edicaoLoading, reload: reloadEdicoes } = useTable(fetchEdicoes)

  const [edicaoId, setEdicaoId] = useState(null)
  const [ranking, setRanking] = useState([])
  const [criterios, setCriterios] = useState([])
  const [notaMaxTotal, setNotaMaxTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  const [recursosAbertos, setRecursosAbertos] = useState(0)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const edicaoAtual = edicoes.find(e => e.id === edicaoId) ?? null
  const vagas = edicaoAtual?.numero_vagas ?? null

  useEffect(() => {
    if (edicoes.length > 0 && !edicaoId) {
      setEdicaoId(edicoes[0].id)
    }
  }, [edicoes])

  useEffect(() => {
    if (edicaoId) fetchRanking(edicaoId)
  }, [edicaoId])

  useEffect(() => {
    if (!edicaoId) return
    supabase
      .from('recurso')
      .select('id', { count: 'exact', head: true })
      .eq('edicao_id', edicaoId)
      .in('status', ['enviado', 'em_analise'])
      .then(({ count }) => setRecursosAbertos(count ?? 0))
  }, [edicaoId])

  async function fetchRanking(eid) {
    setLoading(true)
    setError(null)
    try {
      const { data: criterios, error: ec } = await supabase
        .from('criterio_avaliacao')
        .select('id, codigo, nome, nota_maxima, ordem')
        .eq('edicao_id', eid)
        .order('ordem', { ascending: true })
      if (ec) throw new Error(ec.message)

      const notaMax = (criterios ?? []).reduce((s, c) => s + Number(c.nota_maxima ?? 0), 0)
      setNotaMaxTotal(notaMax)
      setCriterios(criterios ?? [])

      const { data: projetos, error: ep } = await supabase
        .from('projeto')
        .select('id, titulo, area_conhecimento, orientador_id, status')
        .eq('edicao_id', eid)
      if (ep) throw new Error(ep.message)

      if (!projetos?.length) { setRanking([]); setLoading(false); return }

      const projetoIds = projetos.map(p => p.id)

      const { data: avaliacoes, error: ea } = await supabase
        .from('avaliacao')
        .select(`
          id, recomendacao_final, projeto_id,
          notas_criterio:avaliacao_criterio (
            nota,
            criterio:criterio_id ( id, codigo )
          )
        `)
        .eq('status', 'concluida')
        .in('projeto_id', projetoIds)
      if (ea) throw new Error(ea.message)

      if (!avaliacoes?.length) { setRanking([]); setLoading(false); return }

      setRanking(computarRanking(projetos, avaliacoes, criterios ?? []))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmarSelecao() {
    if (!vagas || vagas <= 0) {
      setConfirmError('Defina o número de vagas desta edição em Edições antes de continuar.')
      return
    }
    setConfirmando(true)
    setConfirmError(null)
    try {
      // Recheca recursos em aberto no momento da confirmação — evita corrida com
      // o modal ficar aberto enquanto um recurso é respondido em outra aba.
      const { count: abertos, error: erRec } = await supabase
        .from('recurso')
        .select('id', { count: 'exact', head: true })
        .eq('edicao_id', edicaoId)
        .in('status', ['enviado', 'em_analise'])
      if (erRec) throw new Error(erRec.message)
      if ((abertos ?? 0) > 0) {
        throw new Error(`Existem ${abertos} recurso(s) ainda em aberto nesta edição. Encerre a fase de recursos antes de confirmar a seleção final.`)
      }

      const selecionados = ranking.slice(0, vagas)
      const reserva = ranking.slice(vagas)
      const selecionadoIds = selecionados.map(r => r.projeto.id)
      const reservaIds = reserva.map(r => r.projeto.id)

      if (selecionadoIds.length > 0) {
        const { error: erSel } = await supabase.from('projeto').update({ status: 'selecionado' }).in('id', selecionadoIds)
        if (erSel) throw new Error(erSel.message)
      }
      if (reservaIds.length > 0) {
        const { error: erRes } = await supabase.from('projeto').update({ status: 'reserva' }).in('id', reservaIds)
        if (erRes) throw new Error(erRes.message)
      }

      // codigo_orientador sequencial por ordem de classificação — só grava em
      // quem ainda não tem (idempotente: rodar de novo não sobrescreve).
      const orientadorIdsRankOrder = [...new Set(selecionados.map(r => r.projeto.orientador_id).filter(Boolean))]
      if (orientadorIdsRankOrder.length > 0) {
        const { data: orientadores, error: erOr } = await supabase
          .from('orientador')
          .select('id, codigo_orientador')
          .in('id', orientadorIdsRankOrder)
        if (erOr) throw new Error(erOr.message)
        const codigoPorId = new Map((orientadores ?? []).map(o => [o.id, o.codigo_orientador]))
        const prefixo = gerarPrefixoCodigo(edicaoAtual)

        for (let i = 0; i < orientadorIdsRankOrder.length; i++) {
          const orientadorId = orientadorIdsRankOrder[i]
          if (codigoPorId.get(orientadorId)) continue
          const seq = String(i + 1).padStart(3, '0')
          const { error: erUpd } = await supabase
            .from('orientador')
            .update({ codigo_orientador: `${prefixo}-${seq}` })
            .eq('id', orientadorId)
          if (erUpd) throw new Error(erUpd.message)
        }
      }

      const { error: erEd } = await supabase
        .from('edicao')
        .update({ data_selecao_final: new Date().toISOString() })
        .eq('id', edicaoId)
      if (erEd) throw new Error(erEd.message)

      setSuccessMsg(`Seleção final confirmada: ${selecionadoIds.length} selecionado(s), ${reservaIds.length} em reserva.`)
      setConfirmModalOpen(false)
      reloadEdicoes()
      fetchRanking(edicaoId)
    } catch (err) {
      setConfirmError(err.message)
    } finally {
      setConfirmando(false)
    }
  }

  const totalAvaliacoes = ranking.reduce((s, r) => s + r.n, 0)

  function labelEdicao(ed) {
    if (ed.data_inicio) return `Edição ${new Date(ed.data_inicio).getFullYear()} · ${ed.status ?? ''}`
    return `Edição #${ed.id}${ed.status ? ` · ${ed.status}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Classificação Geral</h1>
          {ranking.length > 0 && (
            <span className="text-sm text-muted-foreground">
              — {ranking.length} projeto(s) · {totalAvaliacoes} avaliação(ões) enviada(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={edicaoId ?? ''}
            onChange={e => setEdicaoId(Number(e.target.value))}
            disabled={edicaoLoading}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="" disabled>Selecione a edição</option>
            {edicoes.map(ed => (
              <option key={ed.id} value={ed.id}>{labelEdicao(ed)}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => { setConfirmError(null); setSuccessMsg(null); setConfirmModalOpen(true) }}
            disabled={!edicaoId || ranking.length === 0 || loading}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar seleção final
          </Button>
        </div>
      </div>

      <ErrorAlert message={error} />

      {successMsg && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      )}

      {selectedItem && (
        <ClassificacaoDetalhe
          item={selectedItem.item}
          pos={selectedItem.pos}
          notaMaxTotal={notaMaxTotal}
          criterios={criterios}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {confirmModalOpen && (
        <Modal
          open={confirmModalOpen}
          onClose={() => { if (!confirmando) setConfirmModalOpen(false) }}
          title="Confirmar seleção final"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Marca os projetos mais bem classificados como <strong>selecionados</strong> — liberando o
              orientador para montar a equipe e a Secretaria para gerar o contrato — e os demais como{' '}
              <strong>reserva</strong>. Rodar novamente não duplica nem sobrescreve códigos já atribuídos.
            </p>

            {vagas == null ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Esta edição ainda não tem o número de vagas definido. Configure em Edições antes de continuar.</span>
              </div>
            ) : (
              <div className="rounded-md border border-border p-3 text-sm space-y-1">
                <p>Vagas do edital: <strong>{vagas}</strong></p>
                <p>Serão marcados como <strong>selecionados</strong>: {Math.min(vagas, ranking.length)}</p>
                <p>Ficam em <strong>reserva</strong>: {Math.max(ranking.length - vagas, 0)}</p>
              </div>
            )}

            {recursosAbertos > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {recursosAbertos} recurso(s) ainda em aberto nesta edição. A seleção final só deve ser
                  confirmada depois que a fase de recursos estiver encerrada.
                </span>
              </div>
            )}

            {edicaoAtual?.data_selecao_final && (
              <p className="text-xs text-muted-foreground">
                Última confirmação: {new Date(edicaoAtual.data_selecao_final).toLocaleString('pt-BR')}
              </p>
            )}

            <ErrorAlert message={confirmError} />

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setConfirmModalOpen(false)} disabled={confirmando}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarSelecao}
                disabled={confirmando || vagas == null || recursosAbertos > 0}
              >
                {confirmando ? 'Confirmando…' : 'Confirmar seleção final'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {loading ? <LoadingState /> : ranking.length === 0 ? (
        <EmptyState message="Nenhuma avaliação enviada encontrada para esta edição." />
      ) : (
        <div className="space-y-2">
          {ranking.map((item, idx) => {
            const pos = idx + 1
            return (
              <Card
                key={item.projeto.id}
                onClick={() => setSelectedItem({ item, pos })}
                className={`hover:shadow-md transition-shadow cursor-pointer ${pos <= 3 ? 'border-primary/40' : ''}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    {/* Posição */}
                    <span className={posClassName(pos)}>{posLabel(pos)}</span>

                    {/* Título e área */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {item.projeto.titulo}
                      </p>
                      {item.projeto.area_conhecimento && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.projeto.area_conhecimento}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.n} avaliação{item.n !== 1 ? 'ões' : ''} enviada{item.n !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Nota e consenso */}
                    <div className="text-right shrink-0 space-y-1.5">
                      <p className="text-lg font-bold text-foreground leading-none">
                        {fmt(item.notaFinal)}
                        <span className="text-xs font-normal text-muted-foreground">
                          {' '}/ {fmt(notaMaxTotal)}
                        </span>
                      </p>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Badge variant={CONSENSO_VARIANT[item.consenso] ?? 'secondary'}>
                          {item.consenso}
                        </Badge>
                        {STATUS_SELECAO_LABEL[item.projeto.status] && (
                          <Badge variant={STATUS_SELECAO_VARIANT[item.projeto.status]}>
                            {STATUS_SELECAO_LABEL[item.projeto.status]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
