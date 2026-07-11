import { useEffect, useState } from 'react'
import { AlertCircle, ChevronRight, Download, FileText, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'
import { PROGRAMAS } from '@/lib/programas'

const VAGAS = 10

function MetricCard({ label, value, valueClass }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueClass ?? 'text-foreground'}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }) {
  if (status === 'selecionado') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        Selecionado
      </span>
    )
  }
  if (status === 'reserva') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
        Reserva
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">{status ?? '—'}</span>
}

export function ClassificacaoAdmin() {
  const { edicaoSelecionada, programaSelecionado } = useAdmin()
  const edicaoId = edicaoSelecionada?.id
  const programaNome = PROGRAMAS.find((p) => p.programaId === programaSelecionado)?.nome ?? 'Programa'
  const ano = edicaoSelecionada?.ano_referencia ?? '—'
  const [projetos, setProjetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { if (edicaoId) fetchProjetos() }, [edicaoId])

  async function fetchProjetos() {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('projeto')
      .select(`
        ordem_classificacao,
        codigo_inscricao,
        titulo,
        instituicao,
        nota_final_oficial,
        status,
        orientador:orientador_id ( nome_completo )
      `)
      .eq('edicao_id', edicaoId)
      .order('ordem_classificacao', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setProjetos(data ?? [])
    }
    setLoading(false)
  }

  const total = projetos.length
  const selecionados = projetos.filter(p => p.status === 'selecionado').length
  const reserva = projetos.filter(p => p.status === 'reserva').length

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2 flex-wrap">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link to="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span>{programaNome}</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-foreground font-medium">Classificação — Edição {ano}</span>
          </nav>
          <h1 className="text-xl font-bold text-foreground">Classificação geral dos projetos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Resultado final oficial — Edição {ano}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-md px-3 py-2 bg-background hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-md px-3 py-2 bg-background hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total avaliados" value={total} />
        <MetricCard label="Vagas disponíveis" value={VAGAS} />
        <MetricCard label="Selecionados" value={selecionados} valueClass="text-green-600" />
        <MetricCard label="Lista de reserva" value={reserva} valueClass="text-amber-600" />
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Legenda:</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          Selecionado
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Reserva
        </span>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando classificação...</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-14">Pos.</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Projeto</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Instituição</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Nota final</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projetos.flatMap((p, idx) => {
                const isReserva = p.status === 'reserva'
                const rows = []

                if (idx === VAGAS) {
                  rows.push(
                    <tr key="divisor-reserva">
                      <td
                        colSpan={6}
                        className="px-4 py-2.5 text-xs font-semibold text-amber-700 text-center bg-amber-50 border-y border-amber-200"
                      >
                        Lista de reserva — projetos convocados apenas em caso de desclassificação
                      </td>
                    </tr>
                  )
                }

                rows.push(
                  <tr
                    key={p.codigo_inscricao ?? idx}
                    className={isReserva ? 'bg-amber-50/40 hover:bg-amber-50/70 transition-colors' : 'hover:bg-muted/30 transition-colors'}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-muted-foreground">
                      {p.ordem_classificacao != null ? `${p.ordem_classificacao}º` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {p.codigo_inscricao ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-semibold text-foreground leading-snug">
                        {p.titulo ?? '—'}
                      </p>
                      {p.orientador?.nome_completo && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.orientador.nome_completo}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.instituicao ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
                      {p.nota_final_oficial != null ? Number(p.nota_final_oficial).toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                )

                return rows
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
