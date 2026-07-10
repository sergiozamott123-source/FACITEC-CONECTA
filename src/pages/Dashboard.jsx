import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingState, ErrorAlert } from '@/components/common/FormField'
import { supabase } from '@/lib/supabase'
import { LayoutGrid, Users, GraduationCap } from 'lucide-react'

function useResumoSistema() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: edicoesAtivas, error: e1 },
          { count: orientadoresAtivos, error: e2 },
          { count: bolsistasAtivos, error: e3 },
        ] = await Promise.all([
          supabase.from('edicao').select('programa_id').eq('status', 'ativo'),
          supabase.from('orientador').select('*', { count: 'exact', head: true }).not('codigo_orientador', 'is', null),
          supabase.from('bolsista').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        ])
        if (e1) throw e1
        if (e2) throw e2
        if (e3) throw e3

        const programasAtivos = new Set((edicoesAtivas ?? []).map((e) => e.programa_id ?? 'PIBICJR')).size

        setStats({ programasAtivos, orientadoresAtivos: orientadoresAtivos ?? 0, bolsistasAtivos: bolsistasAtivos ?? 0 })
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
  const { stats, loading, error } = useResumoSistema()

  if (loading) return <LoadingState />
  if (error) return <ErrorAlert message={error} />

  const cards = [
    { title: 'Programas ativos', value: stats.programasAtivos, icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Orientadores ativos', value: stats.orientadoresAtivos, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Bolsistas ativos', value: stats.bolsistasAtivos, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo(a) ao FACITEC Conecta</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral de todos os programas da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">{c.title}</p>
                    <p className="text-2xl font-bold text-foreground">{c.value}</p>
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
    </div>
  )
}
