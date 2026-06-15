import { useState, useCallback, useEffect } from 'react'
import { FileUp, BookOpen, Users, FileSignature, History, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTable } from '@/hooks/useTable'
import { edicaoService } from '@/lib/db'
import { Select, FormField, LoadingState } from '@/components/common/FormField'
import { AbaBase44Projetos } from '@/components/importacao/AbaBase44Projetos'
import { AbaBase44Bolsistas } from '@/components/importacao/AbaBase44Bolsistas'
import { AbaBase44Contratos } from '@/components/importacao/AbaBase44Contratos'
import { AbaHistorica } from '@/components/importacao/AbaHistorica'
import { cn } from '@/lib/utils'

const TABS = [
  {
    key: 'projetos',
    label: 'Base44 – Projetos e Avaliações',
    icon: BookOpen,
    description: 'Importa projetos, orientadores e avaliações da exportação Base44.',
  },
  {
    key: 'bolsistas',
    label: 'Base44 – Orientadores e Bolsistas',
    icon: Users,
    description: 'Importa bolsistas e atualiza dados de orientadores. Vincula ao projeto pela edição.',
  },
  {
    key: 'contratos',
    label: 'Base44 – Contratos e Termos',
    icon: FileSignature,
    description: 'Importa contratos referenciando códigos FACITEC já cadastrados.',
  },
  {
    key: 'historico',
    label: 'Planilhas Históricas',
    icon: History,
    description: 'Importação flexível com mapeamento manual de colunas para qualquer tabela.',
  },
]

const STATUS_VARIANT = {
  ativo: 'success', aberto: 'default', rascunho: 'secondary', encerrado: 'secondary', cancelado: 'destructive',
}

function EdicaoSelector({ edicoes, edicaoId, onChange }) {
  const selected = edicoes.find(e => String(e.id) === String(edicaoId))

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <BookOpen className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Edição de referência</p>
        <p className="text-xs text-muted-foreground mb-2">
          Todos os registros importados serão vinculados à edição selecionada.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={edicaoId}
            onChange={e => onChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione a edição…</option>
            {edicoes.map(e => (
              <option key={e.id} value={e.id}>
                Edição #{e.id} — {e.status ?? ''}
                {e.data_inicio ? ` (${new Date(e.data_inicio).getFullYear()})` : ''}
              </option>
            ))}
          </select>
          {selected && (
            <Badge variant={STATUS_VARIANT[selected.status] ?? 'secondary'}>
              {selected.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

export function Importacao() {
  const fetchEdicoes = useCallback(() => edicaoService.list(), [])
  const { data: edicoes, loading: eLoading } = useTable(fetchEdicoes)

  const [edicaoId, setEdicaoId] = useState('')
  const [tab, setTab] = useState('projetos')

  const edicao = edicoes.find(e => String(e.id) === String(edicaoId)) ?? null

  // Auto-select first active edition
  useEffect(() => {
    if (!edicaoId && edicoes.length > 0) {
      const ativa = edicoes.find(e => e.status === 'ativo') ?? edicoes[0]
      setEdicaoId(String(ativa.id))
    }
  }, [edicoes])

  if (eLoading) return <LoadingState />

  const activeTab = TABS.find(t => t.key === tab)

  return (
    <div className="space-y-6">
      {/* Edition selector */}
      <EdicaoSelector edicoes={edicoes} edicaoId={edicaoId} onChange={setEdicaoId} />

      {/* Tab nav */}
      <div className="flex flex-col sm:flex-row gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab description */}
      {activeTab && (
        <div className="flex items-start gap-3 rounded-md bg-muted/50 border border-border px-4 py-3">
          <FileUp className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{activeTab.description}</p>
        </div>
      )}

      {/* Tab content */}
      <div>
        {tab === 'projetos' && <AbaBase44Projetos edicao={edicao} />}
        {tab === 'bolsistas' && <AbaBase44Bolsistas edicao={edicao} />}
        {tab === 'contratos' && <AbaBase44Contratos edicao={edicao} />}
        {tab === 'historico' && <AbaHistorica edicao={edicao} />}
      </div>
    </div>
  )
}
