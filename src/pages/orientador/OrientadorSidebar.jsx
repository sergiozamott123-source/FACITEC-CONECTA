import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, User, FolderOpen, Users, FileText, ClipboardList, LogOut } from 'lucide-react'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import LogoFacitecConecta from '@/components/orientador/LogoFacitecConecta'
import { listarCiclos, listarRelatoriosDoOrientador, detectarCicloAtual } from '@/lib/relatorioMensal'

const NAV_ITEMS = [
  { label: 'Início',           icon: LayoutDashboard, to: '/orientador/dashboard'        },
  { label: 'Meus dados',       icon: User,            to: '/orientador/meus-dados'       },
  { label: 'Meu projeto',      icon: FolderOpen,      to: '/orientador/dados'            },
  { label: 'Bolsistas',        icon: Users,           to: '/orientador/bolsistas'        },
  { label: 'Relatório mensal', icon: ClipboardList,   to: '/orientador/relatorio-mensal' },
  { label: 'Documentos',       icon: FileText,        to: '/orientador/documentos'       },
]

export function OrientadorSidebar() {
  const { orientador, projeto, logout } = usePortalOrientador()
  const location = useLocation()
  const navigate = useNavigate()
  const [pendente, setPendente] = useState(false)

  useEffect(() => {
    if (!orientador?.id || !projeto?.edicao_id) return
    let ativo = true
    Promise.all([
      listarCiclos(projeto.edicao_id),
      listarRelatoriosDoOrientador(orientador.id),
    ]).then(([ciclos, relatorios]) => {
      if (!ativo) return
      const porCiclo = Object.fromEntries(relatorios.map(r => [r.ciclo_id, r]))
      const info = detectarCicloAtual(ciclos, porCiclo)
      setPendente(!!info.ciclo && info.relatorio?.status !== 'enviado')
    }).catch(() => {})
    return () => { ativo = false }
  }, [orientador?.id, projeto?.edicao_id])

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
      <div className="px-4 pt-6 pb-5 border-b border-white/10">
        <LogoFacitecConecta size="lg" inverted />
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
              <span className="flex-1">{label}</span>
              {to === '/orientador/relatorio-mensal' && pendente && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              )}
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
