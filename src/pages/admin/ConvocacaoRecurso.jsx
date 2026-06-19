import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'

function computeConvocacoes(rcList, avList) {
  return rcList
    .map(rc => {
      const c = rc.criterio
      const rows = avList.flatMap(av => {
        const ac = (av.avaliacao_criterio ?? []).find(x => x.criterio_id === c.id)
        if (!ac) return []
        return [{
          avaliador: av.avaliador,
          nota:      ac.nota,
          convocar:  ac.nota < c.nota_maxima,
        }]
      })
      return { criterio: c, rows }
    })
    .sort((a, b) => (a.criterio?.ordem ?? 0) - (b.criterio?.ordem ?? 0))
}

export function ConvocacaoRecurso() {
  const [recursos,       setRecursos]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [selected,       setSelected]       = useState(null)
  const [convocacoes,    setConvocacoes]    = useState([])
  const [detailLoading,  setDetailLoading]  = useState(false)
  const [detailError,    setDetailError]    = useState(null)

  useEffect(() => { fetchRecursos() }, [])

  async function fetchRecursos() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('recurso')
      .select(`
        id, codigo_recurso, status, assinado_em, projeto_id,
        projeto:projeto_id(id, titulo),
        orientador:orientador_id(id, nome_completo),
        recurso_criterio(id)
      `)
      .eq('status', 'enviado')
      .order('assinado_em', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setRecursos(data ?? [])
    setLoading(false)
  }

  async function handleSelect(rec) {
    setSelected(rec)
    setConvocacoes([])
    setDetailError(null)
    setDetailLoading(true)

    const [{ data: rcList, error: e1 }, { data: avList, error: e2 }] = await Promise.all([
      supabase
        .from('recurso_criterio')
        .select('id, criterio:criterio_id(id, codigo, nome, nota_maxima, ordem)')
        .eq('recurso_id', rec.id),
      supabase
        .from('avaliacao')
        .select(`
          id,
          avaliador:avaliador_id(id, nome, email),
          avaliacao_criterio(criterio_id, nota)
        `)
        .eq('projeto_id', rec.projeto_id)
        .eq('status', 'concluida'),
    ])

    if (e1 || e2) { setDetailError((e1 ?? e2).message); setDetailLoading(false); return }
    setConvocacoes(computeConvocacoes(rcList ?? [], avList ?? []))
    setDetailLoading(false)
  }

  if (selected) {
    const totalConvocar      = convocacoes.reduce((acc, d) => acc + d.rows.filter(r => r.convocar).length, 0)
    const criteriosConvocar  = convocacoes.filter(d => d.rows.some(r => r.convocar)).length

    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1 -ml-1 mt-0.5 shrink-0">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {selected.codigo_recurso && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  {selected.codigo_recurso}
                </span>
              )}
              <h2 className="text-base font-semibold text-foreground leading-snug">
                {selected.projeto?.titulo ?? '—'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidato: {selected.orientador?.nome_completo ?? '—'}
              {selected.assinado_em && (
                <> · Enviado em {new Date(selected.assinado_em).toLocaleDateString('pt-BR')}</>
              )}
            </p>
          </div>
        </div>

        <ErrorAlert message={detailError} />

        {detailLoading ? <LoadingState /> : (
          <>
            <div className={`rounded-lg border px-4 py-3 ${
              totalConvocar > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              {totalConvocar > 0 ? (
                <p className="text-sm font-semibold text-yellow-800">
                  {totalConvocar} avaliador(es) precisam ser convocado(s) em {criteriosConvocar} critério(s)
                </p>
              ) : (
                <p className="text-sm font-semibold text-green-800">
                  Nenhum avaliador precisa ser convocado — todos já deram nota máxima nos critérios contestados.
                </p>
              )}
            </div>

            {convocacoes.length === 0 ? (
              <EmptyState message="Nenhum critério contestado encontrado para este recurso." />
            ) : (
              <div className="space-y-4">
                {convocacoes.map(({ criterio, rows }) => (
                  <Card key={criterio.id}>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {criterio.codigo && (
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            {criterio.codigo}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-foreground flex-1">{criterio.nome}</span>
                        <span className="text-xs text-muted-foreground">Nota máx.: {criterio.nota_maxima}</span>
                      </div>

                      {rows.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">
                          Nenhuma avaliação concluída registrada para este critério.
                        </p>
                      ) : (
                        <div className="rounded-md border divide-y divide-border">
                          {rows.map((row, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                              <p className="flex-1 text-sm text-foreground truncate">
                                {row.avaliador?.nome ?? row.avaliador?.email ?? `Avaliador ${i + 1}`}
                              </p>
                              <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
                                {row.nota} / {criterio.nota_maxima}
                              </span>
                              {row.convocar ? (
                                <Badge variant="warning" className="shrink-0 gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  CONVOCAR
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="shrink-0">
                                  Nota máxima
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button disabled className="gap-2 opacity-60">
                <UserCheck className="w-4 h-4" />
                Convocar avaliadores (em breve)
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="warning">
          {loading ? '…' : recursos.length} recurso(s) recebido(s)
        </Badge>
      </div>

      <ErrorAlert message={error} />

      {loading ? <LoadingState /> : recursos.length === 0 ? (
        <EmptyState message="Nenhum recurso recebido com status 'enviado' no momento." />
      ) : (
        <div className="space-y-3">
          {recursos.map(rec => (
            <Card key={rec.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {rec.codigo_recurso && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {rec.codigo_recurso}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-foreground truncate">
                        {rec.projeto?.titulo ?? '—'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Candidato: {rec.orientador?.nome_completo ?? '—'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{rec.recurso_criterio?.length ?? 0} critério(s) contestado(s)</span>
                      {rec.assinado_em && (
                        <span>Enviado em {new Date(rec.assinado_em).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleSelect(rec)} className="shrink-0 gap-1">
                    Analisar
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
