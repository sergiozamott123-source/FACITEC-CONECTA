// src/components/AcessoEncerradoOrientador.jsx
//
// Tela mostrada a um orientador que foi SUBSTITUÍDO no projeto
// (orientador.status === 'substituido'). Substitui qualquer rota do portal:
// ele não vê mais nada do sistema além desta mensagem e pode apenas sair.
// Decisão de Sérgio em 19/11/2026 (substituição Vívian → Mylenna): o
// orientador que sai PERDE o acesso (muda a regra de 03/11, que previa
// acesso de consulta). O cadastro e o histórico dele não são apagados.

import { LockKeyhole, LogOut } from 'lucide-react'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'

export function AcessoEncerradoOrientador() {
  const { orientador, logout } = usePortalOrientador()

  async function sair() {
    await logout()
    window.location.assign('/orientador/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[color:var(--dv-fundo)]">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[color:var(--dv-borda)] shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[color:var(--dv-neutro-fundo)]">
            <LockKeyhole className="w-5 h-5 text-[color:var(--dv-neutro)]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[color:var(--dv-texto)]">Seu acesso foi encerrado</h1>
            <p className="text-xs text-[color:var(--dv-texto-secundario)]">
              {orientador?.nome_completo ?? 'Portal do orientador'}
            </p>
          </div>
        </div>

        <p className="text-sm text-[color:var(--dv-texto)]">
          A substituição da orientação do projeto foi concluída e o acesso a este portal deixou de existir
          para este cadastro. Os registros do que você fez no projeto continuam guardados pela Secretaria Executiva.
        </p>
        <p className="text-sm text-[color:var(--dv-texto-secundario)]">
          Em caso de dúvida, fale com a Secretaria Executiva do CMCT/FACITEC.
        </p>

        <button
          type="button"
          onClick={sair}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 min-h-[40px] bg-[color:var(--dv-primaria)] text-white text-sm font-semibold rounded-md hover:bg-[color:var(--dv-primaria-hover)] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  )
}
