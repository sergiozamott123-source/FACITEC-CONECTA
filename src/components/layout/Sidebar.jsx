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

// URL do site público institucional do FACITEC — configurada via VITE_URL_PORTAL_PUBLICO (.env).
const URL_PORTAL_PUBLICO = import.meta.env.VITE_URL_PORTAL_PUBLICO || 'https://facitecnews.com.br'

// ── Programa dropdown data ──────────────────────────────────────────────────
const PROGRAMAS = [
  { id: 'PIBICJR', label: 'PIBIC Jr', cor: '#534AB7', ativo: true },
  { id: 'PROFICJR', label: 'PROFIC Jr', ativo: false },
  { id: 'PROFICJOVEM', label: 'PROFIC Jovem', ativo: false },
  { id: 'POSGRAD', label: 'Pós-graduação', ativo: false },
]

// ── Rotas do nível Sistema (fora de qualquer programa) ──────────────────────
const SISTEMA_PATHS = ['/admin', '/admin/painel', '/importacao', '/admin/configuracao-inscricao', '/edicoes']

function isSistemaPath(pathname) {
  return SISTEMA_PATHS.includes(pathname)
}

// ── Menu — nível Sistema ─────────────────────────────────────────────────────
function buildCategoriasSistema() {
  return [
    {
      titulo: 'Sistema',
      itens: [
        { label: 'Painel', href: '/admin/painel', icon: LayoutDashboard, exact: true },
        { label: 'Programas', href: '/admin', icon: LayoutGrid, exact: true },
        { label: 'Portal público', href: URL_PORTAL_PUBLICO, icon: Globe, external: true },
      ],
    },
    {
      titulo: 'Público externo',
      itens: [
        { label: 'Cadastro de avaliadores', href: '/avaliador/login', icon: Users, external: true },
      ],
    },
    {
      titulo: 'Administração',
      itens: [
        { label: 'Importação', href: '/importacao', icon: FileUp },
        { label: 'Configurações do sistema', href: '/admin/configuracao-inscricao', icon: Settings2 },
      ],
    },
  ]
}

// ── Menu — nível Programa/Edição ─────────────────────────────────────────────
function buildCategoriasPrograma(ano) {
  return [
    {
      titulo: 'Visão geral',
      itens: [
        { label: 'Painel do PIBIC Jr', href: `/admin/pibic-jr/${ano}/painel`, icon: LayoutDashboard, exact: true },
        {
          label: 'Configurações', icon: Settings2, group: true,
          itens: [
            { label: 'Ficha de inscrição', href: `/admin/pibic-jr/${ano}/configuracao`, exact: true },
          ],
        },
      ],
    },
    {
      titulo: 'Processo seletivo',
      itens: [
        { label: 'Inscritos', href: '/inscritos', icon: ClipboardList },
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
        { label: 'Obrigações do orientador', href: '/admin/relatorios-mensais', icon: FileCheck2 },
      ],
    },
    {
      titulo: 'Relatórios e financeiro',
      itens: [
        { label: 'Central de relatórios', href: '/historico', icon: BarChart2 },
        { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
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

// ── Nav group (item com submenu, ex: Configurações) ──────────────────────────
function NavGroupItem({ item, collapsed, pathname }) {
  const hasActiveChild = item.itens.some((c) => isItemActive(pathname, c))
  const [open, setOpen] = useState(hasActiveChild)
  const Icon = item.icon

  useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  // Sidebar recolhida: sem espaço para submenu, leva direto ao único item.
  if (collapsed) {
    const first = item.itens[0]
    return (
      <NavLink
        to={first.href}
        title={item.label}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          hasActiveChild
            ? 'bg-white border border-[#E2E8F0] text-[#534AB7] shadow-sm'
            : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground'
        )}
      >
        <Icon className={cn('w-5 h-5 shrink-0', hasActiveChild ? 'text-[#534AB7]' : '')} />
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          hasActiveChild
            ? 'text-[#534AB7]'
            : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground'
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
          {item.itens.map((child) => {
            const childActive = isItemActive(pathname, child)
            return (
              <NavLink
                key={child.href}
                to={child.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors truncate',
                  childActive
                    ? 'bg-white border border-[#E2E8F0] text-[#534AB7] shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground'
                )}
              >
                {child.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
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
  const isSistema = isSistemaPath(location.pathname)
  const categorias = isSistema ? buildCategoriasSistema() : buildCategoriasPrograma(ano)

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
      {!collapsed && !isSistema && (
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

      {!isSistema && <Separator className="bg-sidebar-border mt-2" />}

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {categorias.map((cat) => (
          <div key={cat.titulo}>
            <SectionLabel collapsed={collapsed}>{cat.titulo}</SectionLabel>
            {cat.itens.map((item) => (
              item.group
                ? <NavGroupItem key={item.label} item={item} collapsed={collapsed} pathname={location.pathname} />
                : <NavItem key={item.href} item={item} collapsed={collapsed} pathname={location.pathname} />
            ))}
          </div>
        ))}

        {/* Outros programas — apenas no nível Sistema */}
        {isSistema && (
          <>
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
          </>
        )}
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
