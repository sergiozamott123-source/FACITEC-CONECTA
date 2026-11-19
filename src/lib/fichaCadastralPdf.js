// src/lib/fichaCadastralPdf.js
//
// Ficha cadastral individual do bolsista — uma página completa por pessoa,
// para anexar ao processo físico enviado à Gerência Financeira (abertura de
// conta / cadastramento em sistemas). Reaproveita os mesmos dados já
// buscados por buscarDadosRelatorioFinanceiro/buscarFichaCadastralDeBolsista
// (src/lib/relatorioFinanceiro.js) — nenhuma consulta nova ao Supabase é
// feita aqui, além da busca das próprias imagens dos documentos.
//
// Diferença para o Relatório Financeiro (exportarPDFFinanceiro): aquele é um
// relatório compacto, vários bolsistas por página, pensado para leitura
// rápida da Secretaria; este aqui é uma página cheia por bolsista, formatada
// como ficha individual, pensada para ser destacada e inserida no processo
// de cada um. Sem dados bancários — não fazem parte do que a Financeira
// pediu para esta ficha (só cadastro/abertura de conta).
//
// Fase 25: além dos dados em texto, cada ficha agora mostra um "quadradinho"
// com a imagem do documento de identidade do bolsista e, quando menor, do
// responsável — pedido da Financeira para conferência visual rápida junto
// ao processo físico. O sistema guarda esse documento de duas formas
// dependendo de quando/como foi enviado: um único arquivo combinando
// RG/CI + CPF (fluxo atual), ou os dois separados (cadastros mais antigos)
// — listarDocumentosIdentidade() abaixo escolhe automaticamente o que
// existe. Quando um documento não foi anexado, o quadradinho mostra um
// aviso em vez de quebrar a geração da ficha.

import {
  criarDocumento, titulo, secao, quadroDestaque, camposEmColunas, finalizar,
  fonte, DV, rgb, MARGEM, AREA, INICIO_CONTEUDO,
} from '@/lib/documentoDinov'
import { converterDocumentoParaImagem } from '@/lib/documentoImagem'

// Decide quais documentos de identidade mostrar para o bolsista (ou, quando
// `responsavel: true`, para o responsável dele) — prioriza o documento único
// do fluxo atual; cai para RG/CPF separados quando é isso que existe no
// cadastro; e devolve um único item "sem URL" (vira aviso na ficha) quando
// não há nenhum documento de identidade cadastrado.
function listarDocumentosIdentidade(linha, { responsavel = false } = {}) {
  const quem = responsavel ? 'responsável' : 'bolsista'
  const combinado = responsavel ? linha.doc_identidade_responsavel : linha.doc_identidade_aluno
  if (combinado) {
    return [{ label: `Identidade (RG/CI + CPF) do ${quem}`, url: combinado }]
  }
  const urlRg = responsavel ? linha.responsavel_doc_rg_url : linha.doc_rg_url
  const urlCpf = responsavel ? linha.responsavel_doc_cpf_url : linha.doc_cpf_url
  const docs = []
  if (urlRg) docs.push({ label: `RG do ${quem}`, url: urlRg })
  if (urlCpf) docs.push({ label: `CPF do ${quem}`, url: urlCpf })
  return docs.length ? docs : [{ label: `Identidade do ${quem}`, url: null }]
}

// A ficha cabe numa página por bolsista (a dos documentos vem em seguida):
// por isso os campos usam o espaçamento compacto.
const COMPACTO = { compacto: true }

export async function exportarFichaCadastralPDF(linhas, ano = '2026') {
  if (!linhas?.length) return

  const doc = criarDocumento({ tituloPdf: `Ficha cadastral do bolsista — edição ${ano}` })

  // Desenha o retângulo com a imagem do documento (ou um aviso, quando
  // `resultado` é null porque o documento não existe ou não pôde ser
  // carregado) — usado na página "Documentos de identidade", abaixo. O
  // documento é ampliado ao máximo dentro de DOC_W x DOC_H mantendo sua
  // proporção original, para ficar grande o bastante para conferência
  // (nome, número, foto) sem distorcer a imagem.
  const DOC_W = 76
  const DOC_H = 95
  const GAP_DOC_X = AREA.largura - 2 * DOC_W
  const GAP_DOC_Y = 14
  function quadradoDocumento(x, y, label, resultado) {
    doc.setDrawColor(...rgb(DV.base.borda))
    doc.setLineWidth(0.3)
    if (resultado?.canvas) {
      const escala = Math.min(DOC_W / resultado.largura, DOC_H / resultado.altura)
      const w = resultado.largura * escala
      const h = resultado.altura * escala
      doc.roundedRect(x, y, DOC_W, DOC_H, 2, 2, 'S')
      doc.addImage(resultado.canvas, 'JPEG', x + (DOC_W - w) / 2, y + (DOC_H - h) / 2, w, h)
    } else {
      doc.setFillColor(...rgb(DV.base.marinhoClaro))
      doc.roundedRect(x, y, DOC_W, DOC_H, 2, 2, 'FD')
      fonte(doc, 'texto', 9, DV.base.textoSecundario)
      doc.text('Documento', x + DOC_W / 2, y + DOC_H / 2 - 3, { align: 'center' })
      doc.text('não anexado', x + DOC_W / 2, y + DOC_H / 2 + 3, { align: 'center' })
    }
    fonte(doc, 'textoSemi', 8.5, DV.base.textoSecundario)
    doc.text(label, x + DOC_W / 2, y + DOC_H + 5.5, { align: 'center' })
  }

  for (const [idx, b] of linhas.entries()) {
    if (idx > 0) doc.addPage()

    let y = titulo(doc, {
      chapeu: `Edição ${ano} · Cadastramento junto à Gerência Financeira`,
      texto: 'Ficha cadastral do bolsista',
    })

    // ── Nome em destaque ────────────────────────────────────────────────
    y = quadroDestaque(doc, {
      rotulo: `${b.codigo_bolsista || '—'}  ·  ${b.tipo || '—'}${b.menor_idade === 'Sim' ? '  ·  Menor de idade' : ''}`,
      titulo: b.nome_completo || '—',
    }, y)

    // ── Identificação ───────────────────────────────────────────────────
    y = secao(doc, 'Identificação', y)
    y = camposEmColunas(doc, [['CPF', b.cpf], ['RG', b.rg]], y, COMPACTO)
    y = camposEmColunas(doc, [['Data de nascimento', b.data_nascimento], ['Escola', b.escola]], y, COMPACTO)

    // ── Contato ─────────────────────────────────────────────────────────
    y = secao(doc, 'Contato', y + 2)
    y = camposEmColunas(doc, [['Telefone', b.telefone], ['E-mail', b.email]], y, COMPACTO)

    // ── Endereço ────────────────────────────────────────────────────────
    y = secao(doc, 'Endereço', y + 2)
    y = camposEmColunas(doc, [['Endereço completo', b.endereco]], y, COMPACTO)

    // ── Responsável ─────────────────────────────────────────────────────
    // Só existe (e só faz sentido mostrar) para bolsistas menores de idade —
    // para os demais, a seção inteira é omitida, em vez de imprimir um
    // "Responsável: —" vazio numa ficha que vai para fora da instituição.
    if (b.menor_idade === 'Sim') {
      y = secao(doc, 'Responsável', y + 2)
      y = camposEmColunas(doc, [['Nome', b.nome_responsavel], ['Vínculo', b.vinculo_responsavel]], y, COMPACTO)
      y = camposEmColunas(doc, [['CPF', b.cpf_responsavel], ['RG', b.rg_responsavel]], y, COMPACTO)
      y = camposEmColunas(doc, [['Telefone', b.telefone_responsavel], ['E-mail', b.email_responsavel]], y, COMPACTO)
    }

    // ── Vínculo institucional ───────────────────────────────────────────
    y = secao(doc, 'Vínculo institucional', y + 2)
    y = camposEmColunas(doc, [['Orientador(a)', b.orientador], ['Código do orientador', b.codigo_orientador]], y, COMPACTO)
    y = camposEmColunas(doc, [['Projeto', b.projeto]], y, COMPACTO)
    y = camposEmColunas(doc, [['Nº do contrato', b.numero_contrato]], y, COMPACTO)

    // ── Documentos anexados ──────────────────────────────────────────────
    // Busca as imagens (ou converte a 1ª página do PDF) em paralelo, para
    // não deixar o carregamento mais lento do que precisa — cada bolsista
    // tem no máximo 4 documentos (2 dele + 2 do responsável).
    const documentosAluno = listarDocumentosIdentidade(b)
    const documentosResponsavel = b.menor_idade === 'Sim' ? listarDocumentosIdentidade(b, { responsavel: true }) : []
    const todosDocumentos = [...documentosAluno, ...documentosResponsavel]
    const resultadosImagens = await Promise.all(todosDocumentos.map(d => converterDocumentoParaImagem(d.url)))

    // Os documentos ganham página própria (em vez de dividir espaço com o
    // texto): assim cada imagem pode ser exibida bem maior, grande o
    // suficiente para conferir CPF, RG e foto sem precisar dar zoom.
    doc.addPage()
    y = secao(doc, `Documentos de identidade — ${b.nome_completo || '—'}`, INICIO_CONTEUDO) + 2

    const colunasGrid = 2
    todosDocumentos.forEach((docInfo, i) => {
      const col = i % colunasGrid
      const lin = Math.floor(i / colunasGrid)
      const x = MARGEM.esquerda + col * (DOC_W + GAP_DOC_X)
      const yLinha = y + lin * (DOC_H + GAP_DOC_Y)
      quadradoDocumento(x, yLinha, docInfo.label, resultadosImagens[i])
    })
  }

  finalizar(doc)

  const sufixo = linhas.length === 1
    ? (linhas[0].codigo_bolsista || 'bolsista')
    : `${linhas[0].codigo_orientador || 'grupo'}_${ano}`
  doc.save(`Ficha_Cadastral_${sufixo}.pdf`)
}
