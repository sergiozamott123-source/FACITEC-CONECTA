import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminProvider } from '@/contexts/AdminContext'
import { getPrograma, PROGRAMA_ID_PADRAO } from '@/lib/programas'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

// Extrai o slug do programa de rotas /admin/:programa/:ano/... — Layout envolve
// a <Routes> aninhada via `children` (não via <Outlet>), então não é descendente
// dela e não pode usar useParams() aqui. Resolve pelo pathname, mesmo padrão já
// usado em Header.jsx (PAGE_NAMES) e Sidebar.jsx (isSistemaPath) para esse fim.
function resolverProgramaId(pathname) {
  const match = pathname.match(/^\/admin\/([^/]+)\/\d+\//)
  if (!match) return PROGRAMA_ID_PADRAO
  return getPrograma(match[1])?.programaId ?? PROGRAMA_ID_PADRAO
}

export function Layout({ children }) {
  const { pathname } = useLocation()
  const programaId = resolverProgramaId(pathname)

  // Identidade Visual DINOV (Etapa 2): vale só enquanto a Secretaria está na tela.
  // O tema fica em <html> (e não em uma <div>) para também alcançar janelas e listas
  // que o React desenha fora desta árvore (diálogos, menus suspensos).
  useEffect(() => {
    document.documentElement.dataset.tema = 'dinov'
    return () => { delete document.documentElement.dataset.tema }
  }, [])

  return (
    <AdminProvider programaId={programaId}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Faixa de 6 px nas cores do sistema (identidade DINOV) */}
        <div className="dv-faixa shrink-0" aria-hidden="true" />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header pathname={pathname} />
            <main className="flex-1 overflow-y-auto bg-[var(--dv-fundo)] p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AdminProvider>
  )
}
