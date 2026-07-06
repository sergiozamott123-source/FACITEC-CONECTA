// src/lib/solicitacoes.js
//
// Canal de solicitações da Secretaria Executiva para os Orientadores.
// Usado tanto no Superpainel (lado Secretaria, cria/lista) quanto no
// Portal do Orientador (lado Orientador, visualiza/atende).

import { supabase } from '@/lib/supabase'

export const TIPOS_SOLICITACAO = [
  { key: 'dados_bolsista',    label: 'Complementar dados dos bolsistas' },
  { key: 'relatorio_mensal',  label: 'Relatório mensal de acompanhamento' },
  { key: 'outro',             label: 'Outro' },
]

// ── Secretaria: listar todas as solicitações (com nome do orientador) ─────
export async function listarSolicitacoes() {
  const { data, error } = await supabase
    .from('solicitacao')
    .select('*, orientador:orientador_id (nome_completo, codigo_orientador)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Secretaria: criar uma solicitação para um ou mais orientadores ────────
export async function criarSolicitacoes({ orientadorIds, titulo, descricao, tipo, linkAcao, dataLimite }) {
  if (!orientadorIds?.length) throw new Error('Selecione ao menos um orientador.')
  if (!titulo?.trim()) throw new Error('Informe um título para a solicitação.')

  const linhas = orientadorIds.map(orientador_id => ({
    orientador_id,
    titulo: titulo.trim(),
    descricao: descricao?.trim() || null,
    tipo: tipo || 'outro',
    link_acao: linkAcao || null,
    data_limite: dataLimite || null,
    status: 'pendente',
  }))

  const { error } = await supabase.from('solicitacao').insert(linhas)
  if (error) throw error
}

// ── Orientador: listar as próprias solicitações ────────────────────────────
export async function listarSolicitacoesDoOrientador(orientadorId) {
  const { data, error } = await supabase
    .from('solicitacao')
    .select('*')
    .eq('orientador_id', orientadorId)
    .order('status', { ascending: true }) // pendente antes de atendida
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Orientador: marcar como atendida ────────────────────────────────────────
export async function marcarComoAtendida(id) {
  const { error } = await supabase
    .from('solicitacao')
    .update({ status: 'atendida', atendida_em: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Detecção automática: orientadores com bolsistas sem dados cadastrais ───
// Usado para o atalho "Complementar endereço/dados" no Superpainel.
export async function detectarOrientadoresComDadosPendentes(ano = '2026') {
  const { data: orientData, error: e1 } = await supabase
    .from('orientador')
    .select('id, nome_completo, codigo_orientador')
    .not('codigo_orientador', 'is', null)
  if (e1) throw e1
  if (!orientData?.length) return []

  const orientIds = orientData.map(o => o.id)
  const orientMap = Object.fromEntries(orientData.map(o => [o.id, o]))

  const { data: projData, error: e2 } = await supabase
    .from('projeto')
    .select('id, orientador_id')
    .in('orientador_id', orientIds)
    .eq('status', 'selecionado')
  if (e2) throw e2
  const projetoIds = (projData ?? []).map(p => p.id)
  const projetoOrientador = Object.fromEntries((projData ?? []).map(p => [p.id, p.orientador_id]))
  if (!projetoIds.length) return []

  const { data: bolsistaData, error: e3 } = await supabase
    .from('bolsista')
    .select('projeto_id, escola, telefone, endereco_rua, endereco_bairro, endereco_cidade, endereco_cep')
    .in('projeto_id', projetoIds)
    .eq('status', 'ativo')
  if (e3) throw e3

  const camposObrigatorios = ['escola', 'telefone', 'endereco_rua', 'endereco_bairro', 'endereco_cidade', 'endereco_cep']
  const orientadoresComPendencia = new Set()

  ;(bolsistaData ?? []).forEach(b => {
    const incompleto = camposObrigatorios.some(campo => !b[campo])
    if (incompleto) {
      const orientadorId = projetoOrientador[b.projeto_id]
      if (orientadorId) orientadoresComPendencia.add(orientadorId)
    }
  })

  return [...orientadoresComPendencia].map(id => orientMap[id]).filter(Boolean)
}
