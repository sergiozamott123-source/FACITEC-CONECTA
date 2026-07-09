import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileCheck2,
  ExternalLink,
  FileSignature,
  FileUp,
  FlaskConical,
  GraduationCap,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Settings2,
  Trophy,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { useAdmin } from '@/contexts/AdminContext'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'

// ── Programa dropdown data ──────────────────────────────────────────────────
const PROGRAMAS = [
  { id: 'PIBICJR', label: 'PIBIC Jr', cor: '#534AB7', ativo: true },
  { id: 'PROFICJR', label: 'PROFIC Jr', ativo: false },
  { id: 'PROFICJOVEM', label: 'PROFIC Jovem', ativo: false },
  { id: 'POSGRAD', label: 'Pós-graduação', ativo: false },
]

// ── Menu categories ─────────────────────────────────────────────────────────
function buildCategorias(ano) {
  return [
    {
      titulo: 'Visão geral',
      itens: [
        { label: 'Painel', href: `/admin/pibic-jr/${ano}/painel`, icon: LayoutDashboard, exact: true },
        { label: 'Configuração da edição', href: `/admin/pibic-jr/${ano}/configuracao`, icon: Settings2, exact: true },
      ],
    },
    {
      titulo: 'Processo seletivo',
      itens: [
        { label: 'Inscrições', href: '/inscricao', icon: ClipboardList, external: true },
        { label: 'Avaliação', href: '/avaliacoes', icon: ClipboardCheck },
        { label: 'Classificação', href: '/classificacao', icon: Trophy },
        { label: 'Recursos', href: '/recursos', icon: Inbox },
      ],
    },
    {
      titulo: 'Orientadores e bolsistas',
      itens: [
        { label: 'Orientadores', href: '/admin/gerenciar-usuarios-orientadores', icon: Users },
        { label: 'Bolsistas', href: '/bolsistas', icon: GraduationCap },
        { label: 'Contratos', href: `/admin/pibic-jr/${ano}/m2/contratos`, icon: FileSignature },
        { label: 'Relatórios mensais', href: '/admin/relatorios-mensais', icon: FileCheck2 },
      ],
    },
    {
      titulo: 'Relatórios e financeiro',
      itens: [
        { label: 'Central de relatórios', href: '/historico', icon: BarChart2 },
        { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
      ],
    },
    {
      titulo: 'Geral do sistema',
      sempreVisivel: true,
      itens: [
        { label: 'Programas', href: '/admin', icon: LayoutGrid, exact: true },
        { label: 'Edições anteriores', href: '/edicoes', icon: History },
        { label: 'Portal público', href: '/hub', icon: Globe },
        { label: 'Avaliadores (cadastro geral)', href: '/avaliador/login', icon: Users, external: true },
        { label: 'Importação', href: '/importacao', icon: FileUp },
        { label: 'Configurações do sistema', href: '/admin/configuracao-inscricao', icon: Settings2 },
      ],
    },
  ]
}

const OUTROS_PROGRAMAS = [
  { label: 'PROFIC Jr', icon: FlaskConical },
  { label: 'PROFIC Jovem', icon: BookOpen },
  { label: 'Pós-graduação', icon: GraduationCap },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function isItemActive(pathname, item) {
  if (item.external) return false
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

// ── Dropdown (custom) ────────────────────────────────────────────────────────
function Dropdown({ label, icon: Icon, children, collapsed }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (collapsed) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/90 hover:bg-white/10 transition-colors"
      >
        {Icon && <Icon className="w-4 h-4 shrink-0 text-sidebar-foreground/60" />}
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-[#E2E8F0] rounded-md shadow-md overflow-hidden"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, collapsed }) {
  if (collapsed) return <div className="my-1 border-t border-sidebar-border" />
  return (
    <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 select-none">
      {children}
    </p>
  )
}

// ── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({ item, collapsed, pathname }) {
  const active = isItemActive(pathname, item)
  const Icon = item.icon

  const cls = cn(
    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
    active
      ? 'bg-white border border-[#E2E8F0] text-[#534AB7] shadow-sm'
      : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground'
  )

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        title={collapsed ? item.label : undefined}
        className={cls}
      >
        <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-[#534AB7]' : '')} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-40" />
          </>
        )}
      </a>
    )
  }

  return (
    <NavLink
      to={item.href}
      title={collapsed ? item.label : undefined}
      className={cls}
    >
      <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-[#534AB7]' : '')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { edicoes, edicaoSelecionada, setEdicaoSelecionada } = useAdmin()
  const { logout } = useSecretaria()

  const ano = edicaoSelecionada?.ano_referencia ?? '2026'
  const categorias = buildCategorias(ano)
  const isHome = location.pathname === '/admin'

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 min-h-[72px]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">FACITEC Conecta</p>
            <p className="text-sidebar-foreground/50 text-xs leading-tight">CDTIV · Vitória/ES</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* ── Selectors ── */}
      {!collapsed && !isHome && (
        <div className="px-2 pt-3 pb-1 space-y-1">
          {/* Programa */}
          <Dropdown label="PIBIC Jr" icon={FlaskConical} collapsed={collapsed}>
            {PROGRAMAS.map((p) => (
              <button
                key={p.id}
                disabled={!p.ativo}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  p.ativo
                    ? 'text-[#534AB7] font-semibold bg-[#EEEDFE] hover:bg-[#e0dffe]'
                    : 'text-gray-300 cursor-not-allowed'
                )}
              >
                {p.label}
              </button>
            ))}
          </Dropdown>

          {/* Edição */}
          <Dropdown
            label={edicaoSelecionada ? `Edição ${ano}` : 'Selecionar edição'}
            collapsed={collapsed}
          >
            {edicoes.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400">Nenhuma edição encontrada</p>
            )}
            {edicoes.map((e) => (
              <button
                key={e.id}
                onClick={() => setEdicaoSelecionada(e)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                  edicaoSelecionada?.id === e.id
                    ? 'text-[#534AB7] font-semibold bg-[#EEEDFE]'
                    : 'text-gray-700'
                )}
              >
                Edição {e.ano_referencia}
                {e.status === 'ativo' && (
                  <span className="ml-2 text-[10px] font-semibold text-green-600 uppercase">ativa</span>
                )}
              </button>
            ))}
          </Dropdown>
        </div>
      )}

      {!isHome && <Separator className="bg-sidebar-border mt-2" />}

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {/* Categorias — as ligadas à edição ficam ocultas na home de programas */}
        {categorias.filter(cat => cat.sempreVisivel || !isHome).map((cat) => (
          <div key={cat.titulo}>
            <SectionLabel collapsed={collapsed}>{cat.titulo}</SectionLabel>
            {cat.itens.map((item) => (
              <NavItem key={item.href} item={item} collapsed={collapsed} pathname={location.pathname} />
            ))}
          </div>
        ))}

        {/* Outros programas */}
        <SectionLabel collapsed={collapsed}>Outros programas</SectionLabel>
        {OUTROS_PROGRAMAS.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm opacity-35 cursor-not-allowed select-none"
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </div>
          )
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* ── Footer ── */}
      <div className="px-2 py-2 space-y-0.5">
        <button
          onClick={async () => { await logout(); navigate('/login/secretaria') }}
          title={collapsed ? 'Sair' : undefined}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="truncate">Sair</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
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
