import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown, DollarSign, FileCheck2, FileSignature, ClipboardCheck,
  CheckCircle2, Clock, AlertTriangle, Download, Loader2, ExternalLink,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { pagamentoService } from '@/lib/db'
import { buscarDadosRelatorioFinanceiro, exportarPDFFinanceiro, exportarExcelFinanceiro } from '@/lib/relatorioFinanceiro'
import { listarCiclos, statusRelatorioNoCiclo } from '@/lib/relatorioMensal'
import { gerarPDFRelatorioMensal } from '@/lib/relatorioMensalPdf'
import { computarRanking, CONSENSO_VARIANT } from '@/lib/classificacaoRanking'

const STATUS_INFO = {
  enviado: { label: 'Enviado', variant: 'success' },
  enviado_atrasado: { label: 'Enviado (atraso)', variant: 'warning' },
  atrasado: { label: 'Atrasado', variant: 'destructive' },
  pendente: { label: 'Pendente', variant: 'secondary' },
}

function fmtMoeda(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0)
}

function LoadingInline() {
  return <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
}

function ErroInline({ msg }) {
  if (!msg) return null
  return <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">{msg}</div>
}

function MiniStat({ icon: Icon, label, value, tone = 'slate' }) {
  const toneIcon = {
    slate: 'text-foreground',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }[tone]
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className={`w-3.5 h-3.5 ${toneIcon}`} />}
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}

function VerTelaCompleta({ to, children }) {
  return (
    <Link to={to} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
      {children} <ExternalLink className="w-3 h-3" />
    </Link>
  )
}

// ── Card expansível genérico (mesmo padrão visual dos grupos de Bolsistas) ──
function RelatorioCard({ icon: Icon, iconBg, iconColor, title, headerRight, expanded, onToggle, children }) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center w-9 h-9 rounded-full ${iconBg} shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <p className="font-medium text-sm text-foreground truncate">{title}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {headerRight}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {children != null && (
        <div className={expanded ? 'border-t border-border px-4 py-4 space-y-4' : 'hidden'}>
          {children}
        </div>
      )}
    </Card>
  )
}

// ── Card 1 — Financeiro ──────────────────────────────────────────────────────
function FinanceiroBody({ ano }) {
  const [orientadores, setOrientadores] = useState([])
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [orientadorId, setOrientadorId] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [exportando, setExportando] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('orientador').select('id, nome_completo').not('codigo_orientador', 'is', null).order('nome_completo'),
      pagamentoService.list(),
    ]).then(([oRes, pRes]) => {
      setOrientadores(oRes.data ?? [])
      setPagamentos(pRes.data ?? [])
    }).catch(() => setErro('Não foi possível carregar os dados financeiros.'))
      .finally(() => setLoading(false))
  }, [])

  const periodos = useMemo(
    () => [...new Set(pagamentos.map(p => p.mes_referencia).filter(Boolean))].sort(),
    [pagamentos],
  )

  const pagamentosFiltrados = useMemo(() => pagamentos.filter(p => {
    if (orientadorId && String(p.bolsista?.orientador_id ?? '') !== orientadorId) return false
    if (periodo && p.mes_referencia !== periodo) return false
    return true
  }), [pagamentos, orientadorId, periodo])

  const totalPago = pagamentosFiltrados.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor ?? 0), 0)
  const totalPendente = pagamentosFiltrados.filter(p => ['pendente', 'agendado'].includes(p.status)).reduce((s, p) => s + Number(p.valor ?? 0), 0)

  async function handleExportar(formato) {
    setExportando(formato)
    setErro(null)
    try {
      const orientadorIds = orientadorId ? [Number(orientadorId)] : null
      const linhas = await buscarDadosRelatorioFinanceiro(ano, orientadorIds)
      if (!linhas.length) { setErro('Nenhum bolsista ativo encontrado para gerar o relatório.'); return }
      if (formato === 'excel') exportarExcelFinanceiro(linhas, ano)
      else exportarPDFFinanceiro(linhas, ano)
    } catch {
      setErro('Não foi possível gerar o relatório financeiro.')
    } finally {
      setExportando(null)
    }
  }

  if (loading) return <LoadingInline />

  return (
    <>
      <ErroInline msg={erro} />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={orientadorId}
          onChange={e => setOrientadorId(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Todos os orientadores</option>
          {orientadores.map(o => <option key={o.id} value={o.id}>{o.nome_completo}</option>)}
        </select>
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          <option value="">Todos os períodos</option>
          {periodos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={!!exportando} onClick={() => handleExportar('pdf')}>
            {exportando === 'pdf' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" disabled={!!exportando} onClick={() => handleExportar('excel')}>
            {exportando === 'excel' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            Exportar Excel
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Total pago" value={fmtMoeda(totalPago)} />
        <MiniStat label="A pagar / pendente" value={fmtMoeda(totalPendente)} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Totais calculados sobre os pagamentos cadastrados na tela Financeiro. A exportação em PDF/Excel traz os dados cadastrais completos dos bolsistas para a Gerência Financeira.
      </p>
      <VerTelaCompleta to={`/admin/pibic-jr/${ano}/m2`}>Abrir relatório completo (Superpainel M2)</VerTelaCompleta>
    </>
  )
}

// ── Card 2 — Relatório Mensal (Obrigações do Orientador) ────────────────────
function RelatorioMensalBody({ edicaoId, ciclosIniciais }) {
  const [ciclos, setCiclos] = useState(ciclosIniciais ?? null)
  const [cicloId, setCicloId] = useState(null)
  const [orientadores, setOrientadores] = useState([])
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [exportandoLote, setExportandoLote] = useState(false)

  useEffect(() => {
    if (!edicaoId) return
    async function boot() {
      let lista = ciclos
      if (!lista) {
        lista = await listarCiclos(edicaoId)
        setCiclos(lista)
      }
      const hoje = new Date().toISOString().slice(0, 10)
      const vigente = lista.find(c => hoje >= c.data_abertura && hoje <= c.data_fechamento)
        ?? [...lista].reverse().find(c => hoje >= c.data_abertura)
        ?? lista[0]
      setCicloId(vigente?.id ?? null)
    }
    boot().catch(() => setErro('Erro ao carregar os ciclos do relatório mensal.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId])

  async function carregarStatus() {
    setLoading(true)
    try {
      const [pRes, rRes] = await Promise.all([
        supabase
          .from('projeto')
          .select('id, titulo, orientador:orientador_id(id, nome_completo, codigo_orientador)')
          .eq('edicao_id', edicaoId)
          .eq('status', 'selecionado'),
        supabase.from('relatorio_mensal').select('*').eq('ciclo_id', cicloId),
      ])
      setOrientadores((pRes.data ?? []).filter(p => p.orientador).map(p => ({ ...p.orientador, projeto: p.titulo })))
      setRelatorios(rRes.data ?? [])
    } catch {
      setErro('Erro ao carregar o status dos relatórios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!cicloId || !edicaoId) return
    carregarStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cicloId, edicaoId])

  const cicloSelecionado = (ciclos ?? []).find(c => c.id === cicloId) ?? null

  const linhas = useMemo(() => {
    if (!cicloSelecionado) return []
    return orientadores.map(o => {
      const relatorio = relatorios.find(r => r.orientador_id === o.id) ?? null
      return { orientador: o, relatorio, status: statusRelatorioNoCiclo(cicloSelecionado, relatorio) }
    })
  }, [orientadores, relatorios, cicloSelecionado])

  const resumo = useMemo(() => ({
    enviados: linhas.filter(l => l.status === 'enviado' || l.status === 'enviado_atrasado').length,
    pendentes: linhas.filter(l => l.status === 'pendente').length,
    atrasados: linhas.filter(l => l.status === 'atrasado').length,
  }), [linhas])

  async function handleExportarTodos() {
    const enviados = linhas.filter(l => l.relatorio?.status === 'enviado')
    if (!enviados.length || !cicloSelecionado) return
    setExportandoLote(true)
    try {
      const idsBolsistas = [...new Set(enviados.flatMap(l => (l.relatorio.frequencia_bolsistas ?? []).map(f => f.bolsista_id)))]
      let nomes = {}
      if (idsBolsistas.length) {
        const { data } = await supabase.from('bolsista').select('id, nome_completo').in('id', idsBolsistas)
        nomes = Object.fromEntries((data ?? []).map(b => [b.id, b.nome_completo]))
      }
      for (const l of enviados) {
        await gerarPDFRelatorioMensal({
          relatorio: l.relatorio,
          ciclo: cicloSelecionado,
          orientador: l.orientador,
          projetoTitulo: l.orientador?.projeto,
          nomesBolsistas: nomes,
        })
        await new Promise(resolve => setTimeout(resolve, 350))
      }
    } catch {
      setErro('Não foi possível exportar os relatórios em lote.')
    } finally {
      setExportandoLote(false)
    }
  }

  if (!edicaoId || !ciclos) return <LoadingInline />

  return (
    <>
      <ErroInline msg={erro} />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={cicloId ?? ''}
          onChange={e => setCicloId(Number(e.target.value))}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {ciclos.map(c => <option key={c.id} value={c.id}>Ciclo {c.numero_ciclo} — {c.mes_referencia}</option>)}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={exportandoLote || resumo.enviados === 0}
          onClick={handleExportarTodos}
        >
          {exportandoLote ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
          {exportandoLote ? 'Exportando...' : `Exportar todos enviados (${resumo.enviados})`}
        </Button>
      </div>
      {loading ? <LoadingInline /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={CheckCircle2} label="Enviados" value={resumo.enviados} tone="green" />
            <MiniStat icon={Clock} label="Pendentes" value={resumo.pendentes} tone="amber" />
            <MiniStat icon={AlertTriangle} label="Atrasados" value={resumo.atrasados} tone="red" />
          </div>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {linhas.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum orientador com projeto selecionado nesta edição.</p>}
            {linhas.map(({ orientador, status }) => (
              <div key={orientador.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="truncate">{orientador.nome_completo}</span>
                <Badge variant={STATUS_INFO[status].variant} className="text-xs shrink-0">{STATUS_INFO[status].label}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
      <VerTelaCompleta to="/admin/relatorios-mensais">Abrir tela completa</VerTelaCompleta>
    </>
  )
}

// ── Card 3 — Contratos ───────────────────────────────────────────────────────
function ContratosBody({ orientadores, ano }) {
  if (!orientadores) return <LoadingInline />
  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {orientadores.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum orientador ativo nesta edição.</p>}
        {orientadores.map(o => (
          <div key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="truncate">{o.nome_completo}</span>
            {o.contrato_url ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Emitido
              </span>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">Pendente</span>
            )}
          </div>
        ))}
      </div>
      <VerTelaCompleta to={`/admin/pibic-jr/${ano}/m2/contratos`}>Abrir painel de contratos</VerTelaCompleta>
    </>
  )
}

// ── Card 4 — Avaliação ───────────────────────────────────────────────────────
function AvaliacaoBody({ edicaoId, statusTallyInicial }) {
  const [statusTally, setStatusTally] = useState(statusTallyInicial ?? null)
  const [ranking, setRanking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!edicaoId) return
    async function carregar() {
      setLoading(true)
      setErro(null)
      try {
        const { data: projetos, error: ep } = await supabase
          .from('projeto').select('id, titulo, area_conhecimento').eq('edicao_id', edicaoId)
        if (ep) throw ep
        const projetoIds = (projetos ?? []).map(p => p.id)

        if (!statusTally) {
          const { data: avals, error: ea } = await supabase.from('avaliacao').select('status').in('projeto_id', projetoIds.length ? projetoIds : [-1])
          if (ea) throw ea
          const tally = { pendente: 0, em_andamento: 0, concluida: 0, recurso: 0 }
          ;(avals ?? []).forEach(a => { if (tally[a.status] !== undefined) tally[a.status]++ })
          setStatusTally(tally)
        }

        if (!projetoIds.length) { setRanking([]); return }

        const { data: criterios, error: ec } = await supabase
          .from('criterio_avaliacao').select('id, codigo, nome, nota_maxima, ordem').eq('edicao_id', edicaoId).order('ordem', { ascending: true })
        if (ec) throw ec

        const { data: avaliacoesConcluidas, error: eac } = await supabase
          .from('avaliacao')
          .select(`id, recomendacao_final, projeto_id, notas_criterio:avaliacao_criterio ( nota, criterio:criterio_id ( id, codigo ) )`)
          .eq('status', 'concluida')
          .in('projeto_id', projetoIds)
        if (eac) throw eac

        setRanking(avaliacoesConcluidas?.length ? computarRanking(projetos, avaliacoesConcluidas, criterios ?? []) : [])
      } catch {
        setErro('Erro ao carregar o resumo de avaliação.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId])

  if (!edicaoId || loading || !statusTally || ranking === null) return <LoadingInline />

  const porConsenso = ranking.reduce((acc, r) => { acc[r.consenso] = (acc[r.consenso] ?? 0) + 1; return acc }, {})

  return (
    <>
      <ErroInline msg={erro} />
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Pendentes" value={statusTally.pendente} />
        <MiniStat label="Em andamento" value={statusTally.em_andamento} />
        <MiniStat icon={CheckCircle2} label="Concluídas" value={statusTally.concluida} tone="green" />
        <MiniStat icon={AlertTriangle} label="Em recurso" value={statusTally.recurso} tone="red" />
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Classificação — {ranking.length} projeto(s) avaliado(s)
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(porConsenso).map(([consenso, n]) => (
            <Badge key={consenso} variant={CONSENSO_VARIANT[consenso] ?? 'secondary'} className="text-xs">{n} {consenso}</Badge>
          ))}
          {ranking.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma avaliação concluída ainda.</span>}
        </div>
      </div>
      <div className="flex gap-4">
        <VerTelaCompleta to="/avaliacoes">Abrir Avaliações</VerTelaCompleta>
        <VerTelaCompleta to="/classificacao">Abrir Classificação</VerTelaCompleta>
      </div>
    </>
  )
}

// ── Hub — Central de relatórios ──────────────────────────────────────────────
// Mantém o nome "Historico" porque é o componente já roteado em /historico
// (App.jsx) — trocar o nome exigiria tocar o roteamento sem necessidade.
export function Historico() {
  const { edicaoSelecionada } = useAdmin()
  const edicaoId = edicaoSelecionada?.id ?? null
  const ano = edicaoSelecionada?.data_inicio ? new Date(edicaoSelecionada.data_inicio).getFullYear() : '2026'

  const [expanded, setExpanded] = useState(() => new Set())
  const [loaded, setLoaded] = useState(() => new Set())

  const toggle = useCallback((key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setLoaded(prev => (prev.has(key) ? prev : new Set(prev).add(key)))
  }, [])

  // Resumos leves para os cabeçalhos dos cards (carregados no mount, não no expand).
  const [ciclos, setCiclos] = useState(null)
  const [contratos, setContratos] = useState(null)
  const [statusTally, setStatusTally] = useState(null)

  useEffect(() => {
    if (!edicaoId) return
    listarCiclos(edicaoId).then(setCiclos).catch(() => setCiclos([]))
  }, [edicaoId])

  useEffect(() => {
    supabase
      .from('orientador')
      .select('id, nome_completo, contrato_url')
      .not('codigo_orientador', 'is', null)
      .order('nome_completo')
      .then(({ data }) => setContratos(data ?? []))
  }, [])

  useEffect(() => {
    if (!edicaoId) return
    supabase.from('projeto').select('id').eq('edicao_id', edicaoId).then(({ data: projetos }) => {
      const ids = (projetos ?? []).map(p => p.id)
      if (!ids.length) { setStatusTally({ pendente: 0, em_andamento: 0, concluida: 0, recurso: 0 }); return }
      supabase.from('avaliacao').select('status').in('projeto_id', ids).then(({ data }) => {
        const tally = { pendente: 0, em_andamento: 0, concluida: 0, recurso: 0 }
        ;(data ?? []).forEach(a => { if (tally[a.status] !== undefined) tally[a.status]++ })
        setStatusTally(tally)
      })
    })
  }, [edicaoId])

  const emitidos = contratos?.filter(o => o.contrato_url).length ?? 0
  const totalOrientadores = contratos?.length ?? 0

  const totalAval = statusTally ? Object.values(statusTally).reduce((s, n) => s + n, 0) : 0
  const statusAvaliacaoLabel = !statusTally
    ? '...'
    : totalAval === 0
      ? 'Sem avaliações'
      : statusTally.concluida === totalAval
        ? 'Concluída'
        : 'Em andamento'
  const statusAvaliacaoVariant = statusAvaliacaoLabel === 'Concluída' ? 'success' : statusAvaliacaoLabel === 'Em andamento' ? 'default' : 'secondary'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Central de relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Financeiro, obrigações dos orientadores, contratos e avaliação em um só lugar.
        </p>
      </div>

      <div className="space-y-3">
        <RelatorioCard
          icon={DollarSign} iconBg="bg-emerald-100" iconColor="text-emerald-600"
          title="Financeiro"
          headerRight={<Badge variant="secondary" className="text-xs">Por orientador</Badge>}
          expanded={expanded.has('financeiro')} onToggle={() => toggle('financeiro')}
        >
          {loaded.has('financeiro') ? <FinanceiroBody ano={ano} /> : null}
        </RelatorioCard>

        <RelatorioCard
          icon={FileCheck2} iconBg="bg-blue-100" iconColor="text-blue-600"
          title="Relatório Mensal · Obrigações do Orientador"
          headerRight={<Badge variant="secondary" className="text-xs">{ciclos ? `${ciclos.length} ciclos` : '...'}</Badge>}
          expanded={expanded.has('mensal')} onToggle={() => toggle('mensal')}
        >
          {loaded.has('mensal') ? <RelatorioMensalBody edicaoId={edicaoId} ciclosIniciais={ciclos} /> : null}
        </RelatorioCard>

        <RelatorioCard
          icon={FileSignature} iconBg="bg-violet-100" iconColor="text-violet-600"
          title="Contratos"
          headerRight={<Badge variant="secondary" className="text-xs">{contratos ? `${emitidos}/${totalOrientadores} emitidos` : '...'}</Badge>}
          expanded={expanded.has('contratos')} onToggle={() => toggle('contratos')}
        >
          {loaded.has('contratos') ? <ContratosBody orientadores={contratos} ano={ano} /> : null}
        </RelatorioCard>

        <RelatorioCard
          icon={ClipboardCheck} iconBg="bg-amber-100" iconColor="text-amber-600"
          title="Avaliação"
          headerRight={<Badge variant={statusAvaliacaoVariant} className="text-xs">{statusAvaliacaoLabel}</Badge>}
          expanded={expanded.has('avaliacao')} onToggle={() => toggle('avaliacao')}
        >
          {loaded.has('avaliacao') ? <AvaliacaoBody edicaoId={edicaoId} statusTallyInicial={statusTally} /> : null}
        </RelatorioCard>
      </div>
    </div>
  )
}
