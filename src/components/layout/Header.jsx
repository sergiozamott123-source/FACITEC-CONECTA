import { useEffect, useState } from 'react'
import { Bell, ChevronRight, Search, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAdmin } from '@/contexts/AdminContext'
import { edicaoService } from '@/lib/db'
import { PROGRAMAS } from '@/lib/programas'

const PAGE_NAMES = [
  { pattern: /^\/admin\/painel$/, label: 'Painel' },
  { pattern: /^\/admin$/, label: 'Programas' },
  { pattern: /^\/admin\/[^/]+\/[^/]+\/painel/, label: 'Painel do programa' },
  { pattern: /^\/admin\/[^/]+\/[^/]+\/configuracao/, label: 'Ficha de inscrição' },
  { pattern: /^\/admin\/[^/]+\/[^/]+\/m2\/contratos/, label: 'Contratos' },
  { pattern: /^\/admin\/configuracao-inscricao/, label: 'Configurações do sistema' },
  { pattern: /^\/admin\/gerenciar-usuarios-orientadores/, label: 'Orientadores' },
  { pattern: /^\/admin\/relatorios-mensais/, label: 'Obrigações do orientador' },
  { pattern: /^\/admin\/acervo\/[^/]+\/projetos/, label: 'Projetos' },
  { pattern: /^\/admin\/acervo\/[^/]+\/orientadores/, label: 'Orientadores' },
  { pattern: /^\/admin\/acervo\/[^/]+\/bolsistas/, label: 'Bolsistas Jr' },
  { pattern: /^\/admin\/acervo\/[^/]+\/inscritos/, label: 'Inscritos' },
  { pattern: /^\/admin\/acervo$/, label: 'Acervo' },
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

const SISTEMA_PATHS = ['/admin', '/admin/painel', '/importacao', '/admin/configuracao-inscricao', '/edicoes', '/admin/acervo']

function edicaoIdDoAcervo(pathname) {
  const match = pathname.match(/^\/admin\/acervo\/([^/]+)\//)
  return match ? match[1] : null
}

export function Header({ pathname }) {
  const { programaSelecionado, edicaoSelecionada } = useAdmin()
  const [edicaoAcervo, setEdicaoAcervo] = useState(null)

  const edicaoIdAcervo = edicaoIdDoAcervo(pathname)

  useEffect(() => {
    if (!edicaoIdAcervo) { setEdicaoAcervo(null); return }
    let cancelado = false
    edicaoService.get(edicaoIdAcervo).then((e) => { if (!cancelado) setEdicaoAcervo(e) }).catch(() => {})
    return () => { cancelado = true }
  }, [edicaoIdAcervo])

  const programaLabel = PROGRAMAS.find((p) => p.programaId === programaSelecionado)?.nome ?? programaSelecionado
  const edicaoLabel = edicaoSelecionada
    ? `Edição ${edicaoSelecionada.ano_referencia}`
    : 'Edição'
  const pageLabel = getPageLabel(pathname)

  const isSistema = SISTEMA_PATHS.includes(pathname)

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border h-[72px] shrink-0">
      <nav className="flex items-center gap-1.5 text-sm">
        {edicaoIdAcervo ? (
          <>
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Sistema</Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <Link to="/admin/acervo" className="text-muted-foreground hover:text-foreground transition-colors">Acervo</Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-muted-foreground">
              {edicaoAcervo ? `Edição ${edicaoAcervo.ano_referencia}` : 'Edição'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="font-semibold text-foreground">{pageLabel}</span>
          </>
        ) : isSistema ? (
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
