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

import { jsPDF } from 'jspdf'
import { desenharCabecalhoLogos } from '@/lib/identidadeVisual'
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

export async function exportarFichaCadastralPDF(linhas, ano = '2026') {
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

  // Desenha um "quadradinho" com a imagem do documento (ou um aviso, quando
  // `resultado` é null porque o documento não existe ou não pôde ser
  // carregado) — usado na seção "Documentos anexados", abaixo.
  const LADO_DOC = 30
  const GAP_DOC = 6
  function quadradoDocumento(x, y, label, resultado) {
    doc.setDrawColor(...CINZA_CLARO)
    doc.setLineWidth(0.3)
    if (resultado?.canvas) {
      const escala = Math.min(LADO_DOC / resultado.largura, LADO_DOC / resultado.altura)
      const w = resultado.largura * escala
      const h = resultado.altura * escala
      doc.roundedRect(x, y, LADO_DOC, LADO_DOC, 1.5, 1.5, 'S')
      doc.addImage(resultado.canvas, 'JPEG', x + (LADO_DOC - w) / 2, y + (LADO_DOC - h) / 2, w, h)
    } else {
      doc.setFillColor(...CINZA_CLARO)
      doc.roundedRect(x, y, LADO_DOC, LADO_DOC, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...CINZA_TEXTO)
      doc.text('Documento', x + LADO_DOC / 2, y + LADO_DOC / 2 - 2, { align: 'center' })
      doc.text('não anexado', x + LADO_DOC / 2, y + LADO_DOC / 2 + 2.5, { align: 'center' })
      doc.setTextColor(0, 0, 0)
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(doc.splitTextToSize(label, LADO_DOC + 4), x, y + LADO_DOC + 3.5)
    doc.setTextColor(0, 0, 0)
  }

  for (const [idx, b] of linhas.entries()) {
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
    // Só existe (e só faz sentido mostrar) para bolsistas menores de idade —
    // para os demais, a seção inteira é omitida, em vez de imprimir um
    // "Responsável: —" vazio numa ficha que vai para fora da instituição.
    if (b.menor_idade === 'Sim') {
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
    }

    // ── Vínculo institucional ───────────────────────────────────────────
    y = tituloSecao(y, 'Vínculo institucional')
    y = linha(y, [
      { x: colEsqX, label: 'ORIENTADOR(A)', valor: b.orientador, largura: colLargura },
      { x: colDirX, label: 'CÓDIGO DO ORIENTADOR', valor: b.codigo_orientador, largura: colLargura },
    ])
    y = linha(y, [
      { x: colEsqX, label: 'PROJETO', valor: b.projeto, largura: usableW },
    ])
    y = linha(y, [
      { x: colEsqX, label: 'Nº DO CONTRATO', valor: b.numero_contrato, largura: colLargura },
    ], 5)

    // ── Documentos anexados ──────────────────────────────────────────────
    // Busca as imagens (ou converte a 1ª página do PDF) em paralelo, para
    // não deixar o carregamento mais lento do que precisa — cada bolsista
    // tem no máximo 4 documentos (2 dele + 2 do responsável).
    const documentosAluno = listarDocumentosIdentidade(b)
    const documentosResponsavel = b.menor_idade === 'Sim' ? listarDocumentosIdentidade(b, { responsavel: true }) : []
    const todosDocumentos = [...documentosAluno, ...documentosResponsavel]
    const resultadosImagens = await Promise.all(todosDocumentos.map(d => converterDocumentoParaImagem(d.url)))

    // Se não sobrar espaço suficiente para o título + os quadradinhos nesta
    // página, começa uma página nova (ainda para o mesmo bolsista) em vez de
    // cortar/sobrepor conteúdo no rodapé — casos com responsável (mais
    // campos) e vários documentos são os que mais se aproximam do limite.
    const ALTURA_SECAO_DOCUMENTOS = 10 + LADO_DOC + 6
    if (y + ALTURA_SECAO_DOCUMENTOS > pgH - 20) {
      rodape()
      doc.addPage()
      pagina++
      cabecalho()
      y = mT + 10
    }

    y = tituloSecao(y, 'Documentos anexados')
    todosDocumentos.forEach((docInfo, i) => {
      quadradoDocumento(colEsqX + i * (LADO_DOC + GAP_DOC), y, docInfo.label, resultadosImagens[i])
    })
  }

  rodape()

  const sufixo = linhas.length === 1
    ? (linhas[0].codigo_bolsista || 'bolsista')
    : `${linhas[0].codigo_orientador || 'grupo'}_${ano}`
  doc.save(`Ficha_Cadastral_${sufixo}.pdf`)
}
