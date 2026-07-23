// src/lib/relatorioMensalPdf.js
//
// Exportação em PDF do Relatório Mensal enviado, com o mesmo padrão de
// branding FACITEC/CDTIV já estabelecido em relatorioFinanceiro.js.

import { jsPDF } from 'jspdf'

const AZUL = [26, 39, 68]
const CINZA_CLARO = [244, 246, 249]
const CINZA_TEXTO = [90, 96, 110]
const VERDE = [22, 130, 90]
const VERMELHO = [178, 38, 38]

async function urlParaDataURL(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  const formato = blob.type.includes('png') ? 'PNG' : 'JPEG'
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  return { dataUrl, formato }
}

export async function gerarPDFRelatorioMensal({ relatorio, ciclo, orientador, projetoTitulo, nomesBolsistas }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 20, mR = 20, mT = 26, mB = 20
  const pgW = 210, pgH = 297
  const usableW = pgW - mL - mR
  let pagina = 1

  function cabecalho() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text('FUNDO DE APOIO À CIÊNCIA E TECNOLOGIA - FACITEC', pgW / 2, 12, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text('Companhia de Desenvolvimento, Turismo e Inovação de Vitória - CDTIV', pgW / 2, 16.5, { align: 'center' })
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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...AZUL)
  doc.text('RELATÓRIO DE ACOMPANHAMENTO MENSAL', pgW / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(`Ciclo ${ciclo.numero_ciclo} · ${ciclo.mes_referencia}`, pgW / 2, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 10

  const codigo = orientador?.codigo_facitec || orientador?.codigo_orientador || '—'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  const projetoLinhas = doc.splitTextToSize(projetoTitulo || '—', usableW - 8)
  const lhTitulo = 4.8
  const alturaBox = 8 + projetoLinhas.length * lhTitulo + 8

  y = checkPage(y, alturaBox + 4)

  doc.setFillColor(...CINZA_CLARO)
  doc.roundedRect(mL, y, usableW, alturaBox, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...AZUL)
  let tituloY = y + 7
  projetoLinhas.forEach(linha => {
    doc.text(linha, mL + 4, tituloY)
    tituloY += lhTitulo
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(`Orientador(a): ${orientador?.nome_completo ?? '—'}  ·  ${codigo}`, mL + 4, tituloY + 1)

  if (relatorio.enviado_em) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...VERDE)
    doc.text(`Enviado em ${new Date(relatorio.enviado_em).toLocaleDateString('pt-BR')}`, pgW - mR - 4, y + 8, { align: 'right' })
  }
  doc.setTextColor(0, 0, 0)
  y += alturaBox + 8

  function secaoTitulo(texto) {
    y = checkPage(y, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...AZUL)
    doc.text(texto.toUpperCase(), mL, y)
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.3)
    doc.line(mL, y + 1.5, mL + 30, y + 1.5)
    doc.setTextColor(0, 0, 0)
    y += 7
  }

  function secaoTexto(texto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    const linhas = doc.splitTextToSize(texto || '—', usableW)
    linhas.forEach(linha => {
      y = checkPage(y, 6)
      doc.text(linha, mL, y)
      y += 4.6
    })
    doc.setTextColor(0, 0, 0)
    y += 4
  }

  // 1 — Frequência da equipe
  secaoTitulo('Frequência da equipe')
  const freq = relatorio.frequencia_bolsistas ?? []
  const colW = usableW / 2
  freq.forEach((f, i) => {
    const col = i % 2
    if (col === 0) y = checkPage(y, 6)
    const x = mL + col * colW
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 30, 30)
    doc.text(nomesBolsistas[f.bolsista_id] ?? '—', x, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(f.cumpriu_75_porcento ? VERDE : VERMELHO))
    doc.text(f.cumpriu_75_porcento ? '75%+' : 'Abaixo de 75%', x + colW - 4, y, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    if (col === 1) y += 5.5
  })
  if (freq.length % 2 === 1) y += 5.5
  if (!freq.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('—', mL, y); y += 5.5 }
  y += 4

  // 2-4 — textos corridos
  secaoTitulo('Atividades realizadas')
  secaoTexto(relatorio.atividades_realizadas)
  secaoTitulo('Resultados alcançados')
  secaoTexto(relatorio.resultados_alcancados)
  secaoTitulo('Desafios enfrentados')
  secaoTexto(relatorio.desafios_enfrentados)

  // 5 — Evidências
  secaoTitulo('Evidências')
  const evidencias = (relatorio.evidencias_urls ?? []).map(e =>
    typeof e === 'string' ? { url: e, legenda: '' } : e)
  const porLinha = 3
  const gap = 4
  const imgW = (usableW - gap * (porLinha - 1)) / porLinha
  const imgH = (imgW * 3) / 4
  let linhasLegendaMax = 0
  for (let i = 0; i < evidencias.length; i++) {
    const col = i % porLinha
    if (col === 0) { y = checkPage(y, imgH + 4); linhasLegendaMax = 0 }
    const { url, legenda } = evidencias[i]
    const x = mL + col * (imgW + gap)
    try {
      const { dataUrl, formato } = await urlParaDataURL(url)
      doc.addImage(dataUrl, formato, x, y, imgW, imgH, undefined, 'FAST')
    } catch {
      // evidência que falhar ao carregar é apenas omitida do PDF
    }
    if (legenda) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...CINZA_TEXTO)
      const linhasLegenda = doc.splitTextToSize(legenda, imgW)
      let legendaY = y + imgH + 3.5
      linhasLegenda.forEach(linha => {
        doc.text(linha, x, legendaY)
        legendaY += 3.5
      })
      doc.setTextColor(0, 0, 0)
      linhasLegendaMax = Math.max(linhasLegendaMax, linhasLegenda.length)
    }
    if (col === porLinha - 1 || i === evidencias.length - 1) y += imgH + (linhasLegendaMax * 3.5) + gap
  }
  if (!evidencias.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('—', mL, y) }

  rodape()

  const codigoArquivo = (orientador?.codigo_facitec || orientador?.codigo_orientador || 'orientador').replace(/\s+/g, '')
  doc.save(`relatorio-ciclo${ciclo.numero_ciclo}-${codigoArquivo}.pdf`)
}
