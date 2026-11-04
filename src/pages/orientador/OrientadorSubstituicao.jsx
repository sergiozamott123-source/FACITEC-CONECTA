// src/pages/orientador/OrientadorSubstituicao.jsx
//
// Página do orientador para solicitar a própria substituição (Edital
// FACITEC vigente, item 16.2). O orientador atual indica o motivo e o
// professor substituto (nome, e-mail, CPF e telefone) e anexa a própria
// Solicitação de Desligamento assinada — o sistema gera essa carta já
// preenchida em PDF para facilitar a assinatura eletrônica (GOV.BR). A
// Declaração de Anuência da escola NÃO é mais anexada aqui: passou a ser
// responsabilidade do substituto, na tela do convite (revisão de
// 04/11/2026, a pedido de Sérgio).
//
// O sistema gera um link de convite para que o substituto preencha seus
// próprios dados (ver ConviteSubstituicaoOrientador.jsx). O pedido só
// vira troca de verdade depois da aprovação da Secretaria Executiva, no
// painel "Substituições" do menu dela — ver
// src/pages/admin/SubstituicoesOrientadorPainel.jsx.

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Upload, FileText, Copy, Check, Clock, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react'
import { OrientadorSidebar } from './OrientadorSidebar'
import { usePortalOrientador } from '@/contexts/PortalOrientadorContext'
import {
  solicitarSubstituicaoOrientador,
  listarSolicitacoesSubstituicaoOrientadorDoOrientador,
  uploadDocSolicitacaoSubstituicao,
} from '@/lib/substituicoesOrientador'
import { baixarSolicitacaoDesligamento } from '@/lib/documentosSubstituicaoOrientador'

function formatarDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const STATUS_INFO = {
  aguardando_substituto: { label: 'Aguardando o substituto preencher os dados', color: 'amber', Icon: Clock },
  aguardando_aprovacao: { label: 'Aguardando aprovação da Secretaria Executiva', color: 'blue', Icon: Clock },
  aprovada: { label: 'Aprovada — substituição concluída', color: 'green', Icon: CheckCircle },
  recusada: { label: 'Recusada pela Secretaria Executiva', color: 'red', Icon: XCircle },
  cancelada: { label: 'Cancelada', color: 'gray', Icon: XCircle },
}

const colorCls = {
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  green: 'bg-green-50 text-green-800 border-green-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
}

export function OrientadorSubstituicao() {
  const { orientador, projeto } = usePortalOrientador()
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  const [motivo, setMotivo] = useState('')
  const [nomeSubstituto, setNomeSubstituto] = useState('')
  const [emailSubstituto, setEmailSubstituto] = useState('')
  const [cpfSubstituto, setCpfSubstituto] = useState('')
  const [telefoneSubstituto, setTelefoneSubstituto] = useState('')
  const [desligamento, setDesligamento] = useState(null) // { url, nomeArquivo }
  const [enviandoDesligamento, setEnviandoDesligamento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  useEffect(() => { if (orientador?.id) carregar() }, [orientador?.id])

  async function carregar() {
    setLoading(true)
    try {
      const data = await listarSolicitacoesSubstituicaoOrientadorDoOrientador(orientador.id)
      setSolicitacoes(data)
    } catch {
      // falha silenciosa — não deve travar a página
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadDesligamento(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoDesligamento(true)
    setError(null)
    try {
      const result = await uploadDocSolicitacaoSubstituicao(file, orientador.id, 'desligamento')
      setDesligamento(result)
    } catch (err) {
      setError(err.message ?? 'Erro ao enviar a Solicitação de Desligamento.')
    } finally {
      setEnviandoDesligamento(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!desligamento) {
      setError('Anexe sua Solicitação de Desligamento assinada antes de enviar.')
      return
    }
    setEnviando(true)
    try {
      await solicitarSubstituicaoOrientador({
        projetoId: projeto.id,
        motivo,
        nomeSubstituto,
        emailSubstituto,
        cpfSubstituto,
        telefoneSubstituto,
        docDesligamentoUrl: desligamento.url,
        docDesligamentoNomeArquivo: desligamento.nomeArquivo,
      })
      setMotivo('')
      setNomeSubstituto('')
      setEmailSubstituto('')
      setCpfSubstituto('')
      setTelefoneSubstituto('')
      setDesligamento(null)
      await carregar()
    } catch (err) {
      setError(err.message ?? 'Erro ao solicitar a substituição.')
    } finally {
      setEnviando(false)
    }
  }

  function handleBaixarDesligamento() {
    baixarSolicitacaoDesligamento({
      orientador,
      projeto,
      numeroEdital: projeto?.edicao?.numero_edital,
      nomeSubstituto,
      cpfSubstituto,
      motivo,
    })
  }

  function copiarLink(token) {
    const link = `${window.location.origin}/convite-substituicao-orientador/${token}`
    navigator.clipboard?.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const emAndamento = solicitacoes.find(s => s.status === 'aguardando_substituto' || s.status === 'aguardando_aprovacao')
  const jaSubstituido = orientador?.status === 'substituido'

  return (
    <div className="min-h-screen flex bg-gray-50">
      <OrientadorSidebar />

      <main className="flex-1 ml-[200px] p-6 space-y-5" style={{ maxWidth: 'calc(100% - 200px)' }}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Minha substituição</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Solicite sua substituição como orientador deste projeto (Edital vigente, item 16.2).
          </p>
        </div>

        {jaSubstituido && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Você já foi substituído neste projeto</p>
              <p className="text-xs text-gray-500 mt-1">
                Sua substituição foi aprovada em {formatarDataHora(orientador.data_substituicao)}. Você continua com acesso de
                consulta ao histórico do que já fez no projeto.
              </p>
            </div>
          </div>
        )}

        {!jaSubstituido && loading && (
          <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
        )}

        {!jaSubstituido && !loading && emAndamento && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            {(() => {
              const info = STATUS_INFO[emAndamento.status]
              const Icon = info.Icon
              return (
                <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${colorCls[info.color]}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {info.label}
                </div>
              )
            })()}
            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="text-gray-400">Substituto indicado:</span> {emAndamento.nome_substituto} ({emAndamento.email_substituto})</p>
              <p><span className="text-gray-400">Motivo:</span> {emAndamento.motivo}</p>
              <p><span className="text-gray-400">Pedido em:</span> {formatarDataHora(emAndamento.created_at)}</p>
            </div>
            {emAndamento.status === 'aguardando_substituto' && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-3 space-y-2">
                <p className="text-xs text-blue-800">
                  Envie este link para <strong>{emAndamento.nome_substituto}</strong> preencher os próprios dados e
                  documentos. O link expira em {formatarDataHora(emAndamento.convite_expira_em)}.
                </p>
                <button
                  onClick={() => copiarLink(emAndamento.token_convite)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-100 transition-colors"
                >
                  {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado ? 'Link copiado!' : 'Copiar link do convite'}
                </button>
              </div>
            )}
          </div>
        )}

        {!jaSubstituido && !loading && !emAndamento && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-100">Solicitar substituição</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do desligamento</label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={3}
                required
                placeholder="Explique o motivo da sua substituição..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do professor substituto</label>
                <input
                  value={nomeSubstituto}
                  onChange={e => setNomeSubstituto(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do substituto</label>
                <input
                  type="email"
                  value={emailSubstituto}
                  onChange={e => setEmailSubstituto(e.target.value)}
                  required
                  placeholder="professor@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF do substituto</label>
                <input
                  value={cpfSubstituto}
                  onChange={e => setCpfSubstituto(e.target.value)}
                  required
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone do substituto</label>
                <input
                  value={telefoneSubstituto}
                  onChange={e => setTelefoneSubstituto(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3 space-y-2">
              <p className="text-xs text-blue-900">
                Baixe sua Solicitação de Desligamento já preenchida com os dados do projeto e do substituto, assine
                eletronicamente (GOV.BR) e anexe o arquivo assinado abaixo.
              </p>
              <button
                type="button"
                onClick={handleBaixarDesligamento}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Solicitação de Desligamento (PDF)
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minha Solicitação de Desligamento assinada</label>
              <p className="text-xs text-gray-400 mb-1.5">
                Envie o documento acima já assinado (GOV.BR ou assinatura física digitalizada).
              </p>
              <div
                className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                  desligamento ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
                onClick={() => fileRef.current?.click()}
              >
                {desligamento ? (
                  <>
                    <FileText className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-xs text-gray-700 truncate flex-1">{desligamento.nomeArquivo}</span>
                    <span className="text-[10px] text-blue-600 shrink-0 font-medium">Substituir</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {enviandoDesligamento ? 'Enviando...' : 'Clique para enviar (PDF, JPG, PNG)'}
                    </span>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadDesligamento} disabled={enviandoDesligamento} />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2 text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={enviando || enviandoDesligamento}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {enviando ? 'Enviando...' : 'Solicitar substituição e gerar convite'}
            </button>
          </form>
        )}

        {!jaSubstituido && !loading && solicitacoes.some(s => s.status === 'recusada') && !emAndamento && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800">
            Seu último pedido de substituição foi recusado
            {solicitacoes.find(s => s.status === 'recusada')?.motivo_recusa
              ? `: ${solicitacoes.find(s => s.status === 'recusada').motivo_recusa}`
              : '.'} Você pode abrir um novo pedido acima.
          </div>
        )}
      </main>
    </div>
  )
}
