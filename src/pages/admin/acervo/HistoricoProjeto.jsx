import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const TIPO_DOC = { recurso_interposto: 'Recurso interposto', resposta_recurso: 'Resposta ao recurso' }

// Histórico somente-leitura de avaliação e recurso de um projeto — carregado
// só quando a linha é expandida (não pré-carrega tudo de uma vez), ver
// AcervoProjetos.jsx.
export function HistoricoProjeto({ projetoId }) {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      setLoading(true)
      setError(null)
      try {
        const [{ data: avs, error: e1 }, { data: recs, error: e2 }] = await Promise.all([
          supabase
            .from('avaliacao')
            .select(`
              id, nota_total, parecer, status,
              avaliador:avaliador_id ( id, nome ),
              avaliacao_criterio ( id, nota, justificativa, criterio:criterio_id ( id, nome, nota_maxima ) )
            `)
            .eq('projeto_id', projetoId),
          supabase
            .from('recurso')
            .select(`
              id, texto, status, resposta, respondido_em,
              recurso_criterio ( id, fundamentacao, decisao_final, nota_aplicada, votos_sim, votos_nao, criterio:criterio_id ( id, nome ) ),
              recurso_documento ( id, tipo, nome_arquivo, url )
            `)
            .eq('projeto_id', projetoId),
        ])
        if (e1) throw e1
        if (e2) throw e2
        if (!cancelado) {
          setAvaliacoes(avs ?? [])
          setRecursos(recs ?? [])
        }
      } catch (err) {
        if (!cancelado) setError(err.message ?? 'Erro ao carregar histórico.')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => { cancelado = true }
  }, [projetoId])

  if (loading) return <p className="text-xs text-muted-foreground py-3">Carregando histórico…</p>
  if (error) return <p className="text-xs text-destructive py-3">{error}</p>
  if (avaliacoes.length === 0 && recursos.length === 0) {
    return <p className="text-xs text-muted-foreground italic py-3">Nenhum histórico de avaliação/recurso registrado.</p>
  }

  return (
    <div className="space-y-4 py-3">
      {avaliacoes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliações</p>
          <div className="space-y-2">
            {avaliacoes.map((av) => (
              <div key={av.id} className="rounded-md border border-border px-3 py-2 bg-muted/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{av.avaliador?.nome ?? '—'}</span>
                  <span className="text-xs font-semibold text-foreground">Nota total: {av.nota_total ?? '—'}</span>
                </div>
                {av.parecer && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{av.parecer}</p>}
                {(av.avaliacao_criterio ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {av.avaliacao_criterio.map((ac) => (
                      <li key={ac.id} className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{ac.criterio?.nome ?? '—'}</span>
                        {': '}{ac.nota ?? '—'} / {ac.criterio?.nota_maxima ?? '—'}
                        {ac.justificativa && <span className="block italic mt-0.5">{ac.justificativa}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recursos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recursos</p>
          <div className="space-y-2">
            {recursos.map((rec) => (
              <div key={rec.id} className="rounded-md border border-border px-3 py-2 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground capitalize">{rec.status ?? '—'}</span>
                  {rec.respondido_em && (
                    <span className="text-xs text-muted-foreground">
                      Respondido em {new Date(rec.respondido_em).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                {rec.texto && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{rec.texto}</p>}
                {rec.resposta && (
                  <p className="text-xs text-foreground whitespace-pre-wrap"><strong>Resposta:</strong> {rec.resposta}</p>
                )}
                {(rec.recurso_criterio ?? []).length > 0 && (
                  <ul className="space-y-1">
                    {rec.recurso_criterio.map((rc) => (
                      <li key={rc.id} className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{rc.criterio?.nome ?? '—'}</span>
                        {' — '}{rc.decisao_final ?? 'pendente'}
                        {rc.nota_aplicada != null && ` (nota aplicada: ${rc.nota_aplicada})`}
                        {' · '}{rc.votos_sim ?? 0} sim / {rc.votos_nao ?? 0} não
                        {rc.fundamentacao && <span className="block italic mt-0.5">{rc.fundamentacao}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {(rec.recurso_documento ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {rec.recurso_documento.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="w-3 h-3" /> Ver PDF ({TIPO_DOC[doc.tipo] ?? doc.tipo})
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
