import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/ui/badge'

const REC_VARIANT = {
  'Aprovado':               'success',
  'Aprovado com Ressalvas': 'warning',
  'Não Aprovado':           'destructive',
  'Sem consenso':           'secondary',
  'Não informado':          'secondary',
}

function fmt(n) {
  if (n === null || n === undefined) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

function notasPorCodigo(av) {
  const map = {}
  ;(av.notas_criterio ?? []).forEach(nc => {
    if (nc.criterio?.codigo) map[nc.criterio.codigo] = Number(nc.nota ?? 0)
  })
  return map
}

function totalAv(av) {
  return (av.notas_criterio ?? []).reduce((s, nc) => s + Number(nc.nota ?? 0), 0)
}

export function ClassificacaoDetalhe({ item, pos, notaMaxTotal, criterios, onClose }) {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!item) return
    setLoading(true)
    setError(null)
    supabase
      .from('avaliacao')
      .select(`
        id, recomendacao_final, parecer,
        avaliador:avaliador_id ( id, nome ),
        notas_criterio:avaliacao_criterio (
          nota,
          criterio:criterio_id ( id, codigo, ordem )
        )
      `)
      .eq('projeto_id', item.projeto.id)
      .eq('status', 'concluida')
      .order('avaliador_id')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setAvaliacoes(data ?? [])
        setLoading(false)
      })
  }, [item?.projeto?.id])

  if (!item) return null

  return (
    <Modal open={true} onClose={onClose} title={`${pos}° lugar — Ficha detalhada`} size="xl">
      {/* Cabeçalho do projeto */}
      <div className="mb-5 pb-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground leading-snug">{item.projeto.titulo}</h3>
        {item.projeto.area_conhecimento && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.projeto.area_conhecimento}</p>
        )}
        <div className="flex items-center gap-3 mt-2.5">
          <span className="text-2xl font-bold text-foreground">{fmt(item.notaFinal)}</span>
          <span className="text-sm text-muted-foreground">/ {fmt(notaMaxTotal)}</span>
          <Badge variant={REC_VARIANT[item.consenso] ?? 'secondary'}>{item.consenso}</Badge>
          <span className="text-xs text-muted-foreground">{item.n} avaliação(ões)</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando detalhes...</p>
      ) : error ? (
        <p className="text-sm text-red-600 py-4">{error}</p>
      ) : (
        <div className="space-y-6">
          {/* ── Tabela comparativa ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Comparativo por critério
            </p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground py-2 pr-4 min-w-[160px]">
                      Critério
                    </th>
                    {avaliacoes.map(av => (
                      <th key={av.id} className="text-center font-semibold text-foreground py-2 px-3 min-w-[80px]">
                        {primeiroNome(av.avaliador?.nome)}
                      </th>
                    ))}
                    <th className="text-center font-semibold text-primary py-2 px-3 min-w-[70px]">
                      Média
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {criterios.map(c => {
                    const notas = avaliacoes.map(av => notasPorCodigo(av)[c.codigo] ?? null)
                    const media = notas.length > 0
                      ? notas.reduce((s, n) => s + (n ?? 0), 0) / notas.length
                      : null
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 pr-4">
                          <span className="font-semibold text-foreground">{c.codigo}</span>
                          <span className="text-muted-foreground"> {c.nome}</span>
                          <span className="text-xs text-muted-foreground ml-1">/ {fmt(c.nota_maxima)}</span>
                        </td>
                        {notas.map((n, i) => (
                          <td key={i} className="text-center py-2 px-3 text-foreground tabular-nums">
                            {fmt(n)}
                          </td>
                        ))}
                        <td className="text-center py-2 px-3 font-semibold text-primary tabular-nums">
                          {fmt(media)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-muted/40 font-bold border-t-2 border-border">
                    <td className="py-2.5 pr-4 text-foreground">Total</td>
                    {avaliacoes.map(av => (
                      <td key={av.id} className="text-center py-2.5 px-3 text-foreground tabular-nums">
                        {fmt(totalAv(av))}
                      </td>
                    ))}
                    <td className="text-center py-2.5 px-3 text-primary tabular-nums">
                      {fmt(item.notaFinal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Fichas individuais ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Fichas individuais
            </p>
            <div className="space-y-3">
              {avaliacoes.map(av => {
                const notas = notasPorCodigo(av)
                const total = totalAv(av)
                return (
                  <div key={av.id} className="rounded-lg border border-border p-4 space-y-3">
                    {/* Nome + nota + recomendação */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{av.avaliador?.nome ?? '—'}</p>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="tabular-nums font-bold text-foreground">{fmt(total)}</span>
                        <span className="text-xs text-muted-foreground">/ {fmt(notaMaxTotal)}</span>
                        {av.recomendacao_final ? (
                          <Badge variant={REC_VARIANT[av.recomendacao_final] ?? 'secondary'}>
                            {av.recomendacao_final}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Não informado</Badge>
                        )}
                      </div>
                    </div>

                    {/* Notas por critério */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {criterios.map(c => (
                        <div key={c.id} className="bg-muted/40 rounded-md px-3 py-2 text-center">
                          <p className="text-xs font-semibold text-muted-foreground">{c.codigo}</p>
                          <p className="text-lg font-bold text-foreground tabular-nums">
                            {fmt(notas[c.codigo] ?? null)}
                          </p>
                          <p className="text-xs text-muted-foreground">/ {fmt(c.nota_maxima)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Parecer */}
                    {av.parecer && (
                      <div className="bg-muted/20 rounded-md px-3 py-2.5">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Parecer</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {av.parecer}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function primeiroNome(nome) {
  if (!nome) return '—'
  return nome.split(' ')[0]
}
