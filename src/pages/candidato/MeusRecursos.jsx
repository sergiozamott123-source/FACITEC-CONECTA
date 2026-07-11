import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, LogOut } from 'lucide-react'
import { useOrientador } from '@/contexts/OrientadorContext'
import { supabase } from '@/lib/supabase'

const RECURSO_STATUS = {
  rascunho:   { label: 'Rascunho salvo', classes: 'bg-amber-50 text-amber-700 border-amber-200',  btnLabel: 'Continuar Rascunho' },
  enviado:    { label: 'Enviado',         classes: 'bg-green-50 text-green-700 border-green-200',  btnLabel: 'Ver Recurso'        },
  em_analise: { label: 'Em análise',      classes: 'bg-blue-50  text-blue-700  border-blue-200',   btnLabel: 'Ver Recurso'        },
  respondido: { label: 'Respondido',      classes: 'bg-purple-50 text-purple-700 border-purple-200', btnLabel: 'Ver Resposta'     },
}

function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200">
        Não iniciado
      </span>
    )
  }
  const s = RECURSO_STATUS[status] ?? { label: status, classes: 'bg-gray-50 text-gray-700 border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.classes}`}>
      {s.label}
    </span>
  )
}

export function MeusRecursos() {
  const { orientador, logout } = useOrientador()
  const navigate = useNavigate()
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orientador) return
    fetchData()
  }, [orientador])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const { data: projetosList, error: errProj } = await supabase
      .from('projeto')
      .select('id, titulo, codigo_facitec, area_conhecimento')
      .eq('orientador_id', orientador.id)
      .order('created_at', { ascending: true })

    if (errProj) {
      setError('Não foi possível carregar seus projetos. Tente recarregar a página.')
      setLoading(false)
      return
    }

    if (!projetosList || projetosList.length === 0) {
      setProjetos([])
      setLoading(false)
      return
    }

    const ids = projetosList.map(p => p.id)
    const { data: recursosList } = await supabase
      .from('recurso')
      .select('id, status, codigo_recurso, projeto_id')
      .eq('orientador_id', orientador.id)
      .in('projeto_id', ids)

    const recursosMap = {}
    ;(recursosList ?? []).forEach(r => { recursosMap[r.projeto_id] = r })

    setProjetos(projetosList.map(p => ({ ...p, recurso: recursosMap[p.id] ?? null })))
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/candidato/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">FACITEC Conecta</p>
              <p className="text-gray-500 text-xs leading-tight">Portal do Candidato</p>
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

          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">
              FACITEC Conecta
            </p>
            <h1 className="text-xl font-bold mb-1">
              Olá, {orientador?.nome_completo?.split(' ')[0]}!
            </h1>
            <p className="text-blue-200 text-sm">
              {loading ? '...' : `${projetos.length} projeto(s) vinculado(s) ao seu cadastro`}
            </p>
          </div>

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
            ) : projetos.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Nenhum projeto vinculado ao seu cadastro ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {projetos.map(proj => {
                  const rec = proj.recurso
                  const statusKey = rec?.status ?? null
                  const cfg = statusKey ? (RECURSO_STATUS[statusKey] ?? null) : null
                  const btnLabel = cfg?.btnLabel ?? 'Iniciar Recurso'

                  return (
                    <button
                      key={proj.id}
                      onClick={() => navigate(`/candidato/recurso/${proj.id}`)}
                      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                            {proj.titulo}
                          </p>
                          {proj.codigo_facitec && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Código: {proj.codigo_facitec}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <StatusBadge status={statusKey} />
                            {rec?.codigo_recurso && (
                              <span className="text-xs font-semibold text-gray-500">
                                {rec.codigo_recurso}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-blue-600 font-medium mt-2">{btnLabel} →</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                      </div>
                    </button>
                  )
                })}
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
