// src/lib/contratoPdf.js
//
// PDF do Contrato de Concessão de Apoio Financeiro (texto editável gerado na
// tela do contrato). Segue o modelo único A4 da Identidade Visual DINOV
// (documentoDinov.js): cabeçalho, rodapé com "Página x de y", faixas e
// fontes Poppins/Inter; o texto corrido e o bloco de assinaturas mantêm o
// layout próprio do contrato.

import {
  criarDocumento, adaptarDocumentoLegado, finalizar, fonte, DV,
  MARGEM, INICIO_CONTEUDO, FIM_CONTEUDO,
} from '@/lib/documentoDinov'

export function construirPDFContrato({ dados, orientador }) {
  // Modelo único A4 da Identidade Visual DINOV (cabeçalho, rodapé com
  // "Página x de y", faixas, Poppins/Inter); o texto do contrato segue o
  // layout próprio abaixo, dentro das margens do modelo.
  const doc = adaptarDocumentoLegado(criarDocumento({ tituloPdf: "Contrato de concessão de apoio financeiro" }))
  const mL = MARGEM.esquerda, mR = MARGEM.direita, mT = INICIO_CONTEUDO, mB = 297 - FIM_CONTEUDO
  const pgW = 210, pgH = 297
  const usableW = pgW - mL - mR
  const lineH   = 5.8
  const col2X   = pgW / 2 + 5
  const sigW    = 65

  // ── texto justificado com quebra de página automática ─────────────
  function addJustifiedText(doc, text, x, startY, maxWidth, lh) {
    const lines = doc.splitTextToSize(text, maxWidth)
    let curY = startY
    lines.forEach((line, i) => {
      if (curY + lh > pgH - mB) { doc.addPage(); curY = mT }
      const isLast = i === lines.length - 1
      if (isLast || !line.trim()) {
        doc.text(line, x, curY)
      } else {
        const words = line.trim().split(" ")
        if (words.length <= 1) {
          doc.text(line, x, curY)
        } else {
          const totalW = words.reduce((s, w) => s + doc.getTextWidth(w), 0)
          const space  = (maxWidth - totalW) / (words.length - 1)
          let wx = x
          words.forEach(w => { doc.text(w, wx, curY); wx += doc.getTextWidth(w) + space })
        }
      }
      curY += lh
    })
    return curY
  }

  function checkPage(y, needed = lineH) {
    if (y + needed > pgH - mB) { doc.addPage(); return mT }
    return y
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)

  let y = mT + 3

  // ── separar corpo do bloco de assinaturas ─────────────────────────
  const fullText = dados.conteudo_editavel
  const vitMatch = /^Vitória,/m.exec(fullText)
  const bodyText = vitMatch
    ? fullText.slice(0, vitMatch.index).trimEnd()
    : fullText

  // ── renderizar corpo ──────────────────────────────────────────────
  for (const rawLine of bodyText.split("\n")) {
    const txt = rawLine.trim()
    if (!txt) { y += lineH * 0.5; continue }

    y = checkPage(y, lineH)

    if (/^CONTRATO DE CONCESSÃO/i.test(txt)) {
      // título do contrato centralizado
      fonte(doc, "titulo", 14, DV.base.marinho)
      const titleW = doc.splitTextToSize(txt, usableW)
      for (const tl of titleW) {
        y = checkPage(y, lineH + 1)
        doc.text(tl, pgW / 2, y, { align: "center" })
        y += lineH + 1
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
    } else if (/^CLÁUSULA/i.test(txt)) {
      // cláusula principal: espaço extra + bold + texto pode quebrar
      y += 4
      y = checkPage(y, lineH)
      doc.setFont("helvetica", "bold")
      const clauseLines = doc.splitTextToSize(txt, usableW)
      for (const cl of clauseLines) {
        y = checkPage(y, lineH)
        doc.text(cl, mL, y)
        y += lineH
      }
      doc.setFont("helvetica", "normal")
    } else if (/^3\.1\./.test(txt)) {
      // subcláusula: bold sem espaço extra
      y = checkPage(y, lineH)
      doc.setFont("helvetica", "bold")
      const subLines = doc.splitTextToSize(txt, usableW)
      for (const sl of subLines) {
        y = checkPage(y, lineH)
        doc.text(sl, mL, y)
        y += lineH
      }
      doc.setFont("helvetica", "normal")
    } else {
      doc.setFont("helvetica", "normal")
      y = addJustifiedText(doc, txt, mL, y, usableW, lineH)
    }
  }

  // ── bloco de assinaturas ─────────────────────────────────────────
  y += lineH

  // linha da data
  const dateLine = vitMatch
    ? fullText.slice(vitMatch.index).split("\n")[0].trim()
    : ""
  if (dateLine) {
    y = checkPage(y, lineH)
    doc.setFont("helvetica", "normal")
    doc.text(dateLine, mL, y)
    y += lineH * 2
  }

  // garante espaço (≈ 65 mm) para o primeiro bloco de assinaturas
  y = checkPage(y, 65)

  // helper: reinicia estado gráfico e traça linha horizontal
  function sigLine(x1, x2, atY) {
    doc.setDrawColor(0)
    doc.setLineWidth(0.4)
    doc.line(x1, atY, x2, atY)
  }

  // — Diretor Presidente + Diretora Adm-Financeira (2 colunas) —
  sigLine(mL,    mL    + sigW, y)
  sigLine(col2X, col2X + sigW, y)
  y += lineH * 0.7

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(dados.nome_diretor_presidente || "___", mL,    y)
  doc.text(dados.nome_diretora_adm       || "___", col2X, y)
  y += lineH * 0.8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Diretor Presidente - CDTIV",                   mL,    y)
  doc.text("Diretora de Administração e Finanças - CDTIV", col2X, y)
  y += lineH * 2.5

  // — Orientador (centralizado) —
  y = checkPage(y, 30)
  const cx = pgW / 2
  sigLine(cx - 32, cx + 32, y)
  y += lineH * 0.7

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(orientador?.nome_completo || "___", cx, y, { align: "center" })
  y += lineH * 0.8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Orientador(a)", cx, y, { align: "center" })
  y += lineH * 2.5

  // — Testemunhas (2 colunas) —
  y = checkPage(y, 45)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("TESTEMUNHAS:", mL, y)
  y += lineH * 1.5

  y = checkPage(y, lineH * 6)
  sigLine(mL,    mL    + sigW, y)
  sigLine(col2X, col2X + sigW, y)
  y += lineH * 0.7

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  for (const field of ["Nome legível:", "CPF:", "Assinatura:"]) {
    y = checkPage(y, lineH)
    doc.text(field, mL,    y)
    doc.text(field, col2X, y)
    y += lineH
  }

  finalizar(doc, { codigo: dados.numero_contrato ? `CONTRATO ${dados.numero_contrato}` : undefined })
  return doc
}
