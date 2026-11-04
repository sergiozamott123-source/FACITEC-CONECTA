// src/components/AguardandoAprovacaoSubstituicao.jsx
//
// Tela de acesso restrito mostrada a um orientador substituto enquanto
// ele estiver com status 'pendente_documentacao_substituicao' — ou seja,
// já confirmou o convite de substituição (ver ConviteSubstituicaoOrientador.jsx)
// mas a Secretaria Executiva ainda não confirmou o Termo Aditivo assinado
// e aprovou o pedido. Renderizada por RequireAcessoOrientador.jsx no lugar
// de QUALQUER rota do portal — o substituto não enxerga mais nada do
// sistema além desta tela até ser aprovado (decisão de 04/11/2026, a
// pedido de Sérgio).

import { useEffect, useState } from 'react'
import { Clock, LogOut, XCircle, FileCheck2 } from 'lucide-react'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import { obterMinhaSolicitacaoComoSubstituto } from '@/lib/substituicoesOrientador'

const DOCS = [
  { key: 'doc_identidade', label: 'Identidade com foto e CPF' },
  { key: 'doc_diploma', label: 'Diploma de graduação' },
  { key: 'doc_comprovante_residencia_url', label: 'Comprovante de residência' },
  { key: 'doc_regularidade_url', label: 'Certidão de regularidade fiscal (CND)' },
]

export function AguardandoAprovacaoSubstituicao() {
  const { orientador, logout } = usePortalOrientador()
  const [solicitacao, setSolicitacao] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orientador?.id) return
    obterMinhaSolicitacaoComoSubstituto(orientador.id)
      .then(setSolicitacao)
      .finally(() => setLoading(false))
  }, [orientador?.id])

  const recusada = solicitacao?.status === 'recusada'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${recusada ? 'bg-red-100' : 'bg-amber-100'}`}>
            {recusada ? <XCircle className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">
              {recusada ? 'Pedido de substituição recusado' : 'Aguardando aprovação da Secretaria Executiva'}
            </h1>
            <p className="text-xs text-gray-500">
              {loading ? 'Carregando...' : solicitacao?.projeto?.titulo ?? 'Substituição de orientador'}
            </p>
          </div>
        </div>

        {!loading && recusada ? (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            Seu pedido de substituição foi recusado pela Secretaria Executiva
            {solicitacao?.motivo_recusa ? `: ${solicitacao.motivo_recusa}` : '.'} Entre em contato com{' '}
            {solicitacao?.orientador_saiu?.nome_completo ?? 'o orientador que enviou o convite'} para mais informações.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Sua Manifestação de Interesse e seus documentos já foram enviados. Enquanto a Secretaria confirma o Termo
              Aditivo assinado e aprova o pedido, seu acesso ao sistema fica restrito a esta tela — nada mais do portal
              fica disponível até a aprovação.
            </p>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" /> Documentos enviados
              </p>
              {DOCS.map(d => (
                <div key={d.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{d.label}</span>
                  <span className={orientador?.[d.key] ? 'text-green-700 font-medium' : 'text-amber-600'}>
                    {orientador?.[d.key] ? 'Enviado' : 'Pendente'}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Declaração de Anuência da escola</span>
                <span className={solicitacao?.doc_anuencia_url ? 'text-green-700 font-medium' : 'text-amber-600'}>
                  {solicitacao?.doc_anuencia_url ? 'Enviado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Declaração de Aceitação da Substituição</span>
                <span className={solicitacao?.doc_aceitacao_url ? 'text-green-700 font-medium' : 'text-amber-600'}>
                  {solicitacao?.doc_aceitacao_url ? 'Enviado' : 'Pendente'}
                </span>
              </div>
            </div>
          </>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair
        </button>
      </div>
    </div>
  )
}
