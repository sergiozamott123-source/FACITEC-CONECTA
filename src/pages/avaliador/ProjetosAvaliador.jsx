import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, LogOut, ChevronRight } from 'lucide-react'
import { useAvaliador } from '@/contexts/AvaliadorContext'
import { supabase } from '@/lib/supabase'

const STATUS_CONFIG = {
  pendente:     { label: 'Pendente',  classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  em_andamento: { label: 'Rascunho', classes: 'bg-blue-50  text-blue-700  border-blue-200'  },
  concluida:    { label: 'Enviada',  classes: 'bg-green-50 text-green-700 border-green-200' },
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-50 text-gray-700 border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.classes}`}>
      {s.label}
    </span>
  )
}

export function ProjetosAvaliador() {
  const { avaliador, logout } = useAvaliador()
  const navigate = useNavigate()
  const [avaliacoes,   setAvaliacoes]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [pendencias,   setPendencias]   = useState([])
  const [showPendencias, setShowPendencias] = useState(false)

  useEffect(() => {
    if (!avaliador) return
    fetchTudo()
  }, [avaliador])

  async function fetchTudo() {
    setLoading(true)

    const [{ data: avData, error: e1 }, { data: ccData, error: e2 }] = await Promise.all([
      supabase
        .from('avaliacao')
        .select('id, status, nota_total, recomendacao_final, projeto:projeto_id(id, titulo, area_conhecimento)')
        .eq('avaliador_id', avaliador.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('convocacao_criterio')
        .select(`
          id,
          criterio:criterio_id (codigo, nome),
          convocacao:convocacao_id (
            recurso:recurso_id (
              codigo_recurso,
              projeto:projeto_id (titulo)
            )
          )
        `)
        .eq('avaliador_id', avaliador.id)
        .eq('status', 'convocado'),
    ])

    if (e1) setError('Não foi possível carregar os projetos. Tente recarregar a página.')
    else setAvaliacoes(avData ?? [])
    setPendencias(ccData ?? [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/avaliador/login')
  }

  const pendentes   = avaliacoes.filter(a => a.status === 'pendente').length
  const rascunhos   = avaliacoes.filter(a => a.status === 'em_andamento').length
  const concluidas  = avaliacoes.filter(a => a.status === 'concluida').length

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">FACITEC Conecta</p>
              <p className="text-gray-500 text-xs leading-tight">Portal de Avaliadores</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Banner de pendências de recurso */}
          {!loading && pendencias.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {pendencias.length} pendência(s) de recurso aguardando sua resposta
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Você foi convocado para reavaliar critérios contestados por candidatos.
                  </p>
                </div>
                <button
                  onClick={() => setShowPendencias(v => !v)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0 underline underline-offset-2"
                >
                  {showPendencias ? 'Ocultar' : 'Ver pendências'}
                </button>
              </div>

              {showPendencias && (
                <div className="space-y-2 pt-1">
                  {pendencias.map(cc => {
                    const recurso = cc.convocacao?.recurso
                    return (
                      <button
                        key={cc.id}
                        onClick={() => navigate(`/avaliador/recurso/${cc.id}`)}
                        className="w-full text-left bg-white rounded-lg border border-amber-200 px-3 py-2.5 hover:border-amber-400 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {recurso?.codigo_recurso && (
                              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                {recurso.codigo_recurso}
                              </span>
                            )}
                            <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                              {cc.criterio?.codigo}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {recurso?.projeto?.titulo ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{cc.criterio?.nome}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Boas-vindas */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">
              PibicJr · Edição 2026
            </p>
            <h1 className="text-xl font-bold mb-1">
              Olá, {avaliador?.nome?.split(' ')[0]}!
            </h1>
            <p className="text-blue-200 text-sm">
              {avaliacoes.length} projeto(s) atribuído(s) a você
            </p>

            {/* Contadores */}
            {!loading && avaliacoes.length > 0 && (
              <div className="grid grid-cols-3 gap-0 mt-4 pt-4 border-t border-white/20">
                {[
                  { v: pendentes,  l: 'Pendentes'  },
                  { v: rascunhos,  l: 'Rascunhos'  },
                  { v: concluidas, l: 'Enviadas'   },
                ].map((s, i) => (
                  <div key={i} className={`text-center ${i < 2 ? 'border-r border-white/20' : ''}`}>
                    <div className="text-2xl font-bold">{s.v}</div>
                    <div className="text-xs text-blue-200">{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Seus projetos
            </h2>

            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Carregando projetos...
              </div>
            ) : error ? (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : avaliacoes.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Nenhum projeto atribuído ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {avaliacoes.map(av => (
                  <button
                    key={av.id}
                    onClick={() => navigate(`/avaliador/projeto/${av.id}`)}
                    className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                          {av.projeto?.titulo ?? 'Projeto sem título'}
                        </p>
                        {av.projeto?.area_conhecimento && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {av.projeto.area_conhecimento}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <StatusBadge status={av.status} />
                          {av.status === 'concluida' && av.nota_total !== null && (
                            <span className="text-xs font-semibold text-gray-600">
                              {av.nota_total} / 10
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="px-4 py-4 text-center">
        <p className="text-gray-400 text-xs">
          Fundo Municipal de Ciência e Tecnologia de Vitória/ES · CDTIV
        </p>
      </footer>
    </div>
  )
}
