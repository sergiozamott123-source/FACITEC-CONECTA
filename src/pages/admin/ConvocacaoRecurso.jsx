import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, ChevronUp, Loader2, UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'

function buildCriterioGroups(rcList, avList) {
  return rcList
    .map(rc => {
      const c = rc.criterio
      const grupoA = []
      const grupoB = []
      avList.forEach(av => {
        const ac = (av.avaliacao_criterio ?? []).find(x => x.criterio_id === c.id)
        if (!ac) return
        if (ac.nota < c.nota_maxima) grupoA.push({ avaliador: av.avaliador, nota: ac.nota })
        else                         grupoB.push({ avaliador: av.avaliador, nota: ac.nota })
      })
      return { criterio: c, grupoA, grupoB }
    })
    .sort((a, b) => (a.criterio?.ordem ?? 0) - (b.criterio?.ordem ?? 0))
}

export function ConvocacaoRecurso() {
  const [recursos,        setRecursos]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [selected,        setSelected]        = useState(null)
  const [grupos,          setGrupos]          = useState([])
  const [detailLoading,   setDetailLoading]   = useState(false)
  const [detailError,     setDetailError]     = useState(null)
  const [convocacaoId,    setConvocacaoId]    = useState(null)
  const [convocados,      setConvocados]      = useState(new Set())
  const [convocando,      setConvocando]      = useState(new Set())
  const [convocarError,   setConvocarError]   = useState(null)
  const [gruposBExpanded, setGruposBExpanded] = useState(new Set())

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
    setGrupos([])
    setDetailError(null)
    setDetailLoading(true)
    setConvocacaoId(null)
    setConvocados(new Set())
    setConvocando(new Set())
    setConvocarError(null)
    setGruposBExpanded(new Set())

    const [
      { data: rcList,   error: e1 },
      { data: avList,   error: e2 },
      { data: convData, error: e3 },
    ] = await Promise.all([
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
      supabase
        .from('convocacao')
        .select('id, convocacao_criterio(criterio_id, avaliador_id)')
        .eq('recurso_id', rec.id)
        .maybeSingle(),
    ])

    if (e1 || e2 || e3) {
      setDetailError((e1 ?? e2 ?? e3).message)
      setDetailLoading(false)
      return
    }

    if (convData) {
      setConvocacaoId(convData.id)
      setConvocados(new Set(
        (convData.convocacao_criterio ?? []).map(r => `${r.criterio_id}:${r.avaliador_id}`)
      ))
    }

    setGrupos(buildCriterioGroups(rcList ?? [], avList ?? []))
    setDetailLoading(false)
  }

  async function handleConvocar(criterioId, avaliadorId) {
    const key = `${criterioId}:${avaliadorId}`
    setConvocando(prev => new Set([...prev, key]))
    setConvocarError(null)

    try {
      let cid = convocacaoId

      if (!cid) {
        const { data: existing } = await supabase
          .from('convocacao')
          .select('id')
          .eq('recurso_id', selected.id)
          .maybeSingle()

        if (existing) {
          cid = existing.id
        } else {
          const { data: created, error: errC } = await supabase
            .from('convocacao')
            .insert({ recurso_id: selected.id })
            .select('id')
            .single()
          if (errC) throw new Error('Erro ao criar convocação: ' + errC.message)
          cid = created.id
        }
        setConvocacaoId(cid)
      }

      const { error: errI } = await supabase
        .from('convocacao_criterio')
        .insert({ convocacao_id: cid, criterio_id: criterioId, avaliador_id: avaliadorId, status: 'convocado' })

      if (errI && errI.code !== '23505') {
        throw new Error('Erro ao registrar convocação: ' + errI.message)
      }

      setConvocados(prev => new Set([...prev, key]))
    } catch (err) {
      setConvocarError(err.message)
    } finally {
      setConvocando(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  function toggleGrupoB(criterioId) {
    setGruposBExpanded(prev => {
      const s = new Set(prev)
      s.has(criterioId) ? s.delete(criterioId) : s.add(criterioId)
      return s
    })
  }

  function renderBotaoConvocar(criterioId, avaliadorId) {
    const key = `${criterioId}:${avaliadorId}`
    if (convocados.has(key)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded shrink-0">
          <Check className="w-3 h-3" />
          Convocado
        </span>
      )
    }
    const busy = convocando.has(key)
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() => handleConvocar(criterioId, avaliadorId)}
        className="shrink-0 gap-1 h-7 text-xs"
      >
        {busy
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <UserCheck className="w-3 h-3" />}
        {busy ? 'Salvando…' : 'Convocar'}
      </Button>
    )
  }

  function renderLinhaAvaliador(row, i, criterio) {
    return (
      <div key={row.avaliador?.id ?? i} className="flex items-center gap-3 px-3 py-2.5">
        <p className="flex-1 text-sm text-foreground truncate">
          {row.avaliador?.nome ?? row.avaliador?.email ?? `Avaliador ${i + 1}`}
        </p>
        <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
          {row.nota} / {criterio.nota_maxima}
        </span>
        {renderBotaoConvocar(criterio.id, row.avaliador?.id)}
      </div>
    )
  }

  if (selected) {
    const totalGrupoA      = grupos.reduce((s, g) => s + g.grupoA.length, 0)
    const criteriosComA    = grupos.filter(g => g.grupoA.length > 0).length

    return (
      <div className="space-y-6">
        {/* Cabeçalho */}
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
        {convocarError && <ErrorAlert message={convocarError} />}

        {detailLoading ? <LoadingState /> : (
          <>
            {/* Banner resumo */}
            <div className={`rounded-lg border px-4 py-3 ${totalGrupoA > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              {totalGrupoA > 0 ? (
                <p className="text-sm font-semibold text-yellow-800">
                  {totalGrupoA} avaliador(es) a convocar em {criteriosComA} critério(s)
                </p>
              ) : (
                <p className="text-sm font-semibold text-green-800">
                  Todos os avaliadores deram nota máxima nos critérios contestados.
                </p>
              )}
            </div>

            {grupos.length === 0 ? (
              <EmptyState message="Nenhum critério contestado encontrado para este recurso." />
            ) : (
              <div className="space-y-4">
                {grupos.map(({ criterio, grupoA, grupoB }) => {
                  const aSemNota = grupoA.length === 0
                  const aPar     = !aSemNota && grupoA.length % 2 === 0
                  const bExpanded = gruposBExpanded.has(criterio.id)

                  return (
                    <Card key={criterio.id}>
                      <CardContent className="pt-4 pb-4 space-y-3">
                        {/* Cabeçalho do critério */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {criterio.codigo && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              {criterio.codigo}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-foreground flex-1">{criterio.nome}</span>
                          <span className="text-xs text-muted-foreground">Nota máx.: {criterio.nota_maxima}</span>
                        </div>

                        {aSemNota ? (
                          <>
                            <p className="text-xs text-muted-foreground italic px-1">
                              Todos os avaliadores deram nota máxima neste critério.
                            </p>
                            {grupoB.length > 0 && (
                              <div className="rounded-md border divide-y divide-border">
                                {grupoB.map((row, i) => renderLinhaAvaliador(row, i, criterio))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Aviso de paridade */}
                            {aPar && (
                              <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                                <span className="font-semibold">Número par de avaliadores ({grupoA.length})</span>
                                {' '}— selecione mais 1 avaliador com nota máxima para compor a banca com número ímpar.
                              </div>
                            )}

                            {/* Grupo A */}
                            <div className="rounded-md border divide-y divide-border">
                              {grupoA.map((row, i) => renderLinhaAvaliador(row, i, criterio))}
                            </div>

                            {/* Grupo B colapsável (só quando A é par) */}
                            {aPar && grupoB.length > 0 && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => toggleGrupoB(criterio.id)}
                                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {bExpanded
                                    ? <ChevronUp className="w-3.5 h-3.5" />
                                    : <ChevronDown className="w-3.5 h-3.5" />}
                                  {bExpanded ? 'Ocultar' : 'Ver'} avaliadores com nota máxima ({grupoB.length})
                                </button>
                                {bExpanded && (
                                  <div className="rounded-md border divide-y divide-border">
                                    {grupoB.map((row, i) => renderLinhaAvaliador(row, i, criterio))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
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

  // Vista de lista de recursos
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
