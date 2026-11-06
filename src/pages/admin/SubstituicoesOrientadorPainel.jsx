// src/pages/admin/SubstituicoesOrientadorPainel.jsx
//
// Seção "Substituições de Orientador" dentro do painel de Substituições
// da Secretaria Executiva — mirror de PendenteCard/HistoricoLinha de
// SubstituicoesPainel.jsx (bolsista), para o pedido de substituição de
// ORIENTADOR (Edital vigente, item 16.2). Renderizada dentro de
// SubstituicoesPainel.jsx, abaixo da seção de bolsistas.

import { useEffect, useState } from 'react'
import {
  CheckCircle, XCircle, Clock, FileText, AlertTriangle,
  ExternalLink, ChevronDown, ChevronUp, PenLine, UserCheck, FileSignature,
} from 'lucide-react'
import {
  listarSolicitacoesSubstituicaoOrientadorPendentes,
  listarHistoricoSubstituicaoOrientador,
  aprovarSubstituicaoOrientador,
  recusarSubstituicaoOrientador,
} from '@/lib/substituicoesOrientador'
import { gerarTermoAditivoPdf } from '@/lib/documentosSubstituicaoOrientador'

function formatarDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const DOCS_SUBSTITUTO = [
  { key: 'doc_identidade', label: 'Identidade com foto e CPF' },
  { key: 'doc_diploma', label: 'Diploma de graduação' },
  { key: 'doc_comprovante_residencia_url', label: 'Comprovante de residência' },
  { key: 'doc_regularidade_url', label: 'Regularidade fiscal (CND)' },
]

function RecusarModal({ solicitacao, onConfirm, onClose, saving, erro }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Recusar substituição de orientador</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {solicitacao.orientador_saiu?.nome_completo} → {solicitacao.nome_substituto}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs font-medium text-gray-700">
            Motivo da recusa <span className="text-red-500">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Explique por que este pedido está sendo recusado..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {erro && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erro}</p>}
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo.trim())}
            disabled={saving || !motivo.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40"
          >
            {saving ? 'Recusando...' : 'Confirmar recusa'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentosSubstituto({ orientadorEntrou }) {
  if (!orientadorEntrou) {
    return (
      <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 flex items-start gap-2 text-xs text-gray-500">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>O substituto ainda não confirmou o convite.</span>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      {DOCS_SUBSTITUTO.map(d => (
        <div key={d.key} className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{d.label}</span>
          {orientadorEntrou[d.key] ? (
            <a
              href={orientadorEntrou[d.key]} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 font-medium hover:underline"
            >
              <FileText className="w-3 h-3" /> Ver documento <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3" /> Faltando
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function PendenteCardOrientador({ solicitacao, onAprovar, onRecusar, aprovando }) {
  const [aberto, setAberto] = useState(false)
  const aguardandoSubstituto = solicitacao.status === 'aguardando_substituto'

  return (
    <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-indigo-50/40 transition-colors" onClick={() => setAberto(v => !v)}>
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <UserCheck className="w-4 h-4 text-indigo-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {solicitacao.orientador_saiu?.nome_completo} <span className="text-gray-400 font-normal">→</span> {solicitacao.nome_substituto}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {solicitacao.projeto?.titulo} · pedido em {formatarDataHora(solicitacao.created_at)}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
          aguardandoSubstituto ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
        }`}>
          <Clock className="w-3 h-3" /> {aguardandoSubstituto ? 'Aguardando substituto' : 'Aguardando sua aprovação'}
        </span>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      {aberto && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Motivo informado</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">{solicitacao.motivo}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Orientador que sai</p>
              <p className="text-gray-700">{solicitacao.orientador_saiu?.nome_completo}</p>
              <p className="text-gray-400">{solicitacao.orientador_saiu?.codigo_orientador}</p>
              {solicitacao.orientador_saiu?.numero_contrato && (
                <p className="text-gray-400">Contrato nº {solicitacao.orientador_saiu.numero_contrato}</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Substituto</p>
              <p className="text-gray-900 font-medium">{solicitacao.orientador_entrou?.nome_completo ?? solicitacao.nome_substituto}</p>
              <p className="text-gray-400">{solicitacao.orientador_entrou?.cpf ?? solicitacao.email_substituto}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Documentos do substituto</p>
            <DocumentosSubstituto orientadorEntrou={solicitacao.orientador_entrou} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Documentos da substituição</p>
            <div className="space-y-1.5">
              {[
                { key: 'doc_desligamento_url', label: 'Solicitação de Desligamento (assinada por quem sai)' },
                { key: 'doc_anuencia_url', label: 'Declaração de Anuência da escola' },
                { key: 'doc_aceitacao_url', label: 'Declaração de Aceitação da Substituição' },
              ].map(d => (
                <div key={d.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{d.label}</span>
                  {solicitacao[d.key] ? (
                    <a
                      href={solicitacao[d.key]} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 font-medium hover:underline"
                    >
                      <FileText className="w-3 h-3" /> Ver documento <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-3 h-3" /> Faltando
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {solicitacao.orientador_entrou && (
              <button
                type="button"
                onClick={() => gerarTermoAditivoPdf({
                  projeto: solicitacao.projeto,
                  orientadorSaiu: solicitacao.orientador_saiu,
                  orientadorEntrou: solicitacao.orientador_entrou,
                  numeroEdital: solicitacao.projeto?.edicao?.numero_edital,
                  numeroContrato: solicitacao.orientador_saiu?.numero_contrato,
                })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-3 py-1.5 hover:bg-indigo-100 transition-colors"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Gerar minuta do Termo Aditivo
              </button>
            )}
            {solicitacao.assinatura_confirmada_em ? (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2.5 text-xs text-green-900 space-y-1">
                <p className="flex items-center gap-1.5 font-semibold">
                  <PenLine className="w-3.5 h-3.5 shrink-0" />
                  Manifestação de Interesse assinada por {solicitacao.assinatura_nome}
                </p>
                <p className="text-green-800">em {formatarDataHora(solicitacao.assinatura_confirmada_em)}</p>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 flex items-start gap-2 text-xs text-gray-500">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>O substituto ainda não assinou a Manifestação de Interesse.</span>
              </div>
            )}
          </div>

          {!aguardandoSubstituto && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => onAprovar(solicitacao)}
                disabled={aprovando}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {aprovando ? 'Aprovando...' : 'Aprovar substituição'}
              </button>
              <button
                onClick={() => onRecusar(solicitacao)}
                disabled={aprovando}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Recusar
              </button>
            </div>
          )}
          {aguardandoSubstituto && (
            <button
              onClick={() => onRecusar(solicitacao)}
              disabled={aprovando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancelar / recusar pedido
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function HistoricoLinhaOrientador({ solicitacao }) {
  const aprovada = solicitacao.status === 'aprovada'
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold mt-0.5 ${
        aprovada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {aprovada ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {aprovada ? 'Aprovada' : 'Recusada'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">
          {solicitacao.orientador_saiu?.nome_completo} <span className="text-gray-400">→</span>{' '}
          {solicitacao.orientador_entrou?.nome_completo || solicitacao.nome_substituto}
        </p>
        <p className="text-xs text-gray-400">
          {solicitacao.projeto?.titulo} · decidido em {formatarDataHora(solicitacao.decidido_em)}
        </p>
        {!aprovada && solicitacao.motivo_recusa && (
          <p className="text-xs text-red-700 mt-1">Motivo da recusa: {solicitacao.motivo_recusa}</p>
        )}
      </div>
    </div>
  )
}

export function SubstituicoesOrientadorPainel() {
  const [pendentes, setPendentes] = useState([])
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [aprovandoId, setAprovandoId] = useState(null)
  const [recusarAlvo, setRecusarAlvo] = useState(null)
  const [recusando, setRecusando] = useState(false)
  const [erroRecusa, setErroRecusa] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const [pend, hist] = await Promise.all([
        listarSolicitacoesSubstituicaoOrientadorPendentes(),
        listarHistoricoSubstituicaoOrientador(),
      ])
      setPendentes(pend)
      setHistorico(hist)
    } catch (err) {
      setErro(err.message ?? 'Erro ao carregar substituições de orientador.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAprovar(solicitacao) {
    if (!window.confirm(`Aprovar a substituição de ${solicitacao.orientador_saiu?.nome_completo} por ${solicitacao.orientador_entrou?.nome_completo}?`)) return
    setAprovandoId(solicitacao.id)
    setErro(null)
    try {
      await aprovarSubstituicaoOrientador(solicitacao.id)
      await carregar()
    } catch (err) {
      setErro(err.message ?? 'Erro ao aprovar substituição.')
    } finally {
      setAprovandoId(null)
    }
  }

  async function handleConfirmarRecusa(motivo) {
    setRecusando(true)
    setErroRecusa(null)
    try {
      await recusarSubstituicaoOrientador(recusarAlvo.id, motivo)
      setRecusarAlvo(null)
      await carregar()
    } catch (err) {
      setErroRecusa(err.message ?? 'Erro ao recusar substituição.')
    } finally {
      setRecusando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Substituições de orientador</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pedidos de substituição de orientador (Edital vigente, item 16.2) — o substituto preenche os próprios dados por
          convite; a troca só vale de verdade depois da sua aprovação aqui.
        </p>
      </div>

      {erro && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Pendentes</h2>
          {pendentes.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
              {pendentes.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            Nenhum pedido de substituição de orientador pendente no momento.
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map(s => (
              <PendenteCardOrientador
                key={s.id}
                solicitacao={s}
                onAprovar={handleAprovar}
                onRecusar={setRecusarAlvo}
                aprovando={aprovandoId === s.id}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Histórico de decisões</h2>
        {historico.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            Nenhuma substituição de orientador decidida ainda.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {historico.map(s => <HistoricoLinhaOrientador key={s.id} solicitacao={s} />)}
          </div>
        )}
      </div>

      {recusarAlvo && (
        <RecusarModal
          solicitacao={recusarAlvo}
          onConfirm={handleConfirmarRecusa}
          onClose={() => { setRecusarAlvo(null); setErroRecusa(null) }}
          saving={recusando}
          erro={erroRecusa}
        />
      )}
    </div>
  )
}
