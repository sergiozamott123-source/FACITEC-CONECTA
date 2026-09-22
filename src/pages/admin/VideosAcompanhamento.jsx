import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { Badge } from '@/components/ui/badge'
import {
  listarCiclosVideo,
  statusVideoNoCiclo,
  formatarDataBR,
} from '@/lib/videoAcompanhamento'

const STATUS_INFO = {
  enviado:          { label: 'Enviado',          variant: 'success' },
  enviado_atrasado: { label: 'Enviado (atraso)', variant: 'warning' },
  atrasado:         { label: 'Atrasado',         variant: 'destructive' },
  pendente:         { label: 'Pendente',         variant: 'secondary' },
}

export function VideosAcompanhamento() {
  const { edicaoSelecionada } = useAdmin()

  const [ciclos, setCiclos] = useState([])
  const [orientadores, setOrientadores] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!edicaoSelecionada?.id) return
    carregar()
  }, [edicaoSelecionada?.id])

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const [ciclosData, { data: projetos, error: e1 }] = await Promise.all([
        listarCiclosVideo(edicaoSelecionada.id),
        supabase
          .from('projeto')
          .select('id, titulo, orientador:orientador_id(id, nome_completo, codigo_orientador)')
          .eq('edicao_id', edicaoSelecionada.id)
          .eq('status', 'selecionado'),
      ])
      if (e1) throw e1
      setCiclos(ciclosData)
      const listaOrientadores = (projetos ?? []).filter(p => p.orientador).map(p => ({ ...p.orientador, projeto: p.titulo }))
      setOrientadores(listaOrientadores)

      if (ciclosData.length) {
        const { data: videosData, error: e2 } = await supabase
          .from('video_acompanhamento')
          .select('*')
          .in('ciclo_id', ciclosData.map(c => c.id))
        if (e2) throw e2
        setVideos(videosData ?? [])
      } else {
        setVideos([])
      }
    } catch {
      setErro('Não foi possível carregar os vídeos de acompanhamento desta edição.')
    } finally {
      setLoading(false)
    }
  }

  const linhas = useMemo(() => {
    return orientadores.map(o => ({
      orientador: o,
      porCiclo: Object.fromEntries(ciclos.map(c => [
        c.id,
        videos.find(v => v.orientador_id === o.id && v.ciclo_id === c.id) ?? null,
      ])),
    }))
  }, [orientadores, videos, ciclos])

  const resumoPorCiclo = useMemo(() => {
    return Object.fromEntries(ciclos.map(ciclo => {
      const statuses = linhas.map(l => statusVideoNoCiclo(ciclo, l.porCiclo[ciclo.id]))
      return [ciclo.id, {
        enviados: statuses.filter(s => s === 'enviado' || s === 'enviado_atrasado').length,
        pendentes: statuses.filter(s => s === 'pendente').length,
        atrasados: statuses.filter(s => s === 'atrasado').length,
      }]
    }))
  }, [ciclos, linhas])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Vídeos de acompanhamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envio do link do vídeo de acompanhamento (3º e 5º mês) por cada equipe — Edital 01/2026, PIBIC Jr.
        </p>
      </div>

      {erro && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ciclos.map(ciclo => (
          <div key={ciclo.id} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {ciclo.rotulo} · prazo {formatarDataBR(ciclo.data_fechamento)}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> {resumoPorCiclo[ciclo.id]?.enviados ?? 0} enviados</span>
              <span className="inline-flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" /> {resumoPorCiclo[ciclo.id]?.pendentes ?? 0} pendentes</span>
              <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="w-3.5 h-3.5" /> {resumoPorCiclo[ciclo.id]?.atrasados ?? 0} atrasados</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Orientador</th>
              <th className="text-left font-medium px-4 py-2.5">Projeto</th>
              {ciclos.map(ciclo => (
                <th key={ciclo.id} className="text-left font-medium px-4 py-2.5">{ciclo.rotulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={2 + ciclos.length} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!loading && linhas.length === 0 && (
              <tr><td colSpan={2 + ciclos.length} className="px-4 py-6 text-center text-muted-foreground">Nenhum orientador com projeto selecionado nesta edição.</td></tr>
            )}
            {linhas.map(({ orientador, porCiclo }) => (
              <tr key={orientador.id} className="border-t border-border">
                <td className="px-4 py-2.5">{orientador.nome_completo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{orientador.projeto ?? '—'}</td>
                {ciclos.map(ciclo => {
                  const video = porCiclo[ciclo.id]
                  const status = statusVideoNoCiclo(ciclo, video)
                  return (
                    <td key={ciclo.id} className="px-4 py-2.5">
                      <Badge variant={STATUS_INFO[status].variant}>{STATUS_INFO[status].label}</Badge>
                      {video?.link_youtube && (
                        <a
                          href={video.link_youtube}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline align-middle"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
