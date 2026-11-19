// src/lib/documentoDinov.js
//
// Camada fina do FACITEC CONECTA sobre o módulo oficial de documentos da
// Identidade Visual DINOV (src/lib/identidade/identidadeDocumentoDinov.js).
// Os arquivos de src/lib/identidade/ são cópias do kit e NÃO se editam aqui;
// este arquivo só reúne o que o sistema precisa para gerar PDFs no modelo
// único A4 (cabeçalho, rodapé "Página x de y", faixas, fontes Poppins/Inter).
//
// Decisão de Sérgio (19/11/2026): todos os PDFs do sistema seguem o modelo.

import { jsPDF } from 'jspdf'

export * from '@/lib/identidade/identidadeDocumentoDinov.js'

/** Setor que assina os documentos emitidos pela Secretaria Executiva. */
export const SETOR_SECRETARIA = [
  'Secretaria Executiva',
  'Fundo de Apoio à Ciência, Tecnologia e Inovação de Vitória',
  'Conselho Municipal de Ciência e Tecnologia · CMCT',
]

/**
 * Configura o documento como o `novoDocumento` do kit faz (fontes, metadados,
 * cabeçalho em todas as páginas), guardando o `addPage` original em
 * `doc.__addPageOriginal` para podermos misturar páginas retrato e paisagem.
 */
function prepararDocumento(doc, { sistema, setor, tituloPdf, paisagem }) {
  registrarFontes(doc)
  doc.__dvSistema = sistema
  doc.__dvSetor = setor
  doc.setProperties({ title: tituloPdf, author: DV.sistemas[sistema].nome, creator: `${DV.sistemas[sistema].nome} · Identidade Visual DINOV ${DV.versao}` })
  if (doc.setLanguage) doc.setLanguage('pt-BR')
  const desenharCabecalho = paisagem ? cabecalhoPaisagem : cabecalhoRetrato
  desenharCabecalho(doc, { sistema, setor })
  const addPageOriginal = doc.addPage.bind(doc)
  doc.__addPageOriginal = addPageOriginal
  doc.addPage = () => {
    if (paisagem) addPageOriginal('a4', 'landscape')
    else addPageOriginal()
    desenharCabecalho(doc, { sistema, setor })
    return doc
  }
  return doc
}

/** Cria um documento A4 retrato no modelo DINOV para o FACITEC CONECTA. */
export function criarDocumento({ tituloPdf = '', setor = SETOR_SECRETARIA } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  return prepararDocumento(doc, { sistema: 'facitec-conecta', setor, tituloPdf, paisagem: false })
}

/** Texto do rodapé/arquivo seguro: tira acentos e espaços. */
export function nomeArquivoSeguro(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Blocos extras do sistema (usam só o que o módulo do kit exporta) ───────
import { DV, rgb } from '@/lib/identidade/identidadeDinovTokens.js'
import {
  fonte, MARGEM, AREA, INICIO_CONTEUDO, FIM_CONTEUDO, registrarFontes,
  rodape as rodapeRetrato, cabecalho as cabecalhoRetrato,
} from '@/lib/identidade/identidadeDocumentoDinov.js'
import { LOGOS } from '@/lib/identidade/logosDinov.js'

export { DV, rgb }

/**
 * Parágrafo justificado de verdade. O `paragrafo` do kit usa o justificado
 * nativo do jsPDF, que com fontes embutidas (Inter) deixa cada linha uns
 * 3% mais curta que a margem direita. Aqui cada palavra é posicionada com
 * espaço igual, e a linha vai exatamente de margem a margem. Mesma
 * assinatura e mesmo espaçamento do `paragrafo` do kit (que ele substitui
 * nas importações do sistema); o arquivo do kit continua intacto.
 */
export function paragrafo(doc, texto, y, { tamanho = 11, alinhamento = 'justify', cor = DV.base.texto, estilo = 'texto' } = {}) {
  fonte(doc, estilo, tamanho, cor)
  const alturaLinha = tamanho * 0.3528 * 1.5
  const linhas = doc.splitTextToSize(texto, AREA.largura)
  let yy = y
  linhas.forEach((linha, i) => {
    if (yy > FIM_CONTEUDO) { doc.addPage(); yy = INICIO_CONTEUDO; fonte(doc, estilo, tamanho, cor) }
    const ultima = i === linhas.length - 1
    const palavras = linha.trim().split(/\s+/)
    if (alinhamento === 'justify' && !ultima && palavras.length > 1) {
      const larguraPalavras = palavras.reduce((soma, w) => soma + doc.getTextWidth(w), 0)
      const espaco = (AREA.largura - larguraPalavras) / (palavras.length - 1)
      let x = MARGEM.esquerda
      palavras.forEach((w) => { doc.text(w, x, yy); x += doc.getTextWidth(w) + espaco })
    } else if (alinhamento === 'center') {
      doc.text(linha, 105, yy, { align: 'center' })
    } else {
      doc.text(linha, MARGEM.esquerda, yy)
    }
    yy += alturaLinha
  })
  return yy + alturaLinha * 0.5
}

/** Se não houver `altura` mm livres na página, abre outra. Devolve o y a usar. */
export function garantirEspaco(doc, y, altura) {
  if (y + altura > FIM_CONTEUDO) {
    doc.addPage()
    return INICIO_CONTEUDO
  }
  return y
}

/** Título de seção dentro do documento: Inter 600 em caixa-alta + filete. Devolve o próximo y. */
export function secao(doc, texto, y) {
  const yy = garantirEspaco(doc, y + 2, 14)
  fonte(doc, 'textoSemi', 9, DV.base.marinho)
  doc.text(texto.toUpperCase(), MARGEM.esquerda, yy, { charSpace: 0.3 })
  doc.setDrawColor(...rgb(DV.base.marinho))
  doc.setLineWidth(0.3)
  doc.line(MARGEM.esquerda, yy + 1.8, MARGEM.esquerda + 30, yy + 1.8)
  return yy + 8
}

/**
 * Quadro de destaque no padrão da ficha (fundo suave + filete marinho):
 * `titulo` pode ter várias linhas; `subtitulo` é uma linha menor abaixo.
 * Devolve o próximo y.
 */
export function quadroDestaque(doc, { rotulo, titulo, subtitulo }, y) {
  fonte(doc, 'textoSemi', 10.5, DV.base.marinho)
  const linhas = doc.splitTextToSize(titulo || '—', AREA.largura - 12)
  const alturaTitulo = linhas.length * 4.8
  const h = 6 + (rotulo ? 4.5 : 0) + alturaTitulo + (subtitulo ? 6 : 0) + 3
  const yy = garantirEspaco(doc, y, h + 4)
  doc.setFillColor(...rgb(DV.base.marinhoClaro))
  doc.rect(MARGEM.esquerda, yy, AREA.largura, h, 'F')
  doc.setFillColor(...rgb(DV.base.marinho))
  doc.rect(MARGEM.esquerda, yy, 1.6, h, 'F')
  let cy = yy + 6
  if (rotulo) {
    fonte(doc, 'textoSemi', 6.8, DV.base.textoSecundario)
    doc.text(rotulo.toUpperCase(), MARGEM.esquerda + 6, cy, { charSpace: 0.3 })
    cy += 4.5
  }
  fonte(doc, 'textoSemi', 10.5, DV.base.marinho)
  linhas.forEach((l) => { doc.text(l, MARGEM.esquerda + 6, cy); cy += 4.8 })
  if (subtitulo) {
    fonte(doc, 'texto', 8.5, DV.base.textoSecundario)
    doc.text(subtitulo, MARGEM.esquerda + 6, cy + 0.6)
  }
  return yy + h + 8
}

/**
 * Linha "rótulo: valor" alinhada em duas colunas (rótulo em Inter 600 cinza,
 * valor em Inter com quebra de linha). Devolve o próximo y.
 */
export function linhaCampo(doc, rotulo, valor, y, { larguraRotulo = 40 } = {}) {
  fonte(doc, 'texto', 9.5, DV.base.texto)
  const linhas = doc.splitTextToSize(String(valor ?? '') || '—', AREA.largura - larguraRotulo)
  let yy = garantirEspaco(doc, y, 6)
  fonte(doc, 'textoSemi', 8.5, DV.base.textoSecundario)
  doc.text(rotulo, MARGEM.esquerda, yy)
  fonte(doc, 'texto', 9.5, DV.base.texto)
  linhas.forEach((l, i) => {
    if (i > 0) yy = garantirEspaco(doc, yy + 5, 5)
    doc.text(l, MARGEM.esquerda + larguraRotulo, yy)
  })
  return yy + 6
}

/**
 * Uma linha de campos em até 2 colunas, com o rótulo em caixa-alta pequena
 * acima do valor (`compacto` reduz o espaçamento). `pares`: [[rotulo, valor], [rotulo, valor]] ou, para um
 * campo em largura total, [[rotulo, valor]]. Devolve o próximo y.
 */
export function camposEmColunas(doc, pares, y, { compacto = false } = {}) {
  const metade = AREA.largura / 2
  const larguraCampo = pares.length === 1 ? AREA.largura : metade - 6
  fonte(doc, 'texto', 10, DV.base.texto)
  const blocos = pares.map(([rotulo, valor]) => ({
    rotulo,
    linhas: doc.splitTextToSize(String(valor ?? '') || '—', larguraCampo),
  }))
  const maxLinhas = Math.max(...blocos.map((b) => b.linhas.length))
  const altura = compacto ? 4.4 + maxLinhas * 4.3 + 2 : 5 + maxLinhas * 4.6 + 3
  const yy = garantirEspaco(doc, y, altura)
  blocos.forEach((b, i) => {
    const x = MARGEM.esquerda + (pares.length === 1 ? 0 : i * (metade + 2))
    fonte(doc, 'textoSemi', 6.8, DV.base.textoSecundario)
    doc.text(String(b.rotulo).toUpperCase(), x, yy, { charSpace: 0.3 })
    fonte(doc, 'texto', 10, DV.base.texto)
    doc.text(b.linhas, x, yy + (compacto ? 4.4 : 5), { lineHeightFactor: 1.15 })
  })
  return yy + altura
}

/** Faixa azul-marinho com texto branco (título + subtítulo). Devolve o próximo y. */
export function faixaTitulo(doc, { titulo, subtitulo }, y) {
  const h = subtitulo ? 14 : 9
  const yy = garantirEspaco(doc, y, h + 14)
  doc.setFillColor(...rgb(DV.base.marinho))
  doc.rect(MARGEM.esquerda, yy, AREA.largura, h, 'F')
  fonte(doc, 'titulo', 9.5, '#FFFFFF')
  doc.text(doc.splitTextToSize(titulo, AREA.largura - 8)[0], MARGEM.esquerda + 4, yy + 6)
  if (subtitulo) {
    fonte(doc, 'texto', 8, '#FFFFFF')
    doc.text(doc.splitTextToSize(subtitulo, AREA.largura - 8)[0], MARGEM.esquerda + 4, yy + 11)
  }
  return yy + h + 5
}

// ── Páginas em paisagem (relatórios largos) ────────────────────────────────
// A política (seção 5.2) manda usar o mesmo cabeçalho e o mesmo rodapé,
// ajustados à largura. O módulo do kit só desenha A4 retrato; estas funções
// repetem o desenho dele em A4 paisagem (297 x 210 mm), com as mesmas
// medidas, logos, cores e textos.

export const PAISAGEM = {
  largura: 297,
  altura: 210,
  inicioConteudo: INICIO_CONTEUDO,
  fimConteudo: 179,
  areaLargura: 297 - MARGEM.esquerda - MARGEM.direita,
}

function faixaCores(doc, cores, x, y, largura, altura) {
  const w = largura / cores.length
  cores.forEach((c, i) => { doc.setFillColor(...rgb(c)); doc.rect(x + i * w, y, w + 0.05, altura, 'F') })
}

export function cabecalhoPaisagem(doc, { sistema, setor = [] }) {
  const sis = DV.sistemas[sistema]
  faixaCores(doc, sis.faixa, 0, 0, PAISAGEM.largura, 3)
  const logo = LOGOS[sis.logo]
  const altura = sistema === 'ccad' ? 14 : 12
  doc.addImage(logo.dataUrl, 'PNG', MARGEM.esquerda, 10, altura * logo.proporcao, altura, undefined, 'FAST')
  const xd = PAISAGEM.largura - MARGEM.direita
  if (setor[0]) { fonte(doc, 'titulo', 8.5, DV.base.marinho); doc.text(setor[0].toUpperCase(), xd, 14.5, { align: 'right', charSpace: 0.3 }) }
  fonte(doc, 'texto', 7.5, DV.base.textoSecundario)
  setor.slice(1, 3).forEach((l, i) => doc.text(l, xd, 18.6 + i * 3.6, { align: 'right' }))
  doc.setDrawColor(...rgb(DV.base.borda)); doc.setLineWidth(0.3)
  doc.line(MARGEM.esquerda, 28, xd, 28)
}

export function rodapePaisagem(doc, { sistema, pagina, total, codigo, geradoEm = new Date() }) {
  const sis = DV.sistemas[sistema]
  const xd = PAISAGEM.largura - MARGEM.direita
  const base = PAISAGEM.altura - 21 // 189 mm: mesma distância do fim que o retrato (276 de 297)
  doc.setDrawColor(...rgb(DV.base.divisoria)); doc.setLineWidth(0.3)
  doc.line(MARGEM.esquerda, base, xd, base)
  const cd = LOGOS['cdtiv-logo']; const pm = LOGOS['prefeitura-vitoria-horizontal']
  doc.addImage(cd.dataUrl, 'PNG', MARGEM.esquerda, base + 3, 8 * cd.proporcao, 8, undefined, 'FAST')
  doc.addImage(pm.dataUrl, 'PNG', MARGEM.esquerda + 8 * cd.proporcao + 6, base + 3, 8 * pm.proporcao, 8, undefined, 'FAST')
  const data = geradoEm.toLocaleDateString('pt-BR')
  const hora = geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  fonte(doc, 'texto', 7, DV.base.textoSecundario)
  doc.text(`Gerado pelo ${sis.rodapeTexto} em ${data} às ${hora}${codigo ? ` · Código ${codigo}` : ''}`, xd, base + 6, { align: 'right' })
  fonte(doc, 'textoSemi', 7.5, DV.base.marinho)
  doc.text(`Página ${pagina} de ${total}`, xd, base + 10.2, { align: 'right' })
  faixaCores(doc, [...sis.faixa, DV.base.marinho, DV.base.marinho], 0, PAISAGEM.altura - 3, PAISAGEM.largura, 3)
}

/** Cria um documento A4 paisagem no modelo DINOV (cabeçalho em todas as páginas novas). */
export function criarDocumentoPaisagem({ tituloPdf = '', setor = SETOR_SECRETARIA } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true })
  return prepararDocumento(doc, { sistema: 'facitec-conecta', setor, tituloPdf, paisagem: true })
}

/** Acrescenta uma página paisagem a um documento retrato criado por criarDocumento. Devolve o y inicial. */
export function adicionarPaginaPaisagem(doc) {
  doc.__addPageOriginal('a4', 'landscape')
  cabecalhoPaisagem(doc, { sistema: doc.__dvSistema, setor: doc.__dvSetor })
  return PAISAGEM.inicioConteudo
}

/** Como `finalizar`, mas escolhe o rodapé certo (retrato ou paisagem) para cada página. */
export function finalizarDocumento(doc, { codigo, geradoEm } = {}) {
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p)
    const paisagem = doc.internal.pageSize.getWidth() > 250
    const desenhar = paisagem ? rodapePaisagem : rodapeRetrato
    desenhar(doc, { sistema: doc.__dvSistema, pagina: p, total, codigo, geradoEm })
  }
  return doc
}

/**
 * Para documentos longos de texto corrido (contratos, termos) que já têm
 * layout próprio: faz as chamadas `doc.setFont('helvetica', ...)` do código
 * antigo usarem a Inter do modelo (a Helvetica é proibida pela política) e
 * pinta o texto com a cor oficial, não preto puro. O cabeçalho, o rodapé, as
 * margens e a numeração de páginas vêm de criarDocumento/finalizar.
 */
export function adaptarDocumentoLegado(doc) {
  const setFontOriginal = doc.setFont.bind(doc)
  doc.setFont = (nome, estilo, peso) => {
    const familia = String(nome || '').toLowerCase()
    if (['helvetica', 'arial', 'times', 'courier'].includes(familia)) {
      const e = String(estilo || 'normal').toLowerCase()
      if (e.includes('italic')) setFontOriginal('Inter', 'italic')
      else if (e.includes('bold')) setFontOriginal('Inter', 'bold')
      else setFontOriginal('Inter', 'normal')
      doc.setTextColor(...rgb(DV.base.texto))
      return doc
    }
    return setFontOriginal(nome, estilo, peso)
  }
  doc.setTextColor(...rgb(DV.base.texto))

  // O cabeçalho que o modelo desenha em cada página nova muda fonte, tamanho
  // e cor; o código antigo espera continuar do ponto em que estava.
  const addPageDoModelo = doc.addPage
  doc.addPage = (...args) => {
    const fonteAtual = doc.getFont()
    const tamanho = doc.getFontSize()
    const cor = doc.getTextColor()
    addPageDoModelo(...args)
    doc.setFont(fonteAtual.fontName, fonteAtual.fontStyle)
    doc.setFontSize(tamanho)
    doc.setTextColor(cor)
    return doc
  }
  return doc
}
