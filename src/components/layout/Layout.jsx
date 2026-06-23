import { useLocation } from 'react-router-dom'
import { AdminProvider } from '@/contexts/AdminContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }) {
  const { pathname } = useLocation()

  return (
    <AdminProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header pathname={pathname} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  )
}
