import { supabase } from './supabase'

// --- Generic helpers ---
export const db = {
  async list(table, opts = {}) {
    let q = supabase.from(table).select(opts.select ?? '*', { count: 'exact' })
    if (opts.filters) opts.filters.forEach(([col, op, val]) => { q = q.filter(col, op, val) })
    if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? false })
    else q = q.order('created_at', { ascending: false })
    if (opts.limit) q = q.limit(opts.limit)
    const { data, error, count } = await q
    if (error) throw error
    return { data, count }
  },

  async get(table, id, select = '*') {
    const { data, error } = await supabase.from(table).select(select).eq('id', id).single()
    if (error) throw error
    return data
  },

  async insert(table, payload) {
    const { data, error } = await supabase.from(table).insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(table, id, payload) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async remove(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  },

  async count(table, filters = []) {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    filters.forEach(([col, op, val]) => { q = q.filter(col, op, val) })
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  },
}

// --- Filtro por edição ---
// Várias tabelas (bolsista, contrato, termo_adesao, avaliacao, relatorio_mensal)
// só têm `projeto_id`, não `edicao_id` direto — e `orientador.edicao_id` existe
// mas não é preenchido pelo fluxo real de inscrição (FichaInscricao.jsx cria/atualiza
// o orientador por auth_user_id, reaproveitado entre edições, sem gravar edicao_id).
// Por isso resolvemos "quais registros pertencem a esta edição" em duas etapas,
// via `projeto`, que sempre tem `edicao_id` correto.
async function projetoIdsDaEdicao(edicaoId) {
  const { data, error } = await supabase.from('projeto').select('id').eq('edicao_id', edicaoId)
  if (error) throw error
  return (data ?? []).map((r) => r.id)
}

async function orientadorIdsDaEdicao(edicaoId) {
  const { data, error } = await supabase.from('projeto').select('orientador_id').eq('edicao_id', edicaoId)
  if (error) throw error
  return [...new Set((data ?? []).map((r) => r.orientador_id).filter(Boolean))]
}

const EMPTY_LIST = { data: [], count: 0 }

// --- Domain services ---
export const edicaoService = {
  list: (programaId) => db.list('edicao', {
    filters: programaId ? [['programa_id', 'eq', programaId]] : undefined,
  }),
  get: (id) => db.get('edicao', id),
  create: (p) => db.insert('edicao', p),
  update: (id, p) => db.update('edicao', id, p),
  remove: (id) => db.remove('edicao', id),
}

export const projetoService = {
  list: (edicaoId) => db.list('projeto', {
    select: '*, orientador:orientador_id(id, nome_completo)',
    filters: edicaoId ? [['edicao_id', 'eq', edicaoId]] : undefined,
  }),
  listAll: () => db.list('projeto', { select: 'id, titulo, status, edicao_id, orientador_id' }),
  get: (id) => db.get('projeto', id, '*, orientador:orientador_id(id, nome_completo), edicao:edicao_id(id, status, data_inicio)'),
  create: (p) => db.insert('projeto', p),
  update: (id, p) => db.update('projeto', id, p),
  remove: (id) => db.remove('projeto', id),
}

export const orientadorService = {
  list: async (edicaoId) => {
    if (!edicaoId) return db.list('orientador')
    const ids = await orientadorIdsDaEdicao(edicaoId)
    if (ids.length === 0) return EMPTY_LIST
    return db.list('orientador', { filters: [['id', 'in', `(${ids.join(',')})`]] })
  },
  listAll: () => db.list('orientador', { select: 'id, nome_completo, email', order: 'nome_completo', asc: true }),
  get: (id) => db.get('orientador', id),
  create: (p) => db.insert('orientador', p),
  update: (id, p) => db.update('orientador', id, p),
  remove: (id) => db.remove('orientador', id),
}

export const bolsistaService = {
  list: async (edicaoId) => {
    const select = '*, projeto:projeto_id(id, titulo), orientador:orientador_id(id, nome_completo)'
    if (!edicaoId) return db.list('bolsista', { select })
    const ids = await projetoIdsDaEdicao(edicaoId)
    if (ids.length === 0) return EMPTY_LIST
    return db.list('bolsista', { select, filters: [['projeto_id', 'in', `(${ids.join(',')})`]] })
  },
  listAll: () => db.list('bolsista', { select: 'id, nome_completo, tipo, codigo_bolsista', order: 'nome_completo', asc: true }),
  get: (id) => db.get('bolsista', id),
  create: (p) => db.insert('bolsista', p),
  update: (id, p) => db.update('bolsista', id, p),
  remove: (id) => db.remove('bolsista', id),
}

export const contratoService = {
  list: async (edicaoId) => {
    const select = '*, projeto:projeto_id(id, titulo), orientador:orientador_id(id, nome_completo)'
    if (!edicaoId) return db.list('contrato', { select })
    const ids = await projetoIdsDaEdicao(edicaoId)
    if (ids.length === 0) return EMPTY_LIST
    return db.list('contrato', { select, filters: [['projeto_id', 'in', `(${ids.join(',')})`]] })
  },
  get: (id) => db.get('contrato', id),
  create: (p) => db.insert('contrato', p),
  update: (id, p) => db.update('contrato', id, p),
  remove: (id) => db.remove('contrato', id),
}

export const termoAdesaoService = {
  list: async (edicaoId) => {
    const select = '*, projeto:projeto_id(id, titulo), bolsista:bolsista_id(id, nome_completo)'
    if (!edicaoId) return db.list('termo_adesao', { select })
    const ids = await projetoIdsDaEdicao(edicaoId)
    if (ids.length === 0) return EMPTY_LIST
    return db.list('termo_adesao', { select, filters: [['projeto_id', 'in', `(${ids.join(',')})`]] })
  },
  get: (id) => db.get('termo_adesao', id),
  create: (p) => db.insert('termo_adesao', p),
  update: (id, p) => db.update('termo_adesao', id, p),
  remove: (id) => db.remove('termo_adesao', id),
}

export const pagamentoService = {
  list: (edicaoId) => db.list('pagamento', {
    select: '*, bolsista:bolsista_id(id, nome_completo, tipo, orientador_id), edicao:edicao_id(id, data_inicio)',
    filters: edicaoId ? [['edicao_id', 'eq', edicaoId]] : undefined,
  }),
  get: (id) => db.get('pagamento', id),
  create: (p) => db.insert('pagamento', p),
  update: (id, p) => db.update('pagamento', id, p),
  remove: (id) => db.remove('pagamento', id),
  sumPago: async (edicaoId) => {
    let q = supabase.from('pagamento').select('valor').eq('status', 'pago')
    if (edicaoId) q = q.eq('edicao_id', edicaoId)
    const { data, error } = await q
    if (error) return 0
    return (data ?? []).reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
  },
}

export const avaliacaoService = {
  list: async (edicaoId) => {
    const select = '*, projeto:projeto_id(id, titulo, area_conhecimento, edicao_id), avaliador:avaliador_id(id, nome, extrato_url)'
    if (!edicaoId) return db.list('avaliacao', { select })
    const ids = await projetoIdsDaEdicao(edicaoId)
    if (ids.length === 0) return EMPTY_LIST
    return db.list('avaliacao', { select, filters: [['projeto_id', 'in', `(${ids.join(',')})`]] })
  },
  get: (id) => db.get('avaliacao', id),
  create: (p) => db.insert('avaliacao', p),
  update: (id, p) => db.update('avaliacao', id, p),
  remove: (id) => db.remove('avaliacao', id),
}

export const avaliadorService = {
  // avaliador.edicao_id é gravado de forma confiável (ver Avaliacoes.jsx), diferente
  // de orientador.edicao_id — por isso aqui o filtro direto é seguro.
  list: (edicaoId) => db.list('avaliador', {
    filters: edicaoId ? [['edicao_id', 'eq', edicaoId]] : undefined,
  }),
  listAll: () => db.list('avaliador', { select: 'id, nome, email', order: 'nome', asc: true }),
  get: (id) => db.get('avaliador', id),
  create: (p) => db.insert('avaliador', p),
  update: (id, p) => db.update('avaliador', id, p),
  remove: (id) => db.remove('avaliador', id),
}

export const recursoService = {
  // recurso.edicao_id é gravado diretamente na criação (copiado do projeto,
  // ver RecursoWizard.jsx) — filtro direto é seguro aqui.
  list: (edicaoId) => db.list('recurso', {
    select: '*, projeto:projeto_id(id, titulo)',
    filters: edicaoId ? [['edicao_id', 'eq', edicaoId]] : undefined,
  }),
  get: (id) => db.get('recurso', id),
  create: (p) => db.insert('recurso', p),
  update: (id, p) => db.update('recurso', id, p),
  remove: (id) => db.remove('recurso', id),
}

export const relatorioMensalService = {
  list: async (edicaoId) => {
    const select = '*, projeto:projeto_id(id, titulo), orientador:orientador_id(id, nome_completo)'
    if (!edicaoId) return db.list('relatorio_mensal', { select })
    const ids = await projetoIdsDaEdicao(edicaoId)
    if (ids.length === 0) return EMPTY_LIST
    return db.list('relatorio_mensal', { select, filters: [['projeto_id', 'in', `(${ids.join(',')})`]] })
  },
  get: (id) => db.get('relatorio_mensal', id),
  create: (p) => db.insert('relatorio_mensal', p),
  update: (id, p) => db.update('relatorio_mensal', id, p),
  remove: (id) => db.remove('relatorio_mensal', id),
}

export const documentoAcervoService = {
  // Documentos de uma edição inteira (entidade_tipo='edicao') ou de uma
  // entidade específica dentro dela (projeto/orientador/bolsista).
  listPorEdicao: (edicaoId) => db.list('documento_acervo', {
    filters: [['edicao_id', 'eq', edicaoId]],
    order: 'criado_em', asc: false,
  }),
  listPorEntidade: (entidadeTipo, entidadeId) => db.list('documento_acervo', {
    filters: [['entidade_tipo', 'eq', entidadeTipo], ['entidade_id', 'eq', entidadeId]],
    order: 'criado_em', asc: false,
  }),
  create: (p) => db.insert('documento_acervo', p),
  remove: (id) => db.remove('documento_acervo', id),
}

export const acervoService = {
  // Edições encerradas (legado) de todos os programas, mais recentes primeiro.
  listEdicoesEncerradas: () => db.list('edicao', {
    filters: [['status', 'eq', 'encerrado']],
    order: 'ano_referencia', asc: false,
  }),
}

export const importacaoLogService = {
  list: () => db.list('importacao_log'),
  get: (id) => db.get('importacao_log', id),
  remove: (id) => db.remove('importacao_log', id),
}
