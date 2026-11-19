// src/lib/relatorioFinanceiro.js
//
// Relatório de dados cadastrais dos bolsistas, para encaminhamento à
// Gerência Financeira (abertura de contas / cadastramento em sistemas).
//
// Duas saídas:
//  - Excel (.xlsx): dados "crus", uma linha por bolsista, prontos para
//    importação em outros sistemas.
//  - PDF: relatório formal no modelo único A4 da Identidade Visual DINOV,
//    organizado por orientador, para arquivamento/apresentação pela
//    Secretaria Executiva.

import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import {
  criarDocumento, titulo, ficha, faixaTitulo, camposEmColunas, garantirEspaco,
  finalizar, fonte, DV, rgb, MARGEM, AREA,
} from '@/lib/documentoDinov'
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
    return montarLinhaFicha(b, orientador, projeto, contrato)
  })

  return linhas
}

// Monta uma "linha" (um bolsista, com todos os dados já achatados/formatados
// para exibição) a partir do registro cru do bolsista + os dados já
// resolvidos de orientador/projeto/contrato. Extraído para ser reaproveitado
// tanto pela busca em lote (buscarDadosRelatorioFinanceiro, acima) quanto
// pela busca de um único bolsista (buscarFichaCadastralDeBolsista, abaixo) —
// usada quando se quer gerar a Ficha Cadastral de só uma pessoa, sem passar
// pelo grupo inteiro do orientador (Fase 25).
function montarLinhaFicha(b, orientador, projeto, contrato) {
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
    // Documentos "crus" (URLs do Storage) — não entram no Excel nem no
    // relatório em tabela, só são usados pela Ficha Cadastral em PDF
    // (fichaCadastralPdf.js) para desenhar os "quadradinhos" com a imagem
    // do documento de identidade do bolsista e, quando menor, do
    // responsável (Fase 25). Cada campo pode ser o documento único do
    // fluxo atual ("identidade" combinando RG/CI + CPF numa imagem só) ou,
    // em cadastros mais antigos, RG e CPF em arquivos separados.
    doc_identidade_aluno: b.doc_identidade_aluno || null,
    doc_rg_url: b.doc_rg_url || null,
    doc_cpf_url: b.doc_cpf_url || null,
    doc_identidade_responsavel: b.doc_identidade_responsavel || null,
    responsavel_doc_rg_url: b.responsavel_doc_rg_url || null,
    responsavel_doc_cpf_url: b.responsavel_doc_cpf_url || null,
  }
}

// Busca os dados de UM bolsista específico, já no mesmo formato de "linha"
// usado pela Ficha Cadastral — usada pelo botão "Gerar ficha cadastral" no
// card de cada bolsista substituto (SubstituicoesPainel.jsx), para gerar só
// a ficha dele em vez do grupo inteiro do orientador. Recebe o registro do
// bolsista já carregado pela tela (select('*') — evita buscar de novo) e só
// completa o que falta (orientador/projeto/contrato).
export async function buscarFichaCadastralDeBolsista(bolsista) {
  const { data: projeto, error: eProj } = await supabase
    .from('projeto')
    .select('id, titulo, orientador_id')
    .eq('id', bolsista.projeto_id)
    .maybeSingle()
  if (eProj) throw eProj

  const [{ data: orientador, error: eOri }, { data: contrato, error: eCon }] = await Promise.all([
    projeto?.orientador_id
      ? supabase.from('orientador').select('id, nome_completo, codigo_orientador').eq('id', projeto.orientador_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    projeto?.id
      ? supabase.from('contrato').select('numero_contrato').eq('projeto_id', projeto.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (eOri) throw eOri
  if (eCon) throw eCon

  return montarLinhaFicha(bolsista, orientador, projeto, contrato)
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

export function exportarPDFFinanceiro(linhas, ano = '2026', nomePrograma = 'PIBIC Jr') {
  const doc = criarDocumento({ tituloPdf: `Relatório de dados cadastrais dos bolsistas — ${nomePrograma} ${ano}` })
  const COMPACTO = { compacto: true }

  // ── Abertura: título e resumo ─────────────────────────────────────────
  let y = titulo(doc, {
    chapeu: `Programa ${nomePrograma} · Edição ${ano}`,
    texto: 'Relatório de dados cadastrais dos bolsistas',
  })

  const totalBolsistas = linhas.length
  const orientadoresUnicos = new Set(linhas.map(l => l.codigo_orientador)).size
  y = ficha(doc, [
    ['Bolsistas', totalBolsistas],
    ['Orientadores', orientadoresUnicos],
    ['Finalidade', 'Cadastramento junto à Gerência Financeira'],
  ], y)

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

    y = faixaTitulo(doc, {
      titulo: `${orientador}  ·  ${codigo}`,
      subtitulo: `${projeto}${numero_contrato ? `  ·  Contrato nº ${numero_contrato}` : ''}`,
    }, y)

    grupo.forEach((b) => {
      const temBancarios = !!(b.banco_responsavel || b.agencia_responsavel || b.conta_responsavel)
      const alturaEstimativa = 18 + 2 * 10.5 + 10.5 + 10.5 + (b.menor_idade === 'Sim' ? 21 : 0) + (temBancarios ? 10.5 : 0)
      y = garantirEspaco(doc, y, alturaEstimativa)

      fonte(doc, 'titulo', 10, DV.base.marinho)
      doc.text(`${b.nome_completo}`, MARGEM.esquerda, y)
      fonte(doc, 'texto', 8.5, DV.base.textoSecundario)
      doc.text(
        `${b.codigo_bolsista}  ·  ${b.tipo}${b.menor_idade === 'Sim' ? '  ·  Menor de idade' : ''}`,
        MARGEM.esquerda + AREA.largura, y, { align: 'right' },
      )
      y += 5

      y = camposEmColunas(doc, [['CPF', b.cpf], ['RG', b.rg]], y, COMPACTO)
      y = camposEmColunas(doc, [['Data de nascimento', b.data_nascimento], ['Escola', b.escola]], y, COMPACTO)
      y = camposEmColunas(doc, [['Endereço', b.endereco]], y, COMPACTO)
      y = camposEmColunas(doc, [['Telefone', b.telefone], ['E-mail', b.email]], y, COMPACTO)

      if (b.menor_idade === 'Sim') {
        y = camposEmColunas(doc, [
          ['Responsável', `${b.nome_responsavel || '—'} (${b.vinculo_responsavel || '—'})`],
          ['CPF do responsável', b.cpf_responsavel],
        ], y, COMPACTO)
        y = camposEmColunas(doc, [
          ['Telefone do responsável', b.telefone_responsavel],
          ['E-mail do responsável', b.email_responsavel],
        ], y, COMPACTO)
      }

      if (temBancarios) {
        y = camposEmColunas(doc, [[
          'Dados bancários',
          `${b.banco_responsavel || '—'}  ·  Ag. ${b.agencia_responsavel || '—'}  ·  Conta ${b.conta_responsavel || '—'}`,
        ]], y, COMPACTO)
      }

      doc.setDrawColor(...rgb(DV.base.divisoria))
      doc.setLineWidth(0.2)
      doc.line(MARGEM.esquerda, y, MARGEM.esquerda + AREA.largura, y)
      y += 6
    })

    y += 2
  })

  finalizar(doc)
  doc.save(`Relatorio_Financeiro_${sufixoArquivo(linhas, ano)}.pdf`)
}
