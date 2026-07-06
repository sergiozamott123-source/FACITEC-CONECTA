// src/lib/relatorioFinanceiro.js
//
// Relatório de dados cadastrais dos bolsistas, para encaminhamento à
// Gerência Financeira (abertura de contas / cadastramento em sistemas).
//
// Duas saídas:
//  - Excel (.xlsx): dados "crus", uma linha por bolsista, prontos para
//    importação em outros sistemas.
//  - PDF: relatório formal, timbrado FACITEC/CDTIV, organizado por
//    orientador, para arquivamento/apresentação pela Secretaria Executiva.

import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

// ── Formatação ──────────────────────────────────────────────────────────────

function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

function calcIdade(dataNasc) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let age = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) age--
  return age
}

function enderecoCompleto(b) {
  const partes = [
    b.endereco_rua,
    b.endereco_numero,
    b.endereco_complemento,
    b.endereco_bairro,
    b.endereco_cidade,
    b.endereco_cep ? `CEP ${b.endereco_cep}` : null,
  ].filter(Boolean)
  return partes.join(', ')
}

// ── Busca de dados ────────────────────────────────────────────────────────

export async function buscarDadosRelatorioFinanceiro(ano = '2026', orientadorIds = null) {
  // 1 — orientadores com código atribuído (opcionalmente filtrados)
  let query = supabase
    .from('orientador')
    .select('id, nome_completo, codigo_orientador')
    .not('codigo_orientador', 'is', null)
    .order('codigo_orientador', { ascending: true })
  if (orientadorIds && orientadorIds.length > 0) {
    query = query.in('id', orientadorIds)
  }
  const { data: orientData, error: e1 } = await query
  if (e1) throw e1
  if (!orientData?.length) return []

  const orientIds = orientData.map(o => o.id)
  const orientMap = Object.fromEntries(orientData.map(o => [o.id, o]))

  // 2 — projetos selecionados
  const { data: projData, error: e2 } = await supabase
    .from('projeto')
    .select('id, titulo, orientador_id')
    .in('orientador_id', orientIds)
    .eq('status', 'selecionado')
  if (e2) throw e2

  const projetoIds = (projData ?? []).map(p => p.id)
  const projetoMap = Object.fromEntries((projData ?? []).map(p => [p.id, p]))
  if (!projetoIds.length) return []

  // 3 — contratos desses projetos
  const { data: contratoData, error: e3 } = await supabase
    .from('contrato')
    .select('projeto_id, numero_contrato')
    .in('projeto_id', projetoIds)
  if (e3) throw e3
  const contratoMap = Object.fromEntries((contratoData ?? []).map(c => [c.projeto_id, c]))

  // 4 — bolsistas ativos, dados completos
  const { data: bolsistaData, error: e4 } = await supabase
    .from('bolsista')
    .select('*')
    .in('projeto_id', projetoIds)
    .eq('status', 'ativo')
    .order('codigo_bolsista', { ascending: true })
  if (e4) throw e4

  // 5 — monta as linhas do relatório
  const linhas = (bolsistaData ?? []).map(b => {
    const projeto = projetoMap[b.projeto_id]
    const orientador = projeto ? orientMap[projeto.orientador_id] : null
    const contrato = contratoMap[b.projeto_id]
    const menor = calcIdade(b.data_nascimento) !== null && calcIdade(b.data_nascimento) < 18
    return {
      codigo_bolsista: b.codigo_bolsista || '',
      nome_completo: b.nome_completo || '',
      tipo: b.tipo || '',
      cpf: b.cpf || '',
      rg: b.rg || '',
      data_nascimento: formatarData(b.data_nascimento),
      menor_idade: menor ? 'Sim' : 'Não',
      escola: b.escola || '',
      endereco: enderecoCompleto(b),
      telefone: b.telefone || '',
      email: b.email || '',
      nome_responsavel: b.nome_responsavel || '',
      cpf_responsavel: b.cpf_responsavel || '',
      rg_responsavel: b.rg_responsavel || '',
      vinculo_responsavel: b.vinculo_responsavel || '',
      telefone_responsavel: b.telefone_responsavel || '',
      email_responsavel: b.email_responsavel || '',
      banco_responsavel: b.banco_responsavel || '',
      agencia_responsavel: b.agencia_responsavel || '',
      conta_responsavel: b.conta_responsavel || '',
      orientador: orientador?.nome_completo || '',
      codigo_orientador: orientador?.codigo_orientador || '',
      projeto: projeto?.titulo || '',
      numero_contrato: contrato?.numero_contrato || '',
    }
  })

  return linhas
}

// ── Exportação em Excel ──────────────────────────────────────────────────

const COLUNAS_EXCEL = [
  ['codigo_bolsista',        'Código Bolsista'],
  ['nome_completo',          'Nome Completo'],
  ['tipo',                   'Tipo'],
  ['cpf',                    'CPF'],
  ['rg',                     'RG'],
  ['data_nascimento',        'Data de Nascimento'],
  ['menor_idade',            'Menor de Idade'],
  ['escola',                 'Escola'],
  ['endereco',               'Endereço Completo'],
  ['telefone',               'Telefone'],
  ['email',                  'E-mail'],
  ['nome_responsavel',       'Nome do Responsável'],
  ['cpf_responsavel',        'CPF do Responsável'],
  ['rg_responsavel',         'RG do Responsável'],
  ['vinculo_responsavel',    'Vínculo do Responsável'],
  ['telefone_responsavel',   'Telefone do Responsável'],
  ['email_responsavel',      'E-mail do Responsável'],
  ['banco_responsavel',      'Banco'],
  ['agencia_responsavel',    'Agência'],
  ['conta_responsavel',      'Conta'],
  ['orientador',             'Orientador(a)'],
  ['codigo_orientador',      'Código do Orientador'],
  ['projeto',                'Projeto'],
  ['numero_contrato',        'Nº do Contrato'],
]

function sufixoArquivo(linhas, ano) {
  const codigos = [...new Set(linhas.map(l => l.codigo_orientador).filter(Boolean))]
  if (codigos.length === 1) return `${codigos[0]}_${ano}`
  return `${ano}`
}

export function exportarExcelFinanceiro(linhas, ano = '2026') {
  const dados = linhas.map(l => {
    const obj = {}
    COLUNAS_EXCEL.forEach(([campo, titulo]) => { obj[titulo] = l[campo] })
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(dados)
  ws['!cols'] = COLUNAS_EXCEL.map(([campo]) =>
    ({ wch: campo === 'endereco' || campo === 'nome_completo' || campo === 'projeto' ? 38 : 18 })
  )
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Bolsistas ${ano}`)
  XLSX.writeFile(wb, `Relatorio_Financeiro_${sufixoArquivo(linhas, ano)}.xlsx`)
}

// ── Exportação em PDF ─────────────────────────────────────────────────────

export function exportarPDFFinanceiro(linhas, ano = '2026') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 20, mR = 20, mT = 26, mB = 20
  const pgW = 210, pgH = 297
  const usableW = pgW - mL - mR

  const AZUL = [26, 39, 68]       // #1a2744 — mesma cor do header do sistema
  const CINZA_CLARO = [244, 246, 249]
  const CINZA_TEXTO = [90, 96, 110]
  const VERDE = [22, 130, 90]

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
    if (y + needed > pgH - mB) return novaPagina()
    return y
  }

  // ── Capa ──────────────────────────────────────────────────────────────
  cabecalho()
  let y = 70
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...AZUL)
  doc.text('RELATÓRIO DE DADOS CADASTRAIS', pgW / 2, y, { align: 'center' })
  y += 9
  doc.text('DOS BOLSISTAS', pgW / 2, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text(`Programa Institucional de Iniciação Científica Júnior — PibicJr`, pgW / 2, y, { align: 'center' })
  y += 7
  doc.text(`Edição ${ano}`, pgW / 2, y, { align: 'center' })
  y += 20

  const totalBolsistas = linhas.length
  const orientadoresUnicos = new Set(linhas.map(l => l.codigo_orientador)).size

  doc.setDrawColor(...CINZA_CLARO)
  doc.setFillColor(...CINZA_CLARO)
  doc.roundedRect(mL + 15, y, usableW - 30, 30, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...AZUL)
  doc.text(`${totalBolsistas} bolsista(s)`, pgW / 2 - 30, y + 13, { align: 'center' })
  doc.text(`${orientadoresUnicos} orientador(es)`, pgW / 2 + 30, y + 13, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CINZA_TEXTO)
  doc.text('Finalidade: cadastramento junto à Gerência Financeira', pgW / 2, y + 23, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  y = novaPagina()

  // ── Corpo — agrupado por orientador ──────────────────────────────────
  const porOrientador = {}
  linhas.forEach(l => {
    const chave = l.codigo_orientador || '—'
    if (!porOrientador[chave]) porOrientador[chave] = []
    porOrientador[chave].push(l)
  })

  const codigosOrdenados = Object.keys(porOrientador).sort()

  codigosOrdenados.forEach(codigo => {
    const grupo = porOrientador[codigo]
    const { orientador, projeto, numero_contrato } = grupo[0]

    y = checkPage(y, 22)
    doc.setFillColor(...AZUL)
    doc.rect(mL, y, usableW, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(255, 255, 255)
    doc.text(`${orientador}  ·  ${codigo}`, mL + 4, y + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const projetoLinha = `${projeto}${numero_contrato ? `  ·  Contrato nº ${numero_contrato}` : ''}`
    doc.text(doc.splitTextToSize(projetoLinha, usableW - 8)[0], mL + 4, y + 12.5)
    doc.setTextColor(0, 0, 0)
    y += 16 + 5

    grupo.forEach((b, idx) => {
      const temBancarios = !!(b.banco_responsavel || b.agencia_responsavel || b.conta_responsavel)
      const linhasCampos = 4 + (b.menor_idade === 'Sim' ? 2 : 0) + (temBancarios ? 1 : 0)
      const lh = 4.6
      const passoLinha = lh + 3.5
      const alturaEstimativa = 6 + 3 + linhasCampos * passoLinha + 5 // nome + espaço + linhas + respiro final

      y = checkPage(y, alturaEstimativa + 4)

      doc.setFillColor(...CINZA_CLARO)
      doc.roundedRect(mL, y, usableW, alturaEstimativa, 2, 2, 'F')

      const px = mL + 4
      let py = y + 6

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...AZUL)
      doc.text(`${b.nome_completo}`, px, py)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...CINZA_TEXTO)
      doc.text(`${b.codigo_bolsista}  ·  ${b.tipo}${b.menor_idade === 'Sim' ? '  ·  Menor de idade' : ''}`, pgW - mR - 4, py, { align: 'right' })
      py += 6

      const colEsqX = px
      const colDirX = mL + usableW / 2 + 4

      function campo(x, yy, label, valor) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...CINZA_TEXTO)
        doc.text(label, x, yy)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(0, 0, 0)
        doc.text(valor || '—', x, yy + 3.6)
      }

      campo(colEsqX, py, 'CPF', b.cpf)
      campo(colDirX, py, 'RG', b.rg)
      py += passoLinha

      campo(colEsqX, py, 'DATA DE NASCIMENTO', b.data_nascimento)
      campo(colDirX, py, 'ESCOLA', b.escola)
      py += passoLinha

      campo(colEsqX, py, 'ENDEREÇO', b.endereco)
      py += passoLinha

      campo(colEsqX, py, 'TELEFONE', b.telefone)
      campo(colDirX, py, 'E-MAIL', b.email)
      py += passoLinha

      if (b.menor_idade === 'Sim') {
        campo(colEsqX, py, 'RESPONSÁVEL', `${b.nome_responsavel || '—'} (${b.vinculo_responsavel || '—'})`)
        campo(colDirX, py, 'CPF DO RESPONSÁVEL', b.cpf_responsavel)
        py += passoLinha
        campo(colEsqX, py, 'TELEFONE DO RESPONSÁVEL', b.telefone_responsavel)
        campo(colDirX, py, 'E-MAIL DO RESPONSÁVEL', b.email_responsavel)
        py += passoLinha
      }

      if (temBancarios) {
        campo(colEsqX, py, 'DADOS BANCÁRIOS', `${b.banco_responsavel || '—'}  ·  Ag. ${b.agencia_responsavel || '—'}  ·  Conta ${b.conta_responsavel || '—'}`)
        py += passoLinha
      }

      doc.setTextColor(0, 0, 0)
      y += alturaEstimativa + 4
    })

    y += 4
  })

  rodape()
  doc.save(`Relatorio_Financeiro_${sufixoArquivo(linhas, ano)}.pdf`)
}
