import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, LogOut, Save, Send } from 'lucide-react'
import { useAvaliador } from '@/contexts/AvaliadorContext'
import { supabase } from '@/lib/supabase'

const RECOMENDACOES = [
  { value: 'Aprovado',               label: 'Aprovado'               },
  { value: 'Aprovado com Ressalvas', label: 'Aprovado com Ressalvas' },
  { value: 'Não Aprovado',           label: 'Não Aprovado'           },
]

function gerarPossibilidades(notaMaxima) {
  const valores = []
  for (let v = 0; v <= notaMaxima + 0.001; v += 0.5) {
    valores.push(Math.round(v * 10) / 10)
  }
  return valores
}

export function FichaAvaliacao() {
  const { avaliacaoId } = useParams()
  const { avaliador, logout } = useAvaliador()
  const navigate = useNavigate()

  const [avaliacao, setAvaliacao] = useState(null)
  const [criterios, setCriterios] = useState([])
  const [notas, setNotas] = useState({})
  const [parecer, setParecer] = useState('')
  const [recomendacaoFinal, setRecomendacaoFinal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const locked = avaliacao?.status === 'concluida'

  useEffect(() => {
    if (!avaliador) return
    fetchData()
  }, [avaliador, avaliacaoId])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const { data: av, error: errAv } = await supabase
      .from('avaliacao')
      .select(`
        id, status, nota_total, parecer, recomendacao_final, avaliador_id,
        projeto:projeto_id (
          id, titulo, area_conhecimento, resumo,
          edicao:edicao_id ( id )
        )
      `)
      .eq('id', avaliacaoId)
      .single()

    if (errAv || !av) {
      setError('Avaliação não encontrada.')
      setLoading(false)
      return
    }

    if (av.avaliador_id !== avaliador.id) {
      setError('Você não tem permissão para acessar esta avaliação.')
      setLoading(false)
      return
    }

    setAvaliacao(av)
    if (av.parecer) setParecer(av.parecer)
    if (av.recomendacao_final) setRecomendacaoFinal(av.recomendacao_final)

    const edicaoId = av.projeto?.edicao?.id
    if (!edicaoId) {
      setError('Não foi possível identificar a edição deste projeto.')
      setLoading(false)
      return
    }

    const { data: crits, error: errCrits } = await supabase
      .from('criterio_avaliacao')
      .select('*')
      .eq('edicao_id', edicaoId)
      .order('ordem', { ascending: true })

    if (errCrits) {
      setError('Erro ao carregar os critérios de avaliação.')
      setLoading(false)
      return
    }

    setCriterios(crits ?? [])

    const { data: existing } = await supabase
      .from('avaliacao_criterio')
      .select('criterio_id, nota')
      .eq('avaliacao_id', avaliacaoId)

    if (existing?.length) {
      const notasMap = {}
      existing.forEach(r => { notasMap[r.criterio_id] = r.nota })
      setNotas(notasMap)
    }

    setLoading(false)
  }

  const notaTotal = criterios.reduce((s, c) => s + (notas[c.id] ?? 0), 0)
  const notaMaxTotal = criterios.reduce((s, c) => s + (c.nota_maxima ?? 0), 0)
  const pct = notaMaxTotal > 0 ? (notaTotal / notaMaxTotal) * 100 : 0

  async function handleSave(draft) {
    setError(null)
    setSuccessMsg(null)

    if (!draft) {
      const todosCriterios = criterios.every(c => notas[c.id] !== undefined && notas[c.id] !== null)
      if (!todosCriterios) {
        setError('Preencha a nota de todos os critérios antes de enviar.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (!recomendacaoFinal) {
        setError('Selecione uma recomendação final antes de enviar.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    setSaving(true)
    try {
      const rowsToSave = criterios
        .filter(c => notas[c.id] !== undefined)
        .map(c => ({ avaliacao_id: avaliacao.id, criterio_id: c.id, nota: notas[c.id] }))

      if (rowsToSave.length > 0) {
        const { error: errDel } = await supabase
          .from('avaliacao_criterio')
          .delete()
          .eq('avaliacao_id', avaliacao.id)
        if (errDel) throw new Error('Erro ao atualizar notas: ' + errDel.message)

        const { error: errIns } = await supabase
          .from('avaliacao_criterio')
          .insert(rowsToSave)
        if (errIns) throw new Error('Erro ao salvar notas: ' + errIns.message)
      }

      const { error: errAv } = await supabase
        .from('avaliacao')
        .update({
          status: draft ? 'em_andamento' : 'concluida',
          parecer: parecer || null,
          recomendacao_final: recomendacaoFinal || null,
        })
        .eq('id', avaliacao.id)
      if (errAv) throw new Error('Erro ao salvar avaliação: ' + errAv.message)

      if (draft) {
        setAvaliacao(prev => ({ ...prev, status: 'em_andamento' }))
        setSuccessMsg('Rascunho salvo! Você pode continuar editando quando quiser.')
      } else {
        setAvaliacao(prev => ({ ...prev, status: 'concluida' }))
        setSuccessMsg('Avaliação enviada com sucesso! Redirecionando...')
        setTimeout(() => navigate('/avaliador/projetos'), 2500)
      }
    } catch (err) {
      setError(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/avaliador/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando ficha de avaliação...</p>
      </div>
    )
  }

  if (error && !avaliacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => navigate('/avaliador/projetos')}
            className="text-blue-600 text-sm underline"
          >
            Voltar à lista de projetos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header fixo */}
      <header className="bg-white border-b border-gray-200 px-4 py-3.5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/avaliador/projetos')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Ficha de Avaliação</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Cabeçalho do projeto */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">
              Projeto para avaliação
            </p>
            <h1 className="text-lg font-bold leading-snug">
              {avaliacao?.projeto?.titulo}
            </h1>
            {avaliacao?.projeto?.area_conhecimento && (
              <p className="text-blue-200 text-sm mt-1">{avaliacao.projeto.area_conhecimento}</p>
            )}
            {locked && (
              <div className="mt-3 bg-white/15 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-green-200">
                  Avaliação enviada · modo somente leitura
                </p>
              </div>
            )}
          </div>

          {/* Resumo do projeto (se houver) */}
          {avaliacao?.projeto?.resumo && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Resumo do projeto
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {avaliacao.projeto.resumo}
              </p>
            </div>
          )}

          {/* Mensagens de feedback */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              {successMsg}
            </div>
          )}

          {/* Critérios */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Critérios de avaliação
            </h2>
            <div className="space-y-3">
              {criterios.map(c => {
                const possibilidades = gerarPossibilidades(c.nota_maxima)
                const notaSelecionada = notas[c.id]
                const selecionada = notaSelecionada !== undefined

                return (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {c.codigo}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{c.nome}</span>
                      </div>
                      {c.descricao && (
                        <p className="text-xs text-gray-500 leading-relaxed mt-1">{c.descricao}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Nota máxima: <strong>{c.nota_maxima}</strong> · incremento de 0,5
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {possibilidades.map(v => {
                        const ativo = notaSelecionada === v
                        return (
                          <button
                            key={v}
                            disabled={locked}
                            onClick={() => !locked && setNotas(prev => ({ ...prev, [c.id]: v }))}
                            className={`w-11 h-11 rounded-lg text-sm font-semibold transition-all border
                              ${ativo
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                              }
                              ${locked ? 'cursor-default opacity-70' : 'cursor-pointer'}
                            `}
                          >
                            {Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}
                          </button>
                        )
                      })}
                    </div>

                    {selecionada && (
                      <p className="text-xs text-blue-600 font-semibold mt-2">
                        Selecionado: {notaSelecionada} ponto{notaSelecionada !== 1 ? 's' : ''}
                      </p>
                    )}
                    {!selecionada && !locked && (
                      <p className="text-xs text-amber-500 mt-2">Nenhuma nota selecionada ainda</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pontuação parcial */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Pontuação parcial
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Soma dos critérios preenchidos
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-700 leading-none">
                  {notaTotal % 1 === 0 ? notaTotal : notaTotal.toFixed(1).replace('.', ',')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">de {notaMaxTotal} pontos</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Recomendação final */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recomendação final <span className="text-red-400 normal-case font-normal">(obrigatória ao enviar)</span>
            </h3>
            <div className="space-y-2">
              {RECOMENDACOES.map(r => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${recomendacaoFinal === r.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                    ${locked ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <input
                    type="radio"
                    name="recomendacao"
                    value={r.value}
                    checked={recomendacaoFinal === r.value}
                    onChange={() => !locked && setRecomendacaoFinal(r.value)}
                    disabled={locked}
                    className="text-blue-600 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-900">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Parecer / comentários */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Comentários e parecer
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Opcional · observações sobre o projeto, ressalvas ou sugestões para os autores
            </p>
            <textarea
              value={parecer}
              onChange={e => setParecer(e.target.value)}
              disabled={locked}
              placeholder="Escreva aqui suas observações sobre o projeto..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-300"
            />
          </div>

          {/* Botões de ação */}
          {!locked ? (
            <div className="flex flex-col sm:flex-row gap-3 pb-8">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar rascunho'}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                {saving ? 'Enviando...' : 'Enviar definitivamente'}
              </button>
            </div>
          ) : (
            <div className="text-center pb-8 space-y-2">
              <p className="text-sm text-gray-500">
                Esta avaliação já foi enviada e não pode ser editada.
              </p>
              <button
                onClick={() => navigate('/avaliador/projetos')}
                className="text-sm text-blue-600 underline underline-offset-2"
              >
                Voltar à lista de projetos
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
