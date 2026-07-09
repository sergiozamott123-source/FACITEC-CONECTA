import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, AlertTriangle, RotateCcw, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import {
  listarCiclos,
  atualizarJanelaCiclo,
  reabrirRelatorio,
  statusRelatorioNoCiclo,
  formatarDataBR,
} from '@/lib/relatorioMensal'

const STATUS_INFO = {
  enviado:          { label: 'Enviado',          variant: 'success' },
  enviado_atrasado: { label: 'Enviado (atraso)', variant: 'warning' },
  atrasado:         { label: 'Atrasado',         variant: 'destructive' },
  pendente:         { label: 'Pendente',         variant: 'secondary' },
}

export function RelatoriosMensais() {
  const { edicaoSelecionada } = useAdmin()
  const { session } = useSecretaria()

  const [ciclos, setCiclos] = useState([])
  const [cicloSelecionadoId, setCicloSelecionadoId] = useState(null)
  const [orientadores, setOrientadores] = useState([])
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [visualizando, setVisualizando] = useState(null)
  const [nomesBolsistas, setNomesBolsistas] = useState({})
  const [reabrindoId, setReabrindoId] = useState(null)
  const [janelas, setJanelas] = useState({})
  const [salvandoJanelaId, setSalvandoJanelaId] = useState(null)

  useEffect(() => {
    if (!edicaoSelecionada?.id) return
    carregarCiclos()
  }, [edicaoSelecionada?.id])

  async function carregarCiclos() {
    try {
      const data = await listarCiclos(edicaoSelecionada.id)
      setCiclos(data)
      setJanelas(Object.fromEntries(data.map(c => [c.id, { data_abertura: c.data_abertura, data_fechamento: c.data_fechamento }])))
      const hoje = new Date().toISOString().slice(0, 10)
      const vigente = data.find(c => hoje >= c.data_abertura && hoje <= c.data_fechamento)
        ?? [...data].reverse().find(c => hoje >= c.data_abertura)
        ?? data[0]
      setCicloSelecionadoId(vigente?.id ?? null)
    } catch {
      setErro('Erro ao carregar os ciclos do relatório mensal.')
    }
  }

  useEffect(() => {
    if (!cicloSelecionadoId || !edicaoSelecionada?.id) return
    carregarStatus()
  }, [cicloSelecionadoId, edicaoSelecionada?.id])

  async function carregarStatus() {
    setLoading(true)
    setErro(null)
    try {
      const [{ data: projetos, error: e1 }, { data: relatoriosData, error: e2 }] = await Promise.all([
        supabase
          .from('projeto')
          .select('id, titulo, orientador:orientador_id(id, nome_completo, codigo_orientador)')
          .eq('edicao_id', edicaoSelecionada.id)
          .eq('status', 'selecionado'),
        supabase
          .from('relatorio_mensal')
          .select('*')
          .eq('ciclo_id', cicloSelecionadoId),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setOrientadores((projetos ?? []).filter(p => p.orientador).map(p => ({ ...p.orientador, projeto: p.titulo })))
      setRelatorios(relatoriosData ?? [])
    } catch {
      setErro('Erro ao carregar o status dos relatórios.')
    } finally {
      setLoading(false)
    }
  }

  const cicloSelecionado = ciclos.find(c => c.id === cicloSelecionadoId) ?? null

  const linhas = useMemo(() => {
    if (!cicloSelecionado) return []
    return orientadores.map(o => {
      const relatorio = relatorios.find(r => r.orientador_id === o.id) ?? null
      const status = statusRelatorioNoCiclo(cicloSelecionado, relatorio)
      return { orientador: o, relatorio, status }
    })
  }, [orientadores, relatorios, cicloSelecionado])

  const resumo = useMemo(() => ({
    enviados: linhas.filter(l => l.status === 'enviado' || l.status === 'enviado_atrasado').length,
    pendentes: linhas.filter(l => l.status === 'pendente').length,
    atrasados: linhas.filter(l => l.status === 'atrasado').length,
  }), [linhas])

  async function abrirVisualizacao(relatorio) {
    setVisualizando(relatorio)
    const ids = (relatorio.frequencia_bolsistas ?? []).map(f => f.bolsista_id)
    if (!ids.length) return
    const { data } = await supabase.from('bolsista').select('id, nome_completo').in('id', ids)
    setNomesBolsistas(Object.fromEntries((data ?? []).map(b => [b.id, b.nome_completo])))
  }

  async function handleReabrir(relatorioId) {
    setReabrindoId(relatorioId)
    try {
      await reabrirRelatorio(relatorioId, session.user.id)
      await carregarStatus()
    } catch {
      setErro('Não foi possível reabrir o relatório.')
    } finally {
      setReabrindoId(null)
    }
  }

  async function handleSalvarJanela(cicloId) {
    setSalvandoJanelaId(cicloId)
    try {
      await atualizarJanelaCiclo(cicloId, janelas[cicloId])
      await carregarCiclos()
    } catch {
      setErro('Não foi possível salvar a janela deste ciclo.')
    } finally {
      setSalvandoJanelaId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Relatórios mensais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o envio do relatório mensal de cada orientador e gerencie as janelas de cada ciclo.
        </p>
      </div>

      {erro && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{erro}</div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">Ciclo</label>
        <select
          value={cicloSelecionadoId ?? ''}
          onChange={e => setCicloSelecionadoId(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background"
        >
          {ciclos.map(c => (
            <option key={c.id} value={c.id}>Ciclo {c.numero_ciclo} — {c.mes_referencia}</option>
          ))}
        </select>
        {cicloSelecionado && (
          <span className="text-xs text-muted-foreground">
            Janela: {formatarDataBR(cicloSelecionado.data_abertura)} a {formatarDataBR(cicloSelecionado.data_fechamento)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card icon={CheckCircle2} cor="text-green-600 bg-green-100" label="Enviados" valor={resumo.enviados} />
        <Card icon={Clock} cor="text-amber-600 bg-amber-100" label="Pendentes" valor={resumo.pendentes} />
        <Card icon={AlertTriangle} cor="text-red-600 bg-red-100" label="Atrasados" valor={resumo.atrasados} />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Orientador</th>
              <th className="text-left font-medium px-4 py-2.5">Projeto</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!loading && linhas.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhum orientador com projeto selecionado nesta edição.</td></tr>
            )}
            {linhas.map(({ orientador, relatorio, status }) => (
              <tr key={orientador.id} className="border-t border-border">
                <td className="px-4 py-2.5">{orientador.nome_completo}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{orientador.projeto ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={STATUS_INFO[status].variant}>{STATUS_INFO[status].label}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right space-x-2">
                  {relatorio && (
                    <Button variant="outline" size="sm" onClick={() => abrirVisualizacao(relatorio)}>
                      Ver relatório
                    </Button>
                  )}
                  {relatorio?.status === 'enviado' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reabrindoId === relatorio.id}
                      onClick={() => handleReabrir(relatorio.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      {reabrindoId === relatorio.id ? 'Reabrindo...' : 'Reabrir para edição'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Configuração das janelas de envio</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Ciclo</th>
                <th className="text-left font-medium px-4 py-2.5">Abertura</th>
                <th className="text-left font-medium px-4 py-2.5">Fechamento</th>
                <th className="text-right font-medium px-4 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody>
              {ciclos.map(c => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2.5">Ciclo {c.numero_ciclo} — {c.mes_referencia}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="date"
                      value={janelas[c.id]?.data_abertura ?? ''}
                      onChange={e => setJanelas(prev => ({ ...prev, [c.id]: { ...prev[c.id], data_abertura: e.target.value } }))}
                      className="border border-border rounded-md px-2 py-1 text-sm bg-background"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="date"
                      value={janelas[c.id]?.data_fechamento ?? ''}
                      onChange={e => setJanelas(prev => ({ ...prev, [c.id]: { ...prev[c.id], data_fechamento: e.target.value } }))}
                      className="border border-border rounded-md px-2 py-1 text-sm bg-background"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={salvandoJanelaId === c.id}
                      onClick={() => handleSalvarJanela(c.id)}
                    >
                      {salvandoJanelaId === c.id ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!visualizando} onClose={() => setVisualizando(null)} title="Relatório enviado" size="lg">
        {visualizando && (
          <div className="space-y-4">
            <Secao titulo="Atividades realizadas" texto={visualizando.atividades_realizadas} />
            <Secao titulo="Resultados alcançados" texto={visualizando.resultados_alcancados} />
            <Secao titulo="Desafios enfrentados" texto={visualizando.desafios_enfrentados} />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Frequência dos bolsistas</p>
              <ul className="text-sm space-y-1">
                {(visualizando.frequencia_bolsistas ?? []).map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {f.cumpriu_75_porcento
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      : <X className="w-3.5 h-3.5 text-red-500" />}
                    {nomesBolsistas[f.bolsista_id] ?? f.bolsista_id}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Evidências</p>
              <div className="grid grid-cols-4 gap-2">
                {(visualizando.evidencias_urls ?? []).map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Evidência" className="w-full h-20 object-cover rounded-md border border-border" />
                  </a>
                ))}
              </div>
            </div>
            {visualizando.enviado_em && (
              <p className="text-xs text-muted-foreground">Enviado em {new Date(visualizando.enviado_em).toLocaleString('pt-BR')}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Card({ icon: Icon, cor, label, valor }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{valor}</p>
    </div>
  )
}

function Secao({ titulo, texto }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{titulo}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{texto || '—'}</p>
    </div>
  )
}
