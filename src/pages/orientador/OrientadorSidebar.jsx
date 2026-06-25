import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, User, Users, FileText, BarChart2, LogOut } from 'lucide-react'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: LayoutDashboard, to: '/orientador/dashboard' },
  { label: 'Meus dados',   icon: User,            to: '/orientador/dados'     },
  { label: 'Minha equipe', icon: Users,           to: '/orientador/equipe'    },
  { label: 'Documentos',   icon: FileText,        to: '/orientador/documentos'},
  { label: 'Relatórios',   icon: BarChart2,       to: '/orientador/relatorios'},
]

export function OrientadorSidebar() {
  const { orientador, logout } = usePortalOrientador()
  const location = useLocation()
  const navigate = useNavigate()

  const initials = orientador?.nome_completo
    ? orientador.nome_completo.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  const handleLogout = async () => {
    await logout()
    navigate('/orientador/login')
  }

  return (
    <aside
      className="w-[200px] min-h-screen flex flex-col shrink-0 fixed left-0 top-0 z-20"
      style={{ background: '#0D1F3C' }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <p className="text-white font-bold text-sm leading-tight">FACITEC CONECTA</p>
        <p className="text-white/50 text-xs leading-tight mt-0.5">Portal do Orientador</p>
      </div>

      {/* Orientador info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate leading-tight">
              {orientador?.nome_completo?.split(' ')[0] ?? '—'}
            </p>
            <p className="text-white/50 text-[10px] leading-tight truncate">
              {orientador?.codigo_orientador ?? orientador?.email ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 pb-5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
