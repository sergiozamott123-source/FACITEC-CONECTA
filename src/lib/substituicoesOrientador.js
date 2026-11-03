// src/lib/substituicoesOrientador.js
//
// Substituição de ORIENTADOR — mirror de src/lib/substituicoes.js
// (substituição de bolsista), com um passo a mais: o substituto
// confirma o convite preenchendo os próprios dados (Opção B), em vez
// do orientador atual preencher por ele.
//
// Fluxo: orientador atual chama solicitarSubstituicaoOrientador() →
// gera token_convite → substituto abre /convite-substituicao-orientador/:token,
// cria login próprio, preenche seu cadastro e chama
// vincularConviteSubstituicaoOrientador() → pedido vira "aguardando
// aprovação" → Secretaria aprova/recusa em SubstituicoesOrientadorPainel.jsx
// (aprovar_substituicao_orientador / recusar_substituicao_orientador no banco).

import { supabase } from './supabase'

export const BUCKET_SUBSTITUICAO = 'inscricoes'

export async function solicitarSubstituicaoOrientador({
  projetoId, motivo, nomeSubstituto, emailSubstituto, docAnuenciaUrl, docAnuenciaNomeArquivo,
}) {
  const { data, error } = await supabase.rpc('solicitar_substituicao_orientador', {
    p_projeto_id: projetoId,
    p_motivo: motivo,
    p_nome_substituto: nomeSubstituto,
    p_email_substituto: emailSubstituto,
    p_doc_anuencia_url: docAnuenciaUrl,
    p_doc_anuencia_nome_arquivo: docAnuenciaNomeArquivo ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function listarSolicitacoesSubstituicaoOrientadorDoOrientador(orientadorId) {
  const { data, error } = await supabase
    .from('solicitacao_substituicao_orientador')
    .select('*')
    .eq('orientador_saiu_id', orientadorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function uploadDocAnuenciaSubstituicao(file, orientadorSaiuId) {
  const ext = file.name.split('.').pop()
  const path = `substituicoes-orientador/${orientadorSaiuId}/anuencia_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET_SUBSTITUICAO).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(BUCKET_SUBSTITUICAO).getPublicUrl(path)
  return { url: publicUrl, nomeArquivo: file.name }
}

export async function obterConviteSubstituicaoOrientador(token) {
  const { data, error } = await supabase.rpc('obter_convite_substituicao_orientador', { p_token: token })
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

export async function uploadDocSubstituto(file, orientadorEntrouId, campo) {
  const ext = file.name.split('.').pop()
  const path = `orientadores/${orientadorEntrouId}/${campo}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET_SUBSTITUICAO).upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(BUCKET_SUBSTITUICAO).getPublicUrl(path)
  return publicUrl
}

export async function vincularConviteSubstituicaoOrientador(token, assinaturaNome) {
  const { data, error } = await supabase.rpc('vincular_convite_substituicao_orientador', {
    p_token: token,
    p_assinatura_nome: assinaturaNome,
  })
  if (error) throw new Error(error.message)
  return data
}

const SELECT_SOLICITACAO_ORIENTADOR = `
  *,
  projeto:projeto_id ( titulo ),
  orientador_saiu:orientador_saiu_id ( nome_completo, codigo_orientador, email ),
  orientador_entrou:orientador_entrou_id ( * )
`

export async function listarSolicitacoesSubstituicaoOrientadorPendentes() {
  const { data, error } = await supabase
    .from('solicitacao_substituicao_orientador')
    .select(SELECT_SOLICITACAO_ORIENTADOR)
    .in('status', ['aguardando_substituto', 'aguardando_aprovacao'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listarHistoricoSubstituicaoOrientador(limit = 50) {
  const { data, error } = await supabase
    .from('solicitacao_substituicao_orientador')
    .select(SELECT_SOLICITACAO_ORIENTADOR)
    .in('status', ['aprovada', 'recusada'])
    .order('decidido_em', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function aprovarSubstituicaoOrientador(solicitacaoId) {
  const { data, error } = await supabase.rpc('aprovar_substituicao_orientador', { p_solicitacao_id: solicitacaoId })
  if (error) throw new Error(error.message)
  return data
}

export async function recusarSubstituicaoOrientador(solicitacaoId, motivoRecusa) {
  const { data, error } = await supabase.rpc('recusar_substituicao_orientador', {
    p_solicitacao_id: solicitacaoId,
    p_motivo_recusa: motivoRecusa,
  })
  if (error) throw new Error(error.message)
  return data
}

// Usada pelo badge da Secretaria no menu lateral (mesmo padrão de
// contarSolicitacoesSubstituicaoPendentes, em substituicoes.js): conta
// pedidos de substituição de orientador aguardando alguma ação da
// Secretaria. "aguardando_substituto" ainda não precisa da Secretaria
// (o substituto é quem está devendo uma ação), então só contamos
// "aguardando_aprovacao" aqui.
export async function contarSolicitacoesSubstituicaoOrientadorPendentes() {
  const { count, error } = await supabase
    .from('solicitacao_substituicao_orientador')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'aguardando_aprovacao')
  if (error) throw error
  return count ?? 0
}
