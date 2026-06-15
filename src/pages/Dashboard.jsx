import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState, ErrorAlert } from '@/components/common/FormField'
import { db, pagamentoService } from '@/lib/db'
import { BookOpen, ClipboardList, GraduationCap, DollarSign, TrendingUp } from 'lucide-react'

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0)
}

function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [
          edicaoTotal, edicaoAtiva,
          projetoTotal, projetoAprovado,
          bolsistaTotal, bolsistaAtivo,
          totalPago,
          avalPendente,
          contratoTotal, contratoAssinado,
        ] = await Promise.all([
          db.count('edicao'),
          db.count('edicao', [['status', 'eq', 'ativo']]),
          db.count('projeto'),
          db.count('projeto', [['status', 'eq', 'aprovado']]),
          db.count('bolsista'),
          db.count('bolsista', [['status', 'eq', 'ativo']]),
          pagamentoService.sumPago(),
          db.count('avaliacao', [['status', 'eq', 'pendente']]),
          db.count('contrato'),
          db.count('contrato', [['status', 'eq', 'assinado']]),
        ])
        setStats({
          edicaoTotal, edicaoAtiva,
          projetoTotal, projetoAprovado,
          bolsistaTotal, bolsistaAtivo,
          totalPago,
          avalPendente,
          contratoTotal, contratoAssinado,
        })
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { stats, loading, error }
}

export function Dashboard() {
  const { stats, loading, error } = useStats()

  if (loading) return <LoadingState />
  if (error) return <ErrorAlert message={error} />

  const s = stats

  const cards = [
    {
      title: 'Edições',
      value: s.edicaoTotal,
      sub: `${s.edicaoAtiva} ativa${s.edicaoAtiva !== 1 ? 's' : ''}`,
      icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      title: 'Projetos',
      value: s.projetoTotal,
      sub: `${s.projetoAprovado} aprovado${s.projetoAprovado !== 1 ? 's' : ''}`,
      icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50',
    },
    {
      title: 'Bolsistas',
      value: s.bolsistaTotal,
      sub: `${s.bolsistaAtivo} ativo${s.bolsistaAtivo !== 1 ? 's' : ''}`,
      icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50',
    },
    {
      title: 'Total Pago',
      value: fmt(s.totalPago),
      sub: 'pagamentos confirmados',
      icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50',
    },
  ]

  const pendencias = [
    { label: 'Avaliações pendentes', count: s.avalPendente, variant: s.avalPendente > 0 ? 'warning' : 'success' },
    { label: 'Contratos não assinados', count: s.contratoTotal - s.contratoAssinado, variant: (s.contratoTotal - s.contratoAssinado) > 0 ? 'warning' : 'success' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">{c.title}</p>
                    <p className="text-2xl font-bold text-foreground">{c.value}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${c.bg}`}>
                    <Icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Pendências</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pendencias.map((p) => (
              <div key={p.label} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                <span className="text-sm text-foreground">{p.label}</span>
                <Badge variant={p.variant}>{p.count}</Badge>
              </div>
            ))}
            {pendencias.every(p => p.count === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem pendências</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Visão Geral</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Projetos aprovados', value: s.projetoAprovado, total: s.projetoTotal },
              { label: 'Bolsistas ativos', value: s.bolsistaAtivo, total: s.bolsistaTotal },
              { label: 'Contratos assinados', value: s.contratoAssinado, total: s.contratoTotal },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}/{item.total}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
