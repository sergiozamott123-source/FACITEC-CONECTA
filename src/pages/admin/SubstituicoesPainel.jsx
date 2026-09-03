// src/pages/admin/SubstituicoesPainel.jsx
//
// Painel da Secretaria Executiva para os pedidos de substituição de
// bolsista feitos pelos orientadores. Cada pedido só vira uma troca de
// verdade (novo bolsista criado, antigo marcado como substituído) depois
// que a Secretaria aprova aqui — ver funções solicitar_substituicao /
// aprovar_substituicao / recusar_substituicao no banco.

import { useEffect, useState } from 'react'
import {
  ArrowLeftRight, CheckCircle, XCircle, Clock, FileText, AlertTriangle,
  ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const DOCS_BASE = [
  { key: 'doc_identidade_aluno',     label: 'Identidade com foto e CPF do aluno' },
  { key: 'doc_declaracao_matricula', label: 'Comprovante de matrícula' },
  { key: 'doc_anuencia_direcao',     label: 'Declaração de anuência da direção' },
  { key: 'doc_autorizacao_imagem',   label: 'Autorização de uso de imagem' },
]
const DOCS_MENOR = [
  { key: 'doc_autorizacao_responsavel', label: 'Autorização do responsável' },
  { key: 'doc_identidade_responsavel',  label: 'Identidade com foto e CPF do responsável' },
]

function calcIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function isMenor(dataNasc) {
  const idade = calcIdade(dataNasc)
  return idade !== null && idade < 18
}

function formatarDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const SELECT_SOLICITACAO = `
  *,
  orientador:orientador_id ( nome_completo, codigo_orientador ),
  projeto:projeto_id ( titulo ),
  bolsista_saiu:bolsista_saiu_id ( nome_completo, codigo_bolsista ),
  bolsista_entrou:bolsista_entrou_id ( * )
`

function RecusarModal({ solicitacao, onConfirm, onClose, saving, erro }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Recusar substituição</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {solicitacao.bolsista_saiu?.nome_completo} · {solicitacao.orientador?.nome_completo}
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

function CampoComparacao({ label, saiu, entrou }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div>
        <p className="text-gray-400 uppercase tracking-wide text-[10px]">{label} · saiu</p>
        <p className="text-gray-700">{saiu || '—'}</p>
      </div>
      <div>
        <p className="text-gray-400 uppercase tracking-wide text-[10px]">{label} · vai entrar</p>
        <p className="text-gray-900 font-medium">{entrou || '—'}</p>
      </div>
    </div>
  )
}

function PendenteCard({ solicitacao, onAprovar, onRecusar, aprovando }) {
  const [aberto, setAberto] = useState(false)
  const novo = solicitacao.novo_dados || {}

  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50/40 transition-colors" onClick={() => setAberto(v => !v)}>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <ArrowLeftRight className="w-4 h-4 text-blue-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {solicitacao.bolsista_saiu?.nome_completo} <span className="text-gray-400 font-normal">→</span> {novo.nome_completo}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {solicitacao.orientador?.nome_completo} · {solicitacao.orientador?.codigo_orientador} · pedido em {formatarDataHora(solicitacao.created_at)}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
          <Clock className="w-3 h-3" /> Pendente
        </span>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      {aberto && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Motivo informado pelo orientador</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">{solicitacao.motivo}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Projeto</p>
            <p className="text-sm text-gray-700">{solicitacao.projeto?.titulo || '—'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comparação</p>
            <CampoComparacao label="Nome" saiu={solicitacao.bolsista_saiu?.nome_completo} entrou={novo.nome_completo} />
            <CampoComparacao label="CPF" saiu={null} entrou={novo.cpf} />
            <CampoComparacao label="Data de nascimento" saiu={null} entrou={novo.data_nascimento?.split('-').reverse().join('/')} />
            <CampoComparacao label="Ano/série" saiu={null} entrou={novo.ano_serie} />
            {isMenor(novo.data_nascimento) && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Menor de idade — responsável: {novo.nome_responsavel || '—'} ({novo.vinculo_responsavel || '—'})</span>
              </div>
            )}
          </div>

          <a
            href={solicitacao.oficio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-100 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Baixar ofício anexado
            <ExternalLink className="w-3 h-3" />
          </a>

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
        </div>
      )}
    </div>
  )
}

function HistoricoLinha({ solicitacao }) {
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
          {solicitacao.bolsista_saiu?.nome_completo} <span className="text-gray-400">→</span>{' '}
          {solicitacao.bolsista_entrou?.nome_completo || solicitacao.novo_dados?.nome_completo}
        </p>
        <p className="text-xs text-gray-400">
          {solicitacao.orientador?.nome_completo} · decidido em {formatarDataHora(solicitacao.decidido_em)}
        </p>
        {!aprovada && solicitacao.motivo_recusa && (
          <p className="text-xs text-red-700 mt-1">Motivo da recusa: {solicitacao.motivo_recusa}</p>
        )}
      </div>
    </div>
  )
}

function DocumentosSubstitutoCard({ bolsista }) {
  const menor = isMenor(bolsista.data_nascimento)
  const docs = [...DOCS_BASE, ...(menor ? DOCS_MENOR : [])]
  const faltando = docs.filter(d => !bolsista[d.key])
  const completo = faltando.length === 0

  return (
    <div className={`rounded-lg border px-4 py-3 ${completo ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{bolsista.nome_completo}</p>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          completo ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
        }`}>
          {completo ? 'Documentos completos' : `Faltam ${faltando.length}`}
        </span>
      </div>
      <p className="text-xs text-gray-500">{bolsista.codigo_bolsista}</p>
      {!completo && (
        <ul className="mt-2 space-y-0.5">
          {faltando.map(d => (
            <li key={d.key} className="text-xs text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {d.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SubstituicoesPainel() {
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
    const [{ data: pend, error: e1 }, { data: hist, error: e2 }] = await Promise.all([
      supabase.from('solicitacao_substituicao').select(SELECT_SOLICITACAO).eq('status', 'pendente').order('created_at', { ascending: true }),
      supabase.from('solicitacao_substituicao').select(SELECT_SOLICITACAO).in('status', ['aprovada', 'recusada']).order('decidido_em', { ascending: false }).limit(50),
    ])
    if (e1 || e2) setErro((e1 || e2).message)
    setPendentes(pend ?? [])
    setHistorico(hist ?? [])
    setLoading(false)
  }

  async function handleAprovar(solicitacao) {
    if (!window.confirm(`Aprovar a substituição de ${solicitacao.bolsista_saiu?.nome_completo} por ${solicitacao.novo_dados?.nome_completo}?`)) return
    setAprovandoId(solicitacao.id)
    setErro(null)
    try {
      const { error: err } = await supabase.rpc('aprovar_substituicao', { p_solicitacao_id: solicitacao.id })
      if (err) throw new Error(err.message)
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
      const { error: err } = await supabase.rpc('recusar_substituicao', {
        p_solicitacao_id: recusarAlvo.id,
        p_motivo_recusa: motivo,
      })
      if (err) throw new Error(err.message)
      setRecusarAlvo(null)
      await carregar()
    } catch (err) {
      setErroRecusa(err.message ?? 'Erro ao recusar substituição.')
    } finally {
      setRecusando(false)
    }
  }

  const substitutos = historico
    .filter(s => s.status === 'aprovada' && s.bolsista_entrou)
    .map(s => s.bolsista_entrou)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Substituições de bolsista</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pedidos feitos pelos orientadores — a troca só vale de verdade depois da sua aprovação aqui.
        </p>
      </div>

      {erro && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Pendentes</h2>
          {pendentes.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold">
              {pendentes.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            Nenhum pedido de substituição pendente no momento.
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map(s => (
              <PendenteCard
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

      {substitutos.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Documentos dos bolsistas substitutos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {substitutos.map(b => <DocumentosSubstitutoCard key={b.id} bolsista={b} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Histórico de decisões</h2>
        {historico.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            Nenhuma substituição decidida ainda.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {historico.map(s => <HistoricoLinha key={s.id} solicitacao={s} />)}
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
