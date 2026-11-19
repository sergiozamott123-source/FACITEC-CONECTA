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

import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx'
import {
  LOGO_CDTIV_BYTES, LOGO_FACITEC_BYTES, LOGO_CDTIV_ASPECTO, LOGO_FACITEC_ASPECTO,
} from '@/lib/identidadeVisual'
import {
  criarDocumento, titulo, paragrafo, secao, selo, linhaCampo, assinatura,
  finalizar, garantirEspaco, fonte, DV, MARGEM,
} from '@/lib/documentoDinov'

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
  // Modelo único A4 da Identidade Visual DINOV (documentoDinov.js).
  const doc = criarDocumento({ tituloPdf: 'Solicitação de desligamento de projeto PIBIC Jr' })

  let y = titulo(doc, {
    chapeu: `Edital FACITEC nº ${campo(numeroEdital, 10)} · Item 16.2`,
    texto: 'Solicitação de desligamento de projeto PIBIC Jr',
  })

  y = paragrafo(doc, 'À', y, { alinhamento: 'left' })
  y = paragrafo(doc, 'Secretaria Executiva/CMCT-FACITEC', y - 4, { alinhamento: 'left', estilo: 'textoSemi' })
  y = paragrafo(doc, 'Prezado(a) Senhor(a),', y, { alinhamento: 'left' })

  y = paragrafo(
    doc,
    `Eu, ${campo(orientador?.nome_completo, 55)}, CPF nº ${campo(orientador?.cpf, 18)}, RG/CI nº ${campo(orientador?.rg, 16)}, responsável pela orientação do projeto “${campo(projeto?.titulo, 45)}”, SOLICITO O MEU DESLIGAMENTO do projeto, com base no item 16.2 do Edital FACITEC nº ${campo(numeroEdital, 10)}.`,
    y,
  )
  y = paragrafo(
    doc,
    `Diante da possibilidade de o FACITEC continuar oferecendo apoio ao meu projeto, INDICO o(a) professor(a) ${campo(nomeSubstituto, 45)}, CPF nº ${campo(cpfSubstituto, 18)}, para me substituir na orientação, uma vez que o(a) mesmo(a) reúne os requisitos necessários para dar continuidade ao projeto.`,
    y,
  )
  y = paragrafo(doc, `Esclareço que o motivo do meu desligamento é: ${campo(motivo, 0) || dotted(55)}`, y)
  y = paragrafo(doc, 'Certo da compreensão de V.Sª,', y, { alinhamento: 'left' })

  y = garantirEspaco(doc, y + 4, 56)
  fonte(doc, 'texto', 11, DV.base.texto)
  doc.text(`Vitória, ${dataExtensoHoje()}.`, MARGEM.esquerda, y)
  y += 10
  y = paragrafo(doc, 'Atenciosamente,', y, { alinhamento: 'left' })

  assinatura(doc, {
    nome: campo(orientador?.nome_completo, 0) || 'Nome completo do(a) orientador(a)',
    cargo: 'Orientador(a) que solicita o desligamento',
    y: y + 18,
  })

  finalizar(doc, { codigo: 'DESLIGAMENTO-ORIENTADOR' })
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

export function gerarTermoAditivoPdf({ projeto, orientadorSaiu, orientadorEntrou, numeroEdital, numeroContrato }) {
  // Modelo único A4 da Identidade Visual DINOV; minuta leva o selo "Atenção".
  const doc = criarDocumento({ tituloPdf: 'Minuta de termo aditivo — substituição de orientador' })

  let y = titulo(doc, {
    chapeu: `Minuta · Edital FACITEC nº ${campo(numeroEdital, 10)}`,
    texto: 'Termo aditivo ao contrato de concessão de apoio financeiro',
  })
  selo(doc, 'MINUTA gerada pelo sistema — revisar antes de enviar para assinatura (ZapSign)', 'atencao', MARGEM.esquerda, y - 4)
  y += 6

  y = paragrafo(
    doc,
    `TERMO ADITIVO ao Contrato de Concessão de Apoio Financeiro nº ${campo(numeroContrato, 10)}, referente ao projeto “${campo(projeto?.titulo, 60)}”, Edital FACITEC nº ${campo(numeroEdital, 10)}, celebrado entre a Companhia de Desenvolvimento, Turismo e Inovação de Vitória – CDTIV, na qualidade de gestora do Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória – FACITEC, e o(a) orientador(a) do projeto, nos termos do item 16.2 do Edital vigente.`,
    y,
  )

  y = secao(doc, 'Cláusula primeira — Do objeto', y + 2)
  y = paragrafo(
    doc,
    'O presente Termo tem por objeto formalizar a SUBSTITUIÇÃO do(a) orientador(a) responsável pelo projeto acima identificado, que passa da seguinte forma:',
    y,
  )

  y = garantirEspaco(doc, y, 40)
  fonte(doc, 'textoSemi', 10, DV.base.marinho)
  doc.text('Orientador(a) que se desliga', MARGEM.esquerda, y)
  y += 5.5
  y = linhaCampo(doc, 'Nome', campo(orientadorSaiu?.nome_completo, 55), y)
  y = linhaCampo(doc, 'CPF', campo(orientadorSaiu?.cpf, 18), y)
  y += 3
  fonte(doc, 'textoSemi', 10, DV.base.marinho)
  doc.text('Orientador(a) substituto(a)', MARGEM.esquerda, y)
  y += 5.5
  y = linhaCampo(doc, 'Nome', campo(orientadorEntrou?.nome_completo, 55), y)
  y = linhaCampo(doc, 'CPF', campo(orientadorEntrou?.cpf, 18), y)
  y += 2

  y = secao(doc, 'Cláusula segunda — Da vigência das demais cláusulas', y)
  y = paragrafo(
    doc,
    'Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do Contrato de Concessão de Apoio Financeiro original, no que não contrariarem o disposto neste Termo Aditivo.',
    y,
  )
  y = paragrafo(
    doc,
    'E por estarem assim justas e contratadas, firmam o presente Termo Aditivo, em duas vias de igual teor, juntamente com as testemunhas abaixo.',
    y,
  )

  y = garantirEspaco(doc, y + 4, 40)
  fonte(doc, 'texto', 11, DV.base.texto)
  doc.text(`Vitória, ${dataExtensoHoje()}.`, MARGEM.esquerda, y)
  y += 6

  const assinantes = [
    ['Diretor(a) Presidente da CDTIV', 'Companhia de Desenvolvimento, Turismo e Inovação de Vitória'],
    ['Diretor(a) Administrativo-Financeiro(a) da CDTIV', 'Companhia de Desenvolvimento, Turismo e Inovação de Vitória'],
    [campo(orientadorEntrou?.nome_completo, 0) || 'Orientador(a) substituto(a)', 'Orientador(a) substituto(a)'],
  ]
  for (const [nome, cargo] of assinantes) {
    y = assinatura(doc, { nome, cargo, y: y + 16 })
  }

  y = garantirEspaco(doc, y + 2, 20)
  fonte(doc, 'textoSemi', 10, DV.base.marinho)
  doc.text('Testemunhas', MARGEM.esquerda, y)
  y += 4
  for (let i = 1; i <= 2; i++) {
    y = assinatura(doc, { nome: `Testemunha ${i}`, cargo: `Nome: ${dotted(30)}   CPF: ${dotted(18)}`, y: y + 16 })
  }

  finalizar(doc, { codigo: 'MINUTA-TERMO-ADITIVO' })
  doc.save(`Minuta_Termo_Aditivo_${(orientadorEntrou?.nome_completo || 'substituicao').split(' ')[0]}.pdf`)
}
