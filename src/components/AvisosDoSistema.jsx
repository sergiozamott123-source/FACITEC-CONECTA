// Avisos do próprio sistema, em um cartão flutuante no canto inferior direito
// (não empurra o conteúdo da página):
// 1) "Há uma versão nova" — quando publicamos uma atualização, quem está com o sistema aberto
//    recebe o aviso e atualiza com um clique. O sistema NUNCA recarrega sozinho, e o aviso fica
//    escondido nas telas de formulário (inscrição, relatório mensal, convite, ficha de avaliação
//    etc.), para ninguém perder o que está preenchendo.
// 2) "Instalar como aplicativo" — só na área interna (/admin), para a equipe da Secretaria.
/* global __BUILD_ID__ */
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000 // confere a cada 5 minutos
const ADIAR_ATUALIZACAO_MS = 30 * 60 * 1000 // "Depois" esconde o aviso por 30 minutos
const CHAVE_INSTALAR = 'conecta-instalar-dispensado'
const ADIAR_INSTALACAO_MS = 30 * 24 * 60 * 60 * 1000 // "Agora não" esconde por 30 dias

// Telas em que a pessoa costuma estar preenchendo algo: nelas o aviso de versão não aparece.
const TELAS_COM_FORMULARIO = /inscricao|relatorio-mensal|convite|\/avaliador\/(projeto|recurso)|substituicao|documentos|videos|meus-dados|\/dados/

function jaEstaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function instalacaoFoiDispensada() {
  try {
    return Date.now() - Number(localStorage.getItem(CHAVE_INSTALAR) ?? 0) < ADIAR_INSTALACAO_MS
  } catch {
    return false
  }
}

function useNovaVersao() {
  const [temNova, setTemNova] = useState(false)
  const [adiado, setAdiado] = useState(false)

  const verificar = useCallback(async () => {
    try {
      const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!r.ok) return
      const { id } = await r.json()
      if (id && id !== __BUILD_ID__) setTemNova(true)
    } catch {
      /* sem internet ou arquivo indisponível: tenta de novo mais tarde */
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD) return // em desenvolvimento não há versão publicada
    const t0 = window.setTimeout(verificar, 20_000)
    const t = window.setInterval(verificar, INTERVALO_VERIFICACAO_MS)
    const aoVoltar = () => { if (document.visibilityState === 'visible') verificar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { window.clearTimeout(t0); window.clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [verificar])

  function adiar() {
    setAdiado(true)
    window.setTimeout(() => setAdiado(false), ADIAR_ATUALIZACAO_MS)
  }

  return { temNova, adiado, adiar }
}

function useInstalacao() {
  const [evento, setEvento] = useState(null)
  const [dispensado, setDispensado] = useState(instalacaoFoiDispensada)

  useEffect(() => {
    if (jaEstaInstalado()) return
    const aoOferecer = (e) => { e.preventDefault(); setEvento(e) }
    const aoInstalar = () => setEvento(null)
    window.addEventListener('beforeinstallprompt', aoOferecer)
    window.addEventListener('appinstalled', aoInstalar)
    return () => { window.removeEventListener('beforeinstallprompt', aoOferecer); window.removeEventListener('appinstalled', aoInstalar) }
  }, [])

  async function instalar() {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice
    setEvento(null)
  }
  function dispensar() {
    try { localStorage.setItem(CHAVE_INSTALAR, String(Date.now())) } catch { /* sem armazenamento: só some nesta sessão */ }
    setDispensado(true)
  }

  return { temEvento: !!evento && !dispensado, instalar, dispensar }
}

export function AvisosDoSistema() {
  const { pathname } = useLocation()
  const versao = useNovaVersao()
  const instalacao = useInstalacao()

  const mostrarVersao = versao.temNova && !versao.adiado && !TELAS_COM_FORMULARIO.test(pathname)
  const mostrarInstalacao = instalacao.temEvento && pathname.startsWith('/admin')

  if (!mostrarVersao && !mostrarInstalacao) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {mostrarVersao && (
        <div role="status" className="rounded-lg border border-primary bg-card p-4 text-sm text-card-foreground shadow-lg">
          <div className="flex items-start gap-3">
            <RefreshCw size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Há uma versão nova do FACITEC CONECTA</p>
              <p className="mt-1 text-muted-foreground">
                Atualize para receber as melhorias mais recentes. Se estiver preenchendo alguma coisa, conclua e salve antes.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={versao.adiar}>Depois</Button>
            <Button size="sm" onClick={() => window.location.reload()}>Atualizar agora</Button>
          </div>
        </div>
      )}

      {mostrarInstalacao && (
        <div role="status" className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-lg">
          <div className="flex items-start gap-3">
            <img src="/facitec-conecta-icone.svg" alt="" className="h-10 w-10 shrink-0" />
            <div>
              <p className="font-semibold">Instale o FACITEC CONECTA como aplicativo</p>
              <p className="mt-1 text-muted-foreground">
                O ícone fica na sua área de trabalho (ou tela inicial) e o sistema abre em janela própria.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={instalacao.dispensar}>Agora não</Button>
            <Button size="sm" onClick={instalacao.instalar}><Download /> Instalar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
