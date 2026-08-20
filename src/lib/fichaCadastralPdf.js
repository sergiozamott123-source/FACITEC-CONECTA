// src/lib/fichaCadastralPdf.js
//
// Ficha cadastral individual do bolsista — uma página completa por pessoa,
// para anexar ao processo físico enviado à Gerência Financeira (abertura de
// conta / cadastramento em sistemas). Reaproveita os mesmos dados já
// buscados por buscarDadosRelatorioFinanceiro (src/lib/relatorioFinanceiro.js)
// — nenhuma consulta nova ao Supabase é feita aqui.
//
// Diferença para o Relatório Financeiro (exportarPDFFinanceiro): aquele é um
// relatório compacto, vários bolsistas por página, pensado para leitura
// rápida da Secretaria; este aqui é uma página cheia por bolsista, formatada
// como ficha individual, pensada para ser destacada e inserida no processo
// de cada um. Sem dados bancários — não fazem parte do que a Financeira
// pediu para esta ficha (só cadastro/abertura de conta).

import { jsPDF } from 'jspdf'
import { desenharCabecalhoLogos } from '@/lib/identidadeVisual'

export function exportarFichaCadastralPDF(linhas, ano = '2026') {
  if (!linhas?.length) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 20, mR = 20, mT = 26
  const pgW = 210, pgH = 297
  const usableW = pgW - mL - mR

  const AZUL = [26, 39, 68]
  const CINZA_CLARO = [244, 246, 249]
  const CINZA_TEXTO = [90, 96, 110]

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

  function tituloSecao(y, texto) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AZUL)
    doc.text(texto.toUpperCase(), mL, y)
    doc.setDrawColor(...CINZA_CLARO)
    doc.setLineWidth(0.4)
    doc.line(mL, y + 2.5, pgW - mR, y + 2.5)
    doc.setTextColor(0, 0, 0)
    return y + 10
  }

  // Desenha um campo (rótulo + valor) e devolve quantas linhas o valor
  // ocupou — usado por `linha()` para saber o quanto empurrar a próxima
  // linha/seção para baixo, já que campos como endereço/projeto podem
  // quebrar em 2-3 linhas dependendo do cadastro de cada bolsista.
  function campo(x, y, label, valor, largura) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(label, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const linhasTexto = doc.splitTextToSize(valor || '—', largura)
    doc.text(linhasTexto, x, y + 5.5)
    return linhasTexto.length
  }

  // Desenha uma "linha" com 1-2 campos lado a lado e devolve o y da próxima
  // linha, já ajustado à maior quantidade de linhas de texto entre eles.
  const ALTURA_LINHA_TEXTO = 4.2
  function linha(y, pares, gapDepois = 3) {
    const maxLinhas = Math.max(...pares.map(p => campo(p.x, y, p.label, p.valor, p.largura)))
    return y + 5.5 + maxLinhas * ALTURA_LINHA_TEXTO + gapDepois
  }

  const colEsqX = mL
  const colDirX = mL + usableW / 2 + 6
  const colLargura = usableW / 2 - 6

  linhas.forEach((b, idx) => {
    if (idx > 0) {
      rodape()
      doc.addPage()
      pagina++
    }
    cabecalho()

    let y = mT + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.setTextColor(...AZUL)
    doc.text('FICHA CADASTRAL DO BOLSISTA', pgW / 2, y, { align: 'center' })
    y += 6.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(`Edição ${ano} · Finalidade: cadastramento junto à Gerência Financeira`, pgW / 2, y, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    y += 12

    // ── Nome em destaque ────────────────────────────────────────────────
    doc.setDrawColor(...CINZA_CLARO)
    doc.setFillColor(...CINZA_CLARO)
    doc.roundedRect(mL, y, usableW, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...AZUL)
    doc.text(b.nome_completo || '—', mL + 5, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(
      `${b.codigo_bolsista || '—'}  ·  ${b.tipo || '—'}${b.menor_idade === 'Sim' ? '  ·  Menor de idade' : ''}`,
      mL + 5, y + 14.5,
    )
    doc.setTextColor(0, 0, 0)
    y += 18 + 5

    // ── Identificação ───────────────────────────────────────────────────
    y = tituloSecao(y, 'Identificação')
    y = linha(y, [
      { x: colEsqX, label: 'CPF', valor: b.cpf, largura: colLargura },
      { x: colDirX, label: 'RG', valor: b.rg, largura: colLargura },
    ])
    y = linha(y, [
      { x: colEsqX, label: 'DATA DE NASCIMENTO', valor: b.data_nascimento, largura: colLargura },
      { x: colDirX, label: 'ESCOLA', valor: b.escola, largura: colLargura },
    ], 5)

    // ── Contato ─────────────────────────────────────────────────────────
    y = tituloSecao(y, 'Contato')
    y = linha(y, [
      { x: colEsqX, label: 'TELEFONE', valor: b.telefone, largura: colLargura },
      { x: colDirX, label: 'E-MAIL', valor: b.email, largura: colLargura },
    ], 5)

    // ── Endereço ────────────────────────────────────────────────────────
    y = tituloSecao(y, 'Endereço')
    y = linha(y, [
      { x: colEsqX, label: 'ENDEREÇO COMPLETO', valor: b.endereco, largura: usableW },
    ], 5)

    // ── Responsável ─────────────────────────────────────────────────────
    y = tituloSecao(y, 'Responsável')
    y = linha(y, [
      { x: colEsqX, label: 'NOME', valor: b.nome_responsavel, largura: colLargura },
      { x: colDirX, label: 'VÍNCULO', valor: b.vinculo_responsavel, largura: colLargura },
    ])
    y = linha(y, [
      { x: colEsqX, label: 'CPF', valor: b.cpf_responsavel, largura: colLargura },
      { x: colDirX, label: 'RG', valor: b.rg_responsavel, largura: colLargura },
    ])
    y = linha(y, [
      { x: colEsqX, label: 'TELEFONE', valor: b.telefone_responsavel, largura: colLargura },
      { x: colDirX, label: 'E-MAIL', valor: b.email_responsavel, largura: colLargura },
    ], 5)

    // ── Vínculo institucional ───────────────────────────────────────────
    y = tituloSecao(y, 'Vínculo institucional')
    y = linha(y, [
      { x: colEsqX, label: 'ORIENTADOR(A)', valor: b.orientador, largura: colLargura },
      { x: colDirX, label: 'CÓDIGO DO ORIENTADOR', valor: b.codigo_orientador, largura: colLargura },
    ])
    y = linha(y, [
      { x: colEsqX, label: 'PROJETO', valor: b.projeto, largura: usableW },
    ])
    linha(y, [
      { x: colEsqX, label: 'Nº DO CONTRATO', valor: b.numero_contrato, largura: colLargura },
    ])
  })

  rodape()

  const sufixo = linhas.length === 1
    ? (linhas[0].codigo_bolsista || 'bolsista')
    : `${linhas[0].codigo_orientador || 'grupo'}_${ano}`
  doc.save(`Ficha_Cadastral_${sufixo}.pdf`)
}
