import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, FileText, RefreshCw, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { ErrorAlert, LoadingState } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'

export function PainelConsolidadoRecurso() {
  const { recursoId } = useParams()
  const navigate = useNavigate()

  const [recurso,        setRecurso]        = useState(null)
  const [convocacao,     setConvocacao]     = useState(null)
  const [notasOriginais, setNotasOriginais] = useState({})
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [modalJust,      setModalJust]      = useState(null)

  useEffect(() => { fetchDados() }, [recursoId])

  async function fetchDados() {
    setLoading(true)
    setError(null)

    const [{ data: rec, error: e1 }, { data: conv, error: e2 }] = await Promise.all([
      supabase
        .from('recurso')
        .select(`
          id, codigo_recurso, projeto_id,
          projeto:projeto_id(id, titulo),
          orientador:orientador_id(id, nome_completo)
        `)
        .eq('id', recursoId)
        .single(),
      supabase
        .from('convocacao')
        .select(`
          id,
          convocacao_criterio(
            id, criterio_id, avaliador_id,
            status, resposta, nova_nota, justificativa, respondido_em,
            avaliador:avaliador_id(id, nome, email),
            criterio:criterio_id(id, codigo, nome)
          )
        `)
        .eq('recurso_id', recursoId)
        .maybeSingle(),
    ])

    if (e1) { setError(e1.message); setLoading(false); return }

    setRecurso(rec)
    setConvocacao(conv ?? null)

    if (rec && conv?.convocacao_criterio?.length) {
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
      setNotasOriginais(map)
    }

    setLoading(false)
  }

  function handlePDF() {
    const ccs = convocacao?.convocacao_criterio ?? []
    const linhas = ccs.map(cc => {
      const notaOrig  = notasOriginais[`${cc.avaliador_id}:${cc.criterio_id}`] ?? '—'
      const nome      = cc.avaliador?.nome ?? cc.avaliador?.email ?? '—'
      const criterio  = [cc.criterio?.codigo, cc.criterio?.nome].filter(Boolean).join(' — ')
      const resposta  = cc.status === 'respondido'
        ? cc.resposta === 'sim'
          ? `Sim — alterou para ${cc.nova_nota}`
          : 'Não — manteve nota'
        : 'Aguardando resposta'

      return `
        <tr>
          <td>${nome}</td>
          <td>${criterio}</td>
          <td style="text-align:center">${notaOrig}</td>
          <td>${resposta}</td>
          <td style="white-space:pre-wrap">${cc.justificativa ?? '—'}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Relatório — ${recurso?.codigo_recurso ?? 'Recurso'}</title>
<style>
  body{font-family:Arial,sans-serif;padding:2rem;font-size:12px;color:#111}
  h1{font-size:15px;margin:0 0 4px}
  .sub{font-size:12px;color:#555;margin:0 0 1.5rem}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th{background:#f0f0f0;text-align:left;padding:6px 8px;border:1px solid #ccc}
  td{padding:6px 8px;border:1px solid #ccc;vertical-align:top}
  .meta{font-size:11px;color:#777;margin-bottom:1rem}
</style></head><body>
<h1>Relatório de Convocação — ${recurso?.codigo_recurso ?? ''}</h1>
<p class="sub">Projeto: ${recurso?.projeto?.titulo ?? '—'} · Candidato: ${recurso?.orientador?.nome_completo ?? '—'}</p>
<p class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
<table>
  <thead><tr>
    <th>Avaliador</th><th>Critério</th>
    <th>Nota orig.</th><th>Resposta</th><th>Justificativa</th>
  </tr></thead>
  <tbody>${linhas}</tbody>
</table>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorAlert message={error} />
  if (!recurso) return <ErrorAlert message="Recurso não encontrado." />

  const ccs             = convocacao?.convocacao_criterio ?? []
  const total           = ccs.length
  const respondidos     = ccs.filter(cc => cc.status === 'respondido').length
  const todosResponderam = total > 0 && respondidos === total
  const pct             = total > 0 ? Math.round((respondidos / total) * 100) : 0

  const statusLabel  = todosResponderam ? 'Aguardando decisão' : 'Em andamento'
  const statusClass  = todosResponderam
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-yellow-50 text-yellow-700 border-yellow-200'

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost" size="sm"
          onClick={() => navigate('/recursos')}
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
            <span className={`text-xs font-semibold border px-2 py-0.5 rounded ${statusClass}`}>
              {statusLabel}
            </span>
            <Button
              variant="ghost" size="sm"
              onClick={fetchDados}
              className="gap-1 h-6 text-xs ml-auto"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </Button>
          </div>
          <h2 className="text-base font-semibold text-foreground mt-1 leading-snug">
            {recurso.projeto?.titulo ?? '—'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Candidato: {recurso.orientador?.nome_completo ?? '—'}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Respostas recebidas</span>
              <span className="font-bold text-foreground">{respondidos} / {total}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {todosResponderam
                ? 'Todos os convocados responderam.'
                : `${total - respondidos} avaliador(es) ainda não respondeu(ram).`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid de avaliadores */}
      {ccs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          Nenhuma convocação registrada para este recurso ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ccs.map(cc => {
            const notaOrig  = notasOriginais[`${cc.avaliador_id}:${cc.criterio_id}`] ?? null
            const respondeu = cc.status === 'respondido'
            const alterou   = respondeu && cc.resposta === 'sim'
            const nome      = cc.avaliador?.nome ?? cc.avaliador?.email ?? '—'

            return (
              <Card key={cc.id} className={respondeu ? 'border-green-200' : ''}>
                <CardContent className="pt-4 pb-4 space-y-2">

                  {/* Nome + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cc.criterio?.codigo && (
                          <span className="font-bold text-blue-700 mr-1">{cc.criterio.codigo}</span>
                        )}
                        {cc.criterio?.nome}
                      </p>
                    </div>
                    {respondeu ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded shrink-0">
                        <Check className="w-3 h-3" />
                        {alterou ? 'Alterou nota' : 'Manteve nota'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                        <Clock className="w-3 h-3" />
                        Pendente
                      </span>
                    )}
                  </div>

                  {/* Notas */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>
                      Nota original:{' '}
                      <strong className="text-foreground">{notaOrig ?? '—'}</strong>
                    </span>
                    {alterou && cc.nova_nota !== null && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span>
                          Nova nota:{' '}
                          <strong className="text-blue-700">{cc.nova_nota}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Justificativa */}
                  {cc.justificativa && (
                    <div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {cc.justificativa}
                      </p>
                      <button
                        onClick={() => setModalJust({ nome, criterio: cc.criterio, texto: cc.justificativa })}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        Ver completo
                      </button>
                    </div>
                  )}

                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button variant="outline" onClick={handlePDF} className="gap-2">
          <FileText className="w-4 h-4" />
          PDF consolidado
        </Button>

        <span title={!todosResponderam ? 'Disponível quando todos os convocados responderem' : undefined}>
          <Button
            disabled={!todosResponderam}
            onClick={() => navigate(`/recursos/${recursoId}/decisao`)}
            className="gap-2"
          >
            <Scale className="w-4 h-4" />
            Gerar decisão final
          </Button>
        </span>
      </div>

      {/* Modal — justificativa completa */}
      <Modal
        open={!!modalJust}
        onClose={() => setModalJust(null)}
        title={modalJust ? `Justificativa — ${modalJust.nome}` : ''}
        size="md"
      >
        {modalJust && (
          <div className="space-y-2">
            {modalJust.criterio && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {[modalJust.criterio.codigo, modalJust.criterio.nome].filter(Boolean).join(' — ')}
              </p>
            )}
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {modalJust.texto}
            </p>
          </div>
        )}
      </Modal>

    </div>
  )
}
