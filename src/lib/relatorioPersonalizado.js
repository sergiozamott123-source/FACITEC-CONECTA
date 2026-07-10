// src/lib/relatorioPersonalizado.js
//
// Relatório Personalizado — uma linha por orientador, colunas escolhidas
// livremente pela Secretaria. Reaproveita o mesmo critério de "orientador
// ativo" já usado em outras telas do Módulo 2 (codigo_orientador atribuído +
// projeto selecionado) e a mesma identidade visual dos demais PDFs do
// sistema (relatorioFinanceiro.js / relatorioMensalPdf.js).

import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, ShadingType, PageOrientation } from 'docx'
import { supabase } from '@/lib/supabase'

// ── Colunas disponíveis, por categoria ──────────────────────────────────────

export const CATEGORIAS_COLUNAS = [
  {
    categoria: 'Orientador',
    campos: [
      { key: 'nome_completo', label: 'Nome completo', default: true },
      { key: 'email', label: 'E-mail', default: false },
      { key: 'telefone', label: 'Telefone', default: false },
      { key: 'codigo_orientador', label: 'Código do orientador', default: false },
    ],
  },
  {
    categoria: 'Projeto',
    campos: [
      { key: 'projeto_titulo', label: 'Título do projeto', default: true },
      { key: 'area_conhecimento', label: 'Eixo temático', default: false },
      { key: 'projeto_status', label: 'Status do projeto', default: false },
    ],
  },
  {
    categoria: 'Escola',
    campos: [
      { key: 'escola', label: 'Nome da escola', default: true },
    ],
  },
  {
    categoria: 'Bolsistas',
    campos: [
      { key: 'titulares_nomes', label: 'Nomes (titulares)', default: false },
      { key: 'voluntarios_nomes', label: 'Nomes (voluntários)', default: false },
      { key: 'total_bolsistas', label: 'Total de bolsistas', default: false },
      { key: 'status_contrato', label: 'Status do contrato', default: false },
    ],
  },
]

// ── Busca de dados ────────────────────────────────────────────────────────

export async function buscarDadosRelatorioPersonalizado() {
  // 1 — orientadores "de verdade" (selecionados na edição, não meros inscritos)
  const { data: orientData, error: e1 } = await supabase
    .from('orientador')
    .select('id, nome_completo, email, telefone, codigo_orientador, escola, contrato_url')
    .not('codigo_orientador', 'is', null)
    .order('nome_completo', { ascending: true })
  if (e1) throw e1
  if (!orientData?.length) return []

  const orientIds = orientData.map(o => o.id)

  // 2 — projeto selecionado de cada orientador
  const { data: projData, error: e2 } = await supabase
    .from('projeto')
    .select('id, titulo, area_conhecimento, status, orientador_id')
    .in('orientador_id', orientIds)
    .eq('status', 'selecionado')
  if (e2) throw e2

  const projetoPorOrientador = Object.fromEntries((projData ?? []).map(p => [p.orientador_id, p]))
  const orientadoresAtivos = orientData.filter(o => projetoPorOrientador[o.id])
  if (!orientadoresAtivos.length) return []

  const idsAtivos = orientadoresAtivos.map(o => o.id)

  // 3 — bolsistas ativos, agrupados por orientador_id
  const { data: bolsistaData, error: e3 } = await supabase
    .from('bolsista')
    .select('id, nome_completo, tipo, orientador_id')
    .in('orientador_id', idsAtivos)
    .eq('status', 'ativo')
  if (e3) throw e3

  const bolsistasPorOrientador = {}
  ;(bolsistaData ?? []).forEach(b => {
    if (!bolsistasPorOrientador[b.orientador_id]) bolsistasPorOrientador[b.orientador_id] = []
    bolsistasPorOrientador[b.orientador_id].push(b)
  })

  // 4 — monta uma linha por orientador
  return orientadoresAtivos.map(o => {
    const projeto = projetoPorOrientador[o.id]
    const bolsistas = bolsistasPorOrientador[o.id] ?? []
    const titulares = bolsistas.filter(b => b.tipo !== 'voluntario').map(b => b.nome_completo).filter(Boolean)
    const voluntarios = bolsistas.filter(b => b.tipo === 'voluntario').map(b => b.nome_completo).filter(Boolean)

    return {
      nome_completo: o.nome_completo || '',
      email: o.email || '',
      telefone: o.telefone || '',
      codigo_orientador: o.codigo_orientador || '',
      projeto_titulo: projeto?.titulo || '',
      area_conhecimento: projeto?.area_conhecimento || '',
      projeto_status: projeto?.status || '',
      escola: o.escola || '',
      titulares_nomes: titulares.join(', '),
      voluntarios_nomes: voluntarios.join(', '),
      total_bolsistas: bolsistas.length,
      status_contrato: o.contrato_url ? 'Emitido' : 'Pendente',
    }
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sufixoArquivo(ano) {
  return `${ano}_${new Date().toISOString().slice(0, 10)}`
}

// ── Exportação em Excel ──────────────────────────────────────────────────

export function exportarExcelPersonalizado(linhas, colunas, ano = '2026') {
  const dados = linhas.map(l => {
    const obj = {}
    colunas.forEach(c => { obj[c.label] = l[c.key] })
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(dados)
  ws['!cols'] = colunas.map(() => ({ wch: 28 }))
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Relatório ${ano}`)
  XLSX.writeFile(wb, `Relatorio_Personalizado_${sufixoArquivo(ano)}.xlsx`)
}

// ── Exportação em PDF ─────────────────────────────────────────────────────

export function exportarPDFPersonalizado(linhas, colunas, ano = '2026') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const mL = 12, mR = 12, mT = 34, mB = 16
  const pgW = 297, pgH = 210
  const usableW = pgW - mL - mR

  const AZUL = [26, 39, 68]
  const CINZA_CLARO = [244, 246, 249]
  const CINZA_TEXTO = [90, 96, 110]
  const CINZA_LINHA = [220, 224, 230]

  let pagina = 1
  const colWidth = usableW / colunas.length

  function cabecalho() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text('FUNDO DE APOIO À CIÊNCIA E TECNOLOGIA - FACITEC', pgW / 2, 10, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.text('Companhia de Desenvolvimento, Turismo e Inovação de Vitória - CDTIV', pgW / 2, 14, { align: 'center' })
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.6)
    doc.line(mL, 17, pgW - mR, 17)
    doc.setTextColor(0, 0, 0)
  }

  function rodape() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...CINZA_TEXTO)
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} · FACITEC CONECTA`,
      mL, pgH - 8,
    )
    doc.text(`Página ${pagina}`, pgW - mR, pgH - 8, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }

  function cabecalhoTabela(y) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    const labelsWrapped = colunas.map(c => doc.splitTextToSize(c.label, colWidth - 4))
    const maxLinhas = Math.max(...labelsWrapped.map(l => l.length), 1)
    const h = Math.max(8, maxLinhas * 4 + 3)

    doc.setFillColor(...AZUL)
    doc.rect(mL, y, usableW, h, 'F')
    doc.setTextColor(255, 255, 255)
    labelsWrapped.forEach((linhasTexto, i) => {
      doc.text(linhasTexto, mL + i * colWidth + 2, y + 5)
    })
    doc.setTextColor(0, 0, 0)
    return y + h
  }

  function novaPagina() {
    rodape()
    doc.addPage()
    pagina++
    cabecalho()
    return cabecalhoTabela(mT)
  }

  cabecalho()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...AZUL)
  doc.text('RELATÓRIO PERSONALIZADO', mL, mT - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(`Edição ${ano} · ${linhas.length} orientador(es)`, mL, mT - 6)
  doc.setTextColor(0, 0, 0)

  let y = cabecalhoTabela(mT)

  linhas.forEach((linha, idx) => {
    const cellsWrapped = colunas.map(c => doc.splitTextToSize(String(linha[c.key] ?? '—'), colWidth - 4))
    const maxLines = Math.max(...cellsWrapped.map(c => c.length), 1)
    const rowH = Math.max(7, maxLines * 4 + 3)

    if (y + rowH > pgH - mB) y = novaPagina()

    if (idx % 2 === 1) {
      doc.setFillColor(...CINZA_CLARO)
      doc.rect(mL, y, usableW, rowH, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    cellsWrapped.forEach((linhasTexto, i) => {
      doc.text(linhasTexto, mL + i * colWidth + 2, y + 4.5)
    })

    y += rowH
    doc.setDrawColor(...CINZA_LINHA)
    doc.line(mL, y, pgW - mR, y)
  })

  rodape()
  doc.save(`Relatorio_Personalizado_${sufixoArquivo(ano)}.pdf`)
}

// ── Exportação em Word ───────────────────────────────────────────────────

export async function exportarWordPersonalizado(linhas, colunas, ano = '2026') {
  const headerRow = new TableRow({
    tableHeader: true,
    children: colunas.map(c => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: '1A2744' },
      children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true, color: 'FFFFFF', size: 18 })] })],
    })),
  })

  const bodyRows = linhas.map((linha, idx) => new TableRow({
    children: colunas.map(c => new TableCell({
      shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'F4F6F9' } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: String(linha[c.key] ?? '—'), size: 18 })] })],
    })),
  }))

  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  })

  const documento = new Document({
    sections: [{
      properties: {
        page: { size: { orientation: PageOrientation.LANDSCAPE } },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'FUNDO DE APOIO À CIÊNCIA E TECNOLOGIA - FACITEC', bold: true, size: 18 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Companhia de Desenvolvimento, Turismo e Inovação de Vitória - CDTIV', size: 16 })],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [new TextRun({ text: 'Relatório Personalizado', bold: true, size: 28, color: '1A2744' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `Edição ${ano} · ${linhas.length} orientador(es)`, italics: true, size: 18, color: '5A606E' })],
        }),
        new Paragraph({ text: '' }),
        tabela,
      ],
    }],
  })

  const blob = await Packer.toBlob(documento)
  downloadBlob(blob, `Relatorio_Personalizado_${sufixoArquivo(ano)}.docx`)
}
