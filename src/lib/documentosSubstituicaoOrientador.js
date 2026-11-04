// src/lib/documentosSubstituicaoOrientador.js
//
// Gera, no navegador (sem backend), os modelos/documentos usados no
// processo de substituição de orientador (Edital vigente, item 16.2):
//   1) Solicitação de Desligamento — PDF final, preenchido pelo
//      orientador que está saindo, já com os dados do substituto (CPF,
//      telefone) coletados na própria tela de "Minha substituição".
//      Pronta para assinatura eletrônica (GOV.BR).
//   2) Declaração de Anuência — a escola autoriza a continuidade do
//      projeto sob o novo orientador. Anexada pelo PRÓPRIO substituto,
//      na tela do convite (não mais por quem sai).
//   3) Declaração de Aceitação da Substituição — o substituto declara
//      que aceita assumir o projeto. Rascunho criado por Claude (não
//      havia modelo anterior), mesmo padrão visual dos outros dois.
//
// Os três já nascem com o que o sistema sabe — o que falta (RG do
// substituto, assinaturas) fica com reticências para completar à mão,
// igual ao padrão dos anexos em papel já usados pela CCAD.

import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx'
import {
  LOGO_CDTIV_BYTES, LOGO_FACITEC_BYTES, LOGO_CDTIV_ASPECTO, LOGO_FACITEC_ASPECTO,
  desenharCabecalhoLogos,
} from '@/lib/identidadeVisual'

function dotted(n) {
  return '…'.repeat(n)
}

function campo(valor, tamanhoVazio) {
  const v = (valor ?? '').toString().trim()
  return v || dotted(tamanhoVazio)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function dataExtensoHoje() {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const hoje = new Date()
  return `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`
}

// Cabeçalho padrão do sistema (docx): CDTIV + FACITEC lado a lado,
// centralizados (mesmas artes e proporções usadas nos PDFs gerados pelo
// sistema — ver src/lib/identidadeVisual.js).
function cabecalhoLogosDocx() {
  const altura = 34
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new ImageRun({ data: LOGO_CDTIV_BYTES, type: 'png', transformation: { width: Math.round(altura * LOGO_CDTIV_ASPECTO), height: altura } }),
      new TextRun({ text: '     ' }),
      new ImageRun({ data: LOGO_FACITEC_BYTES, type: 'png', transformation: { width: Math.round(altura * LOGO_FACITEC_ASPECTO), height: altura } }),
    ],
  })
}

const ESTILOS = {
  default: { document: { run: { font: 'Calibri', size: 22 } } },
}

const MARGENS = { top: 1100, bottom: 900, left: 1300, right: 1300 }

// ── 1) Solicitação de Desligamento — PDF final ──────────────────────────
//
// Antes era só um modelo .docx em branco; agora que a tela de "Minha
// substituição" já coleta CPF/telefone do substituto, o sistema consegue
// entregar a carta pronta para assinatura eletrônica (GOV.BR), sem
// reticências para os dados que já temos.

export function gerarSolicitacaoDesligamentoPdf({ orientador, projeto, numeroEdital, nomeSubstituto, cpfSubstituto, motivo }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 25, mR = 25
  const pgW = 210

  desenharCabecalhoLogos(doc, { pgW, centroY: 16, altura: 12 })
  doc.setTextColor(0, 0, 0)

  let y = 36
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('SOLICITAÇÃO DE DESLIGAMENTO DE PROJETO PIBIC JR', pgW / 2, y, { align: 'center', maxWidth: pgW - mL - mR })
  y += 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('À', mL, y)
  y += 6
  doc.text('Secretaria Executiva/CMCT-FACITEC', mL, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.text('Prezado(a) Senhor(a),', mL, y)
  y += 10

  const usableW = pgW - mL - mR
  doc.setFontSize(10.5)

  function paragrafo(texto, espacoDepois = 9) {
    const linhas = doc.splitTextToSize(texto, usableW)
    doc.text(linhas, mL, y, { lineHeightFactor: 1.4 })
    y += linhas.length * 5.3 + espacoDepois
  }

  paragrafo(
    `Eu, ${campo(orientador?.nome_completo, 55)}, CPF nº ${campo(orientador?.cpf, 18)}, RG/CI nº ${campo(orientador?.rg, 16)}, responsável pela orientação do projeto “${campo(projeto?.titulo, 45)}”, SOLICITO O MEU DESLIGAMENTO do projeto, com base no item 16.2 do Edital FACITEC nº ${campo(numeroEdital, 10)}.`,
  )
  paragrafo(
    `Diante da possibilidade de o FACITEC continuar oferecendo apoio ao meu projeto, INDICO o(a) professor(a) ${campo(nomeSubstituto, 45)}, CPF nº ${campo(cpfSubstituto, 18)}, para me substituir na orientação, uma vez que o(a) mesmo(a) reúne os requisitos necessários para dar continuidade ao projeto.`,
  )
  paragrafo(`Esclareço que o motivo do meu desligamento é: ${campo(motivo, 0) || dotted(55)}`)

  doc.text('Certo da compreensão de V.Sª,', mL, y)
  y += 14
  doc.text(`Vitória, ${dataExtensoHoje()}.`, pgW - mR, y, { align: 'right' })
  y += 16
  doc.text('Atenciosamente,', mL, y)
  y += 20
  doc.setLineWidth(0.3)
  doc.line(mL, y, mL + 70, y)
  y += 5
  doc.text(campo(orientador?.nome_completo, 0) || 'Nome completo do(a) orientador(a) que solicita o desligamento', mL, y)

  doc.save('Solicitacao_Desligamento_Orientador.pdf')
}

export function baixarSolicitacaoDesligamento(dados) {
  gerarSolicitacaoDesligamentoPdf(dados)
}

// ── 2) Declaração de Anuência (docx — anexada pelo substituto) ─────────

export async function gerarDeclaracaoAnuenciaDocx({ orientador, projeto, numeroEdital, nomeSubstituto }) {
  const doc = new Document({
    styles: ESTILOS,
    sections: [{
      properties: { page: { margin: MARGENS } },
      children: [
        cabecalhoLogosDocx(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'DECLARAÇÃO DE ANUÊNCIA PARA CONTINUIDADE DO PROJETO', bold: true, size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 420 },
          children: [new TextRun({ text: '(em razão de substituição de orientador(a) — Edital FACITEC vigente, item 16.2)', italics: true, size: 20 })],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [new TextRun('Declaramos, para os devidos fins, junto à Companhia de Desenvolvimento, Turismo e Inovação de Vitória – CDTIV, na qualidade de gestora do Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória – FACITEC, nossa anuência e concordância para a continuidade das atividades do projeto do Programa Institucional de Iniciação Científica Júnior – PIBIC Jr.')],
        }),
        new Paragraph({ spacing: { after: 300, line: 360 }, children: [new TextRun(`Projeto: ${campo(projeto?.titulo, 60)}`)] }),
        new Paragraph({ spacing: { after: 300, line: 360 }, children: [new TextRun(`Edital FACITEC nº ${campo(numeroEdital, 10)}`)] }),
        new Paragraph({ spacing: { after: 300, line: 360 }, children: [new TextRun(`Orientador(a) anterior: ${campo(orientador?.nome_completo, 45)}`)] }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [new TextRun('Nos termos do item 16.2 do Edital vigente, o(a) orientador(a) acima indicado(a) passa a ser substituído(a), com a nossa concordância, pelo(a) seguinte orientador(a), que assumirá a condução do projeto nesta instituição de ensino a partir desta data:')],
        }),
        new Paragraph({ spacing: { after: 300, line: 360 }, children: [new TextRun(`Orientador(a) substituto(a): ${campo(nomeSubstituto, 40)}`)] }),
        new Paragraph({ spacing: { after: 420, line: 360 }, children: [new TextRun(`Escola: ${campo(orientador?.escola, 55)}`)] }),
        new Paragraph({ spacing: { after: 420 }, children: [new TextRun('Atenciosamente,')] }),
        new Paragraph({ spacing: { after: 700 }, children: [new TextRun(`Vitória, ${dotted(3)}/${dotted(3)}/${dotted(5)}.`)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun('_'.repeat(55))] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Nome da entidade de ensino')] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Nome e cargo do representante legal da entidade de ensino')] }),
      ],
    }],
  })
  return Packer.toBlob(doc)
}

export async function baixarDeclaracaoAnuencia(dados) {
  const blob = await gerarDeclaracaoAnuenciaDocx(dados)
  downloadBlob(blob, 'Declaracao_Anuencia_Continuidade_Projeto.docx')
}

// ── 3) Declaração de Aceitação da Substituição (docx — rascunho novo) ──
//
// Não existia modelo anterior para este documento — rascunho criado por
// Claude, a pedido de Sérgio (04/11/2026), no mesmo padrão visual dos
// outros dois. Gerado na própria tela do convite, antes do substituto ter
// necessariamente concluído o próprio cadastro — por isso usa só os dados
// já disponíveis no convite (nome do substituto, projeto, orientador
// anterior), sem depender do cadastro completo dele.

export async function gerarDeclaracaoAceitacaoDocx({ nomeSubstituto, cpfSubstituto, projetoTitulo, orientadorSaiuNome }) {
  const doc = new Document({
    styles: ESTILOS,
    sections: [{
      properties: { page: { margin: MARGENS } },
      children: [
        cabecalhoLogosDocx(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'DECLARAÇÃO DE ACEITAÇÃO DA SUBSTITUIÇÃO', bold: true, size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 420 },
          children: [new TextRun({ text: '(Edital FACITEC vigente, item 16.2)', italics: true, size: 20 })],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [
            new TextRun({ text: `Eu, ${campo(nomeSubstituto, 55)}, CPF nº ${campo(cpfSubstituto, 18)}, venho por meio desta DECLARAR que ACEITO assumir a orientação do projeto ` }),
            new TextRun({ text: `“${campo(projetoTitulo, 45)}”`, italics: true, bold: true }),
            new TextRun({ text: `, em substituição ao(à) orientador(a) ${campo(orientadorSaiuNome, 45)}, nos termos do item 16.2 do Edital FACITEC vigente.` }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [new TextRun('Declaro estar ciente das obrigações previstas no referido Edital e no Termo Aditivo ao contrato de concessão, comprometendo-me a cumpri-las integralmente a partir da formalização desta substituição junto à Companhia de Desenvolvimento, Turismo e Inovação de Vitória – CDTIV, gestora do Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória – FACITEC.')],
        }),
        new Paragraph({ spacing: { after: 420 }, children: [new TextRun('Atenciosamente,')] }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 700 },
          children: [new TextRun(`Vitória, ${dotted(3)} de ${dotted(16)} de ${dotted(5)}.`)],
        }),
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun('_'.repeat(55))] }),
        new Paragraph({ children: [new TextRun(campo(nomeSubstituto, 0) || 'Nome completo do(a) orientador(a) substituto(a)')] }),
      ],
    }],
  })
  return Packer.toBlob(doc)
}

export async function baixarDeclaracaoAceitacao(dados) {
  const blob = await gerarDeclaracaoAceitacaoDocx(dados)
  downloadBlob(blob, 'Declaracao_Aceitacao_Substituicao.docx')
}

// ── 4) Termo Aditivo (PDF — minuta gerada pelo painel da Secretaria) ───
//
// Painel da Secretaria (SubstituicoesOrientadorPainel.jsx): gera uma
// MINUTA do Termo Aditivo já preenchida com os dados disponíveis no
// sistema (projeto, orientador que sai, substituto), para a Secretaria
// revisar e levar para assinatura via ZapSign — não substitui a revisão
// jurídica/administrativa do documento final.

export function gerarTermoAditivoPdf({ projeto, orientadorSaiu, orientadorEntrou, numeroEdital }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 25, mR = 25
  const pgW = 210
  const usableW = pgW - mL - mR

  desenharCabecalhoLogos(doc, { pgW, centroY: 16, altura: 12 })
  doc.setTextColor(0, 0, 0)

  let y = 34
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('TERMO ADITIVO AO CONTRATO DE CONCESSÃO DE APOIO FINANCEIRO', pgW / 2, y, { align: 'center', maxWidth: usableW })
  y += 8
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(150, 60, 0)
  doc.text('MINUTA gerada automaticamente pelo sistema — revisar antes de enviar para assinatura (ZapSign)', pgW / 2, y, { align: 'center', maxWidth: usableW })
  doc.setTextColor(0, 0, 0)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)

  function paragrafo(texto, espacoDepois = 8) {
    const linhas = doc.splitTextToSize(texto, usableW)
    doc.text(linhas, mL, y, { lineHeightFactor: 1.4 })
    y += linhas.length * 5.3 + espacoDepois
  }

  paragrafo(
    `TERMO ADITIVO ao Contrato de Concessão de Apoio Financeiro referente ao projeto “${campo(projeto?.titulo, 60)}”, Edital FACITEC nº ${campo(numeroEdital, 10)}, celebrado entre a Companhia de Desenvolvimento, Turismo e Inovação de Vitória – CDTIV, na qualidade de gestora do Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória – FACITEC, e o(a) orientador(a) do projeto, nos termos do item 16.2 do Edital vigente.`,
  )
  paragrafo(
    `CLÁUSULA PRIMEIRA — DO OBJETO. O presente Termo tem por objeto formalizar a SUBSTITUIÇÃO do(a) orientador(a) responsável pelo projeto acima identificado, que passa da seguinte forma:`,
  )

  doc.setFont('helvetica', 'bold')
  doc.text('Orientador(a) que se desliga:', mL, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${campo(orientadorSaiu?.nome_completo, 55)}`, mL, y); y += 5.5
  doc.text(`CPF: ${campo(orientadorSaiu?.cpf, 18)}    RG: ${campo(orientadorSaiu?.rg, 16)}`, mL, y); y += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Orientador(a) substituto(a):', mL, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${campo(orientadorEntrou?.nome_completo, 55)}`, mL, y); y += 5.5
  doc.text(`CPF: ${campo(orientadorEntrou?.cpf, 18)}    RG: ${campo(orientadorEntrou?.rg, 16)}`, mL, y); y += 12

  paragrafo(
    'CLÁUSULA SEGUNDA — DA VIGÊNCIA DAS DEMAIS CLÁUSULAS. Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do Contrato de Concessão de Apoio Financeiro original, no que não contrariarem o disposto neste Termo Aditivo.',
  )
  paragrafo(
    `E por estarem assim justas e contratadas, firmam o presente Termo Aditivo, em ${dotted(2)} vias de igual teor, juntamente com as testemunhas abaixo.`,
    16,
  )

  doc.text(`Vitória, ${dataExtensoHoje()}.`, pgW - mR, y, { align: 'right' })
  y += 16

  const assinaturas = [
    'Diretor(a) Presidente da CDTIV',
    'Diretor(a) Administrativo-Financeiro(a) da CDTIV',
    campo(orientadorEntrou?.nome_completo, 0) || 'Orientador(a) substituto(a)',
  ]
  for (const label of assinaturas) {
    if (y > 260) { doc.addPage(); y = 30 }
    doc.setLineWidth(0.3)
    doc.line(mL, y, mL + 80, y)
    y += 5
    doc.setFontSize(9.5)
    doc.text(label, mL, y)
    doc.setFontSize(10.5)
    y += 14
  }

  y += 2
  doc.setFontSize(9.5)
  doc.text('Testemunhas:', mL, y)
  y += 10
  for (let i = 0; i < 2; i++) {
    if (y > 265) { doc.addPage(); y = 30 }
    doc.line(mL, y, mL + 80, y)
    y += 5
    doc.text(`Nome: ${dotted(30)}    CPF: ${dotted(18)}`, mL, y)
    y += 14
  }

  doc.save(`Minuta_Termo_Aditivo_${(orientadorEntrou?.nome_completo || 'substituicao').split(' ')[0]}.pdf`)
}
