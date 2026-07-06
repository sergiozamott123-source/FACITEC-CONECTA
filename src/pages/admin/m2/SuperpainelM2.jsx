import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Bell, FileText, FileCheck, ChevronRight, RefreshCw, Users, AlertCircle, CheckCircle2, Scroll, Download, FileSpreadsheet, MessageSquarePlus } from 'lucide-react'
import { buscarDadosRelatorioFinanceiro, exportarExcelFinanceiro, exportarPDFFinanceiro } from '@/lib/relatorioFinanceiro'
import { SolicitacoesModal } from './SolicitacoesModal'

// ── DOCS ─────────────────────────────────────────────────────────────────────
const DOCS_BASE = ['doc_identidade_aluno', 'doc_declaracao_matricula', 'doc_anuencia_direcao', 'doc_autorizacao_imagem']
const DOCS_MENOR = ['doc_autorizacao_responsavel', 'doc_identidade_responsavel']

const STEP_LABELS = ['Acesso', 'Dados pessoais', 'Equipe/docs', 'Contrato', 'Termos', 'Relatórios']

const CONTRACT_LABELS = {
  aguardando_dados:  'Aguardando',
  aguardando_equipe: 'Ag. equipe',
  pronto:            'Pronto',
  emitido:           'Emitido',
  assinado:          'Assinado',
}

const FILTROS = [
  { key: 'todos',           label: 'Todos' },
  { key: 'docs_pendentes',  label: 'Docs pendentes' },
  { key: 'contrato_pronto', label: 'Contrato pronto' },
  { key: 'concluido',       label: 'Concluído' },
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
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

function calcStatusBolsista(b) {
  const baseDocs = DOCS_BASE.map(k => b[k])
  const menorDocs = isMenor(b.data_nascimento) ? DOCS_MENOR.map(k => b[k]) : []
  const all = [...baseDocs, ...menorDocs]
  if (all.every(Boolean)) return 'completo'
  if (all.some(Boolean)) return 'pendente'
  return 'incompleto'
}

function calcSteps(item) {
  const { orientador, bolsistas, contrato } = item
  const step1 = true
  const step2 = !!(orientador.cpf && orientador.doc_identidade && orientador.doc_diploma)
  const step3 = bolsistas.length > 0 && bolsistas.every(b => calcStatusBolsista(b) === 'completo')
  const step4 = !!(contrato?.status === 'emitido' || contrato?.status === 'assinado')
  const step5 = bolsistas.length > 0 && bolsistas.every(b => !!b.nome_arquivo_termo)
  const step6 = false // Relatórios — ainda não implementado (M3)
  return [step1, step2, step3, step4, step5, step6]
}

function calcStatusOrientador(item) {
  const { bolsistas, contrato } = item
  const allComplete = bolsistas.length > 0 && bolsistas.every(b => calcStatusBolsista(b) === 'completo')
  const contratoGerado = contrato?.status === 'emitido' || contrato?.status === 'assinado'
  if (contratoGerado) return 'concluido'
  if (allComplete) return 'contrato_pronto'
  return 'docs_pendentes'
}

function iniciais(nome) {
  if (!nome) return '?'
  return nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, valueColor, bg, border }) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 flex items-center gap-3`}>
      <div className="shrink-0">
        <Icon className={`w-5 h-5 ${valueColor}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ProgressBar({ steps }) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((done, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className={`h-1.5 w-full rounded-full ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
            <p className="text-[9px] text-gray-400 mt-1 text-center leading-none whitespace-nowrap">
              {STEP_LABELS[i]}
            </p>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className="w-2.5 h-2.5 text-gray-300 shrink-0 mb-3.5" />
          )}
        </div>
      ))}
    </div>
  )
}

function TipoBadge({ tipo }) {
  const cfg = tipo === 'voluntario'
    ? { label: 'Voluntário', cls: 'bg-purple-50 text-purple-700 border-purple-200' }
    : { label: 'Titular',    cls: 'bg-blue-50 text-blue-700 border-blue-200' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function StatusBolsistaBadge({ status }) {
  const cfg = {
    completo:   { label: 'Completo',   cls: 'bg-green-50 text-green-700 border-green-200' },
    pendente:   { label: 'Pendente',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    incompleto: { label: 'Incompleto', cls: 'bg-red-50 text-red-700 border-red-200' },
  }[status]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function OrientadorCard({ item, ano, onGerarRelatorio, gerando }) {
  const navigate = useNavigate()
  const { orientador, projeto, bolsistas, contrato } = item
  const steps = calcSteps(item)
  const completoCount = bolsistas.filter(b => calcStatusBolsista(b) === 'completo').length
  const contratoGerado = contrato?.status === 'emitido' || contrato?.status === 'assinado'
  const contratoLabel = contrato?.status ? (CONTRACT_LABELS[contrato.status] ?? contrato.status) : '—'
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-indigo-700 text-sm font-bold">{iniciais(orientador.nome_completo)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{orientador.nome_completo}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
              {orientador.codigo_orientador}
            </span>
            {projeto ? (
              <span className="text-xs text-gray-400 truncate">{projeto.titulo}</span>
            ) : (
              <span className="text-xs text-amber-500 italic">Sem projeto selecionado</span>
            )}
          </div>
        </div>
        {bolsistas.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuAberto(v => !v)}
              disabled={gerando}
              title="Relatório Financeiro deste grupo"
              className="w-8 h-8 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                  <button
                    onClick={() => { setMenuAberto(false); onGerarRelatorio('pdf', [orientador.id]) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    PDF deste grupo
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setMenuAberto(false); onGerarRelatorio('excel', [orientador.id]) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    Excel deste grupo
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Barra de progresso ── */}
      <div className="px-5 pt-3 pb-4 border-b border-gray-100">
        <ProgressBar steps={steps} />
      </div>

      {/* ── Grid de bolsistas ── */}
      <div className="px-5 py-4 flex-1">
        {bolsistas.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            Nenhum bolsista cadastrado
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {bolsistas.map(b => {
              const st = calcStatusBolsista(b)
              const clicavel = !!b.codigo_bolsista
              return (
                <div
                  key={b.id}
                  onClick={() => clicavel && navigate(`/admin/pibic-jr/${ano}/m2/bolsista/${b.codigo_bolsista}`)}
                  className={`border border-gray-100 rounded-lg p-2.5 bg-gray-50 space-y-1 transition-colors ${
                    clicavel ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200' : ''
                  }`}
                >
                  <p className="text-[10px] font-mono text-gray-400 leading-none">
                    {b.codigo_bolsista ?? '—'}
                  </p>
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {b.nome_completo || <span className="italic text-gray-400">Sem nome</span>}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <TipoBadge tipo={b.tipo} />
                    <StatusBolsistaBadge status={st} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Rodapé ── */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Counters */}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>
              <span className="font-semibold text-gray-800">{bolsistas.length}</span>/8 bolsistas
            </span>
            <span>
              <span className="font-semibold text-gray-800">{completoCount}</span> docs completos
            </span>
            <span>
              Contrato:{' '}
              <span className={`font-semibold ${contratoGerado ? 'text-green-700' : 'text-gray-500'}`}>
                {contratoLabel}
              </span>
            </span>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              title="Avisar orientador"
            >
              <Bell className="w-3 h-3" />
              Avisar
            </button>
            <button
              onClick={() => projeto && navigate(`/admin/pibic-jr/${ano}/m2/contratos/${projeto.id}`)}
              disabled={!projeto}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-3 h-3" />
              Gerar contrato
            </button>
            <button
              disabled={!contratoGerado}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={!contratoGerado ? 'Gere o contrato primeiro' : 'Gerar termos de compromisso'}
            >
              <FileCheck className="w-3 h-3" />
              Gerar termos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SuperpainelM2() {
  const { ano = '2026' } = useParams()
  const navigate = useNavigate()

  const [orientadores, setOrientadores] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [filtro, setFiltro]             = useState('todos')
  const [gerandoRelatorio, setGerandoRelatorio]        = useState(false)
  const [modalSelecaoAberto, setModalSelecaoAberto]    = useState(false)
  const [idsSelecionados, setIdsSelecionados]          = useState([])
  const [modalSolicitacoesAberto, setModalSolicitacoesAberto] = useState(false)

  useEffect(() => { fetchDados() }, [])

  async function fetchDados() {
    setLoading(true)
    setError(null)
    try {
      // 1 — orientadores com código atribuído
      const { data: orientData, error: e1 } = await supabase
        .from('orientador')
        .select('id, nome_completo, codigo_orientador, email, cpf, doc_identidade, doc_diploma')
        .not('codigo_orientador', 'is', null)
        .order('codigo_orientador', { ascending: true })
      if (e1) throw e1

      if (!orientData?.length) { setOrientadores([]); setLoading(false); return }

      const orientIds = orientData.map(o => o.id)

      // 2 — projetos selecionados desses orientadores
      const { data: projData, error: e2 } = await supabase
        .from('projeto')
        .select('id, titulo, codigo, orientador_id')
        .in('orientador_id', orientIds)
        .eq('status', 'selecionado')
      if (e2) throw e2

      const projetoMap = Object.fromEntries((projData ?? []).map(p => [p.orientador_id, p]))
      const projetoIds = (projData ?? []).map(p => p.id)

      // 3 — bolsistas ativos
      let bolsistasByProjeto = {}
      if (projetoIds.length > 0) {
        const { data: bolsistaData, error: e3 } = await supabase
          .from('bolsista')
          .select([
            'id', 'nome_completo', 'codigo_bolsista', 'tipo', 'data_nascimento', 'projeto_id',
            'doc_identidade_aluno', 'doc_declaracao_matricula', 'doc_anuencia_direcao',
            'doc_autorizacao_imagem', 'doc_autorizacao_responsavel', 'doc_identidade_responsavel',
            'nome_arquivo_termo',
          ].join(', '))
          .in('projeto_id', projetoIds)
          .eq('status', 'ativo')
          .order('created_at', { ascending: true })
        if (e3) throw e3
        ;(bolsistaData ?? []).forEach(b => {
          if (!bolsistasByProjeto[b.projeto_id]) bolsistasByProjeto[b.projeto_id] = []
          bolsistasByProjeto[b.projeto_id].push(b)
        })
      }

      // 4 — contratos
      let contratoByProjeto = {}
      if (projetoIds.length > 0) {
        const { data: contratoData, error: e4 } = await supabase
          .from('contrato')
          .select('id, projeto_id, status, numero_contrato')
          .in('projeto_id', projetoIds)
        if (e4) throw e4
        ;(contratoData ?? []).forEach(c => { contratoByProjeto[c.projeto_id] = c })
      }

      // merge em memória
      const merged = orientData.map(o => {
        const projeto   = projetoMap[o.id] ?? null
        const bolsistas = projeto ? (bolsistasByProjeto[projeto.id] ?? []) : []
        const contrato  = projeto ? (contratoByProjeto[projeto.id] ?? null) : null
        return { orientador: o, projeto, bolsistas, contrato }
      })

      setOrientadores(merged)
    } catch (err) {
      setError(`Erro ao carregar dados: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Métricas ──
  const totalOrientadores = orientadores.length
  const docsPendentes = orientadores.filter(item =>
    item.bolsistas.length === 0 || item.bolsistas.some(b => calcStatusBolsista(b) !== 'completo')
  ).length
  const contratosProntos = orientadores.filter(item =>
    item.contrato?.status === 'emitido' || item.contrato?.status === 'assinado'
  ).length
  const termosGerados = orientadores.reduce(
    (total, item) => total + item.bolsistas.filter(b => !!b.nome_arquivo_termo).length,
    0
  )

  async function handleGerarRelatorio(formato, orientadorIds = null) {
    setModalSelecaoAberto(false)
    setGerandoRelatorio(true)
    setError(null)
    try {
      const linhas = await buscarDadosRelatorioFinanceiro(ano, orientadorIds)
      if (!linhas.length) {
        setError('Nenhum bolsista ativo encontrado para gerar o relatório.')
        return
      }
      if (formato === 'excel') exportarExcelFinanceiro(linhas, ano)
      else exportarPDFFinanceiro(linhas, ano)
    } catch (err) {
      setError(`Erro ao gerar relatório: ${err.message}`)
    } finally {
      setGerandoRelatorio(false)
    }
  }

  function abrirModalSelecao() {
    setIdsSelecionados(orientadores.map(o => o.orientador.id)) // todos marcados por padrão
    setModalSelecaoAberto(true)
  }

  function toggleSelecionado(id) {
    setIdsSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // ── Filtro ──
  const orientadoresFiltrados = filtro === 'todos'
    ? orientadores
    : orientadores.filter(item => calcStatusOrientador(item) === filtro)

  // ── Contagem por filtro ──
  const countByFiltro = {
    docs_pendentes:  orientadores.filter(i => calcStatusOrientador(i) === 'docs_pendentes').length,
    contrato_pronto: orientadores.filter(i => calcStatusOrientador(i) === 'contrato_pronto').length,
    concluido:       orientadores.filter(i => calcStatusOrientador(i) === 'concluido').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ background: '#1a2744' }} className="px-8 pt-6 pb-7">
        <button
          onClick={() => navigate('/pibic-jr')}
          className="text-xs text-white/40 hover:text-white/70 mb-4 flex items-center gap-1.5 transition-colors"
        >
          ← PibicJr
        </button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
              M2 · ORGANIZAÇÃO
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight">Superpainel</h1>
            <p className="text-sm text-white/40 mt-1">
              PibicJr · Edição {ano} · {loading ? '…' : `${totalOrientadores} orientadores`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={abrirModalSelecao}
                disabled={gerandoRelatorio}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600/90 border border-emerald-400/30 rounded-lg px-3 py-1.5 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                <Download className={`w-3.5 h-3.5 ${gerandoRelatorio ? 'animate-pulse' : ''}`} />
                {gerandoRelatorio ? 'Gerando…' : 'Relatório Financeiro'}
              </button>
            </div>
            <button
              onClick={() => setModalSolicitacoesAberto(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600/90 border border-indigo-400/30 rounded-lg px-3 py-1.5 hover:bg-indigo-600 transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Solicitações
            </button>
            <button
              onClick={() => navigate(`/admin/pibic-jr/${ano}/m2/contratos`)}
              className="text-xs font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              Ver contratos
            </button>
            <button
              onClick={fetchDados}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-7 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ── Métricas ──────────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              icon={Users}
              label="Total de orientadores"
              value={totalOrientadores}
              valueColor="text-blue-600"
              bg="bg-blue-50"
              border="border-blue-200"
            />
            <MetricCard
              icon={AlertCircle}
              label="Docs pendentes"
              value={docsPendentes}
              valueColor="text-amber-600"
              bg="bg-amber-50"
              border="border-amber-200"
            />
            <MetricCard
              icon={FileText}
              label="Contratos prontos/emitidos"
              value={contratosProntos}
              valueColor="text-indigo-600"
              bg="bg-indigo-50"
              border="border-indigo-200"
            />
            <MetricCard
              icon={Scroll}
              label="Termos gerados"
              value={termosGerados}
              valueColor="text-green-600"
              bg="bg-green-50"
              border="border-green-200"
            />
          </div>
        )}

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filtro === f.key
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.key !== 'todos' && !loading && (
                <span className="ml-1.5 opacity-70">({countByFiltro[f.key] ?? 0})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Cards ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Carregando orientadores…
          </div>
        ) : orientadoresFiltrados.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Nenhum orientador neste filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {orientadoresFiltrados.map(item => (
              <OrientadorCard key={item.orientador.id} item={item} ano={ano} onGerarRelatorio={handleGerarRelatorio} gerando={gerandoRelatorio} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de seleção de grupos para o Relatório Financeiro ──────── */}
      {modalSelecaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalSelecaoAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Relatório Financeiro</h2>
              <p className="text-xs text-gray-400 mt-0.5">Selecione o(s) grupo(s) de orientador para incluir no relatório</p>
            </div>

            <div className="px-5 py-3 border-b border-gray-100">
              <button
                onClick={() => setIdsSelecionados(
                  idsSelecionados.length === orientadores.length ? [] : orientadores.map(o => o.orientador.id)
                )}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {idsSelecionados.length === orientadores.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
              {orientadores.map(({ orientador, bolsistas }) => (
                <label
                  key={orientador.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={idsSelecionados.includes(orientador.id)}
                    onChange={() => toggleSelecionado(orientador.id)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{orientador.nome_completo}</p>
                    <p className="text-[10px] text-gray-400">{orientador.codigo_orientador} · {bolsistas.length} bolsista(s)</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <p className="text-[10px] text-gray-400 mb-1">
                {idsSelecionados.length} de {orientadores.length} grupo(s) selecionado(s)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGerarRelatorio('pdf', idsSelecionados)}
                  disabled={idsSelecionados.length === 0 || gerandoRelatorio}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => handleGerarRelatorio('excel', idsSelecionados)}
                  disabled={idsSelecionados.length === 0 || gerandoRelatorio}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>
              </div>
              <button
                onClick={() => setModalSelecaoAberto(false)}
                className="w-full text-xs font-medium text-gray-400 hover:text-gray-600 py-1.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSolicitacoesAberto && (
        <SolicitacoesModal
          orientadores={orientadores}
          ano={ano}
          onClose={() => setModalSolicitacoesAberto(false)}
        />
      )}
    </div>
  )
}
