import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { InscricaoLayout } from '@/components/inscricao/InscricaoLayout'

export function ConfirmacaoInscricao() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { projetoId, bolsistaId } = state ?? {}

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/inscricao')
  }

  return (
    <InscricaoLayout>
      <div className="bg-white rounded-xl shadow-2xl p-8 text-center space-y-6 max-w-md mx-auto">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Inscrição Enviada!</h2>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            Sua inscrição no PibicJr foi recebida com sucesso. Em breve você receberá
            informações sobre as próximas etapas do processo seletivo.
          </p>
        </div>

        {projetoId && (
          <div className="rounded-lg bg-muted/50 border p-4 text-sm text-left space-y-2">
            <p className="font-medium text-foreground text-xs uppercase tracking-wide">
              Comprovante de inscrição
            </p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Projeto: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{projetoId}</code>
              </p>
              {bolsistaId && (
                <p className="text-xs text-muted-foreground">
                  Bolsista: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{bolsistaId}</code>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Guarde os identificadores acima para acompanhar o status da sua inscrição.
          </p>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            Sair do portal
          </Button>
        </div>
      </div>
    </InscricaoLayout>
  )
}
