import { Bell, ChevronRight, Search, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAdmin } from '@/contexts/AdminContext'

const PAGE_NAMES = [
  { pattern: /^\/admin$/, label: 'Programas' },
  { pattern: /^\/admin\/pibic-jr\/[^/]+\/painel/, label: 'Painel do PIBIC Jr' },
  { pattern: /^\/admin\/pibic-jr\/[^/]+\/configuracao/, label: 'Ficha de inscrição' },
  { pattern: /^\/admin\/pibic-jr\/[^/]+\/m2\/contratos/, label: 'Contratos' },
  { pattern: /^\/admin\/configuracao-inscricao/, label: 'Configurações do sistema' },
  { pattern: /^\/admin\/gerenciar-usuarios-orientadores/, label: 'Orientadores' },
  { pattern: /^\/admin\/relatorios-mensais/, label: 'Obrigações do orientador' },
  { pattern: /^\/avaliacoes/, label: 'Avaliação' },
  { pattern: /^\/classificacao/, label: 'Classificação' },
  { pattern: /^\/recursos/, label: 'Recursos' },
  { pattern: /^\/contratos/, label: 'Contratos' },
  { pattern: /^\/bolsistas/, label: 'Bolsistas' },
  { pattern: /^\/financeiro/, label: 'Financeiro' },
  { pattern: /^\/historico/, label: 'Central de relatórios' },
  { pattern: /^\/importacao/, label: 'Importação' },
  { pattern: /^\/edicoes/, label: 'Edições' },
  { pattern: /^\/equipes/, label: 'Equipes' },
  { pattern: /^\/$/, label: 'Dashboard' },
]

function getPageLabel(pathname) {
  return PAGE_NAMES.find(({ pattern }) => pattern.test(pathname))?.label ?? 'FACITEC Conecta'
}

const SISTEMA_PATHS = ['/admin', '/importacao', '/admin/configuracao-inscricao', '/edicoes']

const PROGRAMA_LABELS = { PIBICJR: 'PIBIC Jr' }

export function Header({ pathname }) {
  const { programaSelecionado, edicaoSelecionada } = useAdmin()

  const programaLabel = PROGRAMA_LABELS[programaSelecionado] ?? programaSelecionado
  const edicaoLabel = edicaoSelecionada
    ? `Edição ${edicaoSelecionada.ano_referencia}`
    : 'Edição'
  const pageLabel = getPageLabel(pathname)

  const isSistema = SISTEMA_PATHS.includes(pathname)

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border h-[72px] shrink-0">
      <nav className="flex items-center gap-1.5 text-sm">
        {isSistema ? (
          <>
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Sistema</Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="font-semibold text-foreground">{pageLabel}</span>
          </>
        ) : (
          <>
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Sistema</Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-muted-foreground">{programaLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-muted-foreground">{edicaoLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="font-semibold text-foreground">{pageLabel}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Pesquisar">
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Perfil do usuário">
          <User className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
