// src/lib/documentoImagem.js
//
// Converte um documento salvo no Storage (imagem ou PDF) numa imagem
// (canvas) pronta para ser inserida num PDF via jsPDF `addImage`. Usado pela
// Ficha Cadastral (fichaCadastralPdf.js) para desenhar um "quadradinho" com
// o documento de identidade do bolsista/responsável — mesmo quando o
// arquivo original foi enviado como PDF escaneado (não uma foto), caso em
// que "tiramos uma foto" da primeira página do PDF (Fase 25).
//
// Nunca lança erro: qualquer falha (rede fora do ar, arquivo corrompido,
// formato inesperado) devolve `null` — quem chama decide o que fazer (a
// Ficha Cadastral mostra um aviso "documento não anexado" no lugar da
// imagem, em vez de quebrar a geração inteira).

import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

function pareceUrlPdf(url, contentType) {
  return /\.pdf(\?|$)/i.test(url) || contentType.includes('pdf')
}

// Renderiza a página 1 de um PDF (ArrayBuffer) num canvas escondido.
async function primeiraPaginaPdfParaCanvas(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas
}

// Carrega um blob de imagem (jpg/png/...) num canvas, do mesmo tamanho da
// imagem original — mantém a mesma "forma" de retorno do caminho do PDF
// acima, para o resto do código não precisar diferenciar os dois casos.
function blobDeImagemParaCanvas(blob) {
  const objectUrl = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível carregar a imagem do documento.'))
    }
    img.src = objectUrl
  })
}

// Busca a URL pública de um documento e devolve { canvas, largura, altura }
// pronto para `doc.addImage(canvas, 'JPEG', x, y, w, h)` — ou `null` se não
// foi possível buscar/converter.
export async function converterDocumentoParaImagem(url) {
  if (!url) return null
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const contentType = resp.headers.get('content-type') || ''

    const canvas = pareceUrlPdf(url, contentType)
      ? await primeiraPaginaPdfParaCanvas(await resp.arrayBuffer())
      : await blobDeImagemParaCanvas(await resp.blob())

    return { canvas, largura: canvas.width, altura: canvas.height }
  } catch {
    return null
  }
}
