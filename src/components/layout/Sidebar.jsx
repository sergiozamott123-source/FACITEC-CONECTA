import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  FileText,
  FileSignature,
  GraduationCap,
  DollarSign,
  History,
  FileUp,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Edições',
    href: '/edicoes',
    icon: BookOpen,
  },
  {
    label: 'Avaliações',
    href: '/avaliacoes',
    icon: ClipboardList,
  },
  {
    label: 'Equipes e Documentos',
    href: '/equipes',
    icon: Users,
  },
  {
    label: 'Contratos e Termos',
    href: '/contratos',
    icon: FileSignature,
  },
  {
    label: 'Bolsistas e Orientadores',
    href: '/bolsistas',
    icon: GraduationCap,
  },
  {
    label: 'Financeiro',
    href: '/financeiro',
    icon: DollarSign,
  },
  {
    label: 'Classificação',
    href: '/classificacao',
    icon: Trophy,
  },
  {
    label: 'Histórico e Relatórios',
    href: '/historico',
    icon: History,
  },
  {
    label: 'Importação',
    href: '/importacao',
    icon: FileUp,
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 min-h-[72px]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">FACITEC</p>
            <p className="text-sidebar-foreground/60 text-xs leading-tight truncate">Conecta · CDTIV</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.href)

          return (
            <NavLink
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground/80'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3">
          <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
            Fundo Municipal de Ciência e Tecnologia de Vitória/ES
          </p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-20 z-10',
          'flex items-center justify-center w-6 h-6 rounded-full',
          'bg-sidebar text-sidebar-foreground border border-sidebar-border',
          'hover:bg-sidebar-accent transition-colors shadow-sm'
        )}
        aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>
    </aside>
  )
}
