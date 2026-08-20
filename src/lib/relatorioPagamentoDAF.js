// src/lib/relatorioPagamentoDAF.js
//
// Solicitação de pagamento de bolsas encaminhada à Diretoria Administrativa
// Financeira (DAF), por contrato/ciclo — apenas os beneficiários com selo
// "liberado" entram no lote. Mesmo padrão visual (timbre FACITEC/CDTIV,
// cores AZUL/CINZA) usado em src/lib/relatorioFinanceiro.js.

import { jsPDF } from 'jspdf'
import { desenharCabecalhoLogos } from '@/lib/identidadeVisual'
const AZUL = [26, 39, 68]
const CINZA_CLARO = [244, 246, 249]
const CINZA_TEXTO = [90, 96, 110]

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

export function exportarRelatorioDAF(contrato, ciclo, beneficiariosLiberados, numeroFspb) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 20, mR = 20, mT = 26, mB = 20
  const pgW = 210, pgH = 297
  const usableW = pgW - mL - mR

  let pagina = 1

   function cabecalho() {
    desenharCabecalhoLogos(doc, { pgW, centroY: 10.5, altura: 10 })
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.6)
    doc.line(mL, 19.5, pgW - mR, 19.5)
    doc.setTextColor(0, 0, 0)
  }

  function rodape() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · FACITEC CONECTA`,
      mL, pgH - 10,
    )
    doc.text(`Página ${pagina}`, pgW - mR, pgH - 10, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }

  function novaPagina() {
    rodape()
    doc.addPage()
    pagina++
    cabecalho()
    return mT
  }

  function checkPage(y, needed) {
    if (y + needed > pgH - mB) return novaPagina()
    return y
  }

  cabecalho()
  let y = mT

  // "FSPB 01/2026" já vem formatado do banco — em qualquer lugar que já diga
  // "FSPB Nº"/"FSPB nº" por extenso, usamos só o sequencial/ano para não
  // repetir "FSPB" duas vezes ("FSPB Nº FSPB 01/2026").
  const fspbCurto = numeroFspb ? numeroFspb.replace(/^FSPB\s*/i, '') : null

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...AZUL)
  doc.text('FICHA DE SOLICITAÇÃO DE PAGAMENTO DE BOLSA', pgW / 2, y, { align: 'center' })
  y += 7
  doc.text('PROGRAMA PIBICJR', pgW / 2, y, { align: 'center' })
  y += 8
  if (fspbCurto) {
    doc.setFontSize(12)
    doc.text(`FSPB Nº ${fspbCurto}`, pgW / 2, y, { align: 'center' })
    y += 8
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text('(rascunho — ainda não enviado)', pgW / 2, y, { align: 'center' })
    y += 7
  }
  doc.setTextColor(0, 0, 0)

  const cicloLabel = ciclo ? `Ciclo ${ciclo.numero_ciclo} — ${ciclo.mes_referencia}` : '—'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  const texto = `A Secretaria Executiva do FACITEC encaminha à Diretoria Administrativa Financeira - DAF a presente solicitação${fspbCurto ? ` (FSPB nº ${fspbCurto})` : ''} de pagamento das bolsas referentes ao Processo Administrativo nº ${contrato?.numero_processo ?? '—'}, Contrato nº ${contrato?.numero_contrato ?? '—'}, relativa ao ${cicloLabel}, observadas as condições de vigência e disponibilidade orçamentária do referido contrato.`
  const linhasTexto = doc.splitTextToSize(texto, usableW)
  doc.text(linhasTexto, mL, y)
  y += linhasTexto.length * 5.2 + 8

  // ── Tabela de beneficiários liberados ────────────────────────────────
  y = checkPage(y, 14)
  const colX = { nome: mL + 2, cpf: mL + 56, tipo: mL + 90, cnd: mL + 114, valor: pgW - mR - 2 }

  function cabecalhoTabela() {
    doc.setFillColor(...AZUL)
    doc.rect(mL, y, usableW, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('NOME', colX.nome, y + 5.5)
    doc.text('CPF', colX.cpf, y + 5.5)
    doc.text('TIPO', colX.tipo, y + 5.5)
    doc.text('CND', colX.cnd, y + 5.5)
    doc.text('VALOR', colX.valor, y + 5.5, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    y += 8
  }

  cabecalhoTabela()

  let total = 0
  ;(beneficiariosLiberados ?? []).forEach((b, idx) => {
    y = checkPage(y, 8)
    if (y === mT) cabecalhoTabela()

    if (idx % 2 === 1) {
      doc.setFillColor(...CINZA_CLARO)
      doc.rect(mL, y, usableW, 7, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(doc.splitTextToSize(b.nome ?? '—', 52)[0], colX.nome, y + 5)
    doc.text(b.cpf ?? '—', colX.cpf, y + 5)
    doc.text(b.beneficiario_tipo === 'orientador' ? 'Orientador' : 'Bolsista', colX.tipo, y + 5)
    doc.text(doc.splitTextToSize(fmtCnd(b.cndValidade), 44)[0], colX.cnd, y + 5)
    doc.text(fmtMoeda(b.valor), colX.valor, y + 5, { align: 'right' })
    y += 7
    total += Number(b.valor ?? 0)
  })

  doc.setDrawColor(...CINZA_TEXTO)
  doc.setLineWidth(0.2)
  doc.line(mL, y, pgW - mR, y)
  y += 2

  y = checkPage(y, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL DO LOTE', colX.tipo, y + 5)
  doc.text(fmtMoeda(total), colX.valor, y + 5, { align: 'right' })
  y += 14

  // ── Situação do contrato ──────────────────────────────────────────────
  y = checkPage(y, 34)
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

  doc.setFillColor(...CINZA_CLARO)
  doc.roundedRect(mL, y, usableW, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...AZUL)
  doc.text('SITUAÇÃO DO CONTRATO', mL + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`Reservado: ${fmtMoeda(reservado)}`, mL + 4, y + 14)
  doc.text(`Comprometido até este lote (incluindo-o): ${fmtMoeda(comprometidoAteEsteLote)}`, mL + 4, y + 20)
  doc.text(`Saldo restante após este pagamento: ${fmtMoeda(saldoRestante)}`, mL + 4, y + 26)
  doc.setTextColor(0, 0, 0)
  y += 28 + 20

  // ── Assinatura ────────────────────────────────────────────────────────
  y = checkPage(y, 26)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.line(pgW / 2 - 40, y, pgW / 2 + 40, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Sérgio Paulo Tomáz', pgW / 2, y, { align: 'center' })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Secretário Executivo, FACITEC/CDTIV', pgW / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(8.5)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pgW / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  rodape()
  doc.save(`Solicitacao_Pagamento_${sufixoArquivo(contrato?.numero_processo)}_Ciclo${ciclo?.numero_ciclo ?? ''}.pdf`)
}
