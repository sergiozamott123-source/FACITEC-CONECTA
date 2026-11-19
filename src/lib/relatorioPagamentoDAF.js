// src/lib/relatorioPagamentoDAF.js
//
// Solicitação de pagamento de bolsas encaminhada à Diretoria Administrativa
// Financeira (DAF), por contrato/ciclo — apenas os beneficiários com selo
// "liberado" entram no lote. Segue o modelo único A4 da Identidade Visual
// DINOV (documentoDinov.js), com a página de histórico em paisagem.

import {
  criarDocumento, titulo, paragrafo, tabela, selo, ficha, localData, assinatura,
  garantirEspaco, adicionarPaginaPaisagem, finalizarDocumento, fonte, DV, rgb,
  MARGEM, PAISAGEM,
} from '@/lib/documentoDinov'

function fmtMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor ?? 0))
}

function sufixoArquivo(numeroProcesso) {
  return String(numeroProcesso ?? 'sn').replace(/[\\/]/g, '-')
}

function fmtCnd(dataValidade) {
  return dataValidade
    ? `Válida até ${new Date(dataValidade + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : 'Não verificada'
}

export function exportarRelatorioDAF(contrato, ciclo, beneficiariosLiberados, numeroFspb, historico = []) {
  const doc = criarDocumento({ tituloPdf: 'Ficha de solicitação de pagamento de bolsa — PIBIC Jr' })

  // "FSPB 01/2026" já vem formatado do banco — em qualquer lugar que já diga
  // "FSPB Nº"/"FSPB nº" por extenso, usamos só o sequencial/ano para não
  // repetir "FSPB" duas vezes ("FSPB Nº FSPB 01/2026").
  const fspbCurto = numeroFspb ? numeroFspb.replace(/^FSPB\s*/i, '') : null

  let y = titulo(doc, {
    chapeu: fspbCurto ? `FSPB nº ${fspbCurto} · Programa PIBIC Jr` : 'Programa PIBIC Jr',
    texto: 'Ficha de solicitação de pagamento de bolsa',
  })
  if (!fspbCurto) {
    selo(doc, 'Rascunho — ainda não enviado', 'atencao', MARGEM.esquerda, y - 4)
    y += 6
  }

  const cicloLabel = ciclo ? `Ciclo ${ciclo.numero_ciclo} — ${ciclo.mes_referencia}` : '—'
  const texto = `A Secretaria Executiva do FACITEC encaminha à Diretoria Administrativa Financeira - DAF a presente solicitação${fspbCurto ? ` (FSPB nº ${fspbCurto})` : ''} de pagamento das bolsas referentes ao Processo Administrativo nº ${contrato?.numero_processo ?? '—'}, Contrato nº ${contrato?.numero_contrato ?? '—'}, relativa ao ${cicloLabel}, observadas as condições de vigência e disponibilidade orçamentária do referido contrato.`
  y = paragrafo(doc, texto, y)
  y += 2

  // ── Tabela de beneficiários liberados ────────────────────────────────
  let total = 0
  const linhasTabela = (beneficiariosLiberados ?? []).map((b) => {
    total += Number(b.valor ?? 0)
    return [
      b.nome ?? '—',
      b.cpf ?? '—',
      b.beneficiario_tipo === 'orientador' ? 'Orientador' : 'Bolsista',
      fmtCnd(b.cndValidade),
      fmtMoeda(b.valor),
    ]
  })
  y = tabela(doc, [
    { titulo: 'Nome', largura: 52 },
    { titulo: 'CPF', largura: 32 },
    { titulo: 'Tipo', largura: 22 },
    { titulo: 'CND', largura: 36 },
    { titulo: 'Valor', largura: 24, alinhar: 'right' },
  ], linhasTabela, y)

  y = garantirEspaco(doc, y - 4, 10)
  fonte(doc, 'textoSemi', 10, DV.base.marinho)
  doc.text('TOTAL DO LOTE', MARGEM.esquerda + 94, y + 1)
  doc.text(fmtMoeda(total), MARGEM.esquerda + 164, y + 1, { align: 'right' })
  y += 12

  // ── Situação do contrato ──────────────────────────────────────────────
  const reservado = Number(contrato?.valor_global ?? contrato?.saldo?.reservado ?? 0)
  // Soma "pago" (já confirmado pela Financeira) + "comprometido" (lotes
  // anteriores já enviados à DAF via FSPB, mas ainda sem confirmação de
  // pagamento) — não só "pago". Sem isso, um Ciclo cuja confirmação de
  // pagamento está atrasada some do cálculo, e a ficha do ciclo seguinte
  // é emitida com o saldo do contrato desatualizado (repete o valor do
  // ciclo anterior em vez de abatê-lo).
  const comprometidoAntes = Number(contrato?.saldo?.pago ?? 0) + Number(contrato?.saldo?.comprometido ?? 0)
  const comprometidoAteEsteLote = comprometidoAntes + total
  const saldoRestante = reservado - comprometidoAteEsteLote

  y = garantirEspaco(doc, y, 34)
  y = ficha(doc, [
    ['Reservado no contrato', fmtMoeda(reservado)],
    ['Comprometido até este lote (incluindo-o)', fmtMoeda(comprometidoAteEsteLote)],
    ['Saldo restante após este pagamento', fmtMoeda(saldoRestante)],
  ], y)

  // ── Assinatura ────────────────────────────────────────────────────────
  y = garantirEspaco(doc, y, 46)
  y = localData(doc, y + 2)
  assinatura(doc, { nome: 'Sérgio Paulo Tomaz', cargo: 'Secretário Executivo, FACITEC/CDTIV', y: y + 16 })

  // ── Página extra (paisagem) — histórico de pagamentos do contrato ───────
  // Camada adicional de transparência pedida pelo Sérgio: não substitui o
  // detalhamento do lote atual acima, apenas complementa — mostra o que já
  // foi efetivamente pago em cada ciclo do contrato, vaga a vaga, com
  // etiqueta clara sempre que uma vaga trocou de bolsista. Paisagem porque o
  // número de colunas (uma por vaga) varia de contrato para contrato. Ver
  // claude/facitec-conecta-fase22-seguranca-pagamentos-substituicao.md.
  if (historico?.length) {
    let yL = adicionarPaginaPaisagem(doc)
    const areaL = PAISAGEM.areaLargura

    yL = titulo(doc, {
      chapeu: `Contrato nº ${contrato?.numero_contrato ?? '—'}`,
      texto: 'Histórico de pagamentos do contrato',
      y: yL,
    })
    yL = paragrafo(
      doc,
      'Todos os ciclos já pagos ou enviados à DAF até esta ficha. Informação complementar; não substitui o detalhamento do lote atual.',
      yL - 4,
      { tamanho: 9, cor: DV.base.textoSecundario, alinhamento: 'left' },
    )

    // Colunas: uma por "vaga" (código do beneficiário sem o prefixo do
    // contrato — ex.: "BT06", "OR"), na ordem em que aparecem no histórico
    // (orientador primeiro, depois bolsistas por código).
    const codigosOrdenados = []
    const vistos = new Set()
    for (const grupo of historico) {
      for (const item of grupo.itens) {
        const rotulo = item.codigo?.split('-').pop() || item.codigo || '—'
        if (!vistos.has(rotulo)) { vistos.add(rotulo); codigosOrdenados.push(rotulo) }
      }
    }

    const colCiclo = 30
    const colVaga = (areaL - colCiclo) / Math.max(codigosOrdenados.length, 1)
    const colX = codigosOrdenados.map((_, i) => MARGEM.esquerda + colCiclo + colVaga * i)

    function cabecalhoTabelaHistorico() {
      doc.setFillColor(...rgb(DV.base.marinho))
      doc.rect(MARGEM.esquerda, yL, areaL, 9, 'F')
      fonte(doc, 'textoSemi', 8, '#FFFFFF')
      doc.text('CICLO', MARGEM.esquerda + 2, yL + 6)
      codigosOrdenados.forEach((cod, i) => {
        doc.text(cod, colX[i] + colVaga / 2, yL + 6, { align: 'center' })
      })
      yL += 9
    }

    cabecalhoTabelaHistorico()

    const alturaLinha = 15
    historico.forEach((grupo, idx) => {
      if (yL + alturaLinha > PAISAGEM.fimConteudo) {
        yL = adicionarPaginaPaisagem(doc)
        cabecalhoTabelaHistorico()
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...rgb(DV.base.fundo))
        doc.rect(MARGEM.esquerda, yL, areaL, alturaLinha, 'F')
      }

      fonte(doc, 'textoSemi', 8, DV.base.texto)
      doc.text(`Ciclo ${grupo.numero_ciclo}`, MARGEM.esquerda + 2, yL + 5.5)
      fonte(doc, 'texto', 7, DV.base.textoSecundario)
      doc.text(grupo.mes_referencia ?? '—', MARGEM.esquerda + 2, yL + 10.5)

      codigosOrdenados.forEach((cod, i) => {
        const item = grupo.itens.find(it => (it.codigo?.split('-').pop() || it.codigo) === cod)
        const cx = colX[i] + colVaga / 2
        if (!item) {
          fonte(doc, 'texto', 7.5, DV.base.textoSecundario)
          doc.text('—', cx, yL + 8, { align: 'center' })
          return
        }
        fonte(doc, 'texto', 7.2, DV.base.texto)
        const nomeCurto = doc.splitTextToSize(item.nome ?? '—', colVaga - 2)[0]
        doc.text(nomeCurto, cx, yL + 5, { align: 'center' })
        doc.text(fmtMoeda(item.valor), cx, yL + 9.5, { align: 'center' })
        if (item.tag) {
          fonte(doc, 'textoItalico', 6.3, item.tag === 'substituido' ? DV.situacao.erro.texto : DV.situacao.sucesso.texto)
          doc.text(item.tag === 'substituido' ? '(substituído)' : '(substituto)', cx, yL + 13, { align: 'center' })
        }
      })

      yL += alturaLinha
    })
  }

  finalizarDocumento(doc, { codigo: numeroFspb ? `FSPB ${fspbCurto}` : undefined })
  doc.save(`Solicitacao_Pagamento_${sufixoArquivo(contrato?.numero_processo)}_Ciclo${ciclo?.numero_ciclo ?? ''}.pdf`)
}
