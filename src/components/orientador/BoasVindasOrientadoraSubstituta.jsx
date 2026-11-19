// src/components/orientador/BoasVindasOrientadoraSubstituta.jsx
//
// Aviso de boas-vindas mostrado UMA vez a quem assumiu a orientação de um
// projeto por substituição (pedido com orientador_entrou_id = este orientador
// e status 'aprovada'). Aparece por cima do painel no primeiro acesso depois
// da aprovação; ao clicar em "Entendi" o aviso é lembrado neste navegador e
// não volta a aparecer. Pedido de Sérgio em 19/11/2026 (substituição
// Vívian → Mylenna). Não grava nada no banco.

import { useEffect, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { obterMinhaSolicitacaoComoSubstituto } from '@/lib/substituicoesOrientador'

function chaveDoAviso(orientadorId) {
  return `boas-vindas-substituta-${orientadorId}`
}

function jaFoiVisto(orientadorId) {
  try {
    return window.localStorage.getItem(chaveDoAviso(orientadorId)) === '1'
  } catch {
    return false
  }
}

function lembrarQueFoiVisto(orientadorId) {
  try {
    window.localStorage.setItem(chaveDoAviso(orientadorId), '1')
  } catch {
    // sem armazenamento no navegador: o aviso poderá aparecer de novo, sem prejuízo
  }
}

export function BoasVindasOrientadoraSubstituta() {
  const { orientador } = usePortalOrientador()
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!orientador?.id || orientador.status !== 'aprovado') return
    if (jaFoiVisto(orientador.id)) return
    let cancelado = false
    obterMinhaSolicitacaoComoSubstituto(orientador.id)
      .then((solicitacao) => {
        if (!cancelado && solicitacao?.status === 'aprovada') setAberto(true)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [orientador?.id, orientador?.status])

  function fechar() {
    if (orientador?.id) lembrarQueFoiVisto(orientador.id)
    setAberto(false)
  }

  useEffect(() => {
    if (!aberto) return
    function aoTeclar(e) {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  if (!aberto) return null

  const primeiroNome = orientador?.nome_completo?.split(' ')[0] ?? ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(25, 54, 81, 0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="boas-vindas-titulo"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[color:var(--dv-borda)] shadow-xl overflow-hidden">
        <div className="bg-[color:var(--dv-marinho)] px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          <h2 id="boas-vindas-titulo" className="text-lg font-bold text-white">
            Bem-vinda ao FACITEC CONECTA{primeiroNome ? `, ${primeiroNome}` : ''}!
          </h2>
        </div>

        <div className="px-6 py-5 space-y-3 text-sm text-[color:var(--dv-texto)]">
          <p>
            A partir de agora você é a orientadora do projeto em que assumiu a orientação, no PIBIC Jr 2026.
            Neste portal você encontra o projeto e os estudantes da sua equipe.
          </p>
          <p>
            Se houver relatório mensal pendente de antes da sua chegada, ele aparece em destaque no início
            desta página. A Secretaria está ciente da situação excepcional da substituição, e você pode
            enviá-lo com tranquilidade.
          </p>
          <p className="text-[color:var(--dv-texto-secundario)]">
            Mais adiante, quando estiver ambientada, vamos pedir que complete os seus dados em
            &ldquo;Meus dados&rdquo;. Qualquer dúvida, fale com a Secretaria Executiva do FACITEC.
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={fechar}
            autoFocus
            className="w-full min-h-[40px] py-2.5 px-4 bg-[color:var(--dv-primaria)] text-white text-sm font-semibold rounded-md hover:bg-[color:var(--dv-primaria-hover)] transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
