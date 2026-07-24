// src/lib/pagamentos.js
//
// Regras de negócio de elegibilidade e geração de pagamentos das bolsas do
// PibicJr — geração idempotente por ciclo, cálculo de elegibilidade (relatório
// mensal enviado, frequência, CND, saldo de contrato) e a regra de
// desligamento automático após 2 ciclos consecutivos de CND irregular.
//
// Nada de UI aqui — apenas funções puras/testáveis sobre o Supabase.

import { supabase } from '@/lib/supabase'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── 1 — Beneficiários pagáveis da edição ─────────────────────────────────
// Orientadores de projetos 'selecionado' + bolsistas ativos de tipo
// titular/bolsista desses projetos (voluntário nunca é pagável).
export async function listarBeneficiariosPagaveis(edicaoId) {
  const { data: projetos, error: eProj } = await supabase
    .from('projeto')
    .select('id, orientador_id')
    .eq('edicao_id', edicaoId)
    .eq('status', 'selecionado')
  if (eProj) throw eProj
  if (!projetos?.length) return []

  const projetoIds = projetos.map(p => p.id)
  const orientadorIds = [...new Set(projetos.map(p => p.orientador_id).filter(Boolean))]
  const orientadorIdPorProjeto = Object.fromEntries(projetos.map(p => [p.id, p.orientador_id]))

  const [{ data: orientadores, error: eOri }, { data: contratos, error: eCon }, { data: bolsistas, error: eBol }] = await Promise.all([
    supabase.from('orientador').select('id, nome_completo, cpf, codigo_facitec, codigo_orientador').in('id', orientadorIds),
    supabase.from('contrato').select('id, projeto_id, valor_bolsa_orientador, valor_bolsa_estudante').in('projeto_id', projetoIds),
    supabase.from('bolsista').select('id, nome_completo, cpf, codigo_facitec, codigo_bolsista, projeto_id, tipo, status')
      .in('projeto_id', projetoIds).eq('status', 'ativo').in('tipo', ['titular', 'bolsista']),
  ])
  if (eOri) throw eOri
  if (eCon) throw eCon
  if (eBol) throw eBol

  const contratoPorProjeto = Object.fromEntries((contratos ?? []).map(c => [c.projeto_id, c]))
  const orientadorPorId = Object.fromEntries((orientadores ?? []).map(o => [o.id, o]))

  const itens = []

  for (const orientador of orientadores ?? []) {
    const projeto = projetos.find(p => p.orientador_id === orientador.id)
    const contrato = projeto ? contratoPorProjeto[projeto.id] : null
    itens.push({
      beneficiario_tipo: 'orientador',
      id: orientador.id,
      nome: orientador.nome_completo,
      cpf: orientador.cpf,
      valor_padrao: Number(contrato?.valor_bolsa_orientador ?? 1000),
      orientador_id: orientador.id,
      contrato_id: contrato?.id ?? null,
      codigo_facitec: orientador.codigo_facitec ?? orientador.codigo_orientador ?? null,
    })
  }

  for (const bolsista of bolsistas ?? []) {
    const orientadorId = orientadorIdPorProjeto[bolsista.projeto_id]
    const contrato = contratoPorProjeto[bolsista.projeto_id]
    itens.push({
      beneficiario_tipo: 'bolsista',
      id: bolsista.id,
      nome: bolsista.nome_completo,
      cpf: bolsista.cpf,
      valor_padrao: Number(contrato?.valor_bolsa_estudante ?? 300),
      orientador_id: orientadorId ?? null,
      contrato_id: contrato?.id ?? null,
      codigo_facitec: bolsista.codigo_facitec ?? bolsista.codigo_bolsista ?? null,
    })
  }

  return itens
}

// ── 4 — CND vigente ───────────────────────────────────────────────────────
// Registro mais recente (maior data_validade) ainda válido na data de
// referência.
export async function buscarCndVigente(beneficiarioTipo, id, dataReferencia) {
  const idField = beneficiarioTipo === 'orientador' ? 'orientador_id' : 'bolsista_id'
  const { data, error } = await supabase
    .from('cnd_documento')
    .select('*')
    .eq(idField, id)
    .gte('data_validade', dataReferencia)
    .order('data_validade', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

// ── 2 — Geração idempotente dos pagamentos do ciclo ──────────────────────
export async function gerarPagamentosDoCiclo(edicaoId, cicloId) {
  const beneficiarios = await listarBeneficiariosPagaveis(edicaoId)
  if (!beneficiarios.length) return 0

  const { data: existentes, error: eExist } = await supabase
    .from('pagamento')
    .select('beneficiario_tipo, orientador_id, bolsista_id')
    .eq('ciclo_id', cicloId)
  if (eExist) throw eExist

  const chavesExistentes = new Set(
    (existentes ?? []).map(p => `${p.beneficiario_tipo}:${p.beneficiario_tipo === 'orientador' ? p.orientador_id : p.bolsista_id}`)
  )

  const hoje = hojeISO()
  let criados = 0

  for (const item of beneficiarios) {
    const chave = `${item.beneficiario_tipo}:${item.id}`
    if (chavesExistentes.has(chave)) continue

    const cndVigente = await buscarCndVigente(item.beneficiario_tipo, item.id, hoje)

    const payload = {
      edicao_id: edicaoId,
      beneficiario_tipo: item.beneficiario_tipo,
      orientador_id: item.orientador_id,
      bolsista_id: item.beneficiario_tipo === 'bolsista' ? item.id : null,
      ciclo_id: cicloId,
      contrato_id: item.contrato_id,
      codigo_facitec_beneficiario: item.codigo_facitec,
      valor: item.valor_padrao,
      status: 'pendente',
      cnd_status: cndVigente ? 'regular' : 'nao_verificado',
      cnd_verificado_em: cndVigente ? new Date().toISOString() : null,
      origem: 'geracao_automatica',
    }

    const { error: eIns } = await supabase.from('pagamento').insert(payload)
    if (eIns) throw eIns
    criados++
  }

  return criados
}

// ── 3 — Elegibilidade de um pagamento ─────────────────────────────────────
export async function calcularElegibilidade(pagamento, relatorioDoCiclo, saldoContrato) {
  if (!relatorioDoCiclo || relatorioDoCiclo.status !== 'enviado') {
    return { estado: 'pendente_requisito', motivo: 'Relatório não enviado' }
  }

  if (pagamento.beneficiario_tipo === 'bolsista') {
    const frequencia = (relatorioDoCiclo.frequencia_bolsistas ?? []).find(f => f.bolsista_id === pagamento.bolsista_id)
    if (!frequencia || frequencia.cumpriu_75_porcento === false) {
      return { estado: 'pendente_requisito', motivo: 'Frequência abaixo de 75%' }
    }
  }

  if (pagamento.cnd_status !== 'regular') {
    return { estado: 'retido_cnd', motivo: 'CND irregular ou não conferida' }
  }

  if (saldoContrato.disponivel < Number(pagamento.valor) && !pagamento.liberado_manualmente) {
    return { estado: 'bloqueado_saldo', motivo: 'Ultrapassa o saldo do contrato' }
  }

  return { estado: 'liberado', motivo: null }
}

// ── 5 — Saldo do contrato ─────────────────────────────────────────────────
export async function calcularSaldoContrato(contratoId) {
  const [{ data: contrato, error: eCon }, { data: pagamentos, error: ePag }] = await Promise.all([
    supabase.from('contrato').select('valor_global').eq('id', contratoId).single(),
    supabase.from('pagamento').select('valor, status').eq('contrato_id', contratoId).in('status', ['pendente', 'pago']),
  ])
  if (eCon) throw eCon
  if (ePag) throw ePag

  const reservado = Number(contrato?.valor_global ?? 0)
  const pago = (pagamentos ?? []).filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor ?? 0), 0)
  const comprometido = (pagamentos ?? []).filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor ?? 0), 0)

  return { reservado, pago, comprometido, disponivel: reservado - pago - comprometido }
}

// ── 6/7 — Ações sobre pagamentos ──────────────────────────────────────────
export async function marcarComoPago(pagamentoIds) {
  if (!pagamentoIds?.length) return
  const { error } = await supabase
    .from('pagamento')
    .update({ status: 'pago', data_pagamento: hojeISO() })
    .in('id', pagamentoIds)
  if (error) throw error
}

export async function liberarManualmente(pagamentoId, motivo) {
  const { error } = await supabase
    .from('pagamento')
    .update({ liberado_manualmente: true, motivo_liberacao_manual: motivo })
    .eq('id', pagamentoId)
  if (error) throw error
}

// ── 8 — Regra dos 2 ciclos consecutivos de CND irregular ──────────────────
export async function aplicarDesligamentoPorCnd(beneficiarioTipo, id, pagamentosIrregulares) {
  const ids = pagamentosIrregulares.map(p => p.id)
  const { error: ePag } = await supabase
    .from('pagamento')
    .update({
      status: 'pago',
      data_pagamento: hojeISO(),
      desligamento_automatico: true,
      observacoes: 'Liberado automaticamente após 2 ciclos de CND irregular',
    })
    .in('id', ids)
  if (ePag) throw ePag

  if (beneficiarioTipo === 'bolsista') {
    const { error } = await supabase.from('bolsista').update({ status: 'desligado' }).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('orientador').update({ status: 'desclassificado' }).eq('id', id)
    if (error) throw error
  }
}

export async function verificarCndConsecutiva(beneficiarioTipo, id) {
  const idField = beneficiarioTipo === 'orientador' ? 'orientador_id' : 'bolsista_id'
  const { data, error } = await supabase
    .from('pagamento')
    .select('id, cnd_status, ciclo:ciclo_id(numero_ciclo)')
    .eq('beneficiario_tipo', beneficiarioTipo)
    .eq(idField, id)
    .not('ciclo_id', 'is', null)
    .order('numero_ciclo', { foreignTable: 'ciclo', ascending: false })
  if (error) throw error

  const irregulares = []
  for (const pagamento of data ?? []) {
    if (pagamento.cnd_status !== 'irregular') break
    irregulares.push(pagamento)
    if (irregulares.length === 2) break
  }

  if (irregulares.length >= 2) {
    await aplicarDesligamentoPorCnd(beneficiarioTipo, id, irregulares)
    return { desligado: true, beneficiarioTipo, id }
  }

  return null
}

// ── Badge do Sidebar — pagamentos em atenção no ciclo mais recente ────────
// Conta pagamentos com selo 'retido_cnd' ou 'bloqueado_saldo' no ciclo mais
// recente já aberto da edição (usado isoladamente do CndModal/Financeiro.jsx).
export async function contarPagamentosEmAtencao(edicaoId) {
  const { data: ciclos, error: eCic } = await supabase
    .from('relatorio_mensal_ciclo')
    .select('id, numero_ciclo, data_abertura')
    .eq('edicao_id', edicaoId)
  if (eCic) throw eCic

  const hoje = hojeISO()
  const abertos = (ciclos ?? []).filter(c => c.data_abertura <= hoje)
  if (!abertos.length) return 0
  const cicloRecente = abertos.reduce((max, c) => (c.numero_ciclo > max.numero_ciclo ? c : max))

  const [{ data: pagamentos, error: ePag }, { data: relatorios, error: eRel }] = await Promise.all([
    supabase.from('pagamento').select('*').eq('edicao_id', edicaoId).eq('ciclo_id', cicloRecente.id),
    supabase.from('relatorio_mensal').select('*').eq('ciclo_id', cicloRecente.id),
  ])
  if (ePag) throw ePag
  if (eRel) throw eRel
  if (!pagamentos?.length) return 0

  const contratoIds = [...new Set(pagamentos.map(p => p.contrato_id).filter(Boolean))]
  const saldosArr = await Promise.all(contratoIds.map(id => calcularSaldoContrato(id)))
  const saldoPorContrato = Object.fromEntries(contratoIds.map((id, i) => [id, saldosArr[i]]))

  let contagem = 0
  for (const p of pagamentos) {
    const relatorio = relatorios.find(r => r.orientador_id === p.orientador_id) ?? null
    const saldo = saldoPorContrato[p.contrato_id] ?? { reservado: 0, pago: 0, comprometido: 0, disponivel: 0 }
    const { estado } = await calcularElegibilidade(p, relatorio, saldo)
    if (estado === 'retido_cnd' || estado === 'bloqueado_saldo') contagem++
  }
  return contagem
}
