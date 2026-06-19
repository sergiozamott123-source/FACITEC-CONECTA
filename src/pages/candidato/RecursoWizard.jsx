import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2,
  FileText, HelpCircle, LogOut, Send,
} from 'lucide-react'
import { useOrientador } from '@/contexts/OrientadorContext'
import { supabase } from '@/lib/supabase'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

function WizardStepIndicator({ current }) {
  const STEPS = [
    { n: 1, label: 'Destinatário' },
    { n: 2, label: 'Critérios'   },
    { n: 3, label: 'Revisão'     },
    { n: 4, label: 'Assinatura'  },
  ]
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done   = s.n < current
        const active = s.n === current
        return (
          <Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done || active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400',
                active ? 'ring-4 ring-blue-100' : '',
              ].join(' ')}>
                {done ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={[
                'text-xs hidden sm:block whitespace-nowrap',
                active ? 'text-blue-700 font-semibold' : done ? 'text-gray-700' : 'text-gray-400',
              ].join(' ')}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

export function RecursoWizard() {
  const { projetoId } = useParams()
  const { orientador, logout } = useOrientador()
  const navigate = useNavigate()

  // Use ref to avoid stale closure when saveDraft reads recurso ID
  const recursoIdRef = useRef(null)
  const [recursoId, _setRecursoId] = useState(null)
  function setRecursoId(id) {
    recursoIdRef.current = id
    _setRecursoId(id)
  }

  const [projeto,       setProjeto]       = useState(null)
  const [criterios,     setCriterios]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [sending,       setSending]       = useState(false)
  const [error,         setError]         = useState(null)
  const [step,          setStep]          = useState(1)
  const [codigoRecurso, setCodigoRecurso] = useState(null)

  // Step 1
  const [destinatario, setDestinatario] = useState('')

  // Step 2
  const [criteriosForm, setCriteriosForm] = useState({})
  const [tooltipOpen,   setTooltipOpen]   = useState(null)

  // Step 4
  const [nomeAssinatura,  setNomeAssinatura]  = useState('')
  const [declaracaoAceita, setDeclaracaoAceita] = useState(false)

  useEffect(() => {
    if (!orientador) return
    fetchData()
  }, [orientador, projetoId])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const { data: proj, error: errProj } = await supabase
      .from('projeto')
      .select('id, titulo, codigo_facitec, edicao_id')
      .eq('id', projetoId)
      .eq('orientador_id', orientador.id)
      .single()

    if (errProj || !proj) {
      setError('Projeto não encontrado ou sem permissão de acesso.')
      setLoading(false)
      return
    }
    setProjeto(proj)

    const { data: crits } = await supabase
      .from('criterio_avaliacao')
      .select('id, codigo, nome, descricao, ordem')
      .eq('edicao_id', proj.edicao_id)
      .order('ordem', { ascending: true })

    const criteriosList = crits ?? []
    setCriterios(criteriosList)

    const initialForm = {}
    criteriosList.forEach(c => { initialForm[c.id] = { checked: false, fundamentacao: '' } })

    const { data: rec } = await supabase
      .from('recurso')
      .select('id, status, destinatario, codigo_recurso')
      .eq('projeto_id', projetoId)
      .eq('orientador_id', orientador.id)
      .maybeSingle()

    if (rec) {
      setRecursoId(rec.id)
      if (rec.destinatario) setDestinatario(rec.destinatario)

      if (['enviado', 'em_analise', 'respondido'].includes(rec.status)) {
        setCodigoRecurso(rec.codigo_recurso)
        setStep('enviado')
        setLoading(false)
        return
      }

      const { data: rcList } = await supabase
        .from('recurso_criterio')
        .select('criterio_id, fundamentacao')
        .eq('recurso_id', rec.id)

      const form = { ...initialForm }
      ;(rcList ?? []).forEach(r => {
        if (form[r.criterio_id] !== undefined) {
          form[r.criterio_id] = { checked: true, fundamentacao: r.fundamentacao ?? '' }
        }
      })
      setCriteriosForm(form)
    } else {
      setCriteriosForm(initialForm)
    }

    setLoading(false)
  }

  async function saveDraft() {
    if (!orientador || !projeto) return null
    setSaving(true)
    try {
      const recursoData = {
        projeto_id:    projetoId,
        orientador_id: orientador.id,
        edicao_id:     projeto.edicao_id,
        destinatario:  destinatario || null,
        status:        'rascunho',
      }

      let rid = recursoIdRef.current
      if (rid) {
        const { error: errUpd } = await supabase.from('recurso').update(recursoData).eq('id', rid)
        if (errUpd) throw new Error(errUpd.message)
      } else {
        const { data, error: errIns } = await supabase
          .from('recurso').insert(recursoData).select('id').single()
        if (errIns) throw new Error(errIns.message)
        rid = data.id
        setRecursoId(rid)
      }

      await supabase.from('recurso_criterio').delete().eq('recurso_id', rid)

      const toInsert = Object.entries(criteriosForm)
        .filter(([, v]) => v.checked)
        .map(([criterioId, v]) => ({
          recurso_id:    rid,
          criterio_id:  criterioId,
          fundamentacao: v.fundamentacao || null,
        }))

      if (toInsert.length > 0) {
        const { error: errCrit } = await supabase.from('recurso_criterio').insert(toInsert)
        if (errCrit) throw new Error(errCrit.message)
      }

      return rid
    } catch (err) {
      setError('Erro ao salvar rascunho: ' + err.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  async function goNext() {
    setError(null)
    if (step === 1) {
      if (!destinatario.trim()) { setError('Informe o destinatário antes de continuar.'); return }
      await saveDraft()
      setStep(2)
    } else if (step === 2) {
      const algumMarcado = Object.values(criteriosForm).some(v => v.checked)
      if (!algumMarcado) { setError('Marque ao menos um critério para contestar.'); return }
      await saveDraft()
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setError(null)
    setStep(s => (typeof s === 'number' ? s - 1 : 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleEnviar() {
    setError(null)
    if (!nomeAssinatura.trim()) { setError('Digite seu nome completo para assinar.'); return }
    if (!declaracaoAceita)      { setError('Você deve aceitar a declaração para enviar.'); return }

    setSending(true)
    try {
      const rid = await saveDraft()
      if (!rid) return

      const { error: errEnv } = await supabase
        .from('recurso')
        .update({
          status:           'enviado',
          nome_assinatura:  nomeAssinatura,
          declaracao_aceita: true,
          assinado_em:      new Date().toISOString(),
        })
        .eq('id', rid)

      if (errEnv) throw new Error(errEnv.message)

      const { data: recAtual } = await supabase
        .from('recurso')
        .select('codigo_recurso')
        .eq('id', rid)
        .single()

      setCodigoRecurso(recAtual?.codigo_recurso ?? null)
      setStep('enviado')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError('Erro ao enviar recurso: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/candidato/login')
  }

  const criteriosContestados = criterios.filter(c => criteriosForm[c.id]?.checked)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (!projeto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm">{error ?? 'Projeto não encontrado.'}</p>
          <button onClick={() => navigate('/candidato/meus-recursos')} className="text-blue-600 text-sm underline">
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3.5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/candidato/meus-recursos')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Meus recursos
          </button>
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Recurso</span>
            {saving && <span className="text-xs text-gray-400">· salvando...</span>}
          </div>
          <button onClick={handleLogout} title="Sair" className="text-gray-400 hover:text-gray-700 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Projeto banner */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-5 text-white">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-2">Projeto</p>
            <h1 className="text-base font-bold leading-snug">{projeto.titulo}</h1>
            {projeto.codigo_facitec && (
              <p className="text-blue-200 text-xs mt-1">Código: {projeto.codigo_facitec}</p>
            )}
          </div>

          {/* Step indicator */}
          {step !== 'enviado' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <WizardStepIndicator current={typeof step === 'number' ? step : 5} />
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* ========== ETAPA 1 — Destinatário ========== */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800 mb-1">Atenção</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Antes de prosseguir, certifique-se de para quem o recurso deve ser direcionado.
                  Consulte o capítulo de recursos no edital ou entre em contato com a Secretaria
                  Executiva do FACITEC pelo e-mail{' '}
                  <span className="font-semibold">facitec@cdtiv.com.br</span>
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-800">Destinatário do recurso</h2>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-600">
                    A quem este recurso é dirigido <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={destinatario}
                    onChange={e => setDestinatario(e.target.value)}
                    placeholder="Ex: Comissão de Recursos do FACITEC"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div className="flex justify-end pb-4">
                <button
                  onClick={goNext}
                  disabled={saving}
                  className="flex items-center gap-2 py-2.5 px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Próxima etapa
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========== ETAPA 2 — Critérios ========== */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Critérios contestados</h2>
                <p className="text-xs text-gray-500">
                  Selecione os critérios que deseja contestar e apresente a fundamentação.
                  Ao menos um critério deve ser marcado.
                </p>
              </div>

              <div className="space-y-3">
                {criterios.map((c, idx) => {
                  const checked        = criteriosForm[c.id]?.checked ?? false
                  const fundamentacao  = criteriosForm[c.id]?.fundamentacao ?? ''
                  const isTooltipOpen  = tooltipOpen === c.id

                  return (
                    <div
                      key={c.id}
                      className={`bg-white rounded-xl border p-4 transition-all ${checked ? 'border-blue-300' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`crit-${c.id}`}
                          checked={checked}
                          onChange={e =>
                            setCriteriosForm(prev => ({
                              ...prev,
                              [c.id]: { ...prev[c.id], checked: e.target.checked },
                            }))
                          }
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <label
                              htmlFor={`crit-${c.id}`}
                              className="flex-1 text-sm font-semibold text-gray-900 cursor-pointer leading-snug"
                            >
                              {c.codigo && (
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2">
                                  {c.codigo}
                                </span>
                              )}
                              {c.nome}
                            </label>
                            {c.descricao && (
                              <button
                                type="button"
                                onClick={() => setTooltipOpen(isTooltipOpen ? null : c.id)}
                                className="text-gray-400 hover:text-blue-600 transition-colors shrink-0 mt-0.5"
                                title="Ver descrição oficial do critério"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {isTooltipOpen && c.descricao && (
                            <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                              <p className="text-xs text-blue-800 leading-relaxed">{c.descricao}</p>
                            </div>
                          )}

                          {checked && (
                            <div className="mt-3 space-y-1">
                              <label className="block text-xs font-medium text-gray-600">
                                Fundamentação <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={fundamentacao}
                                onChange={e =>
                                  setCriteriosForm(prev => ({
                                    ...prev,
                                    [c.id]: { ...prev[c.id], fundamentacao: e.target.value },
                                  }))
                                }
                                placeholder="Descreva os motivos da contestação deste critério..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 pb-4">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 py-2.5 px-4 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  onClick={goNext}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Revisar recurso
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========== ETAPA 3 — Pré-visualização ========== */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Pré-visualização do recurso</h2>
                <p className="text-xs text-gray-500">
                  Revise o documento abaixo antes de assinar e enviar.
                  Volte para fazer alterações.
                </p>
              </div>

              {/* Petição formal */}
              <div className="bg-white rounded-xl border border-gray-200 px-8 py-7">
                <div className="space-y-5 text-sm text-gray-800 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                  <p className="font-semibold">{destinatario}</p>

                  <p>
                    <span className="font-semibold">{orientador?.nome_completo}</span>
                    {orientador?.email    ? `, ${orientador.email}`    : ''}
                    {orientador?.telefone ? `, ${orientador.telefone}` : ''}
                    , inscrito no programa PibicJr sob o projeto &ldquo;
                    <span className="font-semibold">{projeto.titulo}</span>&rdquo;
                    {projeto.codigo_facitec ? ` (código: ${projeto.codigo_facitec})` : ''}
                    , vem por meio deste apresentar{' '}
                    <span className="font-bold">RECURSO</span>{' '}
                    contra o resultado da avaliação, nos termos do Edital FACITEC 01/2026,
                    pelas razões a seguir:
                  </p>

                  <div className="space-y-4">
                    {criteriosContestados.map((c, idx) => (
                      <div key={c.id}>
                        <p className="font-semibold">
                          {ROMAN[idx]} &ndash; Critério {c.codigo ?? `nº ${String(idx + 1).padStart(2, '0')}`} &ndash; {c.nome}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {criteriosForm[c.id]?.fundamentacao || (
                            <em className="text-gray-400">(sem fundamentação informada)</em>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p>
                    Diante do exposto, solicito a reavaliação da pontuação atribuída ao projeto.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pb-4">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 py-2.5 px-4 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={goNext}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Prosseguir para assinatura
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========== ETAPA 4 — Assinatura e Envio ========== */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Assinatura e confirmação</h2>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Para confirmar sua identidade, digite seu nome completo:
                    <span className="text-red-500"> *</span>
                  </label>
                  <input
                    type="text"
                    value={nomeAssinatura}
                    onChange={e => setNomeAssinatura(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaracaoAceita}
                    onChange={e => setDeclaracaoAceita(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    Declaro que as informações acima são verdadeiras e de minha responsabilidade.
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pb-8">
                <button
                  onClick={goBack}
                  disabled={sending}
                  className="flex items-center gap-2 py-2.5 px-4 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={sending || !nomeAssinatura.trim() || !declaracaoAceita}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Enviando...' : 'Assinar e Enviar'}
                </button>
              </div>
            </div>
          )}

          {/* ========== ENVIADO — Confirmação ========== */}
          {step === 'enviado' && (
            <div className="pb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recurso enviado com sucesso!</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Seu recurso foi registrado e está em análise.
                  </p>
                </div>
                {codigoRecurso && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-6 py-3 inline-block">
                    <p className="text-xs text-gray-500 mb-0.5">Código do recurso</p>
                    <p className="text-2xl font-bold text-blue-700">{codigoRecurso}</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                  Guarde o código acima para acompanhamento.
                  Você receberá o retorno sobre o seu recurso por meio desta plataforma.
                </p>
                <button
                  onClick={() => navigate('/candidato/meus-recursos')}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  ← Voltar aos meus recursos
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
