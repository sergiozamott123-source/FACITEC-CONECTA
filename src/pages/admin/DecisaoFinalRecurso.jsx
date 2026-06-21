import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'

function arredonda(n) {
  return Math.round(n * 100) / 100
}

function buildCriterios(rcList, ccAll, notaMap) {
  return [...rcList]
    .sort((a, b) => (a.criterio?.ordem ?? 0) - (b.criterio?.ordem ?? 0))
    .map(rc => {
      const ccList     = ccAll.filter(cc => cc.criterio_id === rc.criterio_id)
      const pendentes  = ccList.filter(cc => cc.status === 'convocado')
      const simVoters  = ccList.filter(cc => cc.status === 'respondido' && cc.resposta === 'sim')
      const naoVoters  = ccList.filter(cc => cc.status === 'respondido' && cc.resposta === 'nao')
      const votos_sim  = simVoters.length
      const votos_nao  = naoVoters.length
      const decisao    = votos_sim > votos_nao ? 'alterada' : 'mantida'
      const nota_calculada = decisao === 'alterada' && simVoters.length > 0
        ? arredonda(simVoters.reduce((s, cc) => s + (cc.nova_nota ?? 0), 0) / simVoters.length)
        : null

      return {
        rcId: rc.id,
        criterio: rc.criterio,
        ccList,
        pendentes,
        simVoters,
        naoVoters,
        votos_sim,
        votos_nao,
        decisao,
        nota_calculada,
      }
    })
}

export function DecisaoFinalRecurso() {
  const { recursoId } = useParams()
  const navigate      = useNavigate()

  const [recurso,     setRecurso]     = useState(null)
  const [criterios,   setCriterios]   = useState([])
  const [notaMap,     setNotaMap]     = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [confirming,  setConfirming]  = useState(false)
  const [salvando,    setSalvando]    = useState(false)
  const [actionError, setActionError] = useState(null)
  const [sucesso,     setSucesso]     = useState(false)
  const [resumo,      setResumo]      = useState([])

  useEffect(() => { fetchDados() }, [recursoId])

  async function fetchDados() {
    setLoading(true)
    setError(null)

    const [
      { data: rec,    error: e1 },
      { data: rcList, error: e2 },
      { data: conv,   error: e3 },
    ] = await Promise.all([
      supabase
        .from('recurso')
        .select(`
          id, codigo_recurso, status, projeto_id,
          projeto:projeto_id(id, titulo),
          orientador:orientador_id(id, nome_completo)
        `)
        .eq('id', recursoId)
        .single(),
      supabase
        .from('recurso_criterio')
        .select('id, criterio_id, criterio:criterio_id(id, codigo, nome, nota_maxima, ordem)')
        .eq('recurso_id', recursoId),
      supabase
        .from('convocacao')
        .select(`
          id,
          convocacao_criterio(
            id, criterio_id, avaliador_id,
            status, resposta, nova_nota, justificativa, respondido_em,
            avaliador:avaliador_id(id, nome, email)
          )
        `)
        .eq('recurso_id', recursoId)
        .maybeSingle(),
    ])

    if (e1 || e2) { setError((e1 ?? e2).message); setLoading(false); return }

    const { data: avs } = await supabase
      .from('avaliacao')
      .select('avaliador_id, avaliacao_criterio(criterio_id, nota)')
      .eq('projeto_id', rec.projeto_id)
      .eq('status', 'concluida')

    const map = {}
    ;(avs ?? []).forEach(av => {
      ;(av.avaliacao_criterio ?? []).forEach(ac => {
        map[`${av.avaliador_id}:${ac.criterio_id}`] = ac.nota
      })
    })

    setRecurso(rec)
    setNotaMap(map)
    setCriterios(buildCriterios(rcList ?? [], conv?.convocacao_criterio ?? [], map))
    setLoading(false)
  }

  const hasPendentes   = criterios.some(c => c.pendentes.length > 0)
  const podeConfirmar  = !hasPendentes && criterios.length > 0

  async function handleConfirmar() {
    setSalvando(true)
    setActionError(null)
    setConfirming(false)

    try {
      const now = new Date().toISOString()

      for (const crit of criterios) {
        // 1. Gravar decisão em recurso_criterio
        const { error: errRC } = await supabase
          .from('recurso_criterio')
          .update({
            decisao_final: crit.decisao,
            votos_sim:     crit.votos_sim,
            votos_nao:     crit.votos_nao,
            nota_aplicada: crit.nota_calculada,
            decidido_em:   now,
          })
          .eq('id', crit.rcId)
        if (errRC) throw new Error(`Erro ao gravar decisão (${crit.criterio?.codigo}): ${errRC.message}`)

        // 2. Se alterada: atualizar avaliacao_criterio dos que votaram 'sim'
        if (crit.decisao === 'alterada' && crit.simVoters.length > 0) {
          const avaliadorIds = crit.simVoters.map(cc => cc.avaliador_id)

          const { data: avaliacoes, error: errAv } = await supabase
            .from('avaliacao')
            .select('id, avaliador_id')
            .eq('projeto_id', recurso.projeto_id)
            .in('avaliador_id', avaliadorIds)
          if (errAv) throw new Error(`Erro ao buscar avaliações: ${errAv.message}`)

          for (const av of (avaliacoes ?? [])) {
            const { error: errAC } = await supabase
              .from('avaliacao_criterio')
              .update({ nota: crit.nota_calculada, alterado_em_recurso: true })
              .eq('avaliacao_id', av.id)
              .eq('criterio_id', crit.criterio.id)
            if (errAC) throw new Error(`Erro ao atualizar nota: ${errAC.message}`)
          }
        }
      }

      // 3. Encerrar recurso — deferido se ao menos um critério foi alterado
      const statusFinal = criterios.some(c => c.decisao === 'alterada') ? 'deferido' : 'indeferido'
      const { error: errRec } = await supabase
        .from('recurso')
        .update({ status: statusFinal })
        .eq('id', recursoId)
      if (errRec) throw new Error(`Erro ao encerrar recurso: ${errRec.message}`)

      setResumo(criterios.map(c => ({
        criterio:       c.criterio,
        decisao:        c.decisao,
        nota_calculada: c.nota_calculada,
        votos_sim:      c.votos_sim,
        votos_nao:      c.votos_nao,
      })))
      setSucesso(true)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // ─── Tela de sucesso ──────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center py-8 space-y-3">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
          <h2 className="text-lg font-bold text-foreground">Decisão final registrada!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            O recurso foi concluído e as notas foram atualizadas conforme a deliberação.
          </p>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Resumo da decisão
            </p>
            {resumo.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {r.criterio?.codigo && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                      {r.criterio.codigo}
                    </span>
                  )}
                  <span className="text-sm text-foreground truncate">{r.criterio?.nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.votos_sim}S · {r.votos_nao}N
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                    r.decisao === 'alterada'
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : 'text-gray-600 bg-gray-50 border-gray-200'
                  }`}>
                    {r.decisao === 'alterada'
                      ? `Alterada → ${r.nota_calculada?.toFixed(2)}`
                      : 'Mantida'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => navigate('/recursos')}>
            Voltar à lista de recursos
          </Button>
        </div>
      </div>
    )
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return <LoadingState />
  if (error)   return <ErrorAlert message={error} />
  if (!recurso) return <ErrorAlert message="Recurso não encontrado." />

  // ─── Tela principal ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate(`/recursos/${recursoId}/painel`)}
          className="gap-1 -ml-1 mt-0.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {recurso.codigo_recurso && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {recurso.codigo_recurso}
              </span>
            )}
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
              Decisão final
            </span>
          </div>
          <h2 className="text-base font-semibold text-foreground mt-1 leading-snug">
            {recurso.projeto?.titulo ?? '—'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Candidato: {recurso.orientador?.nome_completo ?? '—'}
          </p>
        </div>
      </div>

      {/* Aviso de pendências */}
      {hasPendentes && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Aguardando resposta de todos os avaliadores.</span>
            {' '}A decisão final só poderá ser confirmada quando todos os convocados tiverem respondido.
          </p>
        </div>
      )}

      {/* Cards por critério */}
      <div className="space-y-4">
        {criterios.map(crit => {
          const { criterio, ccList, pendentes, simVoters, votos_sim, votos_nao, decisao, nota_calculada } = crit
          const alterada = decisao === 'alterada'
          const notaOrigSim = simVoters.length > 0
            ? arredonda(simVoters.reduce((s, cc) => s + (notaMap[`${cc.avaliador_id}:${cc.criterio_id}`] ?? 0), 0) / simVoters.length)
            : null

          return (
            <Card key={criterio?.id}>
              <CardContent className="pt-4 pb-4 space-y-4">

                {/* Cabeçalho do critério */}
                <div className="flex items-center gap-2 flex-wrap">
                  {criterio?.codigo && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {criterio.codigo}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {criterio?.nome}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Nota máx.: {criterio?.nota_maxima}
                  </span>
                </div>

                {/* Lista de votos */}
                {ccList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    Nenhum avaliador convocado para este critério.
                  </p>
                ) : (
                  <div className="rounded-md border divide-y divide-border">
                    {ccList.map((cc, i) => {
                      const nome      = cc.avaliador?.nome ?? cc.avaliador?.email ?? `Avaliador ${i + 1}`
                      const notaOrig  = notaMap[`${cc.avaliador_id}:${cc.criterio_id}`] ?? null
                      const respondeu = cc.status === 'respondido'
                      const votouSim  = respondeu && cc.resposta === 'sim'

                      return (
                        <div key={cc.id} className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
                          <p className="flex-1 text-sm text-foreground min-w-0 truncate">{nome}</p>
                          {notaOrig !== null && (
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              orig: {notaOrig}
                            </span>
                          )}
                          {!respondeu ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                          ) : votouSim ? (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                              SIM → {cc.nova_nota}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded shrink-0">
                              NÃO
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Contagem + badge de resultado */}
                {(votos_sim + votos_nao) > 0 && pendentes.length === 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-blue-700">{votos_sim} voto{votos_sim !== 1 ? 's' : ''} SIM</strong>
                      {' · '}
                      <strong className="text-gray-600">{votos_nao} voto{votos_nao !== 1 ? 's' : ''} NÃO</strong>
                    </span>
                    <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${
                      alterada
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-gray-600 bg-gray-100 border-gray-300'
                    }`}>
                      {alterada ? 'Maioria: alterar nota' : 'Maioria: manter nota'}
                    </span>
                  </div>
                )}

                {/* Nota original vs nota final */}
                {alterada && nota_calculada !== null && (
                  <div className="flex items-center gap-6 rounded-lg bg-blue-50 border border-blue-200 px-5 py-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Nota original</p>
                      <p className="text-2xl font-bold text-gray-500">
                        {notaOrigSim !== null ? notaOrigSim.toFixed(2) : '—'}
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground">→</div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Nota final aplicada</p>
                      <p className="text-2xl font-bold text-blue-700">{nota_calculada.toFixed(2)}</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )
        })}
      </div>

      <ErrorAlert message={actionError} />

      {/* Botão confirmar */}
      <div className="flex justify-end pt-2 border-t border-border">
        <span title={hasPendentes ? 'Aguardando resposta de todos os avaliadores' : undefined}>
          <Button
            disabled={!podeConfirmar || salvando}
            onClick={() => setConfirming(true)}
            className="gap-2"
          >
            {salvando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Scale className="w-4 h-4" />}
            {salvando ? 'Salvando…' : 'Confirmar decisão final'}
          </Button>
        </span>
      </div>

      {/* Modal de confirmação */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirmar decisão final"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Esta ação é <strong>irreversível</strong>. As notas dos avaliadores serão
              atualizadas no banco conforme a deliberação e o recurso será encerrado.
            </p>
          </div>
          <p className="text-sm text-foreground">
            Deseja confirmar a decisão final para este recurso?
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} className="gap-2">
              <Scale className="w-4 h-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
