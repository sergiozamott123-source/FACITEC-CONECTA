import { Navigate } from 'react-router-dom'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'

export function RequireAcessoOrientador({ children }) {
  const { orientador, loading } = usePortalOrientador()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Verificando acesso...</p>
      </div>
    )
  }

  if (!orientador) return <Navigate to="/orientador/login" replace />
  return children
}
