// src/lib/inscricaoPdf.js
//
// Exportação em PDF da ficha de inscrição (individual ou em lote), com o
// mesmo padrão de branding FACITEC/CDTIV já estabelecido em
// relatorioMensalPdf.js / relatorioPersonalizado.js.

import { jsPDF } from 'jspdf'

const AZUL = [26, 39, 68]
const CINZA_CLARO = [244, 246, 249]
const CINZA_TEXTO = [90, 96, 110]

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

// ── Contexto de página (cabeçalho, rodapé, quebra de página) ────────────────

function criarContextoDoc(doc) {
  const mL = 20, mR = 20, mT = 26, mB = 20
  const pgW = 210, pgH = 297
  const usableW = pgW - mL - mR
  let pagina = 1

  function cabecalho() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text('FUNDO DE APOIO À CIÊNCIA E TECNOLOGIA - FACITEC', pgW / 2, 12, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text('Companhia de Desenvolvimento, Turismo e Inovação de Vitória - CDTIV', pgW / 2, 16.5, { align: 'center' })
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

  function novaPagina() {
    rodape()
    doc.addPage()
    pagina++
    cabecalho()
    return mT
  }

  function checkPage(y, needed) {
    return (y + needed > pgH - mB) ? novaPagina() : y
  }

  cabecalho()

  return { mL, mR, mT, mB, pgW, pgH, usableW, checkPage, novaPagina, rodapeFinal: rodape }
}

// ── Desenho de uma ficha de inscrição, a partir do topo da página atual ─────

function desenharFichaInscricao(doc, ctx, detalhe) {
  const { mL, usableW, pgW } = ctx
  let y = ctx.mT

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...AZUL)
  doc.text('FICHA DE INSCRIÇÃO', pgW / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(
    `Código: ${detalhe?.codigo_inscricao ?? '—'}   ·   Enviado em ${formatarDataHora(dataEnvioDe(detalhe))}`,
    pgW / 2, y, { align: 'center' },
  )
  doc.setTextColor(0, 0, 0)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const linhasTitulo = doc.splitTextToSize(detalhe?.titulo || '—', usableW - 8)
  const lhTitulo = 4.8
  const alturaBox = 8 + linhasTitulo.length * lhTitulo
  y = ctx.checkPage(y, alturaBox + 4)

  doc.setFillColor(...CINZA_CLARO)
  doc.roundedRect(mL, y, usableW, alturaBox, 2, 2, 'F')
  doc.setTextColor(...AZUL)
  let tituloY = y + 6.5
  linhasTitulo.forEach(linha => {
    doc.text(linha, mL + 4, tituloY)
    tituloY += lhTitulo
  })
  doc.setTextColor(0, 0, 0)
  y += alturaBox + 8

  function secaoTitulo(texto) {
    y = ctx.checkPage(y, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...AZUL)
    doc.text(texto.toUpperCase(), mL, y)
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.3)
    doc.line(mL, y + 1.5, mL + 30, y + 1.5)
    doc.setTextColor(0, 0, 0)
    y += 7
  }

  function linha(label, valor) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    const labelTexto = `${label}: `
    const labelW = doc.getTextWidth(labelTexto)
    doc.setFont('helvetica', 'normal')
    const linhasValor = doc.splitTextToSize(valor || '—', usableW - labelW)

    y = ctx.checkPage(y, 4.6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(labelTexto, mL, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(linhasValor[0] ?? '—', mL + labelW, y)
    y += 4.6
    for (let i = 1; i < linhasValor.length; i++) {
      y = ctx.checkPage(y, 4.6)
      doc.text(linhasValor[i], mL + labelW, y)
      y += 4.6
    }
    doc.setTextColor(0, 0, 0)
  }

  secaoTitulo('Proponente')
  linha('Nome', detalhe?.orientador?.nome_completo)
  linha('E-mail', detalhe?.orientador?.email)
  linha('Telefone', detalhe?.orientador?.telefone)
  linha('CPF', detalhe?.orientador?.cpf)
  linha('Endereço', [detalhe?.orientador?.rua, detalhe?.orientador?.bairro, detalhe?.orientador?.cidade].filter(Boolean).join(', '))
  y += 3

  secaoTitulo('Escola')
  linha('Escola', detalhe?.orientador?.escola)
  linha('Telefone', detalhe?.orientador?.telefone_escola)
  linha('E-mail', detalhe?.orientador?.email_escola)
  linha('Formação', detalhe?.orientador?.instituicao)
  linha('Diploma', detalhe?.orientador?.doc_diploma_url ? 'Anexado (ver sistema)' : 'Não enviado')
  y += 3

  secaoTitulo('Projeto')
  linha('Eixos temáticos', eixosNomesDe(detalhe).join(', '))
  linha('Inédito', detalhe?.inedito ? 'Sim' : 'Não')
  if (!detalhe?.inedito) {
    linha('Edições anteriores', detalhe?.edicoes_anteriores)
    linha('Novidades', detalhe?.palavras_chave_livre)
  }
  linha('PDF do projeto', detalhe?.arquivo_pdf_url ? 'Anexado (ver sistema)' : 'Não enviado')
  y += 3

  const respostas = respostasOrdenadasDe(detalhe)
  if (respostas.length) {
    secaoTitulo('Perguntas dissertativas')
    respostas.forEach(r => {
      y = ctx.checkPage(y, 10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(0, 0, 0)
      const perguntaLinhas = doc.splitTextToSize(r.campo?.pergunta || '—', usableW)
      perguntaLinhas.forEach(l => {
        y = ctx.checkPage(y, 4.6)
        doc.text(l, mL, y)
        y += 4.6
      })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...CINZA_TEXTO)
      const respostaLinhas = doc.splitTextToSize(r.resposta || '—', usableW)
      respostaLinhas.forEach(l => {
        y = ctx.checkPage(y, 4.6)
        doc.text(l, mL, y)
        y += 4.6
      })
      doc.setTextColor(0, 0, 0)
      y += 3
    })
  }
}

// ── API pública ───────────────────────────────────────────────────────────

export function gerarPDFInscricao(detalhe) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ctx = criarContextoDoc(doc)
  desenharFichaInscricao(doc, ctx, detalhe)
  ctx.rodapeFinal()
  doc.save(`inscricao-${detalhe?.codigo_inscricao || detalhe?.id || 'sem-codigo'}.pdf`)
}

export function gerarPDFInscritosLote(lista, ano) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ctx = criarContextoDoc(doc)
  lista.forEach((detalhe, idx) => {
    if (idx > 0) ctx.novaPagina()
    desenharFichaInscricao(doc, ctx, detalhe)
  })
  ctx.rodapeFinal()
  doc.save(`inscritos-edicao-${ano}.pdf`)
}
