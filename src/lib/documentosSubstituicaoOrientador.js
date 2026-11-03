// src/lib/documentosSubstituicaoOrientador.js
//
// Gera, no navegador (sem backend), os modelos de documento usados no
// processo de substituição de orientador (Edital vigente, item 16.2):
//   1) Solicitação de Desligamento — preenchida pelo orientador que está
//      saindo, indicando o substituto.
//   2) Declaração de Anuência — a escola autoriza a continuidade do
//      projeto sob o novo orientador.
//
// Os dois já nascem com o que o sistema sabe (nome/CPF/RG do orientador,
// título do projeto, edital, escola, nome do substituto digitado no
// formulário) — o que falta (CPF/RG do substituto, data, assinatura) fica
// com reticências para completar à mão, igual ao padrão dos anexos em
// papel já usados pela CCAD.

import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx'
import {
  LOGO_CDTIV_BYTES, LOGO_FACITEC_BYTES, LOGO_CDTIV_ASPECTO, LOGO_FACITEC_ASPECTO,
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

// Cabeçalho padrão do sistema: CDTIV + FACITEC lado a lado, centralizados
// (mesmas artes e proporções usadas nos PDFs gerados pelo sistema — ver
// src/lib/identidadeVisual.js).
function cabecalhoLogos() {
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

// ── 1) Solicitação de Desligamento ──────────────────────────────────────

export async function gerarSolicitacaoDesligamentoDocx({ orientador, projeto, numeroEdital, nomeSubstituto, motivo }) {
  const doc = new Document({
    styles: ESTILOS,
    sections: [{
      properties: { page: { margin: MARGENS } },
      children: [
        cabecalhoLogos(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 500 },
          children: [new TextRun({ text: 'SOLICITAÇÃO DE DESLIGAMENTO DE PROJETO PIBIC JR', bold: true, size: 24 })],
        }),
        new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'À', bold: true })] }),
        new Paragraph({ spacing: { after: 420 }, children: [new TextRun({ text: 'Secretaria Executiva/CMCT-FACITEC', bold: true })] }),
        new Paragraph({ spacing: { after: 420 }, children: [new TextRun('Prezado(a) Senhor(a),')] }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [
            new TextRun({ text: `Eu, ${campo(orientador?.nome_completo, 55)}, CPF nº ${campo(orientador?.cpf, 18)}, RG/CI nº ${campo(orientador?.rg, 16)}, responsável pela orientação do projeto ` }),
            new TextRun({ text: `“${campo(projeto?.titulo, 45)}”`, italics: true, bold: true }),
            new TextRun({ text: `, SOLICITO O MEU DESLIGAMENTO do projeto, com base no item 16.2 do Edital FACITEC nº ${campo(numeroEdital, 10)}.` }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [new TextRun({
            text: `Diante da possibilidade de o FACITEC continuar oferecendo apoio ao meu projeto, INDICO o(a) professor(a) ${campo(nomeSubstituto, 45)}, CPF nº ${dotted(18)}, RG nº ${dotted(16)}, para me substituir na orientação, uma vez que o(a) mesmo(a) reúne os requisitos necessários para dar continuidade ao projeto.`,
          })],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300, line: 360 },
          children: [new TextRun(`Esclareço que o motivo do meu desligamento é: ${campo(motivo, 0) || dotted(55)}`)],
        }),
        new Paragraph({ spacing: { after: 420 }, children: [new TextRun('Certo da compreensão de V.Sª,')] }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 700 },
          children: [new TextRun(`Vitória, ${dotted(3)} de ${dotted(16)} de ${dotted(5)}.`)],
        }),
        new Paragraph({ spacing: { after: 700 }, children: [new TextRun('Atenciosamente,')] }),
        new Paragraph({ spacing: { after: 40 }, children: [new TextRun('_'.repeat(55))] }),
        new Paragraph({ children: [new TextRun(campo(orientador?.nome_completo, 0) || 'Nome completo do(a) orientador(a) que solicita o desligamento')] }),
      ],
    }],
  })
  return Packer.toBlob(doc)
}

// ── 2) Declaração de Anuência ───────────────────────────────────────────

export async function gerarDeclaracaoAnuenciaDocx({ orientador, projeto, numeroEdital, nomeSubstituto }) {
  const doc = new Document({
    styles: ESTILOS,
    sections: [{
      properties: { page: { margin: MARGENS } },
      children: [
        cabecalhoLogos(),
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

// ── Atalhos de download ─────────────────────────────────────────────────

export async function baixarSolicitacaoDesligamento(dados) {
  const blob = await gerarSolicitacaoDesligamentoDocx(dados)
  downloadBlob(blob, 'Solicitacao_Desligamento_Orientador.docx')
}

export async function baixarDeclaracaoAnuencia(dados) {
  const blob = await gerarDeclaracaoAnuenciaDocx(dados)
  downloadBlob(blob, 'Declaracao_Anuencia_Continuidade_Projeto.docx')
}
