// src/lib/relatorioNRHPdf.js
//
// PDF do "Relatório de Atividades para o NRH" — modelo definido pelo próprio
// Sérgio (Secretário Executivo CMCT/FACITEC), ver
// claude/facitec-conecta-relatorio-atividades-nrh.md no Claude Project.
// Segue o modelo único A4 da Identidade Visual DINOV (documentoDinov.js).

import {
  criarDocumento, titulo, paragrafo, localData, assinatura, finalizar,
  nomeArquivoSeguro,
} from '@/lib/documentoDinov'

const NOME_SECRETARIO = 'Sérgio Paulo Tomaz'
const CARGO_SECRETARIO = 'Secretário Executivo – CMCT/FACITEC'

// Código de documento cosmético — não é uma assinatura digital criptográfica/
// ICP-Brasil real, é só um elemento visual de formalidade/rastreabilidade
// interna (mesmo padrão já usado no Termo de Envio do Portal CCAD).
function gerarCodigoDocumento() {
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `NRH-${aleatorio}`
}

export function gerarPDFRelatorioNRH({ referencia, textoAtividades }) {
  const doc = criarDocumento({ tituloPdf: 'Relatório de Atividades para o NRH' })

  let y = titulo(doc, {
    chapeu: `Referência · ${referencia || '—'}`,
    texto: 'Relatório de atividades da Secretaria Executiva do FACITEC',
  })

  y = paragrafo(doc, 'Ao', y, { alinhamento: 'left' })
  y = paragrafo(doc, 'NRH', y - 4, { alinhamento: 'left', estilo: 'textoSemi' })

  y = paragrafo(
    doc,
    `Considerando o atendimento ao requisito da Portaria interna da CDTIV, relato as seguintes atividades exercidas pela Secretaria Executiva do Facitec em referência ao mês de ${referencia || '—'}:`,
    y,
  )

  const paragrafos = (textoAtividades || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  paragrafos.forEach((p) => {
    y = paragrafo(doc, p, y)
  })

  y = localData(doc, y + 4)

  const agora = new Date()
  const codigo = gerarCodigoDocumento()
  y = assinatura(doc, {
    nome: NOME_SECRETARIO,
    cargo: CARGO_SECRETARIO,
    y: y + 14,
    eletronica: {
      data: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      codigo,
    },
  })

  finalizar(doc, { codigo })

  doc.save(`relatorio-atividades-nrh-${nomeArquivoSeguro((referencia || 'periodo').replace(/[\s/]+/g, '-'))}.pdf`)
}
