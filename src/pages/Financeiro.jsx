import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, DollarSign, FileDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/common/Modal'
import { FormField, Input, Select, Textarea, ErrorAlert, EmptyState, LoadingState } from '@/components/common/FormField'
import { useAdmin } from '@/contexts/AdminContext'
import { supabase } from '@/lib/supabase'
import { contratoService } from '@/lib/db'
import { listarCiclos } from '@/lib/relatorioMensal'
import {
  listarBeneficiariosPagaveis,
  gerarPagamentosDoCiclo,
  calcularElegibilidade,
  calcularSaldoContrato,
  marcarComoPago,
  liberarManualmente,
  verificarCndConsecutiva,
  buscarCndVigente,
} from '@/lib/pagamentos'
import { listarCndVencendoEmBreve, uploadCnd } from '@/lib/cnd'
import { exportarRelatorioGAF } from '@/lib/relatorioPagamentoGAF'

const ESTADO_LABEL = {
  liberado: 'Liberado',
  pendente_requisito: 'Pendente',
  retido_cnd: 'CND retida',
  bloqueado_saldo: 'Saldo insuficiente',
}

const BADGE_VARIANT = {
  liberado: 'success',
  pendente_requisito: 'secondary',
  retido_cnd: 'destructive',
  bloqueado_saldo: 'warning',
}

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor ?? 0))
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Toast local (mesmo padrão simples usado em ContratoDetalhe.jsx) ────────
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

// ── Modal — conferir/atualizar CND ──────────────────────────────────────────
function CndModal({ item, onClose, onMarcarStatus, onUpload }) {
  const [cndVigente, setCndVigente] = useState(null)
  const [loadingCnd, setLoadingCnd] = useState(false)
  const [file, setFile] = useState(null)
  const [dataValidade, setDataValidade] = useState('')
  const [uploading, setUploading] = useState(false)
  const [marcando, setMarcando] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!item) return
    let cancelado = false
    setLoadingCnd(true)
    buscarCndVigente(item.beneficiario.beneficiario_tipo, item.beneficiario.id, hojeISO())
      .then(doc => { if (!cancelado) setCndVigente(doc) })
      .catch(() => {})
      .finally(() => { if (!cancelado) setLoadingCnd(false) })
    return () => { cancelado = true }
  }, [item])

  if (!item) return null

  async function handleUpload() {
    if (!file || !dataValidade) return
    setUploading(true)
    try {
      const doc = await onUpload({
        beneficiarioTipo: item.beneficiario.beneficiario_tipo,
        beneficiarioId: item.beneficiario.id,
        cpf: item.beneficiario.cpf,
        file,
        dataValidade,
      })
      setCndVigente(doc)
      setFile(null)
      setDataValidade('')
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      /* toast já emitido pelo chamador */
    } finally {
      setUploading(false)
    }
  }

  async function handleMarcar(status) {
    setMarcando(true)
    try {
      await onMarcarStatus(item.pagamento.id, status, item.beneficiario)
    } finally {
      setMarcando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Conferir CND — ${item.beneficiario.nome}`} size="sm">
      <div className="space-y-4">
        {loadingCnd ? (
          <p className="text-sm text-muted-foreground">Verificando CND vigente...</p>
        ) : cndVigente ? (
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">
              CND vigente até {new Date(cndVigente.data_validade).toLocaleDateString('pt-BR')}
            </p>
            <a href={cndVigente.arquivo_url} target="_blank" rel="noreferrer" className="text-primary underline">
              Ver PDF
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma CND vigente cadastrada.</p>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          <FormField label="Enviar novo PDF">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </FormField>
          <FormField label="Validade">
            <Input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} />
          </FormField>
          <Button size="sm" variant="outline" disabled={!file || !dataValidade || uploading} onClick={handleUpload}>
            {uploading ? 'Enviando...' : 'Enviar PDF'}
          </Button>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-border">
          <Button size="sm" variant="destructive" disabled={marcando} onClick={() => handleMarcar('irregular')}>
            Marcar irregular
          </Button>
          <Button size="sm" disabled={marcando} onClick={() => handleMarcar('regular')}>
            Marcar regular
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal — liberar mesmo assim (bloqueio de saldo) ─────────────────────────
function LiberarSaldoModal({ item, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { setMotivo('') }, [item])

  if (!item) return null
  const valido = motivo.trim().length >= 10

  async function confirmar() {
    setSalvando(true)
    try {
      await onConfirmar(item.pagamento.id, motivo.trim())
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Liberar mesmo assim — ${item.beneficiario.nome}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Este pagamento ultrapassa o saldo disponível do contrato. Informe o motivo para liberar mesmo assim.
        </p>
        <FormField label="Motivo" required>
          <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Mín. 10 caracteres" rows={4} />
        </FormField>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button size="sm" disabled={!valido || salvando} onClick={confirmar}>
            {salvando ? 'Salvando...' : 'Liberar mesmo assim'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Card de um contrato (orientador + sua equipe pagável) ───────────────────
function ContratoCard({ contrato, saldo, linhas, cicloSelecionado, selecionadosSet,
  onToggleSelecionado, onSelecionarTodosLiberados, onMarcarSelecionadosPagos,
  onMarcarUmPago, onAbrirCnd, onAbrirSaldo, onEmitirGAF }) {
  const percentual = saldo.reservado > 0
    ? Math.min(100, ((saldo.pago + saldo.comprometido) / saldo.reservado) * 100)
    : 0

  const liberados = linhas.filter(l => l.pagamento && l.eligibilidade?.estado === 'liberado')
  const liberadosIds = liberados.map(l => l.pagamento.id)
  const liberadosParaGAF = liberados.map(l => ({
    nome: l.beneficiario.nome,
    cpf: l.beneficiario.cpf,
    beneficiario_tipo: l.beneficiario.beneficiario_tipo,
    valor: l.pagamento.valor,
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{contrato.orientador?.nome_completo ?? '—'}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contrato.numero_contrato ? `Contrato nº ${contrato.numero_contrato}` : 'Sem número de contrato'}
              {contrato.codigo_facitec_orientador ? ` · ${contrato.codigo_facitec_orientador}` : ''}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEmitirGAF(contrato, cicloSelecionado, liberadosParaGAF)}
            disabled={!liberadosParaGAF.length}
          >
            <FileDown className="w-4 h-4" /> Emitir relatório para GAF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div><p className="text-muted-foreground">Reservado</p><p className="font-semibold text-foreground">{fmt(saldo.reservado)}</p></div>
            <div><p className="text-muted-foreground">Pago</p><p className="font-semibold text-emerald-600">{fmt(saldo.pago)}</p></div>
            <div><p className="text-muted-foreground">Comprometido</p><p className="font-semibold text-amber-600">{fmt(saldo.comprometido)}</p></div>
            <div><p className="text-muted-foreground">Disponível</p><p className={`font-semibold ${saldo.disponivel < 0 ? 'text-destructive' : 'text-foreground'}`}>{fmt(saldo.disponivel)}</p></div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${percentual}%` }} />
          </div>
        </div>

        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum beneficiário pagável neste contrato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium w-8"></th>
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Situação</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                  <th className="pb-2 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ beneficiario, pagamento, eligibilidade }) => (
                  <tr key={`${beneficiario.beneficiario_tipo}-${beneficiario.id}`} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2 align-top">
                      {pagamento && eligibilidade?.estado === 'liberado' && (
                        <input
                          type="checkbox"
                          checked={selecionadosSet.has(pagamento.id)}
                          onChange={() => onToggleSelecionado(contrato.id, pagamento.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <p className="text-foreground">{beneficiario.nome}</p>
                      <p className="text-xs text-muted-foreground">{beneficiario.beneficiario_tipo === 'orientador' ? 'Orientador' : 'Bolsista'}</p>
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {!pagamento ? (
                        <Badge variant="secondary">Não gerado</Badge>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge variant={BADGE_VARIANT[eligibilidade?.estado] ?? 'secondary'}>
                            {ESTADO_LABEL[eligibilidade?.estado] ?? '—'}
                          </Badge>
                          {eligibilidade?.estado !== 'liberado' && eligibilidade?.motivo && (
                            <p className="text-xs text-muted-foreground">{eligibilidade.motivo}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 align-top text-right font-medium">
                      {fmt(pagamento?.valor ?? beneficiario.valor_padrao)}
                    </td>
                    <td className="py-2 align-top text-right">
                      {pagamento && eligibilidade?.estado === 'liberado' && (
                        <Button size="sm" variant="outline" onClick={() => onMarcarUmPago(pagamento.id)}>Marcar como pago</Button>
                      )}
                      {pagamento && eligibilidade?.estado === 'retido_cnd' && (
                        <Button size="sm" variant="outline" onClick={() => onAbrirCnd(pagamento, beneficiario)}>Conferir CND</Button>
                      )}
                      {pagamento && eligibilidade?.estado === 'bloqueado_saldo' && (
                        <Button size="sm" variant="outline" onClick={() => onAbrirSaldo(pagamento, beneficiario)}>Liberar mesmo assim</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="ghost" onClick={() => onSelecionarTodosLiberados(contrato.id, liberadosIds)} disabled={!liberadosIds.length}>
            Selecionar todos os liberados
          </Button>
          <Button size="sm" onClick={() => onMarcarSelecionadosPagos(contrato.id)} disabled={!selecionadosSet.size}>
            Marcar selecionados como pagos
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Tela principal ──────────────────────────────────────────────────────────
export function Financeiro() {
  const { edicaoSelecionada } = useAdmin()
  const edicaoId = edicaoSelecionada?.id

  const [loading, setLoading] = useState(true)
  const [loadingCiclo, setLoadingCiclo] = useState(false)
  const [erro, setErro] = useState(null)
  const [toast, setToast] = useState(null)

  const [ciclos, setCiclos] = useState([])
  const [cicloId, setCicloId] = useState(null)
  const [beneficiarios, setBeneficiarios] = useState([])
  const [contratos, setContratos] = useState([])
  const [cndAlertas, setCndAlertas] = useState([])

  const [pagamentos, setPagamentos] = useState([])
  const [relatorios, setRelatorios] = useState([])
  const [saldos, setSaldos] = useState({})
  const [elegibilidades, setElegibilidades] = useState({})

  const [gerando, setGerando] = useState(false)
  const [selecionados, setSelecionados] = useState({})
  const [modalCnd, setModalCnd] = useState(null)
  const [modalSaldo, setModalSaldo] = useState(null)

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), type === 'warn' ? 7000 : 4000)
  }

  // ── Regra automática dos 2 ciclos de CND irregular (Etapa 4) ────────────
  const rodarChecagemAutomatica = useCallback(async (ciclosData, beneficiariosData) => {
    const hoje = hojeISO()
    const abertos = ciclosData.filter(c => c.data_abertura <= hoje)
    if (!abertos.length) return false
    const cicloRecente = abertos.reduce((max, c) => (c.numero_ciclo > max.numero_ciclo ? c : max))

    const { data: irregulares, error } = await supabase
      .from('pagamento')
      .select('beneficiario_tipo, orientador_id, bolsista_id')
      .eq('ciclo_id', cicloRecente.id)
      .eq('cnd_status', 'irregular')
    if (error) throw error

    const vistos = new Set()
    const desligados = []
    for (const p of irregulares ?? []) {
      const id = p.beneficiario_tipo === 'orientador' ? p.orientador_id : p.bolsista_id
      const chave = `${p.beneficiario_tipo}:${id}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      const resultado = await verificarCndConsecutiva(p.beneficiario_tipo, id)
      if (resultado?.desligado) {
        const beneficiario = beneficiariosData.find(b => b.beneficiario_tipo === p.beneficiario_tipo && b.id === id)
        desligados.push({ ...resultado, nome: beneficiario?.nome ?? 'Beneficiário' })
      }
    }

    if (desligados.length) {
      const lista = desligados
        .map(d => `${d.nome} (${d.beneficiarioTipo === 'orientador' ? 'desclassificado' : 'desligado'})`)
        .join('; ')
      showToast(`Atenção: ${lista} por CND irregular em 2 ciclos consecutivos.`, 'warn')
      return true
    }
    return false
  }, [])

  // ── Carga inicial (independe do ciclo selecionado) ───────────────────────
  const carregarTudo = useCallback(async () => {
    if (!edicaoId) return
    setLoading(true)
    setErro(null)
    try {
      const [ciclosData, beneficiariosData, contratosResult, cndAlertasData] = await Promise.all([
        listarCiclos(edicaoId),
        listarBeneficiariosPagaveis(edicaoId),
        contratoService.list(edicaoId),
        listarCndVencendoEmBreve(edicaoId, 15),
      ])

      setCiclos(ciclosData)
      setContratos(contratosResult.data ?? [])

      const hoje = hojeISO()
      const abertos = ciclosData.filter(c => c.data_abertura <= hoje)
      const padrao = abertos.length ? abertos.reduce((m, c) => (c.numero_ciclo > m.numero_ciclo ? c : m)) : ciclosData[0]
      setCicloId(prev => prev ?? padrao?.id ?? null)

      const houveMudanca = await rodarChecagemAutomatica(ciclosData, beneficiariosData)
      if (houveMudanca) {
        const [beneficiariosAtualizados, cndAtualizadas] = await Promise.all([
          listarBeneficiariosPagaveis(edicaoId),
          listarCndVencendoEmBreve(edicaoId, 15),
        ])
        setBeneficiarios(beneficiariosAtualizados)
        setCndAlertas(cndAtualizadas)
      } else {
        setBeneficiarios(beneficiariosData)
        setCndAlertas(cndAlertasData)
      }
    } catch (e) {
      setErro(e.message ?? 'Erro ao carregar dados financeiros.')
    } finally {
      setLoading(false)
    }
  }, [edicaoId, rodarChecagemAutomatica])

  useEffect(() => { carregarTudo() }, [carregarTudo])

  // ── Dados do ciclo selecionado (pagamentos, relatórios, saldos) ─────────
  const carregarDadosCiclo = useCallback(async () => {
    if (!edicaoId || !cicloId || !contratos.length) {
      setPagamentos([]); setRelatorios([]); setSaldos({})
      return
    }
    setLoadingCiclo(true)
    try {
      const [{ data: pagamentosData, error: ePag }, { data: relatoriosData, error: eRel }, saldosArr] = await Promise.all([
        supabase.from('pagamento').select('*').eq('edicao_id', edicaoId).eq('ciclo_id', cicloId),
        supabase.from('relatorio_mensal').select('*').eq('ciclo_id', cicloId),
        Promise.all(contratos.map(c => calcularSaldoContrato(c.id))),
      ])
      if (ePag) throw ePag
      if (eRel) throw eRel

      setPagamentos(pagamentosData ?? [])
      setRelatorios(relatoriosData ?? [])
      setSaldos(Object.fromEntries(contratos.map((c, i) => [c.id, saldosArr[i]])))
    } catch (e) {
      setErro(e.message ?? 'Erro ao carregar pagamentos do ciclo.')
    } finally {
      setLoadingCiclo(false)
    }
  }, [edicaoId, cicloId, contratos])

  useEffect(() => { carregarDadosCiclo() }, [carregarDadosCiclo])

  // ── Elegibilidade de cada pagamento do ciclo selecionado ────────────────
  useEffect(() => {
    let cancelado = false
    async function calcular() {
      const map = {}
      for (const p of pagamentos) {
        const relatorio = relatorios.find(r => r.orientador_id === p.orientador_id) ?? null
        const saldo = saldos[p.contrato_id] ?? { reservado: 0, pago: 0, comprometido: 0, disponivel: 0 }
        map[p.id] = await calcularElegibilidade(p, relatorio, saldo)
      }
      if (!cancelado) setElegibilidades(map)
    }
    calcular()
    return () => { cancelado = true }
  }, [pagamentos, relatorios, saldos])

  const linhasPorContrato = useMemo(() => {
    const map = {}
    for (const contrato of contratos) {
      const doContrato = beneficiarios.filter(b => b.contrato_id === contrato.id)
      map[contrato.id] = doContrato.map(beneficiario => {
        const pagamento = pagamentos.find(p =>
          p.beneficiario_tipo === beneficiario.beneficiario_tipo &&
          (beneficiario.beneficiario_tipo === 'orientador' ? p.orientador_id === beneficiario.id : p.bolsista_id === beneficiario.id)
        ) ?? null
        const eligibilidade = pagamento ? (elegibilidades[pagamento.id] ?? null) : null
        return { beneficiario, pagamento, eligibilidade }
      })
    }
    return map
  }, [contratos, beneficiarios, pagamentos, elegibilidades])

  const cicloSelecionado = ciclos.find(c => c.id === cicloId) ?? null

  // ── Ações ─────────────────────────────────────────────────────────────
  async function handleGerarPagamentos() {
    if (!cicloId) return
    setGerando(true)
    try {
      const n = await gerarPagamentosDoCiclo(edicaoId, cicloId)
      showToast(`${n} pagamento(s) gerado(s) para o ciclo.`, 'ok')
      await carregarDadosCiclo()
    } catch (e) {
      showToast(e.message ?? 'Erro ao gerar pagamentos do ciclo.', 'err')
    } finally {
      setGerando(false)
    }
  }

  function toggleSelecionado(contratoId, pagamentoId) {
    setSelecionados(prev => {
      const atual = new Set(prev[contratoId] ?? [])
      if (atual.has(pagamentoId)) atual.delete(pagamentoId)
      else atual.add(pagamentoId)
      return { ...prev, [contratoId]: atual }
    })
  }

  function selecionarTodosLiberados(contratoId, ids) {
    setSelecionados(prev => ({ ...prev, [contratoId]: new Set(ids) }))
  }

  async function handleMarcarUmPago(pagamentoId) {
    try {
      await marcarComoPago([pagamentoId])
      showToast('Pagamento marcado como pago.', 'ok')
      await carregarDadosCiclo()
    } catch (e) {
      showToast(e.message ?? 'Erro ao marcar pagamento.', 'err')
    }
  }

  async function handleMarcarSelecionadosPagos(contratoId) {
    const ids = Array.from(selecionados[contratoId] ?? [])
    if (!ids.length) return
    try {
      await marcarComoPago(ids)
      setSelecionados(prev => ({ ...prev, [contratoId]: new Set() }))
      showToast(`${ids.length} pagamento(s) marcado(s) como pago(s).`, 'ok')
      await carregarDadosCiclo()
    } catch (e) {
      showToast(e.message ?? 'Erro ao marcar pagamentos selecionados.', 'err')
    }
  }

  async function handleMarcarStatusCnd(pagamentoId, status, beneficiario) {
    try {
      const { error } = await supabase
        .from('pagamento')
        .update({ cnd_status: status, cnd_verificado_em: new Date().toISOString() })
        .eq('id', pagamentoId)
      if (error) throw error

      if (status === 'irregular') {
        const resultado = await verificarCndConsecutiva(beneficiario.beneficiario_tipo, beneficiario.id)
        if (resultado?.desligado) {
          showToast(
            `Atenção: ${beneficiario.nome} foi ${beneficiario.beneficiario_tipo === 'orientador' ? 'desclassificado' : 'desligado'} automaticamente por CND irregular em 2 ciclos consecutivos.`,
            'warn'
          )
          setModalCnd(null)
          await carregarTudo()
          return
        }
      }
      showToast(`CND marcada como ${status}.`, 'ok')
      setModalCnd(null)
      await carregarDadosCiclo()
    } catch (e) {
      showToast(e.message ?? 'Erro ao atualizar CND.', 'err')
    }
  }

  async function handleUploadCnd(payload) {
    try {
      const doc = await uploadCnd(payload)
      showToast('CND enviada com sucesso.', 'ok')
      return doc
    } catch (e) {
      showToast(e.message ?? 'Erro ao enviar CND.', 'err')
      throw e
    }
  }

  async function handleLiberarManualmente(pagamentoId, motivo) {
    try {
      await liberarManualmente(pagamentoId, motivo)
      showToast('Pagamento liberado manualmente.', 'ok')
      setModalSaldo(null)
      await carregarDadosCiclo()
    } catch (e) {
      showToast(e.message ?? 'Erro ao liberar pagamento.', 'err')
    }
  }

  function handleEmitirGAF(contrato, ciclo, liberados) {
    if (!liberados.length || !ciclo) return
    const saldo = saldos[contrato.id] ?? { reservado: 0, pago: 0, comprometido: 0, disponivel: 0 }
    exportarRelatorioGAF({ ...contrato, saldo }, ciclo, liberados)
  }

  const totalPagamentos = pagamentos.length
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor ?? 0), 0)
  const totalAPagar = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor ?? 0), 0)

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      {cndAlertas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">CND vencendo em breve</p>
            <ul className="mt-1 space-y-0.5">
              {cndAlertas.map(a => (
                <li key={`${a.beneficiario_tipo}-${a.id}`}>
                  {a.nome} — {a.data_validade
                    ? `vence em ${new Date(a.data_validade).toLocaleDateString('pt-BR')}`
                    : 'sem CND cadastrada'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ErrorAlert message={erro} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Pagamentos', display: String(totalPagamentos), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Pago', display: fmt(totalPago), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'A Pagar', display: fmt(totalAPagar), icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(c => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`w-5 h-5 ${c.color}`} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold text-foreground">{c.display}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <FormField label="Ciclo" className="w-56">
          <Select value={cicloId ?? ''} onChange={e => setCicloId(e.target.value)}>
            {ciclos.map(c => (
              <option key={c.id} value={c.id}>Ciclo {c.numero_ciclo} — {c.mes_referencia}</option>
            ))}
          </Select>
        </FormField>
        <Button size="sm" onClick={handleGerarPagamentos} disabled={!cicloId || gerando}>
          {gerando ? 'Gerando...' : 'Gerar pagamentos do ciclo'}
        </Button>
        {loadingCiclo && <span className="text-xs text-muted-foreground">Atualizando...</span>}
      </div>

      {contratos.length === 0 ? (
        <EmptyState message="Nenhum contrato encontrado para esta edição." />
      ) : (
        <div className="space-y-4">
          {contratos.map(contrato => (
            <ContratoCard
              key={contrato.id}
              contrato={contrato}
              saldo={saldos[contrato.id] ?? { reservado: 0, pago: 0, comprometido: 0, disponivel: 0 }}
              linhas={linhasPorContrato[contrato.id] ?? []}
              cicloSelecionado={cicloSelecionado}
              selecionadosSet={selecionados[contrato.id] ?? new Set()}
              onToggleSelecionado={toggleSelecionado}
              onSelecionarTodosLiberados={selecionarTodosLiberados}
              onMarcarSelecionadosPagos={handleMarcarSelecionadosPagos}
              onMarcarUmPago={handleMarcarUmPago}
              onAbrirCnd={(pagamento, beneficiario) => setModalCnd({ pagamento, beneficiario })}
              onAbrirSaldo={(pagamento, beneficiario) => setModalSaldo({ pagamento, beneficiario })}
              onEmitirGAF={handleEmitirGAF}
            />
          ))}
        </div>
      )}

      <CndModal
        item={modalCnd}
        onClose={() => setModalCnd(null)}
        onMarcarStatus={handleMarcarStatusCnd}
        onUpload={handleUploadCnd}
      />
      <LiberarSaldoModal
        item={modalSaldo}
        onClose={() => setModalSaldo(null)}
        onConfirmar={handleLiberarManualmente}
      />

      <Toast toast={toast} />
    </div>
  )
}
