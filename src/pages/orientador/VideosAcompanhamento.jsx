import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ExternalLink, Loader2, PlayCircle } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { BannerRelatorioMensal } from '@/components/orientador/BannerRelatorioMensal'
import {
  listarCiclosVideo,
  listarVideosDoOrientador,
  salvarLinkVideo,
  statusVideoNoCiclo,
  calcularBannerVideos,
  formatarDataBR,
  linkYoutubeValido,
} from '@/lib/videoAcompanhamento'

const STATUS_INFO = {
  enviado:          { label: 'Enviado',          className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  enviado_atrasado: { label: 'Enviado (atraso)', className: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: CheckCircle2 },
  atrasado:         { label: 'Atrasado',         className: 'bg-red-50 text-red-700 border-red-200',             Icon: AlertTriangle },
  pendente:         { label: 'Pendente',         className: 'bg-slate-100 text-slate-600 border-slate-200',      Icon: Clock },
}

function CicloCard({ ciclo, video, onSalvar }) {
  const [link, setLink] = useState(video?.link_youtube ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    setLink(video?.link_youtube ?? '')
  }, [video?.link_youtube])

  const status = statusVideoNoCiclo(ciclo, video)
  const { label, className, Icon } = STATUS_INFO[status]

  async function handleSalvar() {
    setErro(null)
    setOk(false)
    if (!linkYoutubeValido(link)) {
      setErro('Cole um link válido do YouTube (ex.: https://youtu.be/... ou https://www.youtube.com/watch?v=...).')
      return
    }
    setSalvando(true)
    try {
      await onSalvar(ciclo.id, link)
      setOk(true)
    } catch {
      setErro('Não foi possível salvar o link agora. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{ciclo.rotulo}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Prazo: até {formatarDataBR(ciclo.data_fechamento)}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0 ${className}`}>
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <PlayCircle className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            value={link}
            onChange={(e) => { setLink(e.target.value); setErro(null); setOk(false) }}
            placeholder="https://youtu.be/..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando || !link.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#16304f] disabled:opacity-50 transition-colors"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {video?.link_youtube ? 'Atualizar' : 'Salvar'}
        </button>
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {ok && !erro && <p className="text-xs text-emerald-600">Link salvo.</p>}

      {video?.link_youtube && (
        <a
          href={video.link_youtube}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          Abrir vídeo enviado <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}

export function VideosAcompanhamento() {
  const { orientador, projeto } = usePortalOrientador()
  const [loading, setLoading] = useState(true)
  const [ciclos, setCiclos] = useState([])
  const [videos, setVideos] = useState([])
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!orientador?.id || !projeto?.edicao_id) { setLoading(false); return }
    carregar()
  }, [orientador?.id, projeto?.edicao_id])

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const [ciclosData, videosData] = await Promise.all([
        listarCiclosVideo(projeto.edicao_id),
        listarVideosDoOrientador(orientador.id),
      ])
      setCiclos(ciclosData)
      setVideos(videosData)
    } catch {
      setErro('Não foi possível carregar os vídeos de acompanhamento.')
    } finally {
      setLoading(false)
    }
  }

  const videosPorCicloId = useMemo(
    () => Object.fromEntries(videos.map(v => [v.ciclo_id, v])),
    [videos]
  )

  const banner = useMemo(
    () => calcularBannerVideos(ciclos, videosPorCicloId),
    [ciclos, videosPorCicloId]
  )

  async function handleSalvar(cicloId, link) {
    const salvo = await salvarLinkVideo({ orientadorId: orientador.id, cicloId, linkYoutube: link })
    setVideos(prev => {
      const outros = prev.filter(v => v.ciclo_id !== cicloId)
      return [...outros, salvo]
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <OrientadorSidebar />
        <main className="flex-1 ml-[200px] p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <OrientadorSidebar />
      <main className="flex-1 ml-[200px] p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vídeos de Acompanhamento</h1>
          <p className="text-sm text-slate-500 mt-1">
            Exigência do Edital 01/2026 — envie o link do vídeo (publicado como "não listado" no YouTube) até o prazo de cada entrega.
          </p>
        </div>

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>
        )}

        <BannerRelatorioMensal banner={banner} />

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Lembretes do roteiro</h2>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
            <li>Duração entre 3 e 10 minutos, com edição básica (cortes, imagem clara do projeto e da equipe, áudio compreensível).</li>
            <li>Não mostrar rostos de pessoas fora da equipe — use o efeito "blur" quando necessário.</li>
            <li>Estrutura: abertura com histórico do orientador, apresentação do projeto pelos bolsistas, e encerramento com depoimentos e toda a equipe reunida.</li>
            <li>Publique como "não listado" no YouTube — assim só quem tem o link consegue assistir.</li>
          </ul>
        </div>

        <div className="space-y-4">
          {ciclos.map(ciclo => (
            <CicloCard key={ciclo.id} ciclo={ciclo} video={videosPorCicloId[ciclo.id]} onSalvar={handleSalvar} />
          ))}
          {!ciclos.length && (
            <p className="text-sm text-slate-500">Nenhum prazo de vídeo cadastrado para esta edição ainda.</p>
          )}
        </div>
      </main>
    </div>
  )
}
