// src/lib/inscricaoPdf.js
//
// Exportação em PDF da ficha de inscrição (individual ou em lote), no modelo
// único A4 da Identidade Visual DINOV (documentoDinov.js).

import {
  criarDocumento, titulo, paragrafo, secao, quadroDestaque, linhaCampo,
  garantirEspaco, finalizar, DV, INICIO_CONTEUDO,
} from '@/lib/documentoDinov'

function eixosNomesDe(detalhe) {
  return (detalhe?.projeto_eixo ?? []).map(pe => pe.eixo_tematico?.nome).filter(Boolean)
}

function respostasOrdenadasDe(detalhe) {
  return [...(detalhe?.resposta_inscricao ?? [])]
    .sort((a, b) => (a.campo?.ordem ?? 0) - (b.campo?.ordem ?? 0))
}

function dataEnvioDe(detalhe) {
  return detalhe?.enviado_em ?? detalhe?.created_at ?? null
}

function formatarDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Desenho de uma ficha de inscrição, a partir do topo da página atual ─────

function desenharFichaInscricao(doc, detalhe, yInicial = INICIO_CONTEUDO) {
  let y = titulo(doc, {
    chapeu: `Código ${detalhe?.codigo_inscricao ?? '—'} · Enviado em ${formatarDataHora(dataEnvioDe(detalhe))}`,
    texto: 'Ficha de inscrição',
    y: yInicial,
  })

  y = quadroDestaque(doc, { rotulo: 'Projeto', titulo: detalhe?.titulo || '—' }, y)

  const o = detalhe?.orientador

  y = secao(doc, 'Proponente', y)
  y = linhaCampo(doc, 'Nome', o?.nome_completo, y)
  y = linhaCampo(doc, 'E-mail', o?.email, y)
  y = linhaCampo(doc, 'Telefone', o?.telefone, y)
  y = linhaCampo(doc, 'CPF', o?.cpf, y)
  y = linhaCampo(doc, 'Endereço', [o?.rua, o?.bairro, o?.cidade].filter(Boolean).join(', '), y)
  y += 3

  y = secao(doc, 'Escola', y)
  y = linhaCampo(doc, 'Escola', o?.escola, y)
  y = linhaCampo(doc, 'Telefone', o?.telefone_escola, y)
  y = linhaCampo(doc, 'E-mail', o?.email_escola, y)
  y = linhaCampo(doc, 'Formação', o?.instituicao, y)
  y = linhaCampo(doc, 'Diploma', o?.doc_diploma_url ? 'Anexado (ver sistema)' : 'Não enviado', y)
  y += 3

  y = secao(doc, 'Projeto', y)
  y = linhaCampo(doc, 'Eixos temáticos', eixosNomesDe(detalhe).join(', '), y)
  y = linhaCampo(doc, 'Inédito', detalhe?.inedito ? 'Sim' : 'Não', y)
  if (!detalhe?.inedito) {
    y = linhaCampo(doc, 'Edições anteriores', detalhe?.edicoes_anteriores, y)
    y = linhaCampo(doc, 'Novidades', detalhe?.palavras_chave_livre, y)
  }
  y = linhaCampo(doc, 'PDF do projeto', detalhe?.arquivo_pdf_url ? 'Anexado (ver sistema)' : 'Não enviado', y)
  y += 3

  const respostas = respostasOrdenadasDe(detalhe)
  if (respostas.length) {
    y = secao(doc, 'Perguntas dissertativas', y)
    respostas.forEach((r) => {
      y = garantirEspaco(doc, y, 14)
      y = paragrafo(doc, r.campo?.pergunta || '—', y, { tamanho: 9.5, estilo: 'textoSemi', alinhamento: 'left' })
      y = paragrafo(doc, r.resposta || '—', y - 2, { tamanho: 9.5, cor: DV.base.textoSecundario })
      y += 1
    })
  }
}

// ── API pública ───────────────────────────────────────────────────────────

export function gerarPDFInscricao(detalhe) {
  const doc = criarDocumento({ tituloPdf: `Ficha de inscrição ${detalhe?.codigo_inscricao ?? ''}`.trim() })
  desenharFichaInscricao(doc, detalhe)
  finalizar(doc, { codigo: detalhe?.codigo_inscricao })
  doc.save(`inscricao-${detalhe?.codigo_inscricao || detalhe?.id || 'sem-codigo'}.pdf`)
}

export function gerarPDFInscritosLote(lista, ano) {
  const doc = criarDocumento({ tituloPdf: `Fichas de inscrição — edição ${ano}` })
  lista.forEach((detalhe, idx) => {
    if (idx > 0) doc.addPage()
    desenharFichaInscricao(doc, detalhe)
  })
  finalizar(doc)
  doc.save(`inscritos-edicao-${ano}.pdf`)
}
