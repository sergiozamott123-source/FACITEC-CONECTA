// src/lib/documentoHtmlDinov.js
//
// Equivalente em HTML do modelo único A4 da Identidade Visual DINOV, para as
// páginas que abrem numa nova janela e usam "Imprimir / Salvar em PDF"
// (window.print). Mesmo desenho do PDF gerado em jsPDF (documentoDinov.js):
// faixas coloridas no topo e no pé, logo do sistema e setor no cabeçalho,
// logos da CDTIV e da Prefeitura no rodapé, "Página x de y", Poppins nos
// títulos e Inter no texto. Cores e logos vêm do kit (src/lib/identidade/).

import { DV } from '@/lib/identidade/identidadeDinovTokens.js'
import { LOGOS } from '@/lib/identidade/logosDinov.js'
import { SETOR_SECRETARIA } from '@/lib/documentoDinov'

export function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Monta o HTML completo de uma página de impressão no modelo DINOV.
 *
 * @param {object} o
 * @param {string} o.tituloJanela  título da aba/arquivo (vira o nome do PDF salvo)
 * @param {string} [o.chapeu]      linha pequena em caixa-alta acima do título
 * @param {string} [o.titulo]      título principal (Poppins)
 * @param {string} o.corpo         HTML do conteúdo (já com valores escapados)
 * @param {string} [o.css]         CSS extra específico do documento
 * @param {string} [o.codigo]      código exibido no rodapé
 * @param {string[]} [o.setor]     linhas do setor no cabeçalho
 */
export function htmlDocumentoDinov({
  tituloJanela, chapeu, titulo, corpo, css = '', codigo, setor = SETOR_SECRETARIA,
}) {
  const s = DV.sistemas['facitec-conecta']
  const b = DV.base
  const logoSistema = LOGOS[s.logo]
  const logoCdtiv = LOGOS['cdtiv-logo']
  const logoPref = LOGOS['prefeitura-vitoria-horizontal']
  const faixa = (cores) => cores.map((c) => `<i style="background:${c}"></i>`).join('')
  const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ' às')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escaparHtml(tituloJanela)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 0 0 11mm 0;
    @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 600 7.5pt Inter, sans-serif; color: ${b.texto}; padding-right: 22mm; vertical-align: middle; }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Inter, 'Segoe UI', sans-serif; font-size: 11pt; line-height: 1.5; color: ${b.texto}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.pagina { width: 100%; border-collapse: collapse; }
  table.pagina > thead, table.pagina > tfoot { display: table-header-group; }
  table.pagina > tfoot { display: table-footer-group; }
  table.pagina > thead > tr > td, table.pagina > tfoot > tr > td, table.pagina > tbody > tr > td { padding: 0; border: 0; background: none; }
  .faixa { display: flex; height: 3mm; }
  .faixa i { flex: 1; display: block; }
  .cabecalho { display: flex; justify-content: space-between; align-items: center; margin: 0 22mm 8mm; padding: 4mm 0 3mm; border-bottom: 0.3mm solid ${b.divisoria}; }
  .cabecalho img { height: 12mm; }
  .cabecalho .setor { text-align: right; font-size: 7.5pt; line-height: 1.35; color: ${b.textoSecundario}; }
  .cabecalho .setor b { display: block; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${b.marinho}; }
  .rodape { display: flex; align-items: center; gap: 4mm; margin: 6mm 22mm 3mm; border-top: 0.3mm solid ${b.divisoria}; padding-top: 3mm; font-size: 7pt; color: ${b.textoSecundario}; }
  .rodape img { height: 9mm; }
  .rodape .texto { margin-left: auto; text-align: right; }
  main { margin: 0 22mm; }
  .chapeu { font-size: 8.5pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: ${s.primariaTexto}; margin: 0 0 3mm; }
  h1.titulo { font-family: Poppins, Inter, sans-serif; font-weight: 700; font-size: 16pt; line-height: 1.2; color: ${b.marinho}; margin: 0 0 4mm; text-transform: none; text-align: left; }
  .filete { display: flex; width: 30mm; height: 1.2mm; margin-bottom: 7mm; }
  .filete i { flex: 1; }
  h2 { font-family: Inter, sans-serif; font-size: 9pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${b.marinho}; margin: 7mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 0.3mm solid ${b.marinho}; display: inline-block; }
  p { margin: 0 0 3.5mm; text-align: justify; }
  strong { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 3mm; font-size: 9pt; }
  th { background: ${b.marinho}; color: #fff; text-align: left; padding: 2mm 2.5mm; font-weight: 600; }
  td { padding: 2mm 2.5mm; border-bottom: 0.2mm solid ${b.divisoria}; vertical-align: top; }
  tr:nth-child(even) td { background: ${b.fundo}; }
  .assinatura { margin-top: 14mm; text-align: center; break-inside: avoid; }
  .assinatura .data { margin-bottom: 16mm; text-align: left; }
  .assinatura .linha { border-top: 0.4mm solid ${b.marinho}; width: 80mm; margin: 0 auto 1.5mm; }
  .assinatura p { margin: 0.5mm 0; text-align: center; }
  .assinatura .nome { font-family: Poppins, Inter, sans-serif; font-weight: 600; font-size: 10.5pt; color: ${b.marinho}; }
  .assinatura .cargo { font-size: 9pt; color: ${b.textoSecundario}; }
  .meta { font-size: 9pt; color: ${b.textoSecundario}; }
${css}
</style>
</head>
<body>
<table class="pagina">
  <thead><tr><td>
    <div class="faixa">${faixa(s.faixa)}</div>
    <div class="cabecalho">
      <img src="${logoSistema.dataUrl}" alt="${escaparHtml(s.nome)}">
      <div class="setor"><b>${escaparHtml(setor[0] ?? '')}</b>${setor.slice(1).map((l) => escaparHtml(l)).join('<br>')}</div>
    </div>
  </td></tr></thead>
  <tfoot><tr><td>
    <div class="rodape">
      <img src="${logoCdtiv.dataUrl}" alt="CDTIV">
      <img src="${logoPref.dataUrl}" alt="Prefeitura de Vitória">
      <div class="texto">Gerado pelo ${escaparHtml(s.nome)} em ${escaparHtml(geradoEm)}${codigo ? ` · Código ${escaparHtml(codigo)}` : ''}</div>
    </div>
    <div class="faixa">${faixa([...s.faixa, b.marinho])}</div>
  </td></tr></tfoot>
  <tbody><tr><td>
    <main>
      ${chapeu ? `<p class="chapeu">${escaparHtml(chapeu)}</p>` : ''}
      ${titulo ? `<h1 class="titulo">${escaparHtml(titulo)}</h1><div class="filete">${faixa(s.faixa)}</div>` : ''}
      ${corpo}
    </main>
  </td></tr></tbody>
</table>
</body>
</html>`
}
