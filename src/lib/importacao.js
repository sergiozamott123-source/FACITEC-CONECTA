import { supabase } from './supabase'

// ─── Helpers ────────────────────────────────────────────────────────────────

export function normalizeKey(key) {
  return String(key ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-/\\]+/g, '_')
    .replace(/[^\w]/g, '')
}

export function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [normalizeKey(k), v])
  )
}

function str(v) { return String(v ?? '').trim() || null }
function num(v) { const n = Number(v); return isNaN(n) ? null : n }

function getAnoEdicao(edicao) {
  if (edicao?.ano_referencia) return Number(edicao.ano_referencia)
  if (edicao?.data_inicio) {
    const d = new Date(edicao.data_inicio)
    if (!isNaN(d)) return d.getFullYear()
  }
  return new Date().getFullYear()
}

function seqCode(n) { return String(n).padStart(4, '0') }

async function logImportacao(tipo, edicaoId, arquivoNome) {
  await supabase.from('importacao_log').insert({
    tipo,
    edicao_id: edicaoId ?? null,
    arquivo_nome: arquivoNome ?? null,
  }).select()
}

// ─── Orientador: find or upsert by CPF ──────────────────────────────────────

async function upsertOrientador(fields) {
  const cpf = str(fields.cpf)
  const payload = {
    nome_completo: str(fields.nome_completo),
    email: str(fields.email),
    cpf,
    telefone: str(fields.telefone),
    escola: str(fields.escola),
    banco: str(fields.banco),
    agencia: str(fields.agencia),
    conta: str(fields.conta),
    instituicao: str(fields.instituicao),
  }
  // strip nulls to avoid overwriting existing data with nothing
  Object.keys(payload).forEach(k => payload[k] === null && delete payload[k])

  if (cpf) {
    const { data: existing } = await supabase
      .from('orientador').select('id').eq('cpf', cpf).limit(1)
    if (existing?.length > 0) {
      await supabase.from('orientador').update(payload).eq('id', existing[0].id)
      return existing[0].id
    }
  }
  const { data } = await supabase.from('orientador').insert(payload).select('id').single()
  return data?.id ?? null
}

// ─── Sequence allocation ─────────────────────────────────────────────────────

async function allocateSeqs(edicaoId, count) {
  const { data } = await supabase
    .from('edicao').select('ultimo_sequencial').eq('id', edicaoId).single()
  const start = (data?.ultimo_sequencial ?? 0) + 1
  const end = start + count - 1
  await supabase.from('edicao').update({ ultimo_sequencial: end }).eq('id', edicaoId)
  return start
}

// ─── Format detection ────────────────────────────────────────────────────────

export function detectBase44Format(rows) {
  if (!rows?.length) return 'candidatos'
  const keys = Object.keys(normalizeRow(rows[0]))
  if (keys.includes('c1') && keys.includes('c2') && keys.includes('c3') && keys.includes('c4')) {
    return 'detalhamento'
  }
  if (keys.includes('codigo') && (keys.includes('media_final') || keys.includes('consenso'))) {
    return 'classificacao'
  }
  return 'candidatos'
}

function mapConsensus(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (v === 'approved' || v === 'aprovado' || v === 'classificado') return 'classificado'
  if (v === 'rejected' || v === 'reprovado' || v === 'nao_classificado') return 'nao_classificado'
  return str(value)
}

// ─── Tab 1: Base44 – Projetos e Avaliações ──────────────────────────────────
// Base44 export columns (after normalizeKey):
//   ''            ← # (ignored)
//   candidato     → orientador.nome_completo
//   titulo_do_projeto → projeto.titulo
//   orientador    ← duplicate of candidato (ignored)
//   area          → projeto.area_conhecimento
//   instituicao   → orientador.escola, projeto.instituicao

export async function importarBase44Projetos(rows, edicao, onProgress) {
  const ano = getAnoEdicao(edicao)
  const valid = rows.filter(r => !r._skip)
  const startSeq = await allocateSeqs(edicao.id, valid.length)
  const results = { total: rows.length, success: 0, skipped: rows.length - valid.length, errors: [] }

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]
    try {
      const seq = startSeq + i
      const codigoProjeto = `PIBICJR-${ano}-PROJ-${seqCode(seq)}`
      const codigoOrientador = `PIBICJR-${ano}-ORI-${seqCode(seq)}`

      const { data: oriData, error: oriErr } = await supabase.from('orientador').insert({
        nome_completo: str(row.candidato),
        escola: str(row.instituicao),
        edicao_id: edicao.id,
        codigo_facitec: codigoOrientador,
      }).select('id').single()

      if (oriErr) throw new Error(`Orientador: ${oriErr.message}`)

      const { error: projErr } = await supabase.from('projeto').insert({
        titulo: str(row.titulo_do_projeto),
        area_conhecimento: str(row.area),
        instituicao: str(row.instituicao),
        edicao_id: edicao.id,
        orientador_id: oriData?.id ?? null,
        codigo_facitec: codigoProjeto,
        status: 'submetido',
      })

      if (projErr) throw new Error(`Projeto: ${projErr.message}`)

      results.success++
    } catch (e) {
      results.errors.push({
        row: row._rowNum,
        label: str(row.candidato) ?? str(row.titulo_do_projeto) ?? `Linha ${row._rowNum}`,
        error: e.message,
      })
    }
    onProgress?.(i + 1, valid.length)
  }

  await logImportacao('base44_projetos', edicao.id, `base44_projetos_${ano}`)
  return results
}

// ─── Tab 1b: Base44 – Classificação Geral ────────────────────────────────────
// Columns (after normalizeKey):
//   pos            → projeto.ordem_classificacao
//   codigo         → projeto.codigo
//   titulo         → projeto.titulo
//   candidato      → orientador.nome_completo
//   instituicao    → orientador.escola, projeto.instituicao
//   avaliacoes     ← ignored (raw count)
//   media_final    → projeto.status_avaliacao
//   consenso       → projeto.status (approved→"classificado", rejected→"nao_classificado")

export async function importarBase44Classificacao(rows, edicao, onProgress) {
  const ano = getAnoEdicao(edicao)
  const valid = rows.filter(r => !r._skip)
  const results = { total: rows.length, success: 0, skipped: rows.length - valid.length, errors: [] }

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]
    try {
      const { data: oriData, error: oriErr } = await supabase.from('orientador').insert({
        nome_completo: str(row.candidato),
        escola: str(row.instituicao),
        edicao_id: edicao.id,
      }).select('id').single()

      if (oriErr) throw new Error(`Orientador: ${oriErr.message}`)

      const { error: projErr } = await supabase.from('projeto').insert({
        titulo: str(row.titulo),
        codigo: str(row.codigo),
        instituicao: str(row.instituicao),
        status_avaliacao: str(row.media_final),
        status: mapConsensus(row.consenso),
        ordem_classificacao: num(row.pos),
        edicao_id: edicao.id,
        orientador_id: oriData?.id ?? null,
      })

      if (projErr) throw new Error(`Projeto: ${projErr.message}`)

      results.success++
    } catch (e) {
      results.errors.push({
        row: row._rowNum,
        label: str(row.candidato) ?? str(row.titulo) ?? `Linha ${row._rowNum}`,
        error: e.message,
      })
    }
    onProgress?.(i + 1, valid.length)
  }

  await logImportacao('base44_classificacao', edicao.id, `base44_classificacao_${ano}`)
  return results
}

// ─── Tab 2: Base44 – Orientadores e Bolsistas ────────────────────────────────
// Expected columns:
// Orientador: nome_completo, cpf, email, telefone, banco, agencia, conta, escola
// Bolsista:   bolsista_nome_completo, bolsista_cpf, data_nascimento, tipo,
//             ordem, escola_origem, ano_serie, nome_responsavel, cpf_responsavel

export async function importarBase44Bolsistas(rows, edicao, onProgress) {
  const ano = getAnoEdicao(edicao)
  const valid = rows.filter(r => !r._skip)
  const results = { total: rows.length, success: 0, skipped: rows.length - valid.length, errors: [] }

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]
    try {
      // Upsert orientador
      const orientadorId = await upsertOrientador({
        nome_completo: row.nome_completo,
        cpf: row.cpf,
        email: row.email,
        telefone: row.telefone,
        banco: row.banco,
        agencia: row.agencia,
        conta: row.conta,
        escola: row.escola,
      })

      // Find project for this orientador in this edition
      let projetoId = null
      let projSeq = null
      if (orientadorId) {
        const { data: proj } = await supabase
          .from('projeto')
          .select('id, codigo_facitec')
          .eq('orientador_id', orientadorId)
          .eq('edicao_id', edicao.id)
          .limit(1)
        if (proj?.length > 0) {
          projetoId = proj[0].id
          // Extract NNNN from codigo_facitec like PIBICJR-2025-PROJ-0003
          const m = (proj[0].codigo_facitec ?? '').match(/PROJ-(\d+)/)
          projSeq = m ? m[1] : seqCode(0)
        }
      }

      const ordem = str(row.ordem) ?? '1'
      const codigoFacitec = projSeq
        ? `PIBICJR-${ano}-BOL-${projSeq}-${ordem}`
        : null

      await supabase.from('bolsista').insert({
        nome_completo: str(row.bolsista_nome_completo),
        cpf: str(row.bolsista_cpf),
        data_nascimento: str(row.data_nascimento),
        tipo: str(row.tipo) ?? 'IC',
        ordem: num(row.ordem),
        escola_origem: str(row.escola_origem),
        ano_serie: str(row.ano_serie),
        nome_responsavel: str(row.nome_responsavel),
        cpf_responsavel: str(row.cpf_responsavel),
        projeto_id: projetoId,
        orientador_id: orientadorId,
        codigo_facitec: codigoFacitec,
        status: 'ativo',
      })

      results.success++
    } catch (e) {
      results.errors.push({
        row: row._rowNum,
        label: str(row.bolsista_nome_completo) ?? `Linha ${row._rowNum}`,
        error: e.message,
      })
    }
    onProgress?.(i + 1, valid.length)
  }

  await logImportacao('base44_bolsistas', edicao.id, `base44_bolsistas_${ano}`)
  return results
}

// ─── Tab 3: Base44 – Contratos e Termos ──────────────────────────────────────
// Expected columns:
// numero_contrato, numero_processo, data_contrato,
// codigo_facitec_orientador, codigo_facitec_bolsista, status

export async function importarBase44Contratos(rows, edicao, onProgress) {
  const valid = rows.filter(r => !r._skip)
  const results = { total: rows.length, success: 0, skipped: rows.length - valid.length, errors: [] }

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]
    try {
      // Find project by orientador codigo_facitec
      let projetoId = null
      const codOrientador = str(row.codigo_facitec_orientador)
      if (codOrientador) {
        const { data: proj } = await supabase
          .from('projeto')
          .select('id, orientador_id')
          .eq('codigo_facitec', codOrientador)
          .limit(1)
        if (proj?.length > 0) projetoId = proj[0].id
      }

      // Find orientador by codigo_facitec (via projeto)
      let orientadorId = null
      if (codOrientador) {
        const { data: proj } = await supabase
          .from('projeto')
          .select('orientador_id')
          .eq('codigo_facitec', codOrientador)
          .limit(1)
        orientadorId = proj?.[0]?.orientador_id ?? null
      }

      await supabase.from('contrato').insert({
        numero_contrato: str(row.numero_contrato),
        numero_processo: str(row.numero_processo),
        data_contrato: str(row.data_contrato),
        codigo_facitec_orientador: codOrientador,
        status: str(row.status) ?? 'pendente',
        projeto_id: projetoId,
        orientador_id: orientadorId,
      })

      results.success++
    } catch (e) {
      results.errors.push({
        row: row._rowNum,
        label: str(row.numero_contrato) ?? `Linha ${row._rowNum}`,
        error: e.message,
      })
    }
    onProgress?.(i + 1, valid.length)
  }

  const ano = getAnoEdicao(edicao)
  await logImportacao('base44_contratos', edicao.id, `base44_contratos_${ano}`)
  return results
}

// ─── Tab 4: Planilhas Históricas – flexible import ───────────────────────────

export async function importarHistorico(rows, tabela, mapeamento, edicaoId, onProgress) {
  const valid = rows.filter(r => !r._skip)
  const results = { total: rows.length, success: 0, skipped: rows.length - valid.length, errors: [] }
  // FK injections
  const fkMap = { edicao_id: edicaoId }

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]
    try {
      const payload = {}
      for (const [xlsxCol, dbField] of Object.entries(mapeamento)) {
        if (!dbField || dbField === '__skip__') continue
        payload[dbField] = str(row[xlsxCol]) ?? null
      }
      // Inject FKs if fields exist in table
      for (const [fk, val] of Object.entries(fkMap)) {
        if (fk in payload || mapeamento[fk]) continue
        payload[fk] = val
      }
      if (Object.keys(payload).length === 0) throw new Error('Nenhum campo mapeado')

      await supabase.from(tabela).insert(payload)
      results.success++
    } catch (e) {
      results.errors.push({ row: row._rowNum, label: `Linha ${row._rowNum}`, error: e.message })
    }
    onProgress?.(i + 1, valid.length)
  }

  await logImportacao('historico', edicaoId, `historico_${tabela}`)
  return results
}

// ─── Tab 1c: Base44 – Detalhamento por Critérios ─────────────────────────────
// Columns: Projeto, Código, Candidato, Avaliador, C1, C2, C3, C4, Nota Total
// Multiple rows per project (one per avaliador).

export async function importarBase44Detalhamento(rows, edicao, onProgress) {
  const ano = getAnoEdicao(edicao)
  const valid = rows.filter(r => !r._skip)
  const results = { total: rows.length, success: 0, skipped: rows.length - valid.length, errors: [] }

  const orientadorCache = new Map() // candidatoNome → orientador_id
  const avaliadorCache = new Map()  // avaliadorNome → avaliador_id
  const projetoCache = new Map()    // codigo → projeto_id

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i]
    try {
      const codigo = str(row.codigo)
      const tituloProj = str(row.projeto)
      const candidatoNome = str(row.candidato)
      const avaliadorNome = str(row.avaliador)
      const c1 = num(row.c1) ?? 0
      const c2 = num(row.c2) ?? 0
      const c3 = num(row.c3) ?? 0
      const c4 = num(row.c4) ?? 0
      const notaTotal = c1 + c2 + c3 + c4

      // Find or create orientador by name
      let orientadorId = orientadorCache.get(candidatoNome)
      if (orientadorId === undefined) {
        const { data: existing } = await supabase
          .from('orientador').select('id').ilike('nome_completo', candidatoNome).limit(1)
        if (existing?.length > 0) {
          orientadorId = existing[0].id
        } else {
          const { data: created } = await supabase.from('orientador').insert({
            nome_completo: candidatoNome,
            edicao_id: edicao.id,
          }).select('id').single()
          orientadorId = created?.id ?? null
        }
        orientadorCache.set(candidatoNome, orientadorId)
      }

      // Find or create projeto by codigo within this edicao
      let projetoId = projetoCache.get(codigo)
      if (projetoId === undefined) {
        const { data: existing } = await supabase
          .from('projeto').select('id').eq('codigo', codigo).eq('edicao_id', edicao.id).limit(1)
        if (existing?.length > 0) {
          projetoId = existing[0].id
        } else {
          const { data: created, error: projErr } = await supabase.from('projeto').insert({
            titulo: tituloProj,
            codigo,
            orientador_id: orientadorId,
            edicao_id: edicao.id,
            status: 'submetido',
          }).select('id').single()
          if (projErr) throw new Error(`Projeto: ${projErr.message}`)
          projetoId = created?.id ?? null
        }
        projetoCache.set(codigo, projetoId)
      }

      // Find or create avaliador by name
      let avaliadorId = avaliadorCache.get(avaliadorNome)
      if (avaliadorId === undefined) {
        const { data: existing } = await supabase
          .from('avaliador').select('id').ilike('nome', avaliadorNome).limit(1)
        if (existing?.length > 0) {
          avaliadorId = existing[0].id
        } else {
          const { data: created, error: avalErr } = await supabase.from('avaliador').insert({
            nome: avaliadorNome,
            edicao_id: edicao.id,
          }).select('id').single()
          if (avalErr) throw new Error(`Avaliador: ${avalErr.message}`)
          avaliadorId = created?.id ?? null
        }
        avaliadorCache.set(avaliadorNome, avaliadorId)
      }

      // Create avaliacao
      const { error: avaliacaoErr } = await supabase.from('avaliacao').insert({
        projeto_id: projetoId,
        avaliador_id: avaliadorId,
        nota_total: notaTotal,
        nota_c1: c1,
        nota_c2: c2,
        nota_c3: c3,
        nota_c4: c4,
        status: 'concluida',
      })
      if (avaliacaoErr) throw new Error(`Avaliação: ${avaliacaoErr.message}`)

      results.success++
    } catch (e) {
      results.errors.push({
        row: row._rowNum,
        label: str(row.candidato) ?? str(row.projeto) ?? `Linha ${row._rowNum}`,
        error: e.message,
      })
    }
    onProgress?.(i + 1, valid.length)
  }

  await logImportacao('base44_detalhamento', edicao.id, `base44_detalhamento_${ano}`)
  return results
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function validateBase44Projetos(rows) {
  return rows.map((row, i) => {
    const r = normalizeRow(row)
    r._rowNum = i + 2
    const errors = []
    if (!str(r.candidato)) errors.push('"Candidato" (coluna B) é obrigatório')
    if (!str(r.titulo_do_projeto)) errors.push('"Título do Projeto" (coluna C) é obrigatório')
    r._errors = errors
    r._skip = errors.length > 0
    return r
  })
}

export function validateBase44Classificacao(rows) {
  return rows.map((row, i) => {
    const r = normalizeRow(row)
    r._rowNum = i + 2
    const errors = []
    if (!str(r.candidato)) errors.push('"Candidato" é obrigatório')
    if (!str(r.titulo)) errors.push('"Título" é obrigatório')
    r._errors = errors
    r._skip = errors.length > 0
    return r
  })
}

export function validateBase44Detalhamento(rows) {
  return rows.map((row, i) => {
    const r = normalizeRow(row)
    r._rowNum = i + 2
    const errors = []
    if (!str(r.candidato)) errors.push('"Candidato" é obrigatório')
    if (!str(r.avaliador)) errors.push('"Avaliador" é obrigatório')
    if (!str(r.codigo) && !str(r.projeto)) errors.push('"Código" ou "Projeto" é obrigatório')
    r._errors = errors
    r._skip = errors.length > 0
    return r
  })
}

export function validateBase44Bolsistas(rows) {
  return rows.map((row, i) => {
    const r = normalizeRow(row)
    r._rowNum = i + 2
    const errors = []
    if (!str(r.cpf)) errors.push('cpf do orientador obrigatório')
    if (!str(r.bolsista_nome_completo)) errors.push('bolsista_nome_completo obrigatório')
    r._errors = errors
    r._skip = errors.length > 0
    return r
  })
}

export function validateBase44Contratos(rows) {
  return rows.map((row, i) => {
    const r = normalizeRow(row)
    r._rowNum = i + 2
    const errors = []
    if (!str(r.numero_contrato) && !str(r.codigo_facitec_orientador)) {
      errors.push('numero_contrato ou codigo_facitec_orientador é obrigatório')
    }
    r._errors = errors
    r._skip = errors.length > 0
    return r
  })
}

export function validateHistorico(rows, mapeamento, requiredDbFields) {
  return rows.map((row, i) => {
    const errors = []
    for (const req of requiredDbFields) {
      const xlsxCol = Object.entries(mapeamento).find(([, db]) => db === req)?.[0]
      if (!xlsxCol || !str(row[xlsxCol])) errors.push(`${req} obrigatório`)
    }
    return { ...row, _rowNum: i + 2, _errors: errors, _skip: errors.length > 0 }
  })
}

// ─── Table meta for Tab 4 ────────────────────────────────────────────────────

export const TABELAS_HISTORICO = {
  projeto: {
    label: 'Projeto',
    fields: [
      { key: 'titulo', label: 'Título', required: true },
      { key: 'status', label: 'Status' },
      { key: 'area_conhecimento', label: 'Área do Conhecimento' },
      { key: 'palavras_chave', label: 'Palavras-chave' },
      { key: 'resumo', label: 'Resumo' },
      { key: 'codigo_facitec', label: 'Código FACITEC' },
      { key: 'status_avaliacao', label: 'Status de Avaliação' },
      { key: 'instituicao', label: 'Instituição' },
      { key: 'arquivo_pdf_url', label: 'URL do PDF' },
    ],
    required: ['titulo'],
  },
  orientador: {
    label: 'Orientador',
    fields: [
      { key: 'nome_completo', label: 'Nome Completo', required: true },
      { key: 'email', label: 'E-mail' },
      { key: 'cpf', label: 'CPF' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'instituicao', label: 'Instituição' },
      { key: 'escola', label: 'Escola' },
      { key: 'banco', label: 'Banco' },
      { key: 'agencia', label: 'Agência' },
      { key: 'conta', label: 'Conta' },
    ],
    required: ['nome_completo'],
  },
  bolsista: {
    label: 'Bolsista',
    fields: [
      { key: 'nome_completo', label: 'Nome Completo', required: true },
      { key: 'cpf', label: 'CPF' },
      { key: 'email', label: 'E-mail' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'rg', label: 'RG' },
      { key: 'tipo', label: 'Tipo (IC/mestrado/...)' },
      { key: 'modalidade', label: 'Modalidade' },
      { key: 'status', label: 'Status' },
      { key: 'codigo_facitec', label: 'Código FACITEC' },
      { key: 'data_nascimento', label: 'Data de Nascimento' },
      { key: 'escola_origem', label: 'Escola de Origem' },
      { key: 'ano_serie', label: 'Ano/Série' },
      { key: 'nome_responsavel', label: 'Nome do Responsável' },
      { key: 'cpf_responsavel', label: 'CPF do Responsável' },
      { key: 'ordem', label: 'Ordem' },
    ],
    required: ['nome_completo'],
  },
  pagamento: {
    label: 'Pagamento',
    fields: [
      { key: 'valor', label: 'Valor (R$)', required: true },
      { key: 'data_pagamento', label: 'Data de Pagamento' },
      { key: 'mes_referencia', label: 'Mês de Referência' },
      { key: 'status', label: 'Status' },
    ],
    required: ['valor'],
  },
  contrato: {
    label: 'Contrato',
    fields: [
      { key: 'numero_contrato', label: 'Número do Contrato', required: true },
      { key: 'numero_processo', label: 'Número do Processo' },
      { key: 'data_contrato', label: 'Data do Contrato' },
      { key: 'status', label: 'Status' },
      { key: 'codigo_facitec_orientador', label: 'Código FACITEC Orientador' },
    ],
    required: ['numero_contrato'],
  },
  avaliacao: {
    label: 'Avaliação',
    fields: [
      { key: 'status', label: 'Status', required: true },
      { key: 'parecer', label: 'Parecer' },
    ],
    required: ['status'],
  },
  relatorio_mensal: {
    label: 'Relatório Mensal',
    fields: [
      { key: 'mes_referencia', label: 'Mês de Referência', required: true },
      { key: 'status', label: 'Status' },
      { key: 'arquivo_url', label: 'URL do Arquivo' },
    ],
    required: ['mes_referencia'],
  },
}
