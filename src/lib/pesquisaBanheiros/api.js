// Chamadas ao banco da Pesquisa Banheiros Públicos. Tudo passa por funções
// (RPC) do Supabase — ver supabase/pesquisa_banheiros_setup.sql.
import { supabase } from '@/lib/supabase'

export const MODULO = 'pesquisa-banheiros'

async function rpc(nome, args) {
  const { data, error } = await supabase.rpc(nome, args)
  if (error) throw new Error(error.message || 'erro')
  return data
}

// Público (sem login)
export const validarCodigo = (codigo) => rpc('banheiro_validar_codigo', { p_codigo: codigo })
export const enviarResposta = (codigo, respostas, nome) =>
  rpc('banheiro_enviar_resposta', { p_codigo: codigo, p_respostas: respostas, p_nome: nome || null })

// Equipe
export const temAcesso = () => rpc('tem_acesso_modulo', { p_modulo: MODULO })
export const gerarCodigos = async (qtd, lote, validadeDias) =>
  (await rpc('banheiro_gerar_codigos', { p_qtd: qtd, p_lote: lote || null, p_validade_dias: validadeDias || null }))
    .map((x) => x.codigo)
export const listarCodigos = () => rpc('banheiro_listar_codigos')
export const revogarCodigo = (id) => rpc('banheiro_revogar_codigo', { p_id: id })
export const listarRespostas = () => rpc('banheiro_listar_respostas')
export const listarEquipe = () => rpc('banheiro_listar_equipe')

export async function gerarAnaliseCpsi(respostaId, transcricao) {
  const { data, error } = await supabase.functions.invoke('banheiro-analise-cpsi', {
    body: { resposta_id: respostaId, transcricao },
  })
  if (error) {
    let msg = 'Não foi possível gerar a análise.'
    try { msg = (await error.context.json()).error || msg } catch { /* sem corpo */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
