import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/common/Modal'
import { BannerRelatorioMensal } from '@/components/orientador/BannerRelatorioMensal'
import {
  MIN_EVIDENCIAS,
  MAX_EVIDENCIAS,
  listarCiclos,
  listarRelatoriosDoOrientador,
  salvarRascunho,
  enviarRelatorio,
  uploadEvidencia,
  removerEvidencia,
  detectarCicloAtual,
  calcularBanner,
  formatarDataBR,
} from '@/lib/relatorioMensal'

const FORM_VAZIO = {
  frequencia: {},
  atividades_realizadas: '',
  resultados_alcancados: '',
  desafios_enfrentados: '',
  evidencias_urls: [],
}

function normalizarEvidencias(evidencias) {
  return (evidencias ?? []).map(e => (typeof e === 'string' ? { url: e, legenda: '' } : e))
}

function relatorioParaForm(relatorio, bolsistas) {
  const frequenciaArr = relatorio?.frequencia_bolsistas ?? []
  const frequencia = {}
  bolsistas.forEach(b => {
    const entrada = frequenciaArr.find(f => f.bolsista_id === b.id)
    frequencia[b.id] = entrada?.cumpriu_75_porcento ?? false
  })
  return {
    frequencia,
    atividades_realizadas: relatorio?.atividades_realizadas ?? '',
    resultados_alcancados: relatorio?.resultados_alcancados ?? '',
    desafios_enfrentados: relatorio?.desafios_enfrentados ?? '',
    evidencias_urls: normalizarEvidencias(relatorio?.evidencias_urls),
  }
}

export function RelatorioMensal() {
  const { orientador, projeto } = usePortalOrientador()

  const [loading, setLoading] = useState(true)
  const [bolsistas, setBolsistas] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [relatorios, setRelatorios] = useState([])
  const [cicloInfo, setCicloInfo] = useState(null)
  const [relatorioAtual, setRelatorioAtual] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [ultimoSalvo, setUltimoSalvo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState(null)

  const prontoParaAutoSave = useRef(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!projeto) { setLoading(false); return }
    carregarDados()
  }, [projeto])

  async function carregarDados() {
    setLoading(true)
    prontoParaAutoSave.current = false
    try {
      const [{ data: bData }, ciclosData, relatoriosData] = await Promise.all([
        supabase.from('bolsista').select('id,nome_completo,codigo_facitec').eq('projeto_id', projeto.id).eq('status', 'ativo').order('created_at'),
        listarCiclos(projeto.edicao_id),
        listarRelatoriosDoOrientador(orientador.id),
      ])
      const bolsistasAtivos = bData ?? []
      setBolsistas(bolsistasAtivos)
      setCiclos(ciclosData)
      setRelatorios(relatoriosData)

      const relatoriosPorCicloId = Object.fromEntries(relatoriosData.map(r => [r.ciclo_id, r]))
      const info = detectarCicloAtual(ciclosData, relatoriosPorCicloId)
      setCicloInfo(info)
      setRelatorioAtual(info.relatorio)
      setForm(relatorioParaForm(info.relatorio, bolsistasAtivos))
    } catch {
      setErro('Erro ao carregar os dados do relatório mensal.')
    } finally {
      setLoading(false)
      // libera o auto-save só depois que o formulário inicial já foi populado
      setTimeout(() => { prontoParaAutoSave.current = true }, 0)
    }
  }

  const persistirRascunho = useCallback(async (formAtual) => {
    if (!cicloInfo?.ciclo) return
    setSalvando(true)
    try {
      const frequencia_bolsistas = bolsistas.map(b => ({
        bolsista_id: b.id,
        cumpriu_75_porcento: !!formAtual.frequencia[b.id],
      }))
      const salvo = await salvarRascunho({
        orientador_id: orientador.id,
        ciclo_id: cicloInfo.ciclo.id,
        projeto_id: projeto.id,
        edicao_id: projeto.edicao_id,
        mes_referencia: cicloInfo.ciclo.mes_referencia,
        frequencia_bolsistas,
        atividades_realizadas: formAtual.atividades_realizadas || null,
        resultados_alcancados: formAtual.resultados_alcancados || null,
        desafios_enfrentados: formAtual.desafios_enfrentados || null,
        evidencias_urls: formAtual.evidencias_urls,
      })
      setRelatorioAtual(salvo)
      setUltimoSalvo(new Date())
    } catch {
      setErro('Não foi possível salvar o rascunho automaticamente.')
    } finally {
      setSalvando(false)
    }
  }, [cicloInfo, bolsistas, orientador, projeto])

  useEffect(() => {
    if (!prontoParaAutoSave.current) return
    if (!cicloInfo?.ciclo || relatorioAtual?.status === 'enviado') return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persistirRascunho(form), 1500)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  function setCampo(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function toggleFrequencia(bolsistaId) {
    setForm(prev => ({ ...prev, frequencia: { ...prev.frequencia, [bolsistaId]: !prev.frequencia[bolsistaId] } }))
  }

  async function handleUploadEvidencias(files) {
    if (!cicloInfo?.ciclo) return
    const espacoDisponivel = MAX_EVIDENCIAS - form.evidencias_urls.length
    const selecionados = Array.from(files).slice(0, espacoDisponivel)
    if (selecionados.length === 0) return

    setUploading(true)
    try {
      const novos = []
      for (const file of selecionados) {
        const url = await uploadEvidencia(file, orientador.id, cicloInfo.ciclo.id)
        novos.push({ url, legenda: '' })
      }
      setForm(prev => ({ ...prev, evidencias_urls: [...prev.evidencias_urls, ...novos] }))
    } catch {
      setErro('Erro ao enviar uma ou mais fotos. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoverEvidencia(url) {
    setForm(prev => ({ ...prev, evidencias_urls: prev.evidencias_urls.filter(e => e.url !== url) }))
    removerEvidencia(url).catch(() => {})
  }

  function handleLegendaChange(url, texto) {
    setForm(prev => ({
      ...prev,
      evidencias_urls: prev.evidencias_urls.map(e => (e.url === url ? { ...e, legenda: texto } : e)),
    }))
  }

  const camposObrigatoriosOk = form.atividades_realizadas.trim() && form.resultados_alcancados.trim() && form.desafios_enfrentados.trim()
  const fotosOk = form.evidencias_urls.length >= MIN_EVIDENCIAS &&
    form.evidencias_urls.every(e => (e.legenda || '').trim().length >= 10)
  const podeEnviar = camposObrigatoriosOk && fotosOk && !!relatorioAtual

  async function handleConfirmarEnvio() {
    if (!relatorioAtual) return
    setEnviando(true)
    try {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      await persistirRascunho(form)
      const enviado = await enviarRelatorio(relatorioAtual.id)
      setRelatorioAtual(enviado)
      setConfirmando(false)
    } catch {
      setErro('Não foi possível enviar o relatório. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <OrientadorSidebar />
        <main className="flex-1 ml-[200px] p-6">
          <p className="text-sm text-gray-400">Carregando...</p>
        </main>
      </div>
    )
  }

  const banner = cicloInfo ? calcularBanner(cicloInfo.ciclo, relatorioAtual, cicloInfo.atrasado) : null

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />
      <main className="flex-1 ml-[200px] p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relatório mensal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Acompanhamento obrigatório da equipe e das atividades do projeto</p>
        </div>

        {erro && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>
        )}

        {!projeto && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Nenhum projeto selecionado nesta edição.
          </div>
        )}

        {projeto && cicloInfo?.concluido && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-green-900">Todos os relatórios desta edição já foram enviados. Obrigado!</p>
          </div>
        )}

        {projeto && !cicloInfo?.concluido && cicloInfo?.proximoCiclo && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-1">
            <p className="text-sm font-semibold text-gray-800">Nenhuma janela de envio aberta no momento</p>
            <p className="text-sm text-gray-500">
              O ciclo {cicloInfo.proximoCiclo.numero_ciclo} ({cicloInfo.proximoCiclo.mes_referencia}) abre em{' '}
              {formatarDataBR(cicloInfo.proximoCiclo.data_abertura)}.
            </p>
          </div>
        )}

        {projeto && cicloInfo?.ciclo && (
          <>
            <BannerRelatorioMensal banner={banner} />

            {/* ── Visão somente leitura, já enviado ── */}
            {relatorioAtual?.status === 'enviado' ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800">
                    Ciclo {cicloInfo.ciclo.numero_ciclo} — {cicloInfo.ciclo.mes_referencia}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3 h-3" /> Enviado
                  </span>
                </div>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Enviado em {new Date(relatorioAtual.enviado_em).toLocaleString('pt-BR')}. Para alterar, solicite a reabertura à Secretaria.
                </p>

                <ReadOnlySecao titulo="Frequência dos bolsistas">
                  <ul className="space-y-1">
                    {bolsistas.map(b => (
                      <li key={b.id} className="text-sm text-gray-700 flex items-center gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${form.frequencia[b.id] ? 'text-green-600' : 'text-gray-300'}`} />
                        {b.nome_completo} {form.frequencia[b.id] ? '— cumpriu 75%' : '— não cumpriu 75%'}
                      </li>
                    ))}
                  </ul>
                </ReadOnlySecao>
                <ReadOnlySecao titulo="Atividades realizadas">{form.atividades_realizadas}</ReadOnlySecao>
                <ReadOnlySecao titulo="Resultados alcançados">{form.resultados_alcancados}</ReadOnlySecao>
                <ReadOnlySecao titulo="Desafios enfrentados">{form.desafios_enfrentados}</ReadOnlySecao>
                <ReadOnlySecao titulo="Evidências">
                  <div className="grid grid-cols-3 gap-2">
                    {form.evidencias_urls.map(({ url, legenda }) => (
                      <div key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="Evidência" className="w-full h-24 object-cover rounded-md border border-gray-200" />
                        </a>
                        {legenda && <p className="text-[11px] text-gray-500 mt-1">{legenda}</p>}
                      </div>
                    ))}
                  </div>
                </ReadOnlySecao>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-gray-800">
                    Ciclo {cicloInfo.ciclo.numero_ciclo} — {cicloInfo.ciclo.mes_referencia} · prazo {formatarDataBR(cicloInfo.ciclo.data_fechamento)}
                  </h2>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {salvando ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Salvando rascunho...</>
                    ) : ultimoSalvo ? (
                      <>Rascunho salvo às {ultimoSalvo.toLocaleTimeString('pt-BR')}</>
                    ) : null}
                  </span>
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  Sem o envio, o pagamento da bolsa fica retido até o cumprimento desta exigência.
                </div>

                {relatorioAtual?.status === 'rascunho' && relatorioAtual?.motivo_reabertura && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    A secretaria devolveu este relatório para revisão: {relatorioAtual.motivo_reabertura}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Frequência dos bolsistas (cumpriu 75% de presença)</p>
                  {bolsistas.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum bolsista ativo cadastrado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {bolsistas.map(b => (
                        <label key={b.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!form.frequencia[b.id]}
                            onChange={() => toggleFrequencia(b.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          {b.nome_completo}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <CampoTexto
                  label="Resumo das atividades realizadas"
                  value={form.atividades_realizadas}
                  onChange={v => setCampo('atividades_realizadas', v)}
                />
                <CampoTexto
                  label="Resultados alcançados"
                  value={form.resultados_alcancados}
                  onChange={v => setCampo('resultados_alcancados', v)}
                />
                <CampoTexto
                  label="Desafios enfrentados"
                  value={form.desafios_enfrentados}
                  onChange={v => setCampo('desafios_enfrentados', v)}
                  placeholder='Descreva os desafios ou escreva "Sem desafios ao longo deste ciclo"'
                />

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Evidências (fotos) — mínimo {MIN_EVIDENCIAS}, máximo {MAX_EVIDENCIAS}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                    {form.evidencias_urls.map(({ url, legenda }) => {
                      const legendaOk = (legenda || '').trim().length >= 10
                      return (
                        <div key={url} className="relative group">
                          <img src={url} alt="Evidência" className="w-full h-20 object-cover rounded-md border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => handleRemoverEvidencia(url)}
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            value={legenda || ''}
                            onChange={e => handleLegendaChange(url, e.target.value)}
                            placeholder="Descreva o que a foto mostra"
                            className={`mt-1 w-full rounded-md border px-1.5 py-1 text-[10px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${legendaOk ? 'border-gray-300' : 'border-red-400'}`}
                          />
                          {!legendaOk && (
                            <p className="text-[9px] text-red-600 mt-0.5">Legenda obrigatória (mín. 10 caracteres)</p>
                          )}
                        </div>
                      )
                    })}
                    {form.evidencias_urls.length < MAX_EVIDENCIAS && (
                      <UploadEvidenciaBotao onUpload={handleUploadEvidencias} uploading={uploading} />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{form.evidencias_urls.length}/{MAX_EVIDENCIAS} fotos anexadas</p>
                </div>

                {cicloInfo.atrasado && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    O prazo deste ciclo já encerrou. O envio ainda é possível, mas ficará registrado como atrasado.
                  </div>
                )}

                <button
                  type="button"
                  disabled={!podeEnviar || enviando}
                  onClick={() => setConfirmando(true)}
                  className="w-full py-2.5 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar relatório do ciclo {cicloInfo.ciclo.numero_ciclo}
                </button>
              </div>
            )}
          </>
        )}

        <Modal open={confirmando} onClose={() => !enviando && setConfirmando(false)} title="Confirmar envio" size="sm">
          <p className="text-sm text-gray-600 mb-6">
            Após enviar, não será possível editar sem solicitar reabertura à Secretaria. Confirmar envio?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              disabled={enviando}
              onClick={() => setConfirmando(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={handleConfirmarEnvio}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Confirmar envio'}
            </button>
          </div>
        </Modal>
      </main>
    </div>
  )
}

function CampoTexto({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function UploadEvidenciaBotao({ onUpload, uploading }) {
  const ref = useRef()
  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        className="w-full h-20 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        <span className="text-[10px] font-medium">{uploading ? 'Enviando...' : 'Adicionar'}</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files?.length) onUpload(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}

function ReadOnlySecao({ titulo, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{titulo}</p>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{children}</div>
    </div>
  )
}
