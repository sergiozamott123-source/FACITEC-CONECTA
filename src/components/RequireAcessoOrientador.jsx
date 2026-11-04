import { Navigate } from 'react-router-dom'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { AguardandoAprovacaoSubstituicao } from '@/components/AguardandoAprovacaoSubstituicao'

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

  // Substituto que já confirmou o convite (ver ConviteSubstituicaoOrientador.jsx)
  // mas ainda não foi aprovado pela Secretaria: acesso restrito a uma única
  // tela de acompanhamento, em qualquer rota do portal (decisão de
  // 04/11/2026, a pedido de Sérgio).
  if (orientador.status === 'pendente_documentacao_substituicao') {
    return <AguardandoAprovacaoSubstituicao />
  }

  return children
}
