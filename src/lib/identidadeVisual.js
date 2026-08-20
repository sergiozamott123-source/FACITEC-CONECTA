// src/lib/identidadeVisual.js
//
// Logos oficiais (CDTIV + FACITEC) usadas no cabeçalho de todo documento
// PDF/Word gerado pelo sistema. Reaproveita os mesmos arquivos de imagem já
// usados no Hub de Programas/Portal Admin (src/assets), com o `?inline` do
// Vite forçando a inclusão como base64 direto no bundle — assim o jsPDF e o
// docx recebem os bytes prontos, sem precisar buscar a imagem por rede na
// hora de gerar o documento.
//
// Para trocar a arte no futuro, basta substituir o arquivo em src/assets
// (mesmo nome) — nada aqui precisa mudar.
//
// Excel (.xlsx) fica de fora — a biblioteca `xlsx` usada no projeto (SheetJS
// Community Edition) não tem suporte a imagens embutidas em planilha; isso é
// uma limitação da própria lib, não algo que dá para contornar aqui.

import LOGO_CDTIV_BASE64 from '@/assets/logo-cdtiv-transparente.png?inline'
import LOGO_FACITEC_BASE64 from '@/assets/facitec_logo_cropped.png?inline'

export { LOGO_CDTIV_BASE64, LOGO_FACITEC_BASE64 }

// Proporção largura/altura de cada arte original — usada para calcular a
// largura ao desenhar com uma altura fixa, sem distorcer nenhuma das duas.
export const LOGO_CDTIV_ASPECTO = 645 / 198
export const LOGO_FACITEC_ASPECTO = 1235 / 328

// ── jsPDF — desenha as duas logos centralizadas, lado a lado ────────────────
// `centroY` é o centro vertical (mm) onde as logos devem ficar; `altura` é a
// altura de cada logo (mm) — a largura de cada uma é calculada a partir da
// proporção original, então nenhuma das duas fica esticada/deformada.
export function desenharCabecalhoLogos(doc, { pgW, centroY, altura = 10, espaco = 6 }) {
  const larguraCdtiv = altura * LOGO_CDTIV_ASPECTO
  const larguraFacitec = altura * LOGO_FACITEC_ASPECTO
  const larguraTotal = larguraCdtiv + espaco + larguraFacitec
  const xInicio = pgW / 2 - larguraTotal / 2
  const yTopo = centroY - altura / 2

  doc.addImage(LOGO_CDTIV_BASE64, 'PNG', xInicio, yTopo, larguraCdtiv, altura)
  doc.addImage(LOGO_FACITEC_BASE64, 'PNG', xInicio + larguraCdtiv + espaco, yTopo, larguraFacitec, altura)
}

// ── docx (Word) — bytes crus (sem o prefixo data:...;base64,), como o
// ImageRun do pacote `docx` exige ─────────────────────────────────────────
function base64ParaBytes(dataUri) {
  const base64 = dataUri.split(',')[1]
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

export const LOGO_CDTIV_BYTES = base64ParaBytes(LOGO_CDTIV_BASE64)
export const LOGO_FACITEC_BYTES = base64ParaBytes(LOGO_FACITEC_BASE64)
