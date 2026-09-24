// src/lib/relatorioNRHPdf.js
//
// PDF do "Relatório de Atividades para o NRH" — modelo definido pelo próprio
// Sérgio (Secretário Executivo CMCT/FACITEC), ver
// claude/facitec-conecta-relatorio-atividades-nrh.md no Claude Project.
// Mesmo padrão visual (logos, cores) já usado em relatorioMensalPdf.js.

import { jsPDF } from 'jspdf'
import { desenharCabecalhoLogos } from '@/lib/identidadeVisual'

const AZUL = [26, 39, 68]
const CINZA_TEXTO = [90, 96, 110]

const NOME_SECRETARIO = 'Sérgio Paulo Tomáz'
const CARGO_SECRETARIO = 'Secretário Executivo – CMCT/FACITEC'

const MESES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// Código de documento cosmético — não é uma assinatura digital criptográfica/
// ICP-Brasil real, é só um elemento visual de formalidade/rastreabilidade
// interna (mesmo padrão já usado no Termo de Envio do Portal CCAD).
function gerarCodigoDocumento() {
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `NRH-${aleatorio}`
}

function dataPorExtenso(d) {
  return `Vitória (ES), ${d.getDate()} de ${MESES_EXTENSO[d.getMonth()]} de ${d.getFullYear()}.`
}

export function gerarPDFRelatorioNRH({ referencia, textoAtividades }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 25, mR = 25, mT = 26, mB = 20
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
  let y = mT + 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Ao', mL, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('NRH', mL, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  const intro = `Considerando o atendimento ao requisito da Portaria interna da CDTIV, relato as seguintes atividades exercidas pela Secretaria Executiva do Facitec em referência ao mês de ${referencia || '—'}:`
  const linhasIntro = doc.splitTextToSize(intro, usableW)
  linhasIntro.forEach(linha => {
    y = checkPage(y, 6)
    doc.text(linha, mL, y)
    y += 5.6
  })
  y += 4

  doc.setFontSize(10)
  const paragrafos = (textoAtividades || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  paragrafos.forEach((paragrafo, i) => {
    const linhas = doc.splitTextToSize(paragrafo, usableW)
    linhas.forEach(linha => {
      y = checkPage(y, 6)
      doc.text(linha, mL, y)
      y += 5.2
    })
    if (i < paragrafos.length - 1) y += 3
  })
  y += 10

  y = checkPage(y, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text(dataPorExtenso(new Date()), mL, y)
  y += 18

  y = checkPage(y, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text(NOME_SECRETARIO, mL, y)
  y += 5.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(CARGO_SECRETARIO, mL, y)
  y += 10

  // Assinatura eletrônica (cosmética) — mesmo padrão do Termo de Envio do
  // Portal CCAD: código de documento aleatório + data/hora de geração.
  const codigo = gerarCodigoDocumento()
  const agora = new Date()
  y = checkPage(y, 14)
  doc.setDrawColor(...CINZA_TEXTO)
  doc.setLineWidth(0.2)
  doc.line(mL, y, mL + 70, y)
  y += 5
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(`Documento assinado eletronicamente por ${NOME_SECRETARIO}`, mL, y)
  y += 3.8
  doc.text(`em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Código: ${codigo}`, mL, y)
  doc.setTextColor(0, 0, 0)

  rodape()

  const nomeArquivo = `relatorio-atividades-nrh-${(referencia || 'periodo').replace(/[\s/]+/g, '-')}.pdf`
  doc.save(nomeArquivo)
}
