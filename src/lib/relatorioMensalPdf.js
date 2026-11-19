// src/lib/relatorioMensalPdf.js
//
// Exportação em PDF do Relatório Mensal enviado, no modelo único A4 da
// Identidade Visual DINOV (documentoDinov.js).

import {
  criarDocumento, titulo, paragrafo, secao, quadroDestaque, selo, assinatura,
  garantirEspaco, finalizar, fonte, DV, MARGEM, AREA,
} from '@/lib/documentoDinov'

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

// Monta o documento jsPDF do relatório — reaproveitado tanto para download
// direto (gerarPDFRelatorioMensal) quanto para gerar um blob e arquivar no
// Acervo sem passar pelo disco do usuário (gerarBlobPDFRelatorioMensal).
async function construirPDFRelatorioMensal({ relatorio, ciclo, orientador, projetoTitulo, nomesBolsistas }) {
  const doc = criarDocumento({ tituloPdf: `Relatório de acompanhamento mensal — ciclo ${ciclo.numero_ciclo}` })
  const COR = DV.base

  let y = titulo(doc, {
    chapeu: `Ciclo ${ciclo.numero_ciclo} · ${ciclo.mes_referencia}`,
    texto: 'Relatório de acompanhamento mensal',
  })

  const codigo = orientador?.codigo_facitec || orientador?.codigo_orientador || '—'
  y = quadroDestaque(doc, {
    rotulo: 'Projeto',
    titulo: projetoTitulo || '—',
    subtitulo: `Orientador(a): ${orientador?.nome_completo ?? '—'}  ·  ${codigo}`,
  }, y)

  if (relatorio.enviado_em) {
    selo(doc, `Enviado em ${new Date(relatorio.enviado_em).toLocaleDateString('pt-BR')}`, 'sucesso', MARGEM.esquerda, y - 2)
    y += 8
  }

  // 1 — Frequência da equipe
  y = secao(doc, 'Frequência da equipe', y)
  const freq = relatorio.frequencia_bolsistas ?? []
  const colW = AREA.largura / 2
  freq.forEach((f, i) => {
    const col = i % 2
    if (col === 0) y = garantirEspaco(doc, y, 8)
    const x = MARGEM.esquerda + col * colW
    fonte(doc, 'texto', 9, COR.texto)
    doc.text(nomesBolsistas[f.bolsista_id] ?? '—', x, y)
    const cumpriu = f.cumpriu_75_porcento
    const texto = cumpriu ? '75%+' : 'Abaixo de 75%'
    fonte(doc, 'textoSemi', 8, COR.texto)
    const wSelo = doc.getTextWidth(texto) + 6
    selo(doc, texto, cumpriu ? 'sucesso' : 'erro', x + colW - 6 - wSelo, y)
    if (col === 1) y += 7
  })
  if (freq.length % 2 === 1) y += 7
  if (!freq.length) { fonte(doc, 'texto', 9, COR.texto); doc.text('—', MARGEM.esquerda, y); y += 7 }
  y += 4

  // 2-4 — textos corridos
  y = secao(doc, 'Atividades realizadas', y)
  y = paragrafo(doc, relatorio.atividades_realizadas || '—', y, { tamanho: 10 })
  y = secao(doc, 'Resultados alcançados', y)
  y = paragrafo(doc, relatorio.resultados_alcancados || '—', y, { tamanho: 10 })
  y = secao(doc, 'Desafios enfrentados', y)
  y = paragrafo(doc, relatorio.desafios_enfrentados || '—', y, { tamanho: 10 })

  // 5 — Evidências
  y = secao(doc, 'Evidências', y)
  const evidencias = (relatorio.evidencias_urls ?? []).map(e =>
    typeof e === 'string' ? { url: e, legenda: '' } : e)
  const porLinha = 3
  const gap = 4
  const imgW = (AREA.largura - gap * (porLinha - 1)) / porLinha
  const imgH = (imgW * 3) / 4
  let linhasLegendaMax = 0
  for (let i = 0; i < evidencias.length; i++) {
    const col = i % porLinha
    if (col === 0) { y = garantirEspaco(doc, y, imgH + 10); linhasLegendaMax = 0 }
    const { url, legenda } = evidencias[i]
    const x = MARGEM.esquerda + col * (imgW + gap)
    try {
      const { dataUrl, formato } = await urlParaDataURL(url)
      doc.addImage(dataUrl, formato, x, y, imgW, imgH, undefined, 'FAST')
    } catch {
      // evidência que falhar ao carregar é apenas omitida do PDF
    }
    if (legenda) {
      fonte(doc, 'texto', 8, COR.textoSecundario)
      const linhasLegenda = doc.splitTextToSize(legenda, imgW)
      let legendaY = y + imgH + 3.5
      linhasLegenda.forEach(linha => {
        doc.text(linha, x, legendaY)
        legendaY += 3.5
      })
      linhasLegendaMax = Math.max(linhasLegendaMax, linhasLegenda.length)
    }
    if (col === porLinha - 1 || i === evidencias.length - 1) y += imgH + (linhasLegendaMax * 3.5) + gap
  }
  if (!evidencias.length) { fonte(doc, 'texto', 9, COR.texto); doc.text('—', MARGEM.esquerda, y); y += 7 }

  // 6 — Assinatura eletrônica (omitida se o relatório nunca chegou a ser
  // assinado — ex.: dado incompleto de alguma migração antiga)
  if (relatorio.nome_assinatura && relatorio.assinado_em) {
    y = garantirEspaco(doc, y + 10, 34)
    y = assinatura(doc, {
      nome: relatorio.nome_assinatura,
      cargo: `Orientador(a) · ${codigo}`,
      y,
    })

    const dataAssinatura = new Date(relatorio.assinado_em)
    const dataFmt = dataAssinatura.toLocaleDateString('pt-BR')
    const horaFmt = dataAssinatura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const ipTexto = relatorio.ip_assinatura ? ` (IP: ${relatorio.ip_assinatura})` : ''
    const cx = 105
    fonte(doc, 'textoItalico', 7.5, COR.textoSecundario)
    doc.text(
      `Documento assinado eletronicamente por ${relatorio.nome_assinatura} em ${dataFmt} às ${horaFmt}${ipTexto}.`,
      cx, y - 4, { align: 'center', maxWidth: 140 },
    )
    y += 2

    if (relatorio.assinatura_origem === 'reconstituida_retroativamente') {
      const nota = 'Assinatura eletrônica reconstituída a partir do envio original deste relatório pelo sistema, anterior à implementação deste controle de assinatura.'
      fonte(doc, 'texto', 7.5, COR.textoSecundario)
      doc.text(doc.splitTextToSize(nota, 140), cx, y, { align: 'center' })
    }
  }

  finalizar(doc, { codigo: `CICLO-${ciclo.numero_ciclo}` })

  const codigoArquivo = (orientador?.codigo_facitec || orientador?.codigo_orientador || 'orientador').replace(/\s+/g, '')
  const nomeArquivo = `relatorio-ciclo${ciclo.numero_ciclo}-${codigoArquivo}.pdf`
  return { doc, nomeArquivo }
}

export async function gerarPDFRelatorioMensal(params) {
  const { doc, nomeArquivo } = await construirPDFRelatorioMensal(params)
  doc.save(nomeArquivo)
}

// Mesma geração, mas devolve o PDF como Blob (+ nome sugerido) em vez de
// baixar no navegador — usado para arquivar o relatório direto no Acervo.
export async function gerarBlobPDFRelatorioMensal(params) {
  const { doc, nomeArquivo } = await construirPDFRelatorioMensal(params)
  return { blob: doc.output('blob'), nomeArquivo }
}
