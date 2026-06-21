import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, LogOut, Send } from 'lucide-react'
import { useAvaliador } from '@/contexts/AvaliadorContext'
import { supabase } from '@/lib/supabase'

export function RespostaRecursoAvaliador() {
  const { ccId } = useParams()
  const { avaliador, logout } = useAvaliador()
  const navigate = useNavigate()

  const [dados,       setDados]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [enviando,    setEnviando]    = useState(false)
  const [enviado,     setEnviado]     = useState(false)

  // Formulário
  const [resposta,      setResposta]      = useState(null)   // 'sim' | 'nao'
  const [novaNota,      setNovaNota]      = useState('')
  const [justificativa, setJustificativa] = useState('')

  useEffect(() => {
    if (!avaliador) return
    fetchDados()
  }, [avaliador, ccId])

  async function fetchDados() {
    setLoading(true)
    setError(null)

    const { data: cc, error: e1 } = await supabase
      .from('convocacao_criterio')
      .select(`
        id, status, avaliador_id,
        criterio:criterio_id (id, codigo, nome, nota_maxima),
        convocacao:convocacao_id (
          id,
          recurso:recurso_id (
            id, codigo_recurso, projeto_id,
            projeto:projeto_id (id, titulo),
            recurso_criterio (criterio_id, fundamentacao)
          )
        )
      `)
      .eq('id', ccId)
      .single()

    if (e1 || !cc) { setError('Convocação não encontrada.'); setLoading(false); return }
    if (cc.avaliador_id !== avaliador.id) { setError('Sem permissão para acessar esta convocação.'); setLoading(false); return }

    const projetoId  = cc.convocacao?.recurso?.projeto_id
    const criterioId = cc.criterio?.id

    const { data: av, error: e2 } = await supabase
      .from('avaliacao')
      .select('parecer, avaliacao_criterio(criterio_id, nota)')
      .eq('projeto_id', projetoId)
      .eq('avaliador_id', avaliador.id)
      .eq('status', 'concluida')
      .maybeSingle()

    if (e2) { setError('Erro ao carregar avaliação original.'); setLoading(false); return }

    const notaOriginal = av?.avaliacao_criterio?.find(r => r.criterio_id === criterioId)?.nota ?? null
    const fundamentacao = (cc.convocacao?.recurso?.recurso_criterio ?? [])
      .find(r => r.criterio_id === criterioId)?.fundamentacao ?? null

    setDados({ cc, parecerGeral: av?.parecer ?? null, notaOriginal, fundamentacao })

    if (cc.status === 'respondido') {
      setEnviado(true)
    }

    setLoading(false)
  }

  async function handleEnviar() {
    if (!resposta) return
    if (resposta === 'sim' && novaNota === '') return
    if (!justificativa.trim()) return

    setEnviando(true)
    setError(null)

    const notaMax = dados.cc.criterio?.nota_maxima ?? Infinity
    const notaNum = resposta === 'sim' ? parseFloat(novaNota) : null

    if (resposta === 'sim' && (isNaN(notaNum) || notaNum < 0 || notaNum > notaMax)) {
      setError(`Nova nota deve ser entre 0 e ${notaMax}.`)
      setEnviando(false)
      return
    }

    const { error: errUpd } = await supabase
      .from('convocacao_criterio')
      .update({
        resposta,
        nova_nota:     notaNum,
        justificativa: justificativa.trim(),
        status:        'respondido',
        respondido_em: new Date().toISOString(),
      })
      .eq('id', ccId)

    if (errUpd) {
      setError('Erro ao enviar resposta: ' + errUpd.message)
      setEnviando(false)
      return
    }

    setEnviado(true)
    setEnviando(false)
  }

  const handleLogout = async () => { await logout(); navigate('/avaliador/login') }

  const podeEnviar =
    resposta !== null &&
    (resposta === 'nao' || novaNota !== '') &&
    justificativa.trim().length > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando convocação...</p>
      </div>
    )
  }

  if (error && !dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => navigate('/avaliador/projetos')} className="text-blue-600 text-sm underline">
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  const { cc, parecerGeral, notaOriginal, fundamentacao } = dados
  const criterio   = cc.criterio
  const recurso    = cc.convocacao?.recurso
  const projeto    = recurso?.projeto

  if (enviado) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header onLogout={handleLogout} onBack={() => navigate('/avaliador/projetos')} />
        <main className="flex-1 px-4 py-10">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-lg font-bold text-gray-900">Resposta enviada!</h2>
            <p className="text-sm text-gray-500">
              Sua resposta à convocação de recurso foi registrada com sucesso.
            </p>
            <button
              onClick={() => navigate('/avaliador/projetos')}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              ← Voltar aos meus projetos
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onLogout={handleLogout} onBack={() => navigate('/avaliador/projetos')} />

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Cabeçalho do recurso */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              {recurso?.codigo_recurso && (
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                  {recurso.codigo_recurso}
                </span>
              )}
              <span className="text-xs text-blue-200 uppercase tracking-wide font-semibold">
                Convocação de Recurso
              </span>
            </div>
            <h1 className="text-base font-bold leading-snug mb-3">
              {projeto?.titulo ?? '—'}
            </h1>
            <div className="bg-white/15 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-200 mr-2">
                  {criterio?.codigo}
                </span>
                <span className="text-sm font-semibold">{criterio?.nome}</span>
              </div>
              <span className="text-sm font-bold ml-3 shrink-0">
                {notaOriginal ?? '—'} / {criterio?.nota_maxima}
              </span>
            </div>
          </div>

          {/* Duas colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Comentário geral da sua avaliação
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {parecerGeral ?? (
                  <span className="italic text-gray-400">Nenhum comentário registrado.</span>
                )}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Argumento do candidato
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {fundamentacao ?? (
                  <span className="italic text-amber-500">Nenhuma fundamentação registrada.</span>
                )}
              </p>
            </div>
          </div>

          {/* Formulário de resposta */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-800">Sua resposta</h2>

            {/* Toggle SIM / NÃO */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'nao', label: 'Manter nota (NÃO)' },
                { value: 'sim', label: 'Alterar nota (SIM)' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setResposta(opt.value); if (opt.value === 'nao') setNovaNota('') }}
                  className={[
                    'py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all',
                    resposta === opt.value
                      ? opt.value === 'sim'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Nova nota (só se SIM) */}
            {resposta === 'sim' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Nova nota <span className="text-red-500">*</span>
                  <span className="text-gray-400 ml-1">(0 – {criterio?.nota_maxima})</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={criterio?.nota_maxima}
                  step={0.5}
                  value={novaNota}
                  onChange={e => setNovaNota(e.target.value)}
                  placeholder={`Ex: ${criterio?.nota_maxima}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Justificativa */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">
                Justificativa <span className="text-red-500">*</span>
              </label>
              <textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                placeholder="Explique os motivos da sua decisão..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              onClick={handleEnviar}
              disabled={!podeEnviar || enviando}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {enviando ? 'Enviando...' : 'Enviar resposta'}
            </button>
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

function Header({ onLogout, onBack }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3.5 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-sm font-semibold text-gray-700">Resposta ao Recurso</span>
        <button onClick={onLogout} title="Sair" className="text-gray-400 hover:text-gray-700 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
