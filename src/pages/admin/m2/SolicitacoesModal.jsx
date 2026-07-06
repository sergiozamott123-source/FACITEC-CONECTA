// src/pages/admin/m2/SolicitacoesModal.jsx
//
// Painel da Secretaria Executiva para criar e acompanhar solicitações
// enviadas aos orientadores (complementar dados, relatórios mensais, avisos).

import { useEffect, useState } from 'react'
import { X, Send, Sparkles, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import {
  TIPOS_SOLICITACAO,
  listarSolicitacoes,
  criarSolicitacoes,
  detectarOrientadoresComDadosPendentes,
} from '@/lib/solicitacoes'

const LINKS_ACAO = [
  { value: '',                          label: 'Nenhum (aviso geral)' },
  { value: '/orientador/bolsistas',     label: 'Ir para → Bolsistas' },
  { value: '/orientador/dados',         label: 'Ir para → Meu projeto' },
  { value: '/orientador/documentos',    label: 'Ir para → Documentos' },
  { value: '/orientador/meus-dados',    label: 'Ir para → Meus dados' },
]

function formatarData(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function SolicitacoesModal({ orientadores, ano, onClose }) {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [erro, setErro] = useState(null)

  const [aba, setAba] = useState('nova') // 'nova' | 'historico'

  const [idsSelecionados, setIdsSelecionados] = useState([])
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('outro')
  const [linkAcao, setLinkAcao] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(null)

  const [buscandoSugestao, setBuscandoSugestao] = useState(false)
  const [sugestao, setSugestao] = useState(null) // lista de orientadores com pendência, ou null se ainda não buscou

  useEffect(() => { carregarLista() }, [])

  async function carregarLista() {
    setLoadingLista(true)
    try {
      const data = await listarSolicitacoes()
      setSolicitacoes(data)
    } catch (err) {
      setErro(`Erro ao carregar solicitações: ${err.message}`)
    } finally {
      setLoadingLista(false)
    }
  }

  function toggleSelecionado(id) {
    setIdsSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSugestaoAutomatica() {
    setBuscandoSugestao(true)
    setErro(null)
    try {
      const pendentes = await detectarOrientadoresComDadosPendentes(ano)
      setSugestao(pendentes)
      if (pendentes.length > 0) {
        setIdsSelecionados(pendentes.map(o => o.id))
        setTitulo('Complementar dados cadastrais dos bolsistas')
        setTipo('dados_bolsista')
        setLinkAcao('/orientador/bolsistas')
        setDescricao(
          'Identificamos que um ou mais bolsistas da sua equipe estão com dados ' +
          'cadastrais incompletos (escola, telefone e/ou endereço completo). ' +
          'Esses dados são necessários para o encaminhamento à Gerência ' +
          'Financeira (abertura de conta e cadastramento). Por favor, acesse a ' +
          'tela de Bolsistas e complete as informações pendentes o quanto antes.'
        )
      }
    } catch (err) {
      setErro(`Erro ao buscar pendências: ${err.message}`)
    } finally {
      setBuscandoSugestao(false)
    }
  }

  async function handleEnviar() {
    setEnviando(true)
    setErro(null)
    setSucesso(null)
    try {
      await criarSolicitacoes({
        orientadorIds: idsSelecionados,
        titulo,
        descricao,
        tipo,
        linkAcao,
        dataLimite: dataLimite || null,
      })
      setSucesso(`Solicitação enviada para ${idsSelecionados.length} orientador(es).`)
      setTitulo(''); setDescricao(''); setTipo('outro'); setLinkAcao(''); setDataLimite('')
      setIdsSelecionados([]); setSugestao(null)
      carregarLista()
      setTimeout(() => setAba('historico'), 900)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const podeEnviar = idsSelecionados.length > 0 && titulo.trim().length > 0 && !enviando

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Solicitações aos Orientadores</h2>
            <p className="text-xs text-gray-400 mt-0.5">Canal de comunicação da Secretaria Executiva</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-100 px-5">
          <button
            onClick={() => setAba('nova')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              aba === 'nova' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Nova solicitação
          </button>
          <button
            onClick={() => setAba('historico')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              aba === 'historico' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Histórico {solicitacoes.length > 0 && `(${solicitacoes.length})`}
          </button>
        </div>

        {erro && (
          <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="mx-5 mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {sucesso}
          </div>
        )}

        {/* ── Aba: Nova solicitação ── */}
        {aba === 'nova' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <button
              onClick={handleSugestaoAutomatica}
              disabled={buscandoSugestao}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left disabled:opacity-60"
            >
              {buscandoSugestao ? (
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold text-indigo-800">
                  {buscandoSugestao ? 'Verificando dados cadastrais dos bolsistas…' : 'Sugestão automática'}
                </p>
                {!buscandoSugestao && sugestao === null && (
                  <p className="text-[11px] text-indigo-600">
                    Detectar orientadores com bolsistas de dados cadastrais incompletos (escola/telefone/endereço)
                  </p>
                )}
                {sugestao !== null && (
                  <p className="text-[11px] text-indigo-600">
                    {sugestao.length === 0
                      ? 'Nenhum orientador com pendências no momento.'
                      : `${sugestao.length} orientador(es) com pendências — já pré-selecionados abaixo`}
                  </p>
                )}
              </div>
            </button>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Complementar dados cadastrais dos bolsistas"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={3}
                placeholder="Detalhe o que precisa ser feito…"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TIPOS_SOLICITACAO.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prazo (opcional)</label>
                <input
                  type="date"
                  value={dataLimite}
                  onChange={e => setDataLimite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Botão de ação no Portal (opcional)</label>
              <select
                value={linkAcao}
                onChange={e => setLinkAcao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LINKS_ACAO.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700">Enviar para</label>
                <button
                  onClick={() => setIdsSelecionados(
                    idsSelecionados.length === orientadores.length ? [] : orientadores.map(o => o.orientador.id)
                  )}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {idsSelecionados.length === orientadores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                {orientadores.map(({ orientador }) => (
                  <label key={orientador.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={idsSelecionados.includes(orientador.id)}
                      onChange={() => toggleSelecionado(orientador.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-gray-700">{orientador.nome_completo}</span>
                    <span className="text-gray-400">{orientador.codigo_orientador}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{idsSelecionados.length} selecionado(s)</p>
            </div>
          </div>
        )}

        {/* ── Aba: Histórico ── */}
        {aba === 'historico' && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingLista ? (
              <p className="text-xs text-gray-400 text-center py-8">Carregando…</p>
            ) : solicitacoes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Nenhuma solicitação enviada ainda.</p>
            ) : (
              <div className="space-y-2">
                {solicitacoes.map(s => (
                  <div key={s.id} className="border border-gray-200 rounded-lg px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{s.titulo}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {s.orientador?.nome_completo} · {s.orientador?.codigo_orientador}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        s.status === 'atendida'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {s.status === 'atendida' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {s.status === 'atendida' ? 'Atendida' : 'Pendente'}
                      </span>
                    </div>
                    {s.descricao && (
                      <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">{s.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                      <span>Enviada em {formatarData(s.created_at)}</span>
                      {s.data_limite && <span>· Prazo: {formatarData(s.data_limite)}</span>}
                      {s.atendida_em && <span>· Atendida em {formatarData(s.atendida_em)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer (só na aba Nova) */}
        {aba === 'nova' && (
          <div className="px-5 py-3.5 border-t border-gray-100">
            <button
              onClick={handleEnviar}
              disabled={!podeEnviar}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2.5 transition-colors"
            >
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {enviando ? 'Enviando…' : `Enviar solicitação${idsSelecionados.length > 1 ? ` (${idsSelecionados.length})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
