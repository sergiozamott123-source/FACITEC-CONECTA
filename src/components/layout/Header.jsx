import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pageTitles = {
  '/': 'Dashboard',
  '/edicoes': 'Edições',
  '/avaliacoes': 'Avaliações',
  '/recursos': 'Convocação de Recursos',
  '/equipes': 'Equipes e Documentos',
  '/contratos': 'Contratos e Termos',
  '/bolsistas': 'Bolsistas e Orientadores',
  '/financeiro': 'Financeiro',
  '/historico': 'Histórico e Relatórios',
  '/importacao': 'Importação de Dados',
}

export function Header({ pathname }) {
  const title = Object.entries(pageTitles).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] ?? 'FACITEC Conecta'

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border h-[72px] shrink-0">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

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
