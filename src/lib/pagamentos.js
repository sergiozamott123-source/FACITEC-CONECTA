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
  if (pagamento.status === 'pago') {
    return { estado: 'pago', motivo: null }
  }
  if (pagamento.status === 'solicitado') {
    return { estado: 'solicitado', motivo: null }
  }
  if (pagamento.status === 'cancelado') {
    return { estado: 'cancelado', motivo: null }
  }

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
// "Pago" = já confirmado pelo Financeiro. "Comprometido" = processo enviado
// à DAF ('solicitado') mas ainda não confirmado. Pagamentos ainda
// 'pendente' (nem sequer enviados) não reservam saldo — ver Prompt 03.
//
// `excluirPagamentoIds` (opcional) tira do cálculo os pagamentos do próprio
// lote que está sendo emitido/reimpresso agora. É necessário porque, ao
// (re)emitir a ficha de um lote que já foi enviado à DAF antes (portanto já
// está com status 'solicitado' no banco), o próprio lote passaria a contar
// dentro de "comprometido" — e a ficha soma esse valor de novo por fora (o
// total do lote impresso na tabela), contando-o em dobro. Excluindo os IDs
// do próprio lote, o saldo retornado representa sempre "o que o contrato já
// tinha comprometido/pago antes deste lote", não importa se este lote é
// inédito ou uma reimpressão.
export async function calcularSaldoContrato(contratoId, excluirPagamentoIds = []) {
  const [{ data: contrato, error: eCon }, { data: pagamentos, error: ePag }] = await Promise.all([
    supabase.from('contrato').select('valor_global').eq('id', contratoId).single(),
    supabase.from('pagamento').select('id, valor, status').eq('contrato_id', contratoId).in('status', ['solicitado', 'pago']),
  ])
  if (eCon) throw eCon
  if (ePag) throw ePag

  const excluirSet = new Set(excluirPagamentoIds ?? [])
  const considerados = (pagamentos ?? []).filter(p => !excluirSet.has(p.id))

  const reservado = Number(contrato?.valor_global ?? 0)
  const pago = considerados.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor ?? 0), 0)
  const comprometido = considerados.filter(p => p.status === 'solicitado').reduce((s, p) => s + Number(p.valor ?? 0), 0)

  return { reservado, pago, comprometido, disponivel: reservado - pago - comprometido }
}

// ── 6/7 — Ações sobre pagamentos ──────────────────────────────────────────

// ── 6a — Numeração institucional FSPB (Ficha de Solicitação de Pagamento de
// Bolsa) ─────────────────────────────────────────────────────────────────
// Gerada uma única vez por lote enviado à DAF, via a função de banco
// gerar_numero_fspb (sequencial atômico por ano_exercicio). Reimpressões do
// relatório devem reaproveitar o número já gravado em
// pagamento.solicitacao_pagamento_id — ver buscarNumeroFspbDoLote.
export async function criarSolicitacaoPagamento({ contratoId, orientadorId, ciclo, criadoPor, anoExercicio }) {
  const ano = anoExercicio ?? new Date().getFullYear()
  const { data: numeroData, error: eNum } = await supabase.rpc('gerar_numero_fspb', { p_ano: ano })
  if (eNum) throw eNum
  const { sequencial, numero_fspb: numeroFspb } = Array.isArray(numeroData) ? numeroData[0] : numeroData

  const { data: solicitacao, error: eIns } = await supabase
    .from('solicitacao_pagamento')
    .insert({
      numero_sequencial: sequencial,
      ano_exercicio: ano,
      numero_fspb: numeroFspb,
      contrato_id: contratoId ?? null,
      orientador_id: orientadorId ?? null,
      ciclo: ciclo ?? null,
      criado_por: criadoPor ?? null,
    })
    .select()
    .single()
  if (eIns) throw eIns
  return solicitacao
}

// Etapa 1→2: Coordenação envia o processo à DAF/Financeiro. Ainda não é
// pagamento confirmado — não mexe em data_pagamento. Gera a FSPB do lote e
// vincula todos os pagamentos enviados a ela.
export async function enviarParaPagamento({ pagamentoIds, contratoId, orientadorId, ciclo, criadoPor, anoExercicio }) {
  if (!pagamentoIds?.length) return
  const solicitacao = await criarSolicitacaoPagamento({ contratoId, orientadorId, ciclo, criadoPor, anoExercicio })
  const { error } = await supabase
    .from('pagamento')
    .update({
      status: 'solicitado',
      solicitado_em: new Date().toISOString(),
      solicitacao_pagamento_id: solicitacao.id,
    })
    .in('id', pagamentoIds)
  if (error) throw error
  return solicitacao
}

// Na prática o botão usado como "ação completa" de enviar+emitir é o
// "Emitir relatório para DAF", não o "Enviar para pagamento" — então antes
// de montar o PDF, garantimos que o lote selecionado já tem FSPB. Só cria
// uma ficha nova para os pagamentos que ainda não têm solicitacao_pagamento_id;
// os que já tiverem (reimpressão, ou reenvio parcial raro) mantêm a ficha
// original intocada. Se o lote inteiro já estava enviado, não faz nada e
// retorna null.
export async function garantirSolicitacaoPagamento({ pagamentoIds, contratoId, orientadorId, ciclo, criadoPor, anoExercicio }) {
  if (!pagamentoIds?.length) return null
  const { data: pagamentos, error } = await supabase
    .from('pagamento')
    .select('id, solicitacao_pagamento_id')
    .in('id', pagamentoIds)
  if (error) throw error

  const semFicha = (pagamentos ?? []).filter(p => !p.solicitacao_pagamento_id).map(p => p.id)
  if (!semFicha.length) return null

  return enviarParaPagamento({ pagamentoIds: semFicha, contratoId, orientadorId, ciclo, criadoPor, anoExercicio })
}

// Lê o numero_fspb já atribuído a um lote de pagamentos (para reimpressão do
// relatório) — nunca gera um número novo. Se os pagamentos do lote
// apontarem para fichas diferentes (não deveria acontecer em uso normal),
// assume a mais recente.
export async function buscarNumeroFspbDoLote(pagamentoIds) {
  if (!pagamentoIds?.length) return null
  const { data: pagamentos, error: ePag } = await supabase
    .from('pagamento')
    .select('solicitacao_pagamento_id')
    .in('id', pagamentoIds)
    .not('solicitacao_pagamento_id', 'is', null)
  if (ePag) throw ePag

  const fichaIds = [...new Set((pagamentos ?? []).map(p => p.solicitacao_pagamento_id))]
  if (!fichaIds.length) return null

  const { data: fichas, error: eFicha } = await supabase
    .from('solicitacao_pagamento')
    .select('numero_fspb, data_solicitacao')
    .in('id', fichaIds)
    .order('data_solicitacao', { ascending: false })
  if (eFicha) throw eFicha

  return fichas?.[0]?.numero_fspb ?? null
}

// Data de validade mais recente de CND por beneficiário (não filtra por
// vigência — o relatório para a DAF mostra o que se sabia na hora, mesmo
// que já tenha vencido). Retorna um mapa `"tipo:id" -> data_validade`.
export async function buscarCndMaisRecentePorBeneficiario(beneficiarios) {
  const orientadorIds = beneficiarios.filter(b => b.beneficiario_tipo === 'orientador').map(b => b.id)
  const bolsistaIds = beneficiarios.filter(b => b.beneficiario_tipo === 'bolsista').map(b => b.id)

  const [{ data: cndOrientadores, error: e1 }, { data: cndBolsistas, error: e2 }] = await Promise.all([
    orientadorIds.length
      ? supabase.from('cnd_documento').select('orientador_id, data_validade').in('orientador_id', orientadorIds)
      : Promise.resolve({ data: [] }),
    bolsistaIds.length
      ? supabase.from('cnd_documento').select('bolsista_id, data_validade').in('bolsista_id', bolsistaIds)
      : Promise.resolve({ data: [] }),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const mapa = {}
  for (const doc of cndOrientadores ?? []) {
    const chave = `orientador:${doc.orientador_id}`
    if (!mapa[chave] || doc.data_validade > mapa[chave]) mapa[chave] = doc.data_validade
  }
  for (const doc of cndBolsistas ?? []) {
    const chave = `bolsista:${doc.bolsista_id}`
    if (!mapa[chave] || doc.data_validade > mapa[chave]) mapa[chave] = doc.data_validade
  }
  return mapa
}

// Etapa 2→3: Financeiro confirmou o pagamento (comprovante em mãos) e a
// Coordenação registra a data real informada manualmente.
export async function confirmarPagamento(pagamentoIds, dataPagamento) {
  if (!pagamentoIds?.length || !dataPagamento) return
  const { error } = await supabase
    .from('pagamento')
    .update({ status: 'pago', data_pagamento: dataPagamento })
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
// O desligamento em si (bolsista/orientador) é automático, mas o dinheiro
// represado não é — segue a mesma esteira manual (pendente→solicitado→pago):
// aqui só enviamos o processo à DAF (gerando a própria FSPB do lote, como no
// envio manual); a confirmação real do pagamento, com a data do
// comprovante, é feita depois via ConfirmarPagamentoModal.
export async function aplicarDesligamentoPorCnd(beneficiarioTipo, id, pagamentosIrregulares) {
  // Normalmente os pagamentos represados são todos do mesmo contrato (mesmo
  // vínculo ativo nos ciclos consecutivos), mas agrupamos por contrato_id
  // por segurança — cada grupo vira sua própria FSPB.
  const porContrato = new Map()
  for (const p of pagamentosIrregulares) {
    const lista = porContrato.get(p.contrato_id) ?? []
    lista.push(p)
    porContrato.set(p.contrato_id, lista)
  }

  const contratoIds = [...porContrato.keys()].filter(Boolean)
  const { data: contratos, error: eCon } = contratoIds.length
    ? await supabase.from('contrato').select('id, ano_exercicio').in('id', contratoIds)
    : { data: [], error: null }
  if (eCon) throw eCon
  const anoPorContrato = Object.fromEntries((contratos ?? []).map(c => [c.id, c.ano_exercicio]))

  for (const [contratoId, itens] of porContrato) {
    const cicloTexto = itens
      .map(p => (p.ciclo?.numero_ciclo != null ? `Ciclo ${p.ciclo.numero_ciclo}${p.ciclo.mes_referencia ? ` — ${p.ciclo.mes_referencia}` : ''}` : null))
      .filter(Boolean)
      .join('; ') || null

    const solicitacao = await criarSolicitacaoPagamento({
      contratoId,
      orientadorId: itens[0]?.orientador_id ?? null,
      ciclo: cicloTexto,
      criadoPor: 'Sistema (desligamento automático por CND irregular)',
      anoExercicio: anoPorContrato[contratoId],
    })

    const { error: ePag } = await supabase
      .from('pagamento')
      .update({
        status: 'solicitado',
        solicitado_em: new Date().toISOString(),
        solicitacao_pagamento_id: solicitacao.id,
        desligamento_automatico: true,
        observacoes: 'Liberado automaticamente após 2 ciclos de CND irregular',
      })
      .in('id', itens.map(p => p.id))
    if (ePag) throw ePag
  }

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
    .select('id, cnd_status, contrato_id, orientador_id, ciclo:ciclo_id(numero_ciclo, mes_referencia)')
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
