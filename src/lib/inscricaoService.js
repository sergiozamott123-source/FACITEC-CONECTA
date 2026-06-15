import { supabase } from './supabase'

export const inscricaoService = {
  async getRascunho(userId) {
    const { data, error } = await supabase
      .from('inscricao_rascunho')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsertRascunho(userId, dados, etapaAtual) {
    const { data: existing, error: selErr } = await supabase
      .from('inscricao_rascunho')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (selErr) throw selErr

    if (existing?.id) {
      const { data, error } = await supabase
        .from('inscricao_rascunho')
        .update({ dados, etapa_atual: etapaAtual, atualizado_em: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    }
    const { data, error } = await supabase
      .from('inscricao_rascunho')
      .insert({ user_id: userId, dados, etapa_atual: etapaAtual })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getEdicaoAtiva() {
    // Tenta via edital_configuracao primeiro
    try {
      const { data } = await supabase
        .from('edital_configuracao')
        .select('edicao_id')
        .eq('ativo', true)
        .maybeSingle()
      if (data?.edicao_id) return data.edicao_id
    } catch {}

    // Fallback: edição mais recente da tabela edicao
    const { data: edicao, error } = await supabase
      .from('edicao')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !edicao?.id) throw new Error('Nenhuma edição ativa encontrada. Contate o administrador.')
    return edicao.id
  },

  async uploadArquivo(userId, campo, file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${userId}/${campo}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('inscricoes')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw error
    return data.path
  },

  async submeter(userId, formData) {
    // 1. Upsert orientador
    const { data: existingOrientador } = await supabase
      .from('orientador')
      .select('id')
      .eq('email', formData.orientador.email)
      .maybeSingle()

    let orientadorId
    const orientadorPayload = {
      nome_completo: formData.orientador.nome_completo,
      email: formData.orientador.email,
      cpf: formData.orientador.cpf,
      telefone: formData.orientador.telefone,
      instituicao: formData.orientador.instituicao,
    }

    if (existingOrientador?.id) {
      const { data, error } = await supabase
        .from('orientador')
        .update(orientadorPayload)
        .eq('id', existingOrientador.id)
        .select('id')
        .single()
      if (error) throw error
      orientadorId = data.id
    } else {
      const { data, error } = await supabase
        .from('orientador')
        .insert(orientadorPayload)
        .select('id')
        .single()
      if (error) throw error
      orientadorId = data.id
    }

    // 2. Busca edição ativa (obrigatória)
    const edicaoId = await inscricaoService.getEdicaoAtiva()

    // 3. Serializa ineditismo + critérios C1-C4 no campo resumo
    const ineditismoTexto = formData.projeto.ineditismo_inedito === 'sim'
      ? 'INEDITISMO: Projeto inédito — nunca apresentado ao FACITEC anteriormente.'
      : `INEDITISMO: Projeto já apresentado ao FACITEC.\nNovidades: ${formData.projeto.ineditismo_diferencial}`

    const resumo = [
      ineditismoTexto,
      `C1 - Relevância para a realidade escolar:\n${formData.projeto.c1_relevancia}`,
      `C2 - Potencial de impacto:\n${formData.projeto.c2_impacto}`,
      `C3 - Viabilidade técnica e econômica:\n${formData.projeto.c3_viabilidade}`,
      `C4 - Grau de inovação e criatividade:\n${formData.projeto.c4_inovacao}`,
    ].join('\n\n')

    // 4. Insert projeto
    const { data: projeto, error: projetoErr } = await supabase
      .from('projeto')
      .insert({
        titulo: formData.projeto.titulo,
        area_conhecimento: formData.projeto.eixo_tematico,
        palavras_chave: formData.projeto.objetivos,
        resumo,
        status: 'inscrito',
        orientador_id: orientadorId,
        edicao_id: edicaoId,
      })
      .select('id')
      .single()
    if (projetoErr) throw projetoErr

    // 5. Preserva rascunho marcado como submetido (etapa=99)
    try {
      await inscricaoService.upsertRascunho(userId, {
        ...formData,
        _meta: { status: 'submetido', projeto_id: projeto.id },
      }, 99)
    } catch {}

    return { projetoId: projeto.id }
  },
}
