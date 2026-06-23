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

// --- Domain services ---
export const edicaoService = {
  list: () => db.list('edicao'),
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
  list: () => db.list('orientador'),
  listAll: () => db.list('orientador', { select: 'id, nome_completo, email', order: 'nome_completo', asc: true }),
  get: (id) => db.get('orientador', id),
  create: (p) => db.insert('orientador', p),
  update: (id, p) => db.update('orientador', id, p),
  remove: (id) => db.remove('orientador', id),
}

export const bolsistaService = {
  list: () => db.list('bolsista', {
    select: '*, projeto:projeto_id(id, titulo), orientador:orientador_id(id, nome_completo)',
  }),
  listAll: () => db.list('bolsista', { select: 'id, nome_completo, tipo', order: 'nome_completo', asc: true }),
  get: (id) => db.get('bolsista', id),
  create: (p) => db.insert('bolsista', p),
  update: (id, p) => db.update('bolsista', id, p),
  remove: (id) => db.remove('bolsista', id),
}

export const contratoService = {
  list: () => db.list('contrato', {
    select: '*, projeto:projeto_id(id, titulo), orientador:orientador_id(id, nome_completo)',
  }),
  get: (id) => db.get('contrato', id),
  create: (p) => db.insert('contrato', p),
  update: (id, p) => db.update('contrato', id, p),
  remove: (id) => db.remove('contrato', id),
}

export const termoAdesaoService = {
  list: () => db.list('termo_adesao', {
    select: '*, projeto:projeto_id(id, titulo), bolsista:bolsista_id(id, nome_completo)',
  }),
  get: (id) => db.get('termo_adesao', id),
  create: (p) => db.insert('termo_adesao', p),
  update: (id, p) => db.update('termo_adesao', id, p),
  remove: (id) => db.remove('termo_adesao', id),
}

export const pagamentoService = {
  list: () => db.list('pagamento', {
    select: '*, bolsista:bolsista_id(id, nome_completo, tipo), edicao:edicao_id(id, data_inicio)',
  }),
  get: (id) => db.get('pagamento', id),
  create: (p) => db.insert('pagamento', p),
  update: (id, p) => db.update('pagamento', id, p),
  remove: (id) => db.remove('pagamento', id),
  sumPago: async () => {
    const { data, error } = await supabase
      .from('pagamento')
      .select('valor')
      .eq('status', 'pago')
    if (error) return 0
    return (data ?? []).reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
  },
}

export const avaliacaoService = {
  list: () => db.list('avaliacao', {
    select: '*, projeto:projeto_id(id, titulo, area_conhecimento, edicao_id), avaliador:avaliador_id(id, nome, extrato_url)',
  }),
  get: (id) => db.get('avaliacao', id),
  create: (p) => db.insert('avaliacao', p),
  update: (id, p) => db.update('avaliacao', id, p),
  remove: (id) => db.remove('avaliacao', id),
}

export const avaliadorService = {
  list: () => db.list('avaliador'),
  listAll: () => db.list('avaliador', { select: 'id, nome, email', order: 'nome', asc: true }),
  get: (id) => db.get('avaliador', id),
  create: (p) => db.insert('avaliador', p),
  update: (id, p) => db.update('avaliador', id, p),
  remove: (id) => db.remove('avaliador', id),
}

export const recursoService = {
  list: () => db.list('recurso', {
    select: '*, projeto:projeto_id(id, titulo)',
  }),
  get: (id) => db.get('recurso', id),
  create: (p) => db.insert('recurso', p),
  update: (id, p) => db.update('recurso', id, p),
  remove: (id) => db.remove('recurso', id),
}

export const relatorioMensalService = {
  list: () => db.list('relatorio_mensal', {
    select: '*, projeto:projeto_id(id, titulo), orientador:orientador_id(id, nome_completo)',
  }),
  get: (id) => db.get('relatorio_mensal', id),
  create: (p) => db.insert('relatorio_mensal', p),
  update: (id, p) => db.update('relatorio_mensal', id, p),
  remove: (id) => db.remove('relatorio_mensal', id),
}

export const importacaoLogService = {
  list: () => db.list('importacao_log'),
  get: (id) => db.get('importacao_log', id),
  remove: (id) => db.remove('importacao_log', id),
}
