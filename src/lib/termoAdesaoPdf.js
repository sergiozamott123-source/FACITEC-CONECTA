// src/lib/termoAdesaoPdf.js
//
// PDF do "Termo de Adesão do Estudante Bolsista" (anexo ao contrato de
// concessão de bolsa). Segue o modelo único A4 da Identidade Visual DINOV
// (documentoDinov.js): cabeçalho com logos, rodapé com "Página x de y",
// título em Poppins e texto em Inter, justificado.

import {
  criarDocumento, titulo, paragrafo, secao, localData, assinatura, finalizar,
  garantirEspaco, fonte, DV, MARGEM,
} from '@/lib/documentoDinov'

/**
 * Monta o PDF do termo e devolve o documento jsPDF (quem chama decide
 * se baixa com doc.save).
 */
export function construirPDFTermoAdesao({
  bolsista, ehMenor, numeroTermo, numeroContrato, numeroEdital, dataAssinatura,
  tituloProjeto, nomeEscola, nomeResponsavel, cpfResponsavel, docResponsavel,
  nomePrograma,
}) {
  const doc = criarDocumento({ tituloPdf: `Termo de adesão — ${bolsista.nome_completo || 'estudante bolsista'}` })

  const edital = numeroEdital || '01/2026'
  const contrato = numeroContrato || '___'

  let y = titulo(doc, {
    chapeu: `Anexo ao contrato de concessão de bolsa nº ${contrato}`,
    texto: `Termo de adesão do estudante bolsista (${ehMenor ? 'menor' : 'maior'} de idade)`,
  })

  // ── Referência (edital e número do termo) ────────────────────────────
  fonte(doc, 'texto', 9, DV.base.textoSecundario)
  doc.text(`Edital FACITEC ${edital}  ·  Termo nº ${numeroTermo}`, MARGEM.esquerda, y - 2)
  y += 6

  // ── Parágrafo de adesão ──────────────────────────────────────────────
  const escola = nomeEscola || '___'
  const projeto = tituloProjeto || '___'
  const textoAdesao = ehMenor
    ? `Eu, ${bolsista.nome_completo || '___'}, inscrito(a) no CPF nº ${bolsista.cpf || '___'}, representado(a) neste ato por seu(sua) representante legal ${nomeResponsavel || '___'}, portador(a) do CPF nº ${cpfResponsavel || '___'}${docResponsavel ? ` e do documento de identidade nº ${docResponsavel}` : ''}, aluno(a) do(a) ${escola}, declaro que adiro ao projeto de pesquisa "${projeto}", no âmbito do Edital FACITEC ${edital}, vinculado ao Contrato nº ${contrato}, comprometendo-me a cumprir todos os termos e condições estabelecidos.`
    : `Eu, ${bolsista.nome_completo || '___'}, inscrito(a) no CPF nº ${bolsista.cpf || '___'}, aluno(a) do(a) ${escola}, declaro que adiro ao projeto de pesquisa "${projeto}", no âmbito do Edital FACITEC ${edital}, vinculado ao Contrato nº ${contrato}, comprometendo-me a cumprir todos os termos e condições estabelecidos.`
  y = paragrafo(doc, textoAdesao, y)

  // ── Cláusula primeira ────────────────────────────────────────────────
  y = secao(doc, 'Cláusula primeira — Das obrigações do estudante bolsista', y + 2)
  y = paragrafo(
    doc,
    'O Estudante Bolsista compromete-se a: cumprir todas as atividades previstas no plano de trabalho; apresentar os resultados do projeto, caso seja convocado(a); ter frequência mínima mensal de 75% (setenta e cinco por cento) nas atividades do projeto; manter-se em dia com as obrigações fiscais junto à Fazenda Municipal; efetuar o cadastro junto ao Banco autorizado pelo FACITEC.',
    y,
  )

  // ── Cláusula segunda ─────────────────────────────────────────────────
  y = secao(doc, 'Cláusula segunda — Das penalidades', y + 2)
  y = paragrafo(
    doc,
    `O descumprimento das obrigações previstas na Cláusula Primeira acarretará no desligamento do estudante bolsista do projeto e na impossibilidade de participação no Programa ${nomePrograma || 'PIBIC Jr'} por 12 (doze) meses.`,
    y,
  )

  // ── Data e assinatura ────────────────────────────────────────────────
  y = garantirEspaco(doc, y + 6, 48)
  if (dataAssinatura) {
    const d = new Date(dataAssinatura + 'T12:00:00')
    y = localData(doc, y, d)
  } else {
    fonte(doc, 'texto', 11, DV.base.texto)
    doc.text('Vitória, _____ de __________ de _____.', MARGEM.esquerda, y)
    y += 10
  }

  assinatura(doc, {
    nome: ehMenor ? (nomeResponsavel || '___') : (bolsista.nome_completo || '___'),
    cargo: ehMenor ? 'Representante Legal do Estudante' : 'Estudante Bolsista',
    y: y + 18,
  })

  finalizar(doc, { codigo: numeroTermo })
  return doc
}
