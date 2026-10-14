// src/pages/GestaoCnds.jsx
//
// Tela de Gestão de CNDs (14/10/2026) — pedido do Sérgio: até aqui, só dava
// para enviar uma CND nova quando um pagamento já estava retido por ela
// (dentro do Financeiro). Esta tela permite atualizar a CND de qualquer
// beneficiário a qualquer momento, inclusive antes de vencer, e permite
// enviar vários PDFs de uma vez (arrastando a pasta inteira) — o sistema lê
// o CPF de dentro de cada PDF e identifica sozinho de quem é cada CND,
// sempre pedindo conferência antes de gravar (nada é salvo sem revisão).
//
// Nada em lib/pagamentos.js, lib/cnd.js (funções já existentes) ou na tela
// de Financeiro foi alterado por esta funcionalidade — é só um caminho novo
// e independente até chegar no mesmo "uploadCnd" que já estava em produção.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileCheck2, ExternalLink, Loader2, X, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField, Input, Select, ErrorAlert, LoadingState } from '@/components/common/FormField'
import { useAdmin } from '@/contexts/AdminContext'
import { listarTodosComCnd, uploadCnd, identificarCndNoPdf, liberarCndPagamentosPendentes } from '@/lib/cnd'

function situacaoCnd(linha) {
  if (!linha.data_validade) return { label: 'Sem CND cadastrada', variant: 'destructive' }
  if (linha.vencida) return { label: `Vencida em ${fmtData(linha.data_validade)}`, variant: 'destructive' }
  if (linha.dias_para_vencer <= 15) return { label: `Vence em ${fmtData(linha.data_validade)}`, variant: 'warning' }
  return { label: `Vigente até ${fmtData(linha.data_validade)}`, variant: 'success' }
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function chave(tipo, id) {
  return `${tipo}:${id}`
}

// ── Toast local (mesmo padrão simples usado em Financeiro.jsx) ─────────────
function Toast({ toast }) {
  if (!toast) return null
  const estilos = {
    ok: 'bg-emerald-600 text-white',
    err: 'bg-red-600 text-white',
    warn: 'bg-amber-500 text-white',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm ${estilos[toast.type] ?? estilos.ok}`}>
      {toast.msg}
    </div>
  )
}

export function GestaoCnds() {
  const { edicaoSelecionada } = useAdmin()
  const edicaoId = edicaoSelecionada?.id

  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const [toast, setToast] = useState(null)

  const [lote, setLote] = useState([])
  const [arrastando, setArrastando] = useState(false)
  const [enviandoLote, setEnviandoLote] = useState(false)

  const inputLoteRef = useRef(null)
  const inputAvulsoRef = useRef(null)
  const alvoAvulsoRef = useRef(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function carregar() {
    if (!edicaoId) return
    setCarregando(true)
    setErro(null)
    try {
      setLinhas(await listarTodosComCnd(edicaoId))
    } catch (e) {
      setErro(e.message ?? 'Erro ao carregar os beneficiários.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId])

  const linhasFiltradas = useMemo(() => {
    const ordenadas = [...linhas].sort((a, b) => {
      const pa = a.vencida ? -1 : a.dias_para_vencer ?? 9999
      const pb = b.vencida ? -1 : b.dias_para_vencer ?? 9999
      if (pa !== pb) return pa - pb
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
    const termo = busca.trim().toLowerCase()
    if (!termo) return ordenadas
    return ordenadas.filter(l => l.nome.toLowerCase().includes(termo))
  }, [linhas, busca])

  // ── Entrada de arquivos (lote ou avulso) — os dois caminhos convergem
  // para a mesma lista de conferência `lote`, processada do mesmo jeito. ──

  function novaLinhaLote(file) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      nomeArquivo: file.name,
      lendo: true,
      beneficiarioTipo: null,
      beneficiarioId: null,
      nomeEncontrado: null,
      dataValidade: '',
      enviando: false,
      enviado: false,
      erro: null,
    }
  }

  async function processarArquivos(files) {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (!pdfs.length) {
      showToast('Nenhum PDF encontrado nos arquivos selecionados.', 'warn')
      return
    }
    const novasLinhas = pdfs.map(novaLinhaLote)
    setLote(prev => [...prev, ...novasLinhas])

    for (const linha of novasLinhas) {
      const resultado = await identificarCndNoPdf(linha.file, linhas)
      setLote(prev => prev.map(l => l.id !== linha.id ? l : {
        ...l,
        lendo: false,
        beneficiarioTipo: resultado.beneficiario?.beneficiario_tipo ?? null,
        beneficiarioId: resultado.beneficiario?.id ?? null,
        nomeEncontrado: resultado.beneficiario?.nome ?? null,
        dataValidade: resultado.dataValidadeSugerida ?? '',
      }))
    }
  }

  // Upload avulso: clicar em "Enviar CND" numa linha da tabela já sabe de
  // quem é — só falta o arquivo. Mesmo assim tenta detectar a validade
  // automaticamente, e cai na mesma lista de conferência antes de gravar.
  function iniciarUploadAvulso(linhaBeneficiario) {
    alvoAvulsoRef.current = linhaBeneficiario
    inputAvulsoRef.current?.click()
  }

  async function handleArquivoAvulso(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    const beneficiario = alvoAvulsoRef.current
    if (!file || !beneficiario) return

    const linha = novaLinhaLote(file)
    setLote(prev => [...prev, linha])
    const resultado = await identificarCndNoPdf(file, linhas)
    setLote(prev => prev.map(l => l.id !== linha.id ? l : {
      ...l,
      lendo: false,
      beneficiarioTipo: beneficiario.beneficiario_tipo,
      beneficiarioId: beneficiario.id,
      nomeEncontrado: beneficiario.nome,
      dataValidade: resultado.dataValidadeSugerida ?? '',
    }))
  }

  function atualizarLinhaLote(id, patch) {
    setLote(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function removerLinhaLote(id) {
    setLote(prev => prev.filter(l => l.id !== id))
  }

  function handleEscolherPessoa(id, valorSelect) {
    if (!valorSelect) {
      atualizarLinhaLote(id, { beneficiarioTipo: null, beneficiarioId: null, nomeEncontrado: null })
      return
    }
    const [tipo, beneficiarioId] = valorSelect.split(':')
    const beneficiario = linhas.find(l => l.beneficiario_tipo === tipo && String(l.id) === beneficiarioId)
    atualizarLinhaLote(id, {
      beneficiarioTipo: tipo,
      beneficiarioId: beneficiario?.id ?? beneficiarioId,
      nomeEncontrado: beneficiario?.nome ?? null,
    })
  }

  const loteProntoCount = lote.filter(l => l.beneficiarioId && l.dataValidade && !l.enviado).length

  async function handleConfirmarLote() {
    setEnviandoLote(true)
    let sucesso = 0
    let falha = 0

    for (const linha of lote) {
      if (linha.enviado || !linha.beneficiarioId || !linha.dataValidade) continue
      atualizarLinhaLote(linha.id, { enviando: true, erro: null })
      try {
        const beneficiario = linhas.find(l => l.beneficiario_tipo === linha.beneficiarioTipo && l.id === linha.beneficiarioId)
        await uploadCnd({
          beneficiarioTipo: linha.beneficiarioTipo,
          beneficiarioId: linha.beneficiarioId,
          cpf: beneficiario?.cpf ?? null,
          file: linha.file,
          dataValidade: linha.dataValidade,
        })
        if (edicaoId) {
          await liberarCndPagamentosPendentes(edicaoId, linha.beneficiarioTipo, linha.beneficiarioId)
        }
        atualizarLinhaLote(linha.id, { enviando: false, enviado: true })
        sucesso += 1
      } catch (e) {
        atualizarLinhaLote(linha.id, { enviando: false, erro: e.message ?? 'Erro ao enviar.' })
        falha += 1
      }
    }

    setEnviandoLote(false)
    setLote(prev => prev.filter(l => !l.enviado))

    if (sucesso > 0) showToast(`${sucesso} CND${sucesso > 1 ? 's' : ''} enviada${sucesso > 1 ? 's' : ''} com sucesso.`, 'ok')
    if (falha > 0) showToast(`${falha} arquivo${falha > 1 ? 's' : ''} com erro — confira abaixo.`, 'err')
    if (sucesso > 0) await carregar()
  }

  if (carregando) return <LoadingState />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Gestão de CNDs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Envie certidões novas a qualquer momento, avulsas ou em lote — não é preciso esperar o pagamento
          ficar retido para atualizar.
        </p>
      </div>

      <ErrorAlert message={erro} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Enviar em lote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setArrastando(true) }}
            onDragLeave={() => setArrastando(false)}
            onDrop={e => {
              e.preventDefault()
              setArrastando(false)
              processarArquivos(e.dataTransfer.files)
            }}
            onClick={() => inputLoteRef.current?.click()}
            className={`rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
              arrastando ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
            }`}
          >
            <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-foreground font-medium">Arraste os PDFs das CNDs aqui</p>
            <p className="text-xs text-muted-foreground mt-0.5">ou clique para selecionar — pode soltar vários de uma vez</p>
            <input
              ref={inputLoteRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={e => { processarArquivos(e.target.files); e.target.value = '' }}
            />
          </div>

          {lote.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">Conferência antes de enviar</p>
              {lote.map(linha => (
                <div key={linha.id} className="rounded-md border border-border px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground truncate">{linha.nomeArquivo}</p>
                    {!linha.enviando && (
                      <button
                        type="button"
                        onClick={() => removerLinhaLote(linha.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {linha.lendo ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lendo o PDF e identificando a pessoa...
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                      <FormField label={linha.nomeEncontrado ? 'Identificado automaticamente' : 'Não identificado — selecione'}>
                        <Select
                          value={linha.beneficiarioTipo && linha.beneficiarioId ? chave(linha.beneficiarioTipo, linha.beneficiarioId) : ''}
                          onChange={e => handleEscolherPessoa(linha.id, e.target.value)}
                          disabled={linha.enviando}
                        >
                          <option value="">Selecione a pessoa...</option>
                          <optgroup label="Orientadores">
                            {linhas.filter(l => l.beneficiario_tipo === 'orientador').map(l => (
                              <option key={chave(l.beneficiario_tipo, l.id)} value={chave(l.beneficiario_tipo, l.id)}>
                                {l.nome} — {l.cpf}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Bolsistas">
                            {linhas.filter(l => l.beneficiario_tipo === 'bolsista').map(l => (
                              <option key={chave(l.beneficiario_tipo, l.id)} value={chave(l.beneficiario_tipo, l.id)}>
                                {l.nome} — {l.cpf}
                              </option>
                            ))}
                          </optgroup>
                        </Select>
                      </FormField>
                      <FormField label="Validade da CND">
                        <Input
                          type="date"
                          value={linha.dataValidade}
                          onChange={e => atualizarLinhaLote(linha.id, { dataValidade: e.target.value })}
                          disabled={linha.enviando}
                        />
                      </FormField>
                    </div>
                  )}

                  {linha.erro && <p className="text-xs text-destructive">{linha.erro}</p>}
                  {linha.enviando && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...
                    </p>
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-1">
                <Button onClick={handleConfirmarLote} disabled={enviandoLote || loteProntoCount === 0}>
                  {enviandoLote ? 'Enviando...' : `Confirmar e enviar (${loteProntoCount})`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Todos os beneficiários</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {linhasFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum beneficiário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Situação da CND</th>
                    <th className="pb-2 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map(linha => {
                    const situacao = situacaoCnd(linha)
                    return (
                      <tr key={chave(linha.beneficiario_tipo, linha.id)} className="border-b border-border last:border-0">
                        <td className="py-2 pr-2">{linha.nome}</td>
                        <td className="py-2 pr-2 text-muted-foreground">
                          {linha.beneficiario_tipo === 'orientador' ? 'Orientador' : 'Bolsista'}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={situacao.variant}>{situacao.label}</Badge>
                            {linha.arquivo_url && (
                              <a
                                href={linha.arquivo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline text-xs inline-flex items-center gap-0.5"
                              >
                                Ver PDF <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="outline" onClick={() => iniciarUploadAvulso(linha)}>
                            <FileCheck2 className="w-3.5 h-3.5" /> Enviar CND
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={inputAvulsoRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleArquivoAvulso}
      />

      <Toast toast={toast} />
    </div>
  )
}
