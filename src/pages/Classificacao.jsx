import { useState, useEffect, useCallback } from 'react'
import { Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useTable } from '@/hooks/useTable'
import { edicaoService } from '@/lib/db'
import { useAdmin } from '@/contexts/AdminContext'
import { computarRanking, CONSENSO_VARIANT } from '@/lib/classificacaoRanking'
import { ClassificacaoDetalhe } from './ClassificacaoDetalhe'

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
  const { data: edicoes, loading: edicaoLoading } = useTable(fetchEdicoes)

  const [edicaoId, setEdicaoId] = useState(null)
  const [ranking, setRanking] = useState([])
  const [criterios, setCriterios] = useState([])
  const [notaMaxTotal, setNotaMaxTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    if (edicoes.length > 0 && !edicaoId) {
      setEdicaoId(edicoes[0].id)
    }
  }, [edicoes])

  useEffect(() => {
    if (edicaoId) fetchRanking(edicaoId)
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
        .select('id, titulo, area_conhecimento')
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
      </div>

      <ErrorAlert message={error} />

      {selectedItem && (
        <ClassificacaoDetalhe
          item={selectedItem.item}
          pos={selectedItem.pos}
          notaMaxTotal={notaMaxTotal}
          criterios={criterios}
          onClose={() => setSelectedItem(null)}
        />
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
                      <Badge variant={CONSENSO_VARIANT[item.consenso] ?? 'secondary'}>
                        {item.consenso}
                      </Badge>
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
