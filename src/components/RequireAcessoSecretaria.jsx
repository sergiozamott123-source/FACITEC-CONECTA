import { Navigate } from 'react-router-dom'
import { useSecretaria } from '@/contexts/SecretariaAuthContext'

export function RequireAcessoSecretaria({ children }) {
  const { session, role, loading } = useSecretaria()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Verificando acesso...</p>
      </div>
    )
  }

  if (!session || role !== 'secretaria') return <Navigate to="/login/secretaria" replace />
  return children
}
